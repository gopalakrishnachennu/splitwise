import {
  collection, doc, setDoc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, limit, updateDoc, addDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getRate } from './fx';
import {
  User, Friend, Group, GroupMember, Expense, ExpensePayer,
  ExpenseSplit, Activity, Settlement, SplitType, ExpenseCategory,
  GroupType, Balance, DebtSimplification, RecurringInterval,
} from '@/types';

const genId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 20; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ============ USER OPERATIONS ============

export const createUser = async (
  user: Omit<User, 'id' | 'createdAt'> & { password?: string }
): Promise<User> => {
  const id = user.email.replace(/[^a-zA-Z0-9]/g, '_');
  const createdAt = new Date().toISOString();
  const userData = {
    email: user.email,
    name: user.name,
    phone: user.phone || null,
    avatarUrl: user.avatarUrl || null,
    defaultCurrency: user.defaultCurrency || 'USD',
    createdAt,
  };
  await setDoc(doc(db, 'users', id), userData);
  return {
    id,
    email: userData.email,
    name: userData.name,
    phone: userData.phone || undefined,
    avatarUrl: userData.avatarUrl || undefined,
    defaultCurrency: userData.defaultCurrency,
    createdAt,
  };
};

export const getUser = async (id: string): Promise<User | null> => {
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as User;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const q = query(collection(db, 'users'), where('email', '==', normalized));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as User;
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
  const data: any = {};
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.email !== undefined) data.email = updates.email;
  if (updates.phone !== undefined) data.phone = updates.phone;
  if (updates.avatarUrl !== undefined) data.avatarUrl = updates.avatarUrl;
  if (updates.defaultCurrency !== undefined) data.defaultCurrency = updates.defaultCurrency;
  if (updates.role !== undefined) data.role = updates.role;
  if (Object.keys(data).length === 0) return;
  await updateDoc(doc(db, 'users', id), data);
};

export const getAllUsers = async (): Promise<User[]> => {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as User));
};

// ============ FRIEND OPERATIONS ============

export const addFriend = async (friend: Omit<Friend, 'id' | 'createdAt'>): Promise<Friend> => {
  const id = genId();
  const createdAt = new Date().toISOString();
  const data = {
    userId: friend.userId,
    friendId: friend.friendId,
    friendName: friend.friendName,
    friendEmail: friend.friendEmail || null,
    friendPhone: friend.friendPhone || null,
    friendAvatarUrl: friend.friendAvatarUrl || null,
    balance: friend.balance || 0,
    currency: friend.currency || 'USD',
    status: friend.status || 'linked',
    inviteEmail: friend.inviteEmail || null,
    invitePhone: friend.invitePhone || null,
    createdAt,
  };
  await setDoc(doc(db, 'friends', id), data);
  return { id, ...friend, createdAt };
};

export const getFriends = async (userId: string): Promise<Friend[]> => {
  const q = query(
    collection(db, 'friends'),
    where('userId', '==', userId)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Friend))
    .sort((a, b) => (a.friendName || '').localeCompare(b.friendName || ''));
};

export const updateFriendBalance = async (friendId: string, balance: number): Promise<void> => {
  await updateDoc(doc(db, 'friends', friendId), { balance });
};

export const deleteFriend = async (friendId: string): Promise<void> => {
  await deleteDoc(doc(db, 'friends', friendId));
};

// ============ GROUP OPERATIONS ============

export const createGroup = async (
  group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Group> => {
  const id = genId();
  const now = new Date().toISOString();
  const data = {
    name: group.name,
    type: group.type,
    imageUrl: group.imageUrl || null,
    simplifyDebts: group.simplifyDebts || false,
    defaultCurrency: group.defaultCurrency || 'USD',
    defaultSplitType: group.defaultSplitType || null,
    defaultSplitConfig: group.defaultSplitConfig || null,
    members: group.members.map((m) => ({
      id: genId(),
      userId: m.userId,
      name: m.name,
      email: m.email || null,
      phone: m.phone || null,
      avatarUrl: m.avatarUrl || null,
    })),
    createdAt: now,
    updatedAt: now,
  };
  await setDoc(doc(db, 'groups', id), data);
  return { ...data, id } as Group;
};

export const getGroups = async (): Promise<Group[]> => {
  const q = query(collection(db, 'groups'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
};

export const getGroup = async (id: string): Promise<Group | null> => {
  const snap = await getDoc(doc(db, 'groups', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Group;
};

export const updateGroup = async (id: string, updates: Partial<Group>): Promise<void> => {
  const data: any = { updatedAt: new Date().toISOString() };
  if (updates.name !== undefined) data.name = updates.name;
  if (updates.type !== undefined) data.type = updates.type;
  if (updates.simplifyDebts !== undefined) data.simplifyDebts = updates.simplifyDebts;
  if (updates.defaultSplitType !== undefined) data.defaultSplitType = updates.defaultSplitType || null;
  if (updates.defaultSplitConfig !== undefined) data.defaultSplitConfig = updates.defaultSplitConfig || null;
  await updateDoc(doc(db, 'groups', id), data);
};

export const deleteGroup = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'groups', id));
};

export const addGroupMember = async (
  groupId: string,
  member: Omit<GroupMember, 'id'>
): Promise<GroupMember> => {
  const group = await getGroup(groupId);
  if (!group) throw new Error('Group not found');
  const alreadyIn = group.members.some((m) => m.userId === member.userId);
  if (alreadyIn) throw new Error('Member already in group');
  const newMember: GroupMember = {
    id: genId(),
    userId: member.userId,
    name: member.name,
    email: member.email || undefined,
    phone: member.phone || undefined,
    avatarUrl: member.avatarUrl || undefined,
  };
  const updatedMembers = [...group.members, newMember];
  await updateDoc(doc(db, 'groups', groupId), {
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  });
  return newMember;
};

export const removeGroupMember = async (groupId: string, memberId: string): Promise<void> => {
  const group = await getGroup(groupId);
  if (!group) return;
  const updatedMembers = group.members.filter((m) => m.id !== memberId);
  await updateDoc(doc(db, 'groups', groupId), {
    members: updatedMembers,
    updatedAt: new Date().toISOString(),
  });
};

// ============ EXPENSE OPERATIONS ============

export const createExpense = async (
  expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Expense> => {
  const id = genId();
  const now = new Date().toISOString();
  const data: Record<string, unknown> = {
    groupId: expense.groupId || null,
    description: expense.description,
    amount: expense.amount,
    currency: expense.currency,
    category: expense.category,
    splitType: expense.splitType,
    date: expense.date,
    notes: expense.notes || null,
    receiptUrl: expense.receiptUrl || null,
    isRecurring: expense.isRecurring || false,
    recurringInterval: expense.recurringInterval || null,
    createdBy: expense.createdBy,
    paidBy: expense.paidBy,
    splitBetween: expense.splitBetween,
    createdAt: now,
    updatedAt: now,
  };
  if (expense.fxToGroupRate != null) data.fxToGroupRate = expense.fxToGroupRate;
  if (expense.fxUpdatedAt != null) data.fxUpdatedAt = expense.fxUpdatedAt;
  await setDoc(doc(db, 'expenses', id), data);

  if (expense.groupId) {
    await updateDoc(doc(db, 'groups', expense.groupId), {
      updatedAt: now,
    }).catch(() => { });
  }

  return { ...data, id } as Expense;
};

export const updateExpense = async (
  id: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>>
): Promise<Expense | null> => {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { ...updates, updatedAt: now };
  delete patch.id;
  delete patch.createdAt;

  // Attempt the update; if the doc doesn't exist or rules fail, let the error propagate
  // so the caller can surface a real error instead of a silent null.
  await updateDoc(doc(db, 'expenses', id), patch);

  // Try to fetch the latest for return value and group updatedAt bookkeeping.
  const existing = await getExpense(id);
  const groupId = updates.groupId ?? existing?.groupId;
  if (groupId) {
    await updateDoc(doc(db, 'groups', groupId), { updatedAt: now }).catch(() => {});
  }
  return existing ? ({ ...existing, ...updates, id, updatedAt: now } as Expense) : null;
};

export const getExpenses = async (groupId?: string): Promise<Expense[]> => {
  let q;
  if (groupId) {
    q = query(
      collection(db, 'expenses'),
      where('groupId', '==', groupId)
    );
  } else {
    q = query(collection(db, 'expenses'));
  }
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Expense))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

export const getExpense = async (id: string): Promise<Expense | null> => {
  const snap = await getDoc(doc(db, 'expenses', id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Expense;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', id));
};

export const searchExpenses = async (queryStr: string): Promise<Expense[]> => {
  // Firestore doesn't support LIKE — fetch all and filter client-side
  const q = query(collection(db, 'expenses'), orderBy('date', 'desc'));
  const snap = await getDocs(q);
  const lower = queryStr.toLowerCase();
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Expense))
    .filter((e) => e.description.toLowerCase().includes(lower));
};

export interface AnalyticsFilter {
  groupId?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string;   // YYYY-MM-DD
  userId?: string;   // expenses where user is in paidBy or splitBetween
}

export const getExpensesForAnalytics = async (filters?: AnalyticsFilter): Promise<Expense[]> => {
  let expenses = await getExpenses(filters?.groupId ?? undefined);
  if (filters?.dateFrom) {
    expenses = expenses.filter((e) => (e.date || '') >= filters!.dateFrom!);
  }
  if (filters?.dateTo) {
    expenses = expenses.filter((e) => (e.date || '') <= filters!.dateTo!);
  }
  if (filters?.userId) {
    const uid = filters.userId;
    expenses = expenses.filter(
      (e) =>
        (e.paidBy && e.paidBy.some((p) => p.userId === uid)) ||
        (e.splitBetween && e.splitBetween.some((s) => s.userId === uid))
    );
  }
  return expenses;
};

export const getExpensesByCategory = async (filters?: AnalyticsFilter): Promise<{ category: string; total: number }[]> => {
  const expenses = await getExpensesForAnalytics(filters);
  const map: Record<string, number> = {};
  for (const e of expenses) {
    map[e.category] = (map[e.category] || 0) + e.amount;
  }
  return Object.entries(map)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
};

export const getExpensesByMonth = async (filters?: AnalyticsFilter): Promise<{ month: string; total: number }[]> => {
  const expenses = await getExpensesForAnalytics(filters);
  const map: Record<string, number> = {};
  for (const e of expenses) {
    const month = (e.date || '').substring(0, 7);
    if (month.length === 7) map[month] = (map[month] || 0) + e.amount;
  }
  return Object.entries(map)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
};

export interface AnalyticsResult {
  expenses: Expense[];
  categoryTotals: { category: string; total: number }[];
  monthlyTotals: { month: string; total: number }[];
}

export const getAnalytics = async (filters?: AnalyticsFilter): Promise<AnalyticsResult> => {
  const expenses = await getExpensesForAnalytics(filters);
  const categoryMap: Record<string, number> = {};
  const monthMap: Record<string, number> = {};
  for (const e of expenses) {
    categoryMap[e.category] = (categoryMap[e.category] || 0) + e.amount;
    const month = (e.date || '').substring(0, 7);
    if (month.length === 7) monthMap[month] = (monthMap[month] || 0) + e.amount;
  }
  const categoryTotals = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
  const monthlyTotals = Object.entries(monthMap)
    .map(([month, total]) => ({ month, total }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
  return { expenses, categoryTotals, monthlyTotals };
};

// ============ ACTIVITY OPERATIONS ============

export const createActivity = async (
  activity: Omit<Activity, 'id' | 'createdAt'>
): Promise<Activity> => {
  const id = genId();
  const createdAt = new Date().toISOString();
  const data = {
    type: activity.type,
    description: activity.description,
    amount: activity.amount || null,
    currency: activity.currency || null,
    groupId: activity.groupId || null,
    groupName: activity.groupName || null,
    expenseId: activity.expenseId || null,
    createdBy: activity.createdBy,
    createdByName: activity.createdByName,
    createdAt,
  };
  await setDoc(doc(db, 'activities', id), data);
  return { ...data, id } as Activity;
};

export const getActivities = async (limitCount: number = 50): Promise<Activity[]> => {
  const q = query(
    collection(db, 'activities'),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Activity));
};

// ============ SETTLEMENT OPERATIONS ============

export const createSettlement = async (
  settlement: Omit<Settlement, 'id' | 'createdAt'>
): Promise<Settlement> => {
  const id = genId();
  const createdAt = new Date().toISOString();
  const data = {
    fromUserId: settlement.fromUserId,
    fromUserName: settlement.fromUserName,
    toUserId: settlement.toUserId,
    toUserName: settlement.toUserName,
    amount: settlement.amount,
    currency: settlement.currency,
    groupId: settlement.groupId || null,
    date: settlement.date,
    notes: settlement.notes || null,
    createdAt,
  };
  await setDoc(doc(db, 'settlements', id), data);
  return { ...data, id } as Settlement;
};

export const getSettlements = async (groupId?: string): Promise<Settlement[]> => {
  let q;
  if (groupId) {
    q = query(
      collection(db, 'settlements'),
      where('groupId', '==', groupId)
    );
  } else {
    q = query(collection(db, 'settlements'));
  }
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Settlement))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
};

// ============ BALANCE CALCULATIONS ============

export const calculateGroupBalances = async (
  groupId: string,
  currentUserId: string
): Promise<Balance[]> => {
  const group = await getGroup(groupId);
  if (!group) return [];

  const groupCurrency = group.defaultCurrency || 'USD';
  const expenses = await getExpenses(groupId);
  const settlements = await getSettlements(groupId);

  const balanceMap: Record<string, number> = {};
  group.members.forEach((m) => {
    balanceMap[m.userId] = 0;
  });

  for (const expense of expenses) {
    let rate = 1;
    const expCurrency = expense.currency || 'USD';
    if (expCurrency !== groupCurrency) {
      if (expense.fxToGroupRate != null && expense.fxToGroupRate > 0) {
        rate = expense.fxToGroupRate;
      } else {
        try {
          const res = await getRate(expCurrency, groupCurrency);
          rate = res.rate;
          await updateExpense(expense.id, { fxToGroupRate: rate, fxUpdatedAt: res.updatedAt }).catch(() => {});
        } catch {
          rate = 1;
        }
      }
    }
    for (const payer of expense.paidBy) {
      if (balanceMap[payer.userId] !== undefined) {
        balanceMap[payer.userId] += payer.amount * rate;
      }
    }
    for (const split of expense.splitBetween) {
      if (balanceMap[split.userId] !== undefined) {
        balanceMap[split.userId] -= split.amount * rate;
      }
    }
  }

  for (const s of settlements) {
    let settleRate = 1;
    if (s.currency && s.currency !== groupCurrency) {
      try {
        const res = await getRate(s.currency, groupCurrency);
        settleRate = res.rate;
      } catch {}
    }
    if (balanceMap[s.fromUserId] !== undefined) balanceMap[s.fromUserId] += s.amount * settleRate;
    if (balanceMap[s.toUserId] !== undefined) balanceMap[s.toUserId] -= s.amount * settleRate;
  }

  return group.members.map((m) => ({
    userId: m.userId,
    userName: m.name,
    amount: Math.round((balanceMap[m.userId] || 0) * 100) / 100,
    currency: groupCurrency,
  }));
};

export const calculateTotalBalance = async (currentUserId: string): Promise<number> => {
  const user = await getUser(currentUserId);
  const userCurrency = user?.defaultCurrency || 'USD';
  const groups = await getGroups();
  let total = 0;
  for (const group of groups) {
    const balances = await calculateGroupBalances(group.id, currentUserId);
    const myBalance = balances.find((b) => b.userId === currentUserId);
    if (!myBalance) continue;
    if (myBalance.currency === userCurrency) {
      total += myBalance.amount;
    } else {
      try {
        const { amount } = await import('./fx').then((m) => m.convert(myBalance.amount, myBalance.currency, userCurrency));
        total += amount;
      } catch {
        total += myBalance.amount;
      }
    }
  }
  return Math.round(total * 100) / 100;
};

const getNextRecurringDate = (dateStr: string, interval: RecurringInterval | null | undefined): string | null => {
  if (!interval) return null;
  if (!dateStr) return null;
  const base = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;

  const d = new Date(base.getTime());
  switch (interval) {
    case 'daily':
      d.setDate(d.getDate() + 1);
      break;
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + 1);
      break;
    case 'yearly':
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      return null;
  }
  return d.toISOString().split('T')[0];
};

/**
 * Generate next occurrences for recurring expenses created by the given user.
 * For each series, only the latest expense keeps isRecurring=true; older ones are flipped to false.
 * Runs at app startup; idempotent per day (per series it will create at most one new expense per run).
 */
export const generateRecurringExpensesForUser = async (currentUserId: string): Promise<number> => {
  const todayStr = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, 'expenses'),
    where('createdBy', '==', currentUserId),
    where('isRecurring', '==', true)
  );
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  let createdCount = 0;

  for (const docSnap of snap.docs) {
    const data = { id: docSnap.id, ...docSnap.data() } as Expense;
    const nextDate = getNextRecurringDate(data.date, data.recurringInterval);
    if (!nextDate) continue;
    if (nextDate > todayStr) continue;

    const { id, createdAt, updatedAt, ...rest } = data as any;
    const input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'> = {
      ...(rest as any),
      date: nextDate,
    };

    const created = await createExpense(input);

    // Mark previous instance as non-recurring so the series advances.
    await updateExpense(data.id, { isRecurring: false });

    createdCount += 1;
  }

  return createdCount;
};

export const simplifyDebts = (balances: Balance[]): DebtSimplification[] => {
  const currency = balances[0]?.currency || 'USD';
  const debtors: { userId: string; userName: string; amount: number }[] = [];
  const creditors: { userId: string; userName: string; amount: number }[] = [];

  balances.forEach((b) => {
    if (b.amount < -0.01) debtors.push({ userId: b.userId, userName: b.userName, amount: -b.amount });
    else if (b.amount > 0.01) creditors.push({ userId: b.userId, userName: b.userName, amount: b.amount });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const result: DebtSimplification[] = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount);
    if (amount > 0.01) {
      result.push({
        from: debtors[i].userId,
        fromName: debtors[i].userName,
        to: creditors[j].userId,
        toName: creditors[j].userName,
        amount: Math.round(amount * 100) / 100,
        currency,
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return result;
};

/**
 * Compute friend balances from ledger (expenses + settlements) per group.
 * Balance from currentUser POV: positive = friend owes me.
 * All amounts returned in currentUser.defaultCurrency.
 */
export const getComputedFriendBalances = async (
  currentUserId: string,
  friendIds: string[]
): Promise<Record<string, number>> => {
  const result: Record<string, number> = {};
  friendIds.forEach((id) => { result[id] = 0; });

  const user = await getUser(currentUserId);
  const userCurrency = user?.defaultCurrency || 'USD';
  const { convert } = await import('./fx');

  const groups = await getGroups();
  for (const group of groups) {
    const memberIds = new Set(group.members.map((m) => m.userId));
    if (!memberIds.has(currentUserId)) continue;

    const balances = await calculateGroupBalances(group.id, currentUserId);
    const debts = simplifyDebts(balances);
    const groupCurrency = balances[0]?.currency || group.defaultCurrency || 'USD';

    for (const d of debts) {
      let amountInUser = d.amount;
      if (groupCurrency !== userCurrency) {
        try {
          const { amount } = await convert(d.amount, groupCurrency, userCurrency);
          amountInUser = amount;
        } catch {}
      }
      const from = d.from;
      const to = d.to;
      if (from === currentUserId && friendIds.includes(to)) {
        result[to] = (result[to] ?? 0) - amountInUser;
      } else if (to === currentUserId && friendIds.includes(from)) {
        result[from] = (result[from] ?? 0) + amountInUser;
      }
    }
  }

  Object.keys(result).forEach((k) => {
    result[k] = Math.round((result[k] ?? 0) * 100) / 100;
  });
  return result;
};

// ============ SEED DATA ============

export const seedDemoData = async (
  currentUserId: string,
  currentUserName: string
): Promise<void> => {
  // Check if data already exists
  const existingGroups = await getGroups();
  if (existingGroups.length > 0) return;

  const friendIds = [genId(), genId(), genId(), genId()];
  const friends = [
    { name: 'Alice Johnson', email: 'alice@example.com', phone: '+1 555-0101' },
    { name: 'Bob Smith', email: 'bob@example.com', phone: '+1 555-0102' },
    { name: 'Carol Davis', email: 'carol@example.com', phone: '+1 555-0103' },
    { name: 'David Wilson', email: 'david@example.com', phone: '+1 555-0104' },
  ];

  for (let i = 0; i < friends.length; i++) {
    await addFriend({
      userId: currentUserId,
      friendId: friendIds[i],
      friendName: friends[i].name,
      friendEmail: friends[i].email,
      friendPhone: friends[i].phone,
      balance: 0,
      currency: 'USD',
    });
  }

  const apartmentGroup = await createGroup({
    name: 'Apartment 4B',
    type: 'home',
    members: [
      { id: '', userId: currentUserId, name: currentUserName, email: 'you@example.com' },
      { id: '', userId: friendIds[0], name: friends[0].name, email: friends[0].email },
      { id: '', userId: friendIds[1], name: friends[1].name, email: friends[1].email },
    ],
    simplifyDebts: true,
    defaultCurrency: 'USD',
  });

  const tripGroup = await createGroup({
    name: 'Europe Trip 2026',
    type: 'trip',
    members: [
      { id: '', userId: currentUserId, name: currentUserName, email: 'you@example.com' },
      { id: '', userId: friendIds[0], name: friends[0].name, email: friends[0].email },
      { id: '', userId: friendIds[2], name: friends[2].name, email: friends[2].email },
      { id: '', userId: friendIds[3], name: friends[3].name, email: friends[3].email },
    ],
    simplifyDebts: true,
    defaultCurrency: 'EUR',
  });

  const demoExpenses: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>[] = [
    {
      groupId: apartmentGroup.id, description: 'Monthly Rent', amount: 2400, currency: 'USD', category: 'rent',
      paidBy: [{ userId: currentUserId, userName: currentUserName, amount: 2400 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 800 },
        { userId: friendIds[0], userName: friends[0].name, amount: 800 },
        { userId: friendIds[1], userName: friends[1].name, amount: 800 },
      ],
      splitType: 'equal', date: '2026-02-01', isRecurring: true, recurringInterval: 'monthly', createdBy: currentUserId,
    },
    {
      groupId: apartmentGroup.id, description: 'Electricity Bill', amount: 145.50, currency: 'USD', category: 'electricity',
      paidBy: [{ userId: friendIds[0], userName: friends[0].name, amount: 145.50 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 48.50 },
        { userId: friendIds[0], userName: friends[0].name, amount: 48.50 },
        { userId: friendIds[1], userName: friends[1].name, amount: 48.50 },
      ],
      splitType: 'equal', date: '2026-02-05', isRecurring: false, createdBy: friendIds[0],
    },
    {
      groupId: apartmentGroup.id, description: 'Groceries - Whole Foods', amount: 87.30, currency: 'USD', category: 'groceries',
      paidBy: [{ userId: currentUserId, userName: currentUserName, amount: 87.30 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 29.10 },
        { userId: friendIds[0], userName: friends[0].name, amount: 29.10 },
        { userId: friendIds[1], userName: friends[1].name, amount: 29.10 },
      ],
      splitType: 'equal', date: '2026-02-15', isRecurring: false, createdBy: currentUserId,
    },
    {
      groupId: tripGroup.id, description: 'Hotel in Paris', amount: 480, currency: 'EUR', category: 'hotel',
      paidBy: [{ userId: friendIds[2], userName: friends[2].name, amount: 480 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 120 },
        { userId: friendIds[0], userName: friends[0].name, amount: 120 },
        { userId: friendIds[2], userName: friends[2].name, amount: 120 },
        { userId: friendIds[3], userName: friends[3].name, amount: 120 },
      ],
      splitType: 'equal', date: '2026-02-10', isRecurring: false, createdBy: friendIds[2],
    },
    {
      groupId: tripGroup.id, description: 'Dinner at Le Comptoir', amount: 220, currency: 'EUR', category: 'food',
      paidBy: [{ userId: currentUserId, userName: currentUserName, amount: 220 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 55 },
        { userId: friendIds[0], userName: friends[0].name, amount: 55 },
        { userId: friendIds[2], userName: friends[2].name, amount: 55 },
        { userId: friendIds[3], userName: friends[3].name, amount: 55 },
      ],
      splitType: 'equal', date: '2026-02-11', isRecurring: false, createdBy: currentUserId,
    },
    {
      groupId: tripGroup.id, description: 'Train tickets', amount: 160, currency: 'EUR', category: 'transport',
      paidBy: [{ userId: friendIds[3], userName: friends[3].name, amount: 160 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 40 },
        { userId: friendIds[0], userName: friends[0].name, amount: 40 },
        { userId: friendIds[2], userName: friends[2].name, amount: 40 },
        { userId: friendIds[3], userName: friends[3].name, amount: 40 },
      ],
      splitType: 'equal', date: '2026-02-12', isRecurring: false, createdBy: friendIds[3],
    },
    {
      groupId: apartmentGroup.id, description: 'Internet Bill', amount: 79.99, currency: 'USD', category: 'internet',
      paidBy: [{ userId: friendIds[1], userName: friends[1].name, amount: 79.99 }],
      splitBetween: [
        { userId: currentUserId, userName: currentUserName, amount: 26.66 },
        { userId: friendIds[0], userName: friends[0].name, amount: 26.66 },
        { userId: friendIds[1], userName: friends[1].name, amount: 26.67 },
      ],
      splitType: 'equal', date: '2026-02-08', isRecurring: true, recurringInterval: 'monthly', createdBy: friendIds[1],
    },
  ];

  for (const expense of demoExpenses) {
    const created = await createExpense(expense);
    await createActivity({
      type: 'expense_added',
      description: `added "${expense.description}"`,
      amount: expense.amount,
      currency: expense.currency,
      groupId: expense.groupId,
      groupName: expense.groupId === apartmentGroup.id ? 'Apartment 4B' : 'Europe Trip 2026',
      expenseId: created.id,
      createdBy: expense.createdBy,
      createdByName: expense.createdBy === currentUserId ? currentUserName :
        friends.find((_, i) => friendIds[i] === expense.createdBy)?.name || 'Unknown',
    });
  }
};

// ============ REMOVED (no longer needed) ============
// getDatabase, initDatabase, simpleHash, verifyPassword — handled by Firebase Auth
