export interface Transaction {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  source?: 'Manual' | 'Voice' | 'Receipt';
  type?: 'expense' | 'income';
  receipt_image?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  spent: number;
}

export interface Group {
  id: string;
  name: string;
  members: number; // simplified for list view
  owe: number;
  owed: number;
}

export interface GroupMember {
  name: string;
  email: string;
  avatar?: string;
}

export interface UserProfile {
  username: string;
  email: string;
  avatar: string;
}

export interface Reminder {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  paid: boolean;
}

export enum AppRoute {
  LANDING = '/',
  LOGIN = '/login',
  REGISTER = '/register',
  DASHBOARD = '/dashboard',
  TRANSACTIONS = '/transactions',
  ADD_EXPENSE = '/add-expense',
  RECEIPTS = '/receipts',
  GROUPS = '/groups',
  CREATE_GROUP = '/groups/new',
  GROUP_DETAILS = '/groups/:id',
  BUDGETS = '/budgets',
  FORECAST = '/forecast',
  REMINDERS = '/reminders',
  PROFILE = '/profile',
  CATEGORY_ANALYTICS = '/categories'
}