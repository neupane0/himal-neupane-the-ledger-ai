# Standard categories used across the application
TRANSACTION_CATEGORIES = [
    'Food & Dining',
    'Groceries',
    'Transportation',
    'Shopping',
    'Bills & Utilities',
    'Entertainment',
    'Healthcare',
    'Travel',
    'Income',
    'Education',
    'Other'
]

# Category keywords for OCR/auto-categorization
CATEGORY_KEYWORDS = {
    'Food & Dining': ['restaurant', 'cafe', 'coffee', 'burger', 'pizza', 'lunch', 'dinner', 'food', 'bistro', 'kitchen', 'bar', 'grill', 'dining', 'eatery', 'starbucks', 'mcdonald', 'kfc'],
    'Groceries': ['market', 'mart', 'grocery', 'supermarket', 'store', 'foods', 'bakery', 'bhat-bhateni', 'department', 'walmart', 'target', 'costco', 'safeway'],
    'Transportation': ['fuel', 'gas', 'petrol', 'diesel', 'taxi', 'uber', 'lyft', 'bus', 'train', 'transport', 'parking', 'metro', 'subway', 'ride'],
    'Shopping': ['clothing', 'apparel', 'shoes', 'fashion', 'mall', 'shop', 'retail', 'amazon', 'ebay', 'nike', 'adidas'],
    'Bills & Utilities': ['electric', 'water', 'internet', 'wifi', 'bill', 'utility', 'power', 'energy', 'phone', 'mobile', 'cable', 'insurance'],
    'Entertainment': ['movie', 'cinema', 'theatre', 'netflix', 'spotify', 'game', 'entertainment', 'concert', 'show', 'ticket', 'steam'],
    'Healthcare': ['pharmacy', 'drug', 'doctor', 'clinic', 'hospital', 'medical', 'health', 'dental', 'medicine', 'cvs', 'walgreens'],
    'Travel': ['hotel', 'motel', 'inn', 'flight', 'airline', 'travel', 'trip', 'booking', 'airbnb', 'resort', 'vacation'],
    'Income': ['salary', 'paycheck', 'wage', 'bonus', 'refund', 'payment', 'deposit', 'income', 'earning'],
    'Education': ['tuition', 'school', 'college', 'university', 'course', 'book', 'education', 'academy', 'training', 'class'],
}
