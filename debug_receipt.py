"""
Debug script to test receipt OCR and date extraction
Upload your receipt image and this will show you exactly what's happening
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_receipt_image(image_path):
    """Test OCR and date extraction on a receipt image"""
    
    print("="*70)
    print("RECEIPT OCR & DATE EXTRACTION DEBUG")
    print("="*70)
    
    # Import required modules
    try:
        from PIL import Image, ImageEnhance, ImageFilter
        import pytesseract
        import re
        from datetime import datetime
        
        print(f"\n1. Loading image: {image_path}")
        image = Image.open(image_path)
        print(f"   ✓ Image loaded: {image.size[0]}x{image.size[1]} pixels")
        
        # Preprocess
        print("\n2. Preprocessing image...")
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        width, height = image.size
        if width < 800 or height < 800:
            scale = max(800 / width, 800 / height)
            new_size = (int(width * scale), int(height * scale))
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"   ✓ Resized to: {new_size[0]}x{new_size[1]}")
        
        image = image.convert('L')
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        image = image.filter(ImageFilter.SHARPEN)
        print("   ✓ Preprocessing complete")
        
        # OCR
        print("\n3. Running OCR...")
        custom_config = r'--oem 3 --psm 6'
        text = pytesseract.image_to_string(image, config=custom_config)
        print(f"   ✓ OCR complete. Extracted {len(text)} characters")
        
        print("\n4. OCR TEXT OUTPUT:")
        print("-"*70)
        print(text)
        print("-"*70)
        
        # Now test date extraction
        print("\n5. Testing date extraction patterns...")
        
        # Manual date pattern search
        date_patterns = {
            'Transaction/Bill date': r'(?:transaction|trans|txn|bill|invoice|purchase)\s*(?:date|dt)?[\s:]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'Date label': r'date[\s:]+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
            'Date with time': r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+\d{1,2}:\d{2}',
            'DD/MM/YYYY': r'\b(\d{1,2}[/-]\d{1,2}[/-](?:20\d{2}|19[89]\d))\b',
            'YYYY-MM-DD': r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\b',
            'Text date': r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:20\d{2}|19[89]\d))\b',
        }
        
        found_dates = []
        for pattern_name, pattern in date_patterns.items():
            matches = re.findall(pattern, text, re.IGNORECASE)
            if matches:
                print(f"   ✓ {pattern_name}: {matches}")
                found_dates.extend(matches)
        
        if not found_dates:
            print("   ✗ No dates found with any pattern!")
        
        # Test with actual extraction function
        print("\n6. Testing with actual extraction function...")
        try:
            # Import the actual function
            from core.ai_service import _extract_date_regex, _normalize_date, _is_valid_date
            
            extracted_date = _extract_date_regex(text)
            print(f"   Extracted: {extracted_date}")
            
            if extracted_date:
                is_valid = _is_valid_date(extracted_date)
                print(f"   Valid: {is_valid}")
            else:
                print("   ✗ No date extracted!")
                
        except Exception as e:
            print(f"   ✗ Error: {e}")
            import traceback
            traceback.print_exc()
        
        # Test normalization on found dates
        if found_dates:
            print("\n7. Testing normalization on found dates...")
            for date_str in set(found_dates):
                try:
                    normalized = _normalize_date(date_str)
                    if normalized:
                        is_valid = _is_valid_date(normalized)
                        print(f"   '{date_str}' → '{normalized}' (Valid: {is_valid})")
                    else:
                        print(f"   '{date_str}' → Failed to normalize")
                except Exception as e:
                    print(f"   '{date_str}' → Error: {e}")
        
        print("\n" + "="*70)
        print("DEBUG COMPLETE")
        print("="*70)
        
    except Exception as e:
        print(f"\n✗ ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python debug_receipt.py <path_to_receipt_image>")
        print("\nExample:")
        print("  python debug_receipt.py receipts/my_receipt.jpg")
        print("  python debug_receipt.py C:\\path\\to\\receipt.png")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not os.path.exists(image_path):
        print(f"Error: File not found: {image_path}")
        sys.exit(1)
    
    test_receipt_image(image_path)
