// Standard categories matching backend constants
export const TRANSACTION_CATEGORIES = [
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
] as const;

export type TransactionCategory = typeof TRANSACTION_CATEGORIES[number];

// Category colors for UI display
export const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#FF6B6B',
  'Groceries': '#4ECDC4',
  'Transportation': '#45B7D1',
  'Shopping': '#FFA07A',
  'Bills & Utilities': '#98D8C8',
  'Entertainment': '#F7DC6F',
  'Healthcare': '#BB8FCE',
  'Travel': '#85C1E2',
  'Income': '#52C41A',
  'Education': '#FFB142',
  'Other': '#95A5A6'
};

// Category icons (using lucide-react icon names)
export const CATEGORY_ICONS: Record<string, string> = {
  'Food & Dining': 'UtensilsCrossed',
  'Groceries': 'ShoppingCart',
  'Transportation': 'Car',
  'Shopping': 'ShoppingBag',
  'Bills & Utilities': 'FileText',
  'Entertainment': 'Film',
  'Healthcare': 'Heart',
  'Travel': 'Plane',
  'Income': 'TrendingUp',
  'Education': 'BookOpen',
  'Other': 'MoreHorizontal'
};
