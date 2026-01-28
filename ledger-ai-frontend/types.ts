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

export interface IncomeSource {
  id: number;
  name: string;
  monthly_amount: number;
  active: boolean;
}

export interface Budget {
  id: number;
  category: string;
  limit_amount: number;
  month: string;
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
  id: number;
  title: string;
  amount: number;
  due_date: string;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  is_paid: boolean;
  is_overdue: boolean;
  email_reminder: boolean;
  reminder_days_before: number;
  notes: string;
}

export enum AppRoute {
  LANDING = '/',
  LOGIN = '/login',
  REGISTER = '/register',
  DASHBOARD = '/dashboard',
  ASSISTANT = '/assistant',
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