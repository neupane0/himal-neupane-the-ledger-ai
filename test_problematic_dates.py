"""Test date extraction with problematic values"""
import sys
sys.path.insert(0, 'C:/FYP/Himal/ledger_ai')

from core.ai_service import _extract_date_regex

print("=" * 60)
print("TESTING WITH PROBLEMATIC VALUES")
print("=" * 60)

tests = [
    '1912',           # Should NOT match
    '300142094',      # Should NOT match
    'Receipt #1234',  # Should NOT match
    '12345',          # Should NOT match
    '12/21/2025',     # Should match
    'Date: 12/21/2025', # Should match
    'Order 12345',    # Should NOT match
    '2025-12-21',     # Should match
    '21.12.2025',     # Should match
    'Phone: 1234567890', # Should NOT match
]

for test in tests:
    result = _extract_date_regex(test)
    status = "✅" if (result and "/" in test or "-" in test or "." in test) or (not result and not any(x in test for x in ['/', '-', '.', 'Date'])) else "❌"
    print(f"{test:30} -> {result} {status}")
