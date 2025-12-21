"""
Test script for OCR parsing improvements
"""
import sys
sys.path.insert(0, 'C:/FYP/Himal/ledger_ai')

from core.ai_service import _extract_amount_regex, _extract_date_regex

print("=" * 60)
print("TESTING AMOUNT EXTRACTION")
print("=" * 60)

test_amounts = [
    "Total: $45.99",
    "Amount 123.45",
    "Grand Total 1,234.56",
    "$89.99",
    "45.50",
    "TOTAL $12.34",
    "total: 99.00",
    "Price 15.25 Total 30.50",
]

for test in test_amounts:
    result = _extract_amount_regex(test)
    print(f"{test:40} -> {result}")

print("\n" + "=" * 60)
print("TESTING DATE EXTRACTION")
print("=" * 60)

test_dates = [
    "12/21/2025",
    "Date: 12/21/2025",
    "2025-12-21",
    "21 Dec 2025",
    "Dec 21, 2025",
    "12-21-2025 14:30",
]

for test in test_dates:
    result = _extract_date_regex(test)
    print(f"{test:40} -> {result}")

print("\n" + "=" * 60)
print("FULL RECEIPT TEST")
print("=" * 60)

from core.ai_service import parse_receipt_text

receipt_text = """
Walmart Supercenter
123 Main Street
Date: 12/21/2025

Milk             $3.99
Bread            $2.49
Eggs             $4.50

Subtotal        $10.98
Tax              $0.88
Total           $11.86

Thank you for shopping!
"""

result = parse_receipt_text(receipt_text)
print("Parsed Result:")
for key, value in result.items():
    print(f"  {key}: {value}")
