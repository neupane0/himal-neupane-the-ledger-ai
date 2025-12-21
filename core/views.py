from rest_framework import viewsets, permissions, status
from django.db import models
import csv
from django.http import HttpResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import ensure_csrf_cookie, csrf_exempt
from django.utils.decorators import method_decorator
from .models import Transaction
from .serializers import TransactionSerializer, UserSerializer

@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def current_user(request):
    return Response({
        'user': UserSerializer(request.user).data
    })

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(owner=self.request.user).order_by('-date', '-id')

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def register(request):
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        return Response(
            {'error': 'Username already exists'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )
    
    login(request, user)
    request.session.modified = True
    
    return Response({
        'message': 'User created successfully',
        'user': UserSerializer(user).data
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
@ensure_csrf_cookie
def login_view(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(request, username=username, password=password)
    
    if user is not None:
        login(request, user)
        request.session.modified = True
        
        return Response({
            'message': 'Login successful',
            'user': UserSerializer(user).data
        })
    
    return Response(
        {'error': 'Invalid credentials'},
        status=status.HTTP_401_UNAUTHORIZED
    )

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def logout_view(request):
    logout(request)
    return Response({'message': 'Logged out successfully'})

from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import re
from datetime import datetime
import os
import platform

# Set Tesseract path explicitly for Windows if not in PATH
if platform.system() == 'Windows':
    # Common default installation path
    tesseract_path = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
    if os.path.exists(tesseract_path):
        pytesseract.pytesseract.tesseract_cmd = tesseract_path

class ReceiptUploadView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.data:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        image_file = request.data['file']
        
        try:
            image = Image.open(image_file)
            
            # Preprocess image for better OCR results
            image = self.preprocess_image(image)
            
            # Attempt to extract text with custom config
            custom_config = r'--oem 3 --psm 6'  # LSTM OCR Engine, Assume uniform block of text
            text = pytesseract.image_to_string(image, config=custom_config)
            
            # Log extracted text for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.info(f"OCR Extracted Text:\n{text}\n{'='*50}")
            
            parsed_data = self.parse_receipt_text(text)
            
            # Additional logging for debugging
            logger.info(f"Parsed Data: {parsed_data}")
            
            # Return both parsed data and raw text for debugging
            parsed_data['raw_text'] = text[:500]  # First 500 chars
            
            return Response(parsed_data, status=status.HTTP_200_OK)
        except Exception as e:
            # Log full traceback for debugging
            import traceback
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Receipt upload error: {str(e)}")
            logger.error(f"Traceback:\n{traceback.format_exc()}")
            
            # Check if it's a Tesseract not found error
            if "tesseract is not installed" in str(e).lower() or "not found" in str(e).lower():
                 return Response(
                    {'error': 'Tesseract OCR is not installed or not in PATH. Please install it.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def preprocess_image(self, image):
        """Preprocess image to improve OCR accuracy"""
        # Convert to RGB if necessary
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        # Resize if too small (improves OCR)
        width, height = image.size
        if width < 800 or height < 800:
            scale = max(800 / width, 800 / height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
        
        # Convert to grayscale
        image = image.convert('L')
        
        # Increase contrast
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        # Sharpen image
        image = image.filter(ImageFilter.SHARPEN)
        
        return image

    def parse_receipt_text(self, text):
        """Use AI service for intelligent receipt parsing"""
        from .ai_service import parse_receipt_text
        return parse_receipt_text(text)

class ExportTransactionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="transactions.csv"'

        writer = csv.writer(response)
        writer.writerow(['Title', 'Amount', 'Date', 'Category', 'Notes'])

        transactions = Transaction.objects.filter(owner=request.user).order_by('-date', '-id')
        for tx in transactions:
            writer.writerow([tx.title, tx.amount, tx.date, tx.category, tx.notes])

        return response

class ImportTransactionsView(APIView):
    parser_classes = (MultiPartParser, FormParser)
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        if 'file' not in request.data:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        csv_file = request.data['file']
        
        if not csv_file.name.endswith('.csv'):
             return Response({'error': 'File is not a CSV'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = csv_file.read().decode('utf-8').splitlines()
            reader = csv.DictReader(decoded_file)
            
            transactions_to_create = []
            for row in reader:
                # Check for required fields
                if not all(k in row for k in ('Title', 'Amount', 'Date')):
                    continue 
                
                try:
                    amount = float(row['Amount'])
                    date = row['Date'] 
                    
                    transactions_to_create.append(Transaction(
                        owner=request.user,
                        title=row['Title'],
                        amount=amount,
                        date=date,
                        category=row.get('Category', ''),
                        notes=row.get('Notes', '')
                    ))
                except ValueError:
                    continue 
            
            if transactions_to_create:
                Transaction.objects.bulk_create(transactions_to_create)
                
            return Response({'message': f'Successfully imported {len(transactions_to_create)} transactions'}, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Category Management Views
class CategoryListView(APIView):
    """Returns list of all available categories"""
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        from .constants import TRANSACTION_CATEGORIES
        return Response({'categories': TRANSACTION_CATEGORIES}, status=status.HTTP_200_OK)

class CategoryStatsView(APIView):
    """Returns spending statistics by category for the authenticated user"""
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        from django.db.models import Sum, Count
        from decimal import Decimal
        
        # Get transactions grouped by category
        stats = Transaction.objects.filter(owner=request.user).values('category').annotate(
            total=Sum('amount'),
            count=Count('id')
        ).order_by('-total')
        
        # Calculate total spending
        total_spending = sum(item['total'] or Decimal(0) for item in stats)
        
        # Add percentage to each category
        result = []
        for item in stats:
            category = item['category'] or 'Uncategorized'
            total = float(item['total'] or 0)
            percentage = (total / float(total_spending) * 100) if total_spending > 0 else 0
            
            result.append({
                'category': category,
                'total': total,
                'count': item['count'],
                'percentage': round(percentage, 2)
            })
        
        return Response({
            'stats': result,
            'total_spending': float(total_spending)
        }, status=status.HTTP_200_OK)

@method_decorator(csrf_exempt, name='dispatch')
class BulkCategorizeView(APIView):
    """Re-categorize all or selected transactions using keyword matching"""
    permission_classes = [permissions.IsAuthenticated]
    
    def post(self, request):
        transaction_ids = request.data.get('transaction_ids', [])
        
        # Get transactions to categorize
        if transaction_ids:
            transactions_to_update = Transaction.objects.filter(
                owner=request.user,
                id__in=transaction_ids
            )
        else:
            # Re-categorize all transactions with empty or 'Other' category
            transactions_to_update = Transaction.objects.filter(
                owner=request.user
            ).filter(
                models.Q(category='') | models.Q(category='Other') | models.Q(category='Uncategorized') | models.Q(category__isnull=True)
            )
        
        from .constants import CATEGORY_KEYWORDS
        total_checked = transactions_to_update.count()
        updated_count = 0
        
        for transaction in transactions_to_update:
            # Use the same categorization logic from receipt parsing
            text = f"{transaction.title} {transaction.notes or ''}"
            text_lower = text.lower()
            
            categorized = False
            for category, keywords in CATEGORY_KEYWORDS.items():
                for keyword in keywords:
                    if keyword in text_lower:
                        transaction.category = category
                        transaction.save()
                        updated_count += 1
                        categorized = True
                        break
                if categorized:
                    break
        
        return Response({
            'message': f'Successfully categorized {updated_count} out of {total_checked} transactions',
            'total_checked': total_checked,
            'updated_count': updated_count
        }, status=status.HTTP_200_OK)


# AI-powered endpoints
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def categorize_with_ai(request):
    """
    Categorize transaction text using FinBERT + keyword matching
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import categorize_transaction_ai
        category = categorize_transaction_ai(text)
        return Response({'category': category}, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def parse_voice_input(request):
    """
    Parse voice transcript to extract transaction details
    """
    transcript = request.data.get('transcript', '')
    
    if not transcript:
        return Response({'error': 'Transcript is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import parse_voice_input as parse_voice
        result = parse_voice(transcript)
        return Response(result, status=status.HTTP_200_OK)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])  # Allow for testing
def debug_ocr_text(request):
    """
    Debug endpoint to test OCR parsing with raw text
    """
    text = request.data.get('text', '')
    
    if not text:
        return Response({'error': 'Text is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        from .ai_service import parse_receipt_text, _extract_amount_regex, _extract_date_regex
        
        # Parse the text
        result = parse_receipt_text(text)
        
        # Also show individual extractions for debugging
        debug_info = {
            'parsed_result': result,
            'debug': {
                'amount_found': _extract_amount_regex(text),
                'date_found': _extract_date_regex(text),
                'text_length': len(text),
                'text_preview': text[:200]
            }
        }
        
        return Response(debug_info, status=status.HTTP_200_OK)
    except Exception as e:
        import traceback
        return Response({
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
