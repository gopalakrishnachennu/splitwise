import { create } from 'zustand';
import { Expense, Activity, Settlement } from '@/types';
import * as db from '@/services/database';

interface ExpenseState {
  expenses: Expense[];
  activities: Activity[];
  settlements: Settlement[];
  currentExpense: Expense | null;
  searchResults: Expense[];
  categoryTotals: { category: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
  isLoading: boolean;
  fetchExpenses: (groupId?: string) => Promise<void>;
  fetchExpense: (id: string) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, creatorName: string) => Promise<Expense>;
  deleteExpense: (id: string) => Promise<void>;
  fetchActivities: () => Promise<void>;
  searchExpenses: (query: string) => Promise<void>;
  createSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>, creatorName: string) => Promise<void>;
  fetchSettlements: (groupId?: string) => Promise<void>;
  fetchAnalytics: () => Promise<void>;
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  expenses: [],
  activities: [],
  settlements: [],
  currentExpense: null,
  searchResults: [],
  categoryTotals: [],
  monthlyTotals: [],
  isLoading: false,

  fetchExpenses: async (groupId?: string) => {
    set({ isLoading: true });
    try {
      const expenses = await db.getExpenses(groupId);
      set({ expenses, isLoading: false });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      set({ isLoading: false });
    }
  },

  fetchExpense: async (id: string) => {
    try {
      const expense = await db.getExpense(id);
      set({ currentExpense: expense });
    } catch (error) {
      console.error('Error fetching expense:', error);
    }
  },

  createExpense: async (expense, creatorName) => {
    const created = await db.createExpense(expense);
    const groupName = expense.groupId
      ? (await db.getGroup(expense.groupId))?.name
      : undefined;

    await db.createActivity({
      type: 'expense_added',
      description: `added "${expense.description}"`,
      amount: expense.amount,
      currency: expense.currency,
      groupId: expense.groupId,
      groupName,
      expenseId: created.id,
      createdBy: expense.createdBy,
      createdByName: creatorName,
    });

    const { expenses } = get();
    set({ expenses: [created, ...expenses] });
    return created;
  },

  deleteExpense: async (id: string) => {
    const expense = await db.getExpense(id);
    await db.deleteExpense(id);
    if (expense) {
      await db.createActivity({
        type: 'expense_deleted',
        description: `deleted "${expense.description}"`,
        amount: expense.amount,
        currency: expense.currency,
        groupId: expense.groupId,
        expenseId: id,
        createdBy: expense.createdBy,
        createdByName: 'You',
      });
    }
    const { expenses } = get();
    set({ expenses: expenses.filter((e) => e.id !== id) });
  },

  fetchActivities: async () => {
    try {
      const activities = await db.getActivities();
      set({ activities });
    } catch (error) {
      console.error('Error fetching activities:', error);
    }
  },

  searchExpenses: async (query: string) => {
    try {
      const searchResults = await db.searchExpenses(query);
      set({ searchResults });
    } catch (error) {
      console.error('Error searching expenses:', error);
    }
  },

  createSettlement: async (settlement, creatorName) => {
    const created = await db.createSettlement(settlement);
    await db.createActivity({
      type: 'settlement',
      description: `settled up with ${settlement.toUserName}`,
      amount: settlement.amount,
      currency: settlement.currency,
      groupId: settlement.groupId,
      createdBy: settlement.fromUserId,
      createdByName: creatorName,
    });
    const { settlements } = get();
    set({ settlements: [created, ...settlements] });
  },

  fetchSettlements: async (groupId?: string) => {
    try {
      const settlements = await db.getSettlements(groupId);
      set({ settlements });
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  },

  fetchAnalytics: async () => {
    try {
      const [categoryTotals, monthlyTotals] = await Promise.all([
        db.getExpensesByCategory(),
        db.getExpensesByMonth(),
      ]);
      set({ categoryTotals, monthlyTotals });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  },
}));
