import { create } from 'zustand';
import { Expense, Activity, Settlement } from '@/types';
import * as db from '@/services/database';
import { enqueuePendingOperation } from '@/services/offlineQueue';
import { useFriendStore } from '@/stores/useFriendStore';
import { useGroupStore } from '@/stores/useGroupStore';

export type { AnalyticsFilter } from '@/services/database';

interface ExpenseState {
  expenses: Expense[];
  activities: Activity[];
  settlements: Settlement[];
  currentExpense: Expense | null;
  searchResults: Expense[];
  categoryTotals: { category: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
  analyticsExpenses: Expense[];
  isLoading: boolean;
  fetchExpenses: (groupId?: string) => Promise<void>;
  fetchExpense: (id: string) => Promise<void>;
  createExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>, creatorName: string) => Promise<Expense>;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>, creatorName: string) => Promise<Expense | null>;
  deleteExpense: (id: string) => Promise<void>;
  fetchActivities: () => Promise<void>;
  searchExpenses: (query: string) => Promise<void>;
  createSettlement: (settlement: Omit<Settlement, 'id' | 'createdAt'>, creatorName: string) => Promise<void>;
  fetchSettlements: (groupId?: string) => Promise<void>;
  fetchAnalytics: (filters?: import('@/services/database').AnalyticsFilter) => Promise<void>;
}

export interface ReceiptScanPrefill {
  description: string;
  amount: string;
  receiptUri: string;
}

interface ExpenseStateWithPrefill extends ExpenseState {
  receiptScanPrefill: ReceiptScanPrefill | null;
  setReceiptScanPrefill: (prefill: ReceiptScanPrefill | null) => void;
}

export const useExpenseStore = create<ExpenseStateWithPrefill>((set, get) => ({
  expenses: [],
  activities: [],
  settlements: [],
  currentExpense: null,
  searchResults: [],
  categoryTotals: [],
  monthlyTotals: [],
  analyticsExpenses: [],
  isLoading: false,
  receiptScanPrefill: null,
  setReceiptScanPrefill: (prefill) => set({ receiptScanPrefill: prefill }),

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
    try {
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
      useFriendStore.getState().fetchFriends(expense.createdBy).catch(() => {});
      if (expense.groupId) {
        useGroupStore
          .getState()
          .fetchBalances(expense.groupId, expense.createdBy)
          .catch(() => {});
      }
      return created;
    } catch (error) {
      console.error('Error creating expense, enqueueing offline op:', error);
      try {
        await enqueuePendingOperation(expense.createdBy, {
          type: 'createExpense',
          payload: { expense, creatorName },
        });
      } catch (e) {
        console.error('Failed to enqueue offline createExpense op', e);
      }
      throw error;
    }
  },

  updateExpense: async (id, updates, creatorName) => {
    try {
      const updated = await db.updateExpense(id, updates);
      if (!updated) return null;
      const groupName = updated.groupId
        ? (await db.getGroup(updated.groupId))?.name
        : undefined;
      await db.createActivity({
        type: 'expense_updated',
        description: `updated "${updated.description}"`,
        amount: updated.amount,
        currency: updated.currency,
        groupId: updated.groupId,
        groupName,
        expenseId: id,
        createdBy: updated.createdBy,
        createdByName: creatorName,
      });
      const { expenses } = get();
      set({ expenses: expenses.map((e) => (e.id === id ? updated : e)) });
      useFriendStore.getState().fetchFriends(updated.createdBy).catch(() => {});
      if (updated.groupId) {
        useGroupStore
          .getState()
          .fetchBalances(updated.groupId, updated.createdBy)
          .catch(() => {});
      }
      return updated;
    } catch (error) {
      console.error('Error updating expense, enqueueing offline op:', error);
      try {
        const createdBy =
          updates.createdBy ??
          get().expenses.find((e) => e.id === id)?.createdBy ??
          undefined;
        if (createdBy) {
          await enqueuePendingOperation(createdBy, {
            type: 'updateExpense',
            payload: { id, updates, creatorName },
          });
        }
      } catch (e) {
        console.error('Failed to enqueue offline updateExpense op', e);
      }
      throw error;
    }
  },

  deleteExpense: async (id: string) => {
    try {
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
      if (expense?.createdBy) {
        useFriendStore.getState().fetchFriends(expense.createdBy).catch(() => {});
        if (expense.groupId) {
          useGroupStore
            .getState()
            .fetchBalances(expense.groupId, expense.createdBy)
            .catch(() => {});
        }
      }
    } catch (error) {
      console.error('Error deleting expense, enqueueing offline op:', error);
      try {
        const expense = get().expenses.find((e) => e.id === id);
        const createdBy = expense?.createdBy;
        if (createdBy) {
          await enqueuePendingOperation(createdBy, {
            type: 'deleteExpense',
            payload: { id },
          });
        }
      } catch (e) {
        console.error('Failed to enqueue offline deleteExpense op', e);
      }
      throw error;
    }
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
    try {
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
      useFriendStore.getState().fetchFriends(settlement.fromUserId).catch(() => {});
      if (settlement.groupId) {
        useGroupStore
          .getState()
          .fetchBalances(settlement.groupId, settlement.fromUserId)
          .catch(() => {});
      }
    } catch (error) {
      console.error('Error creating settlement, enqueueing offline op:', error);
      try {
        await enqueuePendingOperation(settlement.fromUserId, {
          type: 'createSettlement',
          payload: { settlement, creatorName },
        });
      } catch (e) {
        console.error('Failed to enqueue offline createSettlement op', e);
      }
      throw error;
    }
  },

  fetchSettlements: async (groupId?: string) => {
    try {
      const settlements = await db.getSettlements(groupId);
      set({ settlements });
    } catch (error) {
      console.error('Error fetching settlements:', error);
    }
  },

  fetchAnalytics: async (filters) => {
    try {
      const result = await db.getAnalytics(filters);
      set({
        analyticsExpenses: result.expenses,
        categoryTotals: result.categoryTotals,
        monthlyTotals: result.monthlyTotals,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  },
}));
