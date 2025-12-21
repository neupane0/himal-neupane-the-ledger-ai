"""Test Nepali and English date extraction"""

# Test the date extraction with both Nepali and English dates
from core.ai_service import _normalize_date, _convert_nepali_to_english_date

print("Testing Nepali Date Conversion:")
print("=" * 60)

# Test BS dates (Bikram Sambat / Nepali calendar)
test_nepali_dates = [
    "2081/09/06",  # BS format YYYY/MM/DD
    "06/09/2081",  # BS format DD/MM/YYYY
    "2081-09-06",
    "06-09-2081",
    "६/९/२०८१",  # Devanagari numerals
    "२०८१/०९/०६",
    "15 Poush 2081",
    "25 Baisakh 2081",
]

print("\n1. Nepali (BS) Date Tests:")
for date_str in test_nepali_dates:
    result = _convert_nepali_to_english_date(date_str)
    print(f"  BS: {date_str:20} -> AD: {result}")

print("\n2. English (AD) Date Tests:")
test_english_dates = [
    "11/02/2019",  # US format MM/DD/YYYY
    "02/11/2019",  # Could be DD/MM or MM/DD
    "2019-11-02",
    "15/12/2025",
    "12/15/2025",
    "25 Dec 2025",
]

for date_str in test_english_dates:
    result = _normalize_date(date_str)
    print(f"  AD: {date_str:20} -> {result}")

print("\n3. Mixed Format Tests (should detect BS vs AD):")
mixed_dates = [
    ("2081/09/06", "Should be BS (year > 2025)"),
    ("2024/09/06", "Should be AD (year <= 2025)"),
    ("06/09/2081", "Should be BS (year > 2025)"),
    ("06/09/2024", "Should be AD"),
]

for date_str, note in mixed_dates:
    result = _normalize_date(date_str)
    print(f"  {date_str:20} -> {result:15} ({note})")

print("\n" + "=" * 60)
print("Test complete!")
