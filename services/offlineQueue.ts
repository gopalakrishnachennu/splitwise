import AsyncStorage from '@react-native-async-storage/async-storage';
import * as db from '@/services/database';
import { Expense, Settlement } from '@/types';

type PendingOpType = 'createExpense' | 'updateExpense' | 'deleteExpense' | 'createSettlement';

interface BasePendingOp {
  id: string;
  type: PendingOpType;
  createdAt: string;
}

type CreateExpensePayload = {
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;
  creatorName: string;
};

type UpdateExpensePayload = {
  id: string;
  updates: Partial<Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>>;
  creatorName: string;
};

type DeleteExpensePayload = {
  id: string;
};

type CreateSettlementPayload = {
  settlement: Omit<Settlement, 'id' | 'createdAt'>;
  creatorName: string;
};

export type PendingOperation =
  | (BasePendingOp & { type: 'createExpense'; payload: CreateExpensePayload })
  | (BasePendingOp & { type: 'updateExpense'; payload: UpdateExpensePayload })
  | (BasePendingOp & { type: 'deleteExpense'; payload: DeleteExpensePayload })
  | (BasePendingOp & { type: 'createSettlement'; payload: CreateSettlementPayload });

const STORAGE_KEY_PREFIX = 'splitwise_pending_ops_';

const keyForUser = (userId: string) => `${STORAGE_KEY_PREFIX}${userId}`;

async function loadQueue(userId: string): Promise<PendingOperation[]> {
  try {
    const raw = await AsyncStorage.getItem(keyForUser(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingOperation[];
  } catch (e) {
    console.error('Failed to load pending operations', e);
    return [];
  }
}

async function saveQueue(userId: string, ops: PendingOperation[]): Promise<void> {
  try {
    if (!ops.length) {
      await AsyncStorage.removeItem(keyForUser(userId));
    } else {
      await AsyncStorage.setItem(keyForUser(userId), JSON.stringify(ops));
    }
  } catch (e) {
    console.error('Failed to save pending operations', e);
  }
}

export async function enqueuePendingOperation(
  userId: string,
  op: Omit<PendingOperation, 'id' | 'createdAt'>
): Promise<void> {
  const now = new Date().toISOString();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const full: PendingOperation = { ...(op as any), id, createdAt: now };
  const queue = await loadQueue(userId);
  queue.push(full);
  await saveQueue(userId, queue);
}

export async function processPendingOperations(userId: string): Promise<void> {
  const queue = await loadQueue(userId);
  if (!queue.length) return;

  const remaining: PendingOperation[] = [];

  for (const op of queue) {
    try {
      switch (op.type) {
        case 'createExpense': {
          const { expense, creatorName } = op.payload;
          await db.createExpense(expense);
          await db.createActivity({
            type: 'expense_added',
            description: `added "${expense.description}"`,
            amount: expense.amount,
            currency: expense.currency,
            groupId: expense.groupId,
            groupName: expense.groupId ? (await db.getGroup(expense.groupId))?.name : undefined,
            expenseId: '', // ID not strictly needed for history here
            createdBy: expense.createdBy,
            createdByName: creatorName,
          });
          break;
        }
        case 'updateExpense': {
          const { id, updates, creatorName } = op.payload;
          const updated = await db.updateExpense(id, updates);
          if (updated) {
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
          }
          break;
        }
        case 'deleteExpense': {
          const { id } = op.payload;
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
          break;
        }
        case 'createSettlement': {
          const { settlement, creatorName } = op.payload;
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
          void created;
          break;
        }
      }
    } catch (e) {
      console.error('Failed to process pending op', op.type, e);
      remaining.push(op);
    }
  }

  await saveQueue(userId, remaining);
}

