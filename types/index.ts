export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  defaultCurrency: string;
  createdAt: string;
}

export interface Friend {
  id: string;
  userId: string;
  friendId: string;
  friendName: string;
  friendEmail: string;
  friendPhone?: string;
  friendAvatarUrl?: string;
  balance: number;
  currency: string;
  createdAt: string;
}

export interface Group {
  id: string;
  name: string;
  type: GroupType;
  imageUrl?: string;
  members: GroupMember[];
  simplifyDebts: boolean;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export type GroupType = 'home' | 'trip' | 'couple' | 'other';

export interface GroupMember {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface Expense {
  id: string;
  groupId?: string;
  description: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  paidBy: ExpensePayer[];
  splitBetween: ExpenseSplit[];
  splitType: SplitType;
  date: string;
  notes?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  recurringInterval?: RecurringInterval;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpensePayer {
  userId: string;
  userName: string;
  amount: number;
}

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number;
  percentage?: number;
  shares?: number;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory =
  | 'general'
  | 'food'
  | 'drinks'
  | 'groceries'
  | 'transport'
  | 'fuel'
  | 'parking'
  | 'rent'
  | 'utilities'
  | 'electricity'
  | 'water'
  | 'internet'
  | 'phone'
  | 'insurance'
  | 'medical'
  | 'clothing'
  | 'gifts'
  | 'entertainment'
  | 'movies'
  | 'music'
  | 'sports'
  | 'travel'
  | 'hotel'
  | 'flight'
  | 'taxi'
  | 'education'
  | 'pets'
  | 'home'
  | 'electronics'
  | 'cleaning'
  | 'maintenance'
  | 'subscriptions'
  | 'other';

export type RecurringInterval = 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'yearly';

export interface Activity {
  id: string;
  type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'settlement' | 'group_created' | 'member_added' | 'member_removed';
  description: string;
  amount?: number;
  currency?: string;
  groupId?: string;
  groupName?: string;
  expenseId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Settlement {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  amount: number;
  currency: string;
  groupId?: string;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Balance {
  userId: string;
  userName: string;
  amount: number;
  currency: string;
}

export interface DebtSimplification {
  from: string;
  fromName: string;
  to: string;
  toName: string;
  amount: number;
  currency: string;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  flag: string;
}
