"""
AI Service Module - FinBERT + spaCy for transaction analysis
Replaces Gemini API with local open-source models
"""

import re
from datetime import datetime
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

# Global variables to cache loaded models
_finbert_classifier = None
_spacy_nlp = None

def get_finbert_classifier():
    """Lazy load FinBERT model for categorization"""
    global _finbert_classifier
    if _finbert_classifier is None:
        try:
            from transformers import pipeline
            logger.info("Loading FinBERT model...")
            _finbert_classifier = pipeline(
                "text-classification",
                model="yiyanghkust/finbert-tone",
                top_k=1
            )
            logger.info("FinBERT model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load FinBERT: {e}")
            _finbert_classifier = None
    return _finbert_classifier


def get_spacy_nlp():
    """Lazy load spaCy model for entity extraction"""
    global _spacy_nlp
    if _spacy_nlp is None:
        try:
            import spacy
            logger.info("Loading spaCy model...")
            _spacy_nlp = spacy.load("en_core_web_sm")
            logger.info("spaCy model loaded successfully")
        except OSError:
            # Model not downloaded, try to download it
            logger.warning("spaCy model not found, attempting to use fallback...")
            _spacy_nlp = None
        except Exception as e:
            logger.error(f"Failed to load spaCy: {e}")
            _spacy_nlp = None
    return _spacy_nlp


def categorize_transaction_ai(text: str) -> str:
    """
    Categorize transaction using FinBERT or fallback to keyword matching
    
    Args:
        text: Transaction description
        
    Returns:
        Category name
    """
    if not text or not text.strip():
        return 'Other'
    
    # Try FinBERT first
    classifier = get_finbert_classifier()
    if classifier:
        try:
            result = classifier(text[:512])[0]  # FinBERT has 512 token limit
            sentiment = result[0]['label'].lower()
            
            # Map FinBERT sentiment to transaction categories
            sentiment_to_category = {
                'positive': 'Income',
                'negative': 'Bills & Utilities',
                'neutral': 'Other'
            }
            
            # Additional keyword-based refinement
            category = _refine_category_with_keywords(text)
            if category != 'Other':
                return category
                
            return sentiment_to_category.get(sentiment, 'Other')
        except Exception as e:
            logger.error(f"FinBERT categorization error: {e}")
    
    # Fallback to keyword matching
    return _refine_category_with_keywords(text)


def _refine_category_with_keywords(text: str) -> str:
    """Enhanced keyword matching for categorization"""
    from .constants import CATEGORY_KEYWORDS
    
    text_lower = text.lower()
    
    # Check each category's keywords
    for category, keywords in CATEGORY_KEYWORDS.items():
        for keyword in keywords:
            if keyword in text_lower:
                return category
    
    # Advanced pattern matching
    patterns = {
        'Food & Dining': r'\b(restaurant|cafe|coffee|pizza|burger|food|lunch|dinner|breakfast)\b',
        'Transportation': r'\b(uber|lyft|taxi|gas|fuel|parking|metro|bus|train)\b',
        'Shopping': r'\b(amazon|walmart|target|store|shop|mall|purchase)\b',
        'Bills & Utilities': r'\b(electric|water|internet|phone|bill|utility)\b',
        'Healthcare': r'\b(doctor|hospital|pharmacy|medicine|health|clinic)\b',
        'Entertainment': r'\b(movie|cinema|concert|spotify|netflix|game)\b',
        'Income': r'\b(salary|wage|payment received|income|bonus|refund)\b',
    }
    
    for category, pattern in patterns.items():
        if re.search(pattern, text_lower):
            return category
    
    return 'Other'


def extract_entities_from_text(text: str) -> Dict[str, Optional[str]]:
    """
    Extract merchant, amount, date from text using spaCy NER
    
    Args:
        text: Raw text from OCR or voice input
        
    Returns:
        Dict with extracted entities
    """
    import logging
    logger = logging.getLogger(__name__)
    
    result = {
        'merchant': None,
        'amount': None,
        'date': None,
        'items': []
    }
    
    nlp = get_spacy_nlp()
    
    # Extract using spaCy if available
    if nlp:
        try:
            doc = nlp(text[:1000000])  # Limit text length
            
            # Extract entities
            for ent in doc.ents:
                if ent.label_ == 'ORG' and not result['merchant']:
                    result['merchant'] = ent.text
                elif ent.label_ == 'MONEY' and not result['amount']:
                    # Clean and convert money entity
                    amount_text = re.sub(r'[^\d.]', '', ent.text)
                    try:
                        result['amount'] = float(amount_text)
                    except ValueError:
                        pass
                elif ent.label_ == 'DATE' and not result['date']:
                    # Check context around the date to avoid expiry/manufacturing dates
                    start = max(0, ent.start_char - 50)
                    end = min(len(text), ent.end_char + 50)
                    context = text[start:end].lower()
                    
                    # Skip if it's an expiry, manufacturing, or warranty date
                    skip_keywords = ['expiry', 'exp', 'mfg', 'manufacture', 'valid', 'warranty', 
                                     'best before', 'use by', 'sell by', 'pkg', 'package']
                    
                    if any(keyword in context for keyword in skip_keywords):
                        logger.info(f"[extract_entities] Skipping date '{ent.text}' - likely not transaction date (context: {context})")
                        continue
                    
                    # Normalize the date to YYYY-MM-DD format
                    normalized = _normalize_date(ent.text)
                    if normalized:
                        result['date'] = normalized
                        logger.info(f"[extract_entities] Normalized spaCy date '{ent.text}' -> '{normalized}'")
        except Exception as e:
            logger.error(f"spaCy extraction error: {e}")
    
    # Fallback to regex-based extraction
    if not result['merchant']:
        result['merchant'] = _extract_merchant_regex(text)
    
    if not result['amount']:
        amount = _extract_amount_regex(text)
        result['amount'] = amount
        logger.info(f"[extract_entities] Amount from regex: {amount}")
    
    if not result['date']:
        date = _extract_date_regex(text)
        result['date'] = date
        logger.info(f"[extract_entities] Date from regex: {date}")
        logger.info(f"[extract_entities] Text being parsed for date: {text[:500]}")
    
    return result


def _extract_merchant_regex(text: str) -> Optional[str]:
    """Extract merchant name from first line"""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    if lines:
        # First non-empty line is usually the merchant
        return lines[0][:100]  # Limit length
    return None


def _extract_amount_regex(text: str) -> Optional[float]:
    """Extract monetary amount using regex with improved patterns"""
    text_lower = text.lower()
    
    # PRIORITY 1: Look for "total" amounts (most reliable)
    total_patterns = [
        r'total[\s:]*\$?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)',  # Total $XX.XX or Total: $XX.XX (allow multiple spaces)
        r'amount[\s:]*\$?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)',  # Amount XX.XX
        r'grand\s*total[\s:]*\$?\s*(\d{1,10}(?:,\d{3})*(?:\.\d{2})?)',  # Grand Total
    ]
    
    for pattern in total_patterns:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        for match in matches:
            try:
                val = float(match.replace(',', '').strip())
                if 0.01 <= val <= 1000000:  # Reasonable range
                    return val  # Return immediately if found in "total" patterns
            except ValueError:
                continue
    
    # PRIORITY 2: Look for currency symbols with amounts
    amounts = []
    currency_patterns = [
        r'[\$\£\€]\s?(\d{1,10}(?:,\d{3})*\.\d{2})',             # $XX.XX (with decimal)
        r'\b(\d{1,3}(?:,\d{3})*\.\d{2})\b',                     # XX.XX (standalone with decimal)
        r'(\d{2,}\.\d{2})',                                      # Any number with 2 decimals
    ]
    
    for pattern in currency_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            try:
                val = float(match.replace(',', '').strip())
                if 0.01 <= val <= 1000000:  # Filter unreasonable values
                    amounts.append(val)
            except ValueError:
                continue
    
    # Return largest amount (usually the total)
    return max(amounts) if amounts else None


def _extract_date_regex(text: str) -> Optional[str]:
    """Extract transaction/bill date using multiple patterns with priority for labeled dates"""
    import logging
    logger = logging.getLogger(__name__)
    
    # Log first 600 chars of OCR text for debugging
    logger.info(f"[_extract_date_regex] OCR text (first 600 chars): {text[:600]}")
    
    # Clean text - remove extra whitespace but preserve line structure
    text = re.sub(r' +', ' ', text)
    
    # Priority 1: Look for transaction/bill date with explicit labels (highest priority)
    transaction_date_patterns = [
        # RECEIPT DATE (very common) - more flexible spacing
        r'receipt\s*#?\s*date[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'receipt\s*#?\s*date[\s:]*(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',
        r'receipt\s*#?\s*date[\s:]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
        # Transaction/Invoice/Bill date
        r'(?:transaction|trans|txn|bill|invoice|purchase)\s*(?:date|dt)?[\s:]*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'(?:transaction|trans|txn|bill|invoice|purchase)\s*(?:date|dt)?[\s:]*(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',
        r'(?:transaction|trans|txn|bill|invoice|purchase)\s*(?:date|dt)?[\s:]*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
    ]
    
    for pattern in transaction_date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            normalized = _normalize_date(date_str)
            if normalized and _is_valid_date(normalized):
                logger.info(f"[_extract_date_regex] Found transaction date with label: {normalized}")
                return normalized
    
    # Priority 2: Generic "Date:" label (more flexible)
    date_label_patterns = [
        r'\bdate\s*:?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        r'\bdate\s*:?\s*(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})',
        r'\bdate\s*:?\s*(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4})',
    ]
    
    for pattern in date_label_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            normalized = _normalize_date(date_str)
            if normalized and _is_valid_date(normalized):
                logger.info(f"[_extract_date_regex] Found date with 'Date:' label: {normalized}")
                return normalized
    
    # Priority 3: Date with time (likely transaction timestamp)
    datetime_patterns = [
        r'\b(\d{1,2}[/-]\d{1,2}[/-]\d{4})\s+\d{1,2}:\d{2}',
        r'\b(\d{4}[/-]\d{1,2}[/-]\d{1,2})\s+\d{1,2}:\d{2}',
    ]
    
    for pattern in datetime_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            normalized = _normalize_date(date_str)
            if normalized and _is_valid_date(normalized):
                logger.info(f"[_extract_date_regex] Found date with timestamp: {normalized}")
                return normalized
    
    # Priority 4: First date in document (likely to be transaction date in receipts)
    # Look for dates in the first 600 characters (header area)
    header_text = text[:600]
    general_date_patterns = [
        # 4-digit years - English dates (1980-2099 AD)
        r'\b(\d{1,2}[/\-]\d{1,2}[/\-](?:20\d{2}|19[89]\d))\b',  # MM/DD/YYYY or DD/MM/YYYY
        r'\b(\d{4}[/\-]\d{1,2}[/\-]\d{1,2})\b',  # YYYY/MM/DD
        r'\b(\d{1,2}\.\d{1,2}\.(?:20\d{2}|19[89]\d))\b',  # DD.MM.YYYY
        r'\b(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(?:20\d{2}|19[89]\d))\b',  # 21 Dec 2025
        r'\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+(?:20\d{2}|19[89]\d))\b',  # Dec 21, 2025
        # Nepali dates with Devanagari numerals
        r'([०-९]{1,2}[/\-][०-९]{1,2}[/\-][०-९]{4})',  # Nepali DD/MM/YYYY
        r'([०-९]{4}[/\-][०-९]{1,2}[/\-][०-९]{1,2})',  # Nepali YYYY/MM/DD
        # Nepali month names
        r'\b(\d{1,2}\s+(?:Baisakh|Jestha|Ashar|Shrawan|Bhadra|Ashwin|Kartik|Mangsir|Poush|Magh|Falgun|Chaitra)\s+\d{4})\b',
        # 2-digit years (like 02/15/24 or 02/15/25)
        r'\b(\d{1,2}[/\-]\d{1,2}[/\-]\d{2})\b',
        # MM/DD without year (like 02/15) - will default to current year
        r'\b(\d{1,2}[/\-]\d{1,2})(?![/\-]\d)\b',
    ]
    
    for pattern in general_date_patterns:
        match = re.search(pattern, header_text, re.IGNORECASE)
        if match:
            date_str = match.group(1) if match.groups() else match.group(0)
            
            if not any(sep in date_str for sep in ['/', '-', '.', ' ']):
                logger.debug(f"[_extract_date_regex] Skipping '{date_str}' - no separator")
                continue
            
            # Validate date string doesn't look corrupted
            if len(date_str) < 6:  # Too short to be a valid date
                logger.debug(f"[_extract_date_regex] Skipping '{date_str}' - too short")
                continue
            
            normalized = _normalize_date(date_str)
            if normalized and _is_valid_date(normalized):
                logger.info(f"[_extract_date_regex] Found date in header: '{date_str}' -> '{normalized}'")
                return normalized
            else:
                logger.warning(f"[_extract_date_regex] Rejected invalid date: '{date_str}' -> '{normalized}'")
    
    # Priority 5: Any date in full document (last resort)
    for pattern in general_date_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            date_str = match.group(1) if match.groups() else match.group(0)
            
            if not any(sep in date_str for sep in ['/', '-', '.', ' ']):
                continue
            
            # Validate date string doesn't look corrupted
            if len(date_str) < 6:
                continue
            
            normalized = _normalize_date(date_str)
            if normalized and _is_valid_date(normalized):
                logger.info(f"[_extract_date_regex] Found date in document: '{date_str}' -> '{normalized}'")
                return normalized
    
    logger.warning(f"[_extract_date_regex] No valid date found in text")
    return None


def _is_valid_date(date_str: str) -> bool:
    """Validate that a normalized date string is reasonable for a transaction"""
    try:
        parts = date_str.split('-')
        if len(parts) != 3:
            return False
            
        year = int(parts[0])
        month = int(parts[1])
        day = int(parts[2])
        
        # Year must be between 2000 and current year + 1
        from datetime import datetime
        current_year = datetime.now().year
        if not (2000 <= year <= current_year + 1):
            return False
        
        # Month must be 1-12
        if not (1 <= month <= 12):
            return False
        
        # Day must be valid for the month
        if not (1 <= day <= 31):
            return False
        
        # Verify it's a valid date
        datetime(year, month, day)
        return True
    except:
        return False


def _convert_nepali_to_english_date(nepali_date_str: str) -> Optional[str]:
    """Convert Nepali (BS) date to English (AD) date in YYYY-MM-DD format"""
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        from nepali_datetime import date as NepaliDate
        
        # Devanagari to English numerals mapping
        devanagari_map = {
            '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
            '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
        }
        
        # Convert Devanagari numerals to English
        english_date_str = nepali_date_str
        has_devanagari = any(char in nepali_date_str for char in devanagari_map.keys())
        for nep, eng in devanagari_map.items():
            english_date_str = english_date_str.replace(nep, eng)
        
        # Try different BS date formats
        # Format: YYYY/MM/DD or YYYY-MM-DD
        match = re.match(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$', english_date_str)
        if match:
            year, month, day = map(int, match.groups())
            # Only treat as BS if:
            # 1. Has Devanagari numerals, OR
            # 2. Year is > 2026 (clearly BS), OR  
            # 3. Year is 2026-2050 and month/day are valid BS dates
            if has_devanagari or year > 2050:
                if 2000 <= year <= 2100:
                    try:
                        nepali_date = NepaliDate(year, month, day)
                        english_date = nepali_date.to_datetime_date()
                        result = english_date.strftime('%Y-%m-%d')
                        logger.info(f"[_convert_nepali_to_english_date] Converted BS {nepali_date_str} -> AD {result}")
                        return result
                    except Exception as e:
                        logger.debug(f"[_convert_nepali_to_english_date] Failed to convert {nepali_date_str}: {e}")
        
        # Format: DD/MM/YYYY or DD-MM-YYYY
        match = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$', english_date_str)
        if match:
            day, month, year = map(int, match.groups())
            # Same logic for DD/MM/YYYY format
            if has_devanagari or year > 2050:
                if 2000 <= year <= 2100:
                    try:
                        nepali_date = NepaliDate(year, month, day)
                        english_date = nepali_date.to_datetime_date()
                        result = english_date.strftime('%Y-%m-%d')
                        logger.info(f"[_convert_nepali_to_english_date] Converted BS {nepali_date_str} -> AD {result}")
                        return result
                    except Exception as e:
                        logger.debug(f"[_convert_nepali_to_english_date] Failed to convert {nepali_date_str}: {e}")
        
        # Nepali month names (in English) - if found, definitely BS
        nepali_months = {
            'baisakh': 1, 'baishakh': 1, 'वैशाख': 1,
            'jestha': 2, 'jeth': 2, 'ज्येष्ठ': 2,
            'ashar': 3, 'ashadh': 3, 'asar': 3, 'आषाढ': 3,
            'shrawan': 4, 'sawan': 4, 'श्रावण': 4,
            'bhadra': 5, 'bhadau': 5, 'भाद्र': 5,
            'ashwin': 6, 'asoj': 6, 'आश्विन': 6,
            'kartik': 7, 'कार्तिक': 7,
            'mangsir': 8, 'mangshir': 8, 'मंसिर': 8,
            'poush': 9, 'paush': 9, 'पौष': 9,
            'magh': 10, 'माघ': 10,
            'falgun': 11, 'phalgun': 11, 'फाल्गुन': 11,
            'chaitra': 12, 'chait': 12, 'चैत्र': 12,
        }
        
        # Try named month format: DD MonthName YYYY (definitely BS if Nepali month name found)
        for month_name, month_num in nepali_months.items():
            pattern = rf'\b(\d{{1,2}})\s+{re.escape(month_name)}\s+(\d{{4}})\b'
            match = re.search(pattern, english_date_str, re.IGNORECASE)
            if match:
                day, year = map(int, match.groups())
                if 2000 <= year <= 2100:
                    try:
                        nepali_date = NepaliDate(year, month_num, day)
                        english_date = nepali_date.to_datetime_date()
                        result = english_date.strftime('%Y-%m-%d')
                        logger.info(f"[_convert_nepali_to_english_date] Converted BS {nepali_date_str} -> AD {result}")
                        return result
                    except Exception as e:
                        logger.debug(f"[_convert_nepali_to_english_date] Failed to convert {nepali_date_str}: {e}")
        
    except Exception as e:
        logger.debug(f"[_convert_nepali_to_english_date] Error: {e}")
    
    return None


def _normalize_date(date_str: str) -> Optional[str]:
    """Normalize date to YYYY-MM-DD format with robust parsing (supports both Nepali BS and English AD dates)"""
    import logging
    logger = logging.getLogger(__name__)
    from datetime import datetime
    
    # Clean the input
    date_str = date_str.strip()
    
    # Special case: MM/DD without year (like "02/15") - assume current year
    match = re.match(r'^(\d{1,2})[/-](\d{1,2})$', date_str)
    if match:
        month, day = map(int, match.groups())
        current_year = datetime.now().year
        try:
            dt = datetime(current_year, month, day)
            normalized = dt.strftime('%Y-%m-%d')
            logger.info(f"[_normalize_date] Parsed MM/DD (no year): '{date_str}' -> '{normalized}' (assumed {current_year})")
            return normalized
        except ValueError:
            pass
    
    # Reject if input is too short (less than 5 chars can't be a valid date with year)
    if len(date_str) < 5:
        logger.warning(f"[_normalize_date] Rejected '{date_str}' - too short")
        return None
    
    # Try Nepali date conversion first (if year is 2000-2100 in BS calendar)
    nepali_result = _convert_nepali_to_english_date(date_str)
    if nepali_result:
        return nepali_result
    
    # Handle 2-digit years (like 02/15/24)
    match = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$', date_str)
    if match:
        first, second, year_2digit = match.groups()
        first_int = int(first)
        second_int = int(second)
        year_2digit_int = int(year_2digit)
        
        # Convert 2-digit year to 4-digit (00-50 -> 2000-2050, 51-99 -> 1951-1999)
        if year_2digit_int <= 50:
            year = 2000 + year_2digit_int
        else:
            year = 1900 + year_2digit_int
        
        # Try MM/DD/YY format first (US format)
        try:
            dt = datetime(year, first_int, second_int)
            normalized = dt.strftime('%Y-%m-%d')
            logger.info(f"[_normalize_date] Parsed MM/DD/YY: '{date_str}' -> '{normalized}'")
            return normalized
        except ValueError:
            # Try DD/MM/YY format
            try:
                dt = datetime(year, second_int, first_int)
                normalized = dt.strftime('%Y-%m-%d')
                logger.info(f"[_normalize_date] Parsed DD/MM/YY: '{date_str}' -> '{normalized}'")
                return normalized
            except ValueError:
                pass
    
    # First, try to handle common explicit formats with regex
    # This prevents misinterpretation by dateutil
    
    # Format: DD/MM/YYYY or DD-MM-YYYY (day first, 4-digit year)
    match = re.match(r'^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$', date_str)
    if match:
        first, second, year = match.groups()
        first_int = int(first)
        second_int = int(second)
        year_int = int(year)
        
        # Smart detection: if first number > 12, it must be day
        if first_int > 12:
            try:
                dt = datetime(year_int, second_int, first_int)
                normalized = dt.strftime('%Y-%m-%d')
                logger.info(f"[_normalize_date] Parsed DD/MM/YYYY (first>12): '{date_str}' -> '{normalized}'")
                return normalized
            except ValueError:
                pass
        # If second number > 12, first must be month
        elif second_int > 12:
            try:
                dt = datetime(year_int, first_int, second_int)
                normalized = dt.strftime('%Y-%m-%d')
                logger.info(f"[_normalize_date] Parsed MM/DD/YYYY (second>12): '{date_str}' -> '{normalized}'")
                return normalized
            except ValueError:
                pass
        # Ambiguous case (both <= 12) - try both, prefer MM/DD/YYYY (US format)
        else:
            try:
                dt = datetime(year_int, first_int, second_int)
                normalized = dt.strftime('%Y-%m-%d')
                logger.info(f"[_normalize_date] Parsed MM/DD/YYYY (ambiguous, US default): '{date_str}' -> '{normalized}'")
                return normalized
            except ValueError:
                try:
                    dt = datetime(year_int, second_int, first_int)
                    normalized = dt.strftime('%Y-%m-%d')
                    logger.info(f"[_normalize_date] Parsed DD/MM/YYYY (ambiguous, fallback): '{date_str}' -> '{normalized}'")
                    return normalized
                except ValueError:
                    pass
    
    # Format: YYYY-MM-DD or YYYY/MM/DD
    match = re.match(r'^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$', date_str)
    if match:
        year, month, day = match.groups()
        try:
            dt = datetime(int(year), int(month), int(day))
            normalized = dt.strftime('%Y-%m-%d')
            logger.info(f"[_normalize_date] Parsed YYYY-MM-DD: '{date_str}' -> '{normalized}'")
            return normalized
        except ValueError:
            pass
    
    # Fallback to dateutil parser for text dates like "21 Dec 2019"
    try:
        from dateutil import parser
        # Try with dayfirst=True (more common in receipts)
        dt = parser.parse(date_str, fuzzy=True, dayfirst=True)
        
        # Validate the parsed date is reasonable
        if dt.year < 1900 or dt.year > 2099:
            logger.warning(f"[_normalize_date] Invalid year {dt.year} from '{date_str}'")
            return None
        
        # Double-check we got a full date (not just a year)
        normalized = dt.strftime('%Y-%m-%d')
        if len(normalized) != 10:  # Must be YYYY-MM-DD format (10 chars)
            logger.warning(f"[_normalize_date] Invalid format '{normalized}' from '{date_str}'")
            return None
            
        logger.info(f"[_normalize_date] Parsed with dateutil: '{date_str}' -> '{normalized}'")
        return normalized
    except Exception as e:
        logger.warning(f"[_normalize_date] Failed to parse '{date_str}': {e}")
        return None


def parse_voice_input(transcript: str) -> Dict[str, any]:
    """
    Parse voice input to extract transaction details
    Supports both English and Nepali voice input
    
    Args:
        transcript: Text from speech recognition
        
    Returns:
        Dict with amount, category, date, description
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[parse_voice_input] Parsing transcript: {transcript}")
    
    result = {
        'amount': None,
        'category': 'Other',
        'date': datetime.now().strftime('%Y-%m-%d'),
        'description': transcript[:200]
    }
    
    # Convert Nepali numerals to English
    devanagari_map = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
    normalized_transcript = transcript
    for nep, eng in devanagari_map.items():
        normalized_transcript = normalized_transcript.replace(nep, eng)
    
    # Nepali keywords for amount extraction
    nepali_amount_keywords = [
        r'रुपैयाँ', r'रुपिया', r'रुपया', r'रु\.?', r'Rs\.?', r'NPR',
        r'खर्च', r'तिरेको', r'दिएको', r'भयो', r'पैसा'
    ]
    
    # Nepali category keywords mapping
    nepali_category_map = {
        'खाना': 'Food & Dining',
        'खाजा': 'Food & Dining', 
        'भोजन': 'Food & Dining',
        'रेस्टुरेन्ट': 'Food & Dining',
        'होटेल': 'Food & Dining',
        'किराना': 'Groceries',
        'तरकारी': 'Groceries',
        'सामान': 'Shopping',
        'कपडा': 'Shopping',
        'बिजुली': 'Bills & Utilities',
        'पानी': 'Bills & Utilities',
        'बिल': 'Bills & Utilities',
        'इन्टरनेट': 'Bills & Utilities',
        'फोन': 'Bills & Utilities',
        'पेट्रोल': 'Transportation',
        'बस': 'Transportation',
        'ट्याक्सी': 'Transportation',
        'गाडी': 'Transportation',
        'औषधि': 'Healthcare',
        'डाक्टर': 'Healthcare',
        'अस्पताल': 'Healthcare',
        'मनोरञ्जन': 'Entertainment',
        'सिनेमा': 'Entertainment',
        'शिक्षा': 'Education',
        'स्कुल': 'Education',
        'किताब': 'Education',
    }
    
    # Check for Nepali category keywords
    for nepali_word, category in nepali_category_map.items():
        if nepali_word in transcript:
            result['category'] = category
            break
    
    # Extract amount - try various patterns
    amount_patterns = [
        # Nepali patterns
        r'(?:रु\.?|Rs\.?|NPR|रुपैयाँ|रुपिया)\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:रु\.?|Rs\.?|रुपैयाँ|रुपिया)',
        # English patterns
        r'\$\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:dollars?|bucks?)',
        # General number patterns with context
        r'(?:spent|paid|cost|खर्च|तिरे|दिए)\s*(?:\$|रु\.?)?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)',
        r'(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:for|को लागि|मा)',
        # Standalone large numbers (likely amounts)
        r'\b(\d{2,}(?:,\d{3})*(?:\.\d{2})?)\b',
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, normalized_transcript, re.IGNORECASE)
        if match:
            try:
                amount_str = match.group(1).replace(',', '')
                amount = float(amount_str)
                if 0.01 <= amount <= 10000000:  # Reasonable range
                    result['amount'] = amount
                    logger.info(f"[parse_voice_input] Extracted amount: {amount}")
                    break
            except ValueError:
                continue
    
    # Extract entities using the general extractor
    entities = extract_entities_from_text(normalized_transcript)
    
    # Use extracted amount if not found above
    if not result['amount'] and entities['amount']:
        result['amount'] = entities['amount']
    
    # Use extracted date if available
    if entities['date']:
        result['date'] = entities['date']
    
    # Categorize using AI if not already categorized from Nepali keywords
    if result['category'] == 'Other':
        result['category'] = categorize_transaction_ai(transcript)
    
    # Clean up description - extract meaningful text
    description_patterns = [
        # "spent X on Y" -> Y is the description
        r'(?:spent|paid|on|for|at)\s+(?:\$?\d+\s+)?(?:on|for|at)\s+(.+?)(?:\s+(?:today|yesterday|this)|\s*$)',
        # "bought X" -> X is the description
        r'(?:bought|purchased|got)\s+(.+?)(?:\s+(?:for|at|today|yesterday)|\s*$)',
        # Nepali: "X मा खर्च" or "X किने"
        r'(.+?)\s*(?:मा\s+)?(?:खर्च|किने|तिरे)',
    ]
    
    for pattern in description_patterns:
        match = re.search(pattern, transcript, re.IGNORECASE)
        if match:
            desc = match.group(1).strip()
            if len(desc) > 2 and not desc.isdigit():
                result['description'] = desc[:200]
                break
    
    # If still no good description, use merchant if available
    if entities['merchant'] and len(entities['merchant']) > 2:
        if result['description'] == transcript[:200]:
            result['description'] = entities['merchant']
    
    logger.info(f"[parse_voice_input] Final result: {result}")
    
    return result


def parse_receipt_text(text: str) -> Dict[str, any]:
    """
    Parse receipt text after OCR extraction
    
    Args:
        text: Raw OCR text
        
    Returns:
        Dict with title, amount, date, category
    """
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[parse_receipt_text] Input text length: {len(text)}")
    logger.info(f"[parse_receipt_text] First 200 chars: {text[:200]}")
    
    entities = extract_entities_from_text(text)
    
    logger.info(f"[parse_receipt_text] Extracted entities: {entities}")
    
    # Check if date was actually found or defaulted
    date_found = entities['date'] is not None
    
    result = {
        'title': entities['merchant'] or 'Unknown Merchant',
        'amount': entities['amount'] or 0,
        'date': entities['date'] or datetime.now().strftime('%Y-%m-%d'),
        'category': categorize_transaction_ai(text),
        'date_detected': date_found  # Flag to show if date was actually found
    }
    
    logger.info(f"[parse_receipt_text] Final result: {result}")
    
    return result
