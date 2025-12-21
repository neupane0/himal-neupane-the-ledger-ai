"""Test date extraction with real receipt text"""
import sys
sys.path.insert(0, 'C:/FYP/Himal/ledger_ai')

from core.ai_service import _extract_date_regex, parse_receipt_text

print("=" * 60)
print("TESTING DATE EXTRACTION")
print("=" * 60)

samples = [
    'Date: 12/21/2025',
    '21/12/2025',
    '2025-12-21',
    'Dec 21 2025',
    '21 December 2025',
    '12-21-2025',
    '21.12.2025',
    'DATE 12/21/2025',
    '12/21/25',
    '2025/12/21'
]

for s in samples:
    result = _extract_date_regex(s)
    print(f"{s:30} -> {result}")

print("\n" + "=" * 60)
print("TESTING WITH ACTUAL RECEIPT TEXT")
print("=" * 60)

# Simulate real OCR output
receipt_texts = [
    """
    Walmart
    123 Main St
    12/21/2025
    Total: $45.99
    """,
    """
    Target Store
    Date: 12/21/2025
    Amount: $89.50
    """,
    """
    Starbucks
    2025-12-21 14:30
    Total $5.75
    """
]

for i, text in enumerate(receipt_texts, 1):
    print(f"\nReceipt {i}:")
    result = parse_receipt_text(text)
    print(f"  Date extracted: {result['date']}")
    print(f"  Amount: {result['amount']}")
