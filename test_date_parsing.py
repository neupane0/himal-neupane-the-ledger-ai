"""
Test date parsing with sample receipt text
"""
import sys
import os
import django

# Setup Django
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ledger_ai_project.settings')
django.setup()

from core.ai_service import _extract_date_regex, _normalize_date, _is_valid_date

# Test cases
test_texts = [
    # Your receipt text
    """
    RECEIPT
    Date: 11/02/2019
    Amount: $45.50
    """,
    
    # Various formats
    "Transaction date: 11/02/2019",
    "Date: 02/11/2019",
    "11-02-2019 10:30 AM",
    "Invoice Date: 11 Feb 2019",
    "11.02.2019",
]

print("="*60)
print("DATE EXTRACTION TESTS")
print("="*60)

for i, text in enumerate(test_texts, 1):
    print(f"\nTest {i}:")
    print(f"Input: {text.strip()[:100]}")
    
    # Test extraction
    extracted = _extract_date_regex(text)
    print(f"Extracted: {extracted}")
    
    if extracted:
        is_valid = _is_valid_date(extracted)
        print(f"Valid: {is_valid}")
    print("-"*60)

# Test normalization directly
print("\n" + "="*60)
print("NORMALIZATION TESTS")
print("="*60)

test_dates = [
    "11/02/2019",
    "02/11/2019", 
    "11-02-2019",
    "2019-02-11",
    "11 Feb 2019",
    "Feb 11, 2019",
    "12/21/1912",  # Should be rejected
]

for date_str in test_dates:
    print(f"\nInput: {date_str}")
    normalized = _normalize_date(date_str)
    print(f"Normalized: {normalized}")
    if normalized:
        print(f"Valid: {_is_valid_date(normalized)}")
    print("-"*40)
