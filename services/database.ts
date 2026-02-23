import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import {
  User, Friend, Group, GroupMember, Expense, ExpensePayer,
  ExpenseSplit, Activity, Settlement, SplitType, ExpenseCategory,
  GroupType, Balance, DebtSimplification,
} from '@/types';

let db: SQLite.SQLiteDatabase;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('splitwise.db');
    await initDatabase(db);
  }
  return db;
};

const initDatabase = async (database: SQLite.SQLiteDatabase) => {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      phone TEXT,
      password_hash TEXT,
      avatar_url TEXT,
      default_currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS friends (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      friend_id TEXT NOT NULL,
      friend_name TEXT NOT NULL,
      friend_email TEXT,
      friend_phone TEXT,
      friend_avatar_url TEXT,
      balance REAL DEFAULT 0,
      currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT DEFAULT 'other',
      image_url TEXT,
      simplify_debts INTEGER DEFAULT 0,
      default_currency TEXT DEFAULT 'USD',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      avatar_url TEXT,
      FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      group_id TEXT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      category TEXT DEFAULT 'general',
      split_type TEXT DEFAULT 'equal',
      date TEXT NOT NULL,
      notes TEXT,
      receipt_url TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_interval TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (group_id) REFERENCES groups_table(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_payers (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      amount REAL NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS expense_splits (
      id TEXT PRIMARY KEY,
      expense_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      amount REAL NOT NULL,
      percentage REAL,
      shares REAL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      description TEXT NOT NULL,
      amount REAL,
      currency TEXT,
      group_id TEXT,
      group_name TEXT,
      expense_id TEXT,
      created_by TEXT NOT NULL,
      created_by_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id TEXT PRIMARY KEY,
      from_user_id TEXT NOT NULL,
      from_user_name TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      to_user_name TEXT NOT NULL,
      amount REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      group_id TEXT,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_expenses_group ON expenses(group_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
    CREATE INDEX IF NOT EXISTS idx_expense_payers_expense ON expense_payers(expense_id);
    CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON expense_splits(expense_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);
    CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
    CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
  `);
};

// Simple hash for local-only password storage (not a real backend)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return 'h_' + Math.abs(hash).toString(36) + '_' + str.length;
};

// ============ USER OPERATIONS ============

export const createUser = async (user: Omit<User, 'id' | 'createdAt'> & { password?: string }): Promise<User> => {
  const database = await getDatabase();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  const passwordHash = user.password ? simpleHash(user.password) : null;
  await database.runAsync(
    'INSERT INTO users (id, email, name, phone, password_hash, avatar_url, default_currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, user.email, user.name, user.phone || null, passwordHash, user.avatarUrl || null, user.defaultCurrency || 'USD', createdAt]
  );
  return { id, email: user.email, name: user.name, phone: user.phone, defaultCurrency: user.defaultCurrency || 'USD', createdAt };
};

export const verifyPassword = async (email: string, password: string): Promise<boolean> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT password_hash FROM users WHERE email = ?', [email]);
  if (!row || !row.password_hash) return true;
  return row.password_hash === simpleHash(password);
};

export const getUser = async (id: string): Promise<User | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT * FROM users WHERE id = ?', [id]);
  if (!row) return null;
  return mapUser(row);
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT * FROM users WHERE email = ?', [email]);
  if (!row) return null;
  return mapUser(row);
};

export const updateUser = async (id: string, updates: Partial<User>): Promise<void> => {
  const database = await getDatabase();
  const fields: string[] = [];
  const values: any[] = [];
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.email !== undefined) { fields.push('email = ?'); values.push(updates.email); }
  if (updates.phone !== undefined) { fields.push('phone = ?'); values.push(updates.phone); }
  if (updates.avatarUrl !== undefined) { fields.push('avatar_url = ?'); values.push(updates.avatarUrl); }
  if (updates.defaultCurrency !== undefined) { fields.push('default_currency = ?'); values.push(updates.defaultCurrency); }
  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
};

// ============ FRIEND OPERATIONS ============

export const addFriend = async (friend: Omit<Friend, 'id' | 'createdAt'>): Promise<Friend> => {
  const database = await getDatabase();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  await database.runAsync(
    'INSERT INTO friends (id, user_id, friend_id, friend_name, friend_email, friend_phone, friend_avatar_url, balance, currency, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, friend.userId, friend.friendId, friend.friendName, friend.friendEmail || null, friend.friendPhone || null, friend.friendAvatarUrl || null, friend.balance || 0, friend.currency || 'USD', createdAt]
  );
  return { id, ...friend, createdAt };
};

export const getFriends = async (userId: string): Promise<Friend[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>('SELECT * FROM friends WHERE user_id = ? ORDER BY friend_name', [userId]);
  return rows.map(mapFriend);
};

export const updateFriendBalance = async (friendId: string, balance: number): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('UPDATE friends SET balance = ? WHERE id = ?', [balance, friendId]);
};

export const deleteFriend = async (friendId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM friends WHERE id = ?', [friendId]);
};

// ============ GROUP OPERATIONS ============

export const createGroup = async (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>): Promise<Group> => {
  const database = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  await database.runAsync(
    'INSERT INTO groups_table (id, name, type, image_url, simplify_debts, default_currency, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, group.name, group.type, group.imageUrl || null, group.simplifyDebts ? 1 : 0, group.defaultCurrency || 'USD', now, now]
  );

  for (const member of group.members) {
    const memberId = uuidv4();
    await database.runAsync(
      'INSERT INTO group_members (id, group_id, user_id, name, email, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [memberId, id, member.userId, member.name, member.email || null, member.phone || null, member.avatarUrl || null]
    );
  }

  return { ...group, id, createdAt: now, updatedAt: now };
};

export const getGroups = async (): Promise<Group[]> => {
  const database = await getDatabase();
  const groupRows = await database.getAllAsync<any>('SELECT * FROM groups_table ORDER BY updated_at DESC');
  const groups: Group[] = [];
  for (const row of groupRows) {
    const members = await database.getAllAsync<any>('SELECT * FROM group_members WHERE group_id = ?', [row.id]);
    groups.push(mapGroup(row, members));
  }
  return groups;
};

export const getGroup = async (id: string): Promise<Group | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT * FROM groups_table WHERE id = ?', [id]);
  if (!row) return null;
  const members = await database.getAllAsync<any>('SELECT * FROM group_members WHERE group_id = ?', [id]);
  return mapGroup(row, members);
};

export const updateGroup = async (id: string, updates: Partial<Group>): Promise<void> => {
  const database = await getDatabase();
  const fields: string[] = ['updated_at = ?'];
  const values: any[] = [new Date().toISOString()];
  if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
  if (updates.type !== undefined) { fields.push('type = ?'); values.push(updates.type); }
  if (updates.simplifyDebts !== undefined) { fields.push('simplify_debts = ?'); values.push(updates.simplifyDebts ? 1 : 0); }
  values.push(id);
  await database.runAsync(`UPDATE groups_table SET ${fields.join(', ')} WHERE id = ?`, values);
};

export const deleteGroup = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM groups_table WHERE id = ?', [id]);
};

export const addGroupMember = async (groupId: string, member: Omit<GroupMember, 'id'>): Promise<GroupMember> => {
  const database = await getDatabase();
  const id = uuidv4();
  await database.runAsync(
    'INSERT INTO group_members (id, group_id, user_id, name, email, phone, avatar_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, groupId, member.userId, member.name, member.email || null, member.phone || null, member.avatarUrl || null]
  );
  await database.runAsync('UPDATE groups_table SET updated_at = ? WHERE id = ?', [new Date().toISOString(), groupId]);
  return { id, ...member };
};

export const removeGroupMember = async (groupId: string, memberId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM group_members WHERE id = ? AND group_id = ?', [memberId, groupId]);
};

// ============ EXPENSE OPERATIONS ============

export const createExpense = async (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
  const database = await getDatabase();
  const id = uuidv4();
  const now = new Date().toISOString();

  await database.runAsync(
    `INSERT INTO expenses (id, group_id, description, amount, currency, category, split_type, date, notes, receipt_url, is_recurring, recurring_interval, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, expense.groupId || null, expense.description, expense.amount, expense.currency, expense.category,
     expense.splitType, expense.date, expense.notes || null, expense.receiptUrl || null,
     expense.isRecurring ? 1 : 0, expense.recurringInterval || null, expense.createdBy, now, now]
  );

  for (const payer of expense.paidBy) {
    await database.runAsync(
      'INSERT INTO expense_payers (id, expense_id, user_id, user_name, amount) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), id, payer.userId, payer.userName, payer.amount]
    );
  }

  for (const split of expense.splitBetween) {
    await database.runAsync(
      'INSERT INTO expense_splits (id, expense_id, user_id, user_name, amount, percentage, shares) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uuidv4(), id, split.userId, split.userName, split.amount, split.percentage || null, split.shares || null]
    );
  }

  if (expense.groupId) {
    await database.runAsync('UPDATE groups_table SET updated_at = ? WHERE id = ?', [now, expense.groupId]);
  }

  return { ...expense, id, createdAt: now, updatedAt: now };
};

export const getExpenses = async (groupId?: string): Promise<Expense[]> => {
  const database = await getDatabase();
  let rows: any[];
  if (groupId) {
    rows = await database.getAllAsync<any>('SELECT * FROM expenses WHERE group_id = ? ORDER BY date DESC', [groupId]);
  } else {
    rows = await database.getAllAsync<any>('SELECT * FROM expenses ORDER BY date DESC');
  }

  const expenses: Expense[] = [];
  for (const row of rows) {
    const payers = await database.getAllAsync<any>('SELECT * FROM expense_payers WHERE expense_id = ?', [row.id]);
    const splits = await database.getAllAsync<any>('SELECT * FROM expense_splits WHERE expense_id = ?', [row.id]);
    expenses.push(mapExpense(row, payers, splits));
  }
  return expenses;
};

export const getExpense = async (id: string): Promise<Expense | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<any>('SELECT * FROM expenses WHERE id = ?', [id]);
  if (!row) return null;
  const payers = await database.getAllAsync<any>('SELECT * FROM expense_payers WHERE expense_id = ?', [id]);
  const splits = await database.getAllAsync<any>('SELECT * FROM expense_splits WHERE expense_id = ?', [id]);
  return mapExpense(row, payers, splits);
};

export const deleteExpense = async (id: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
};

export const searchExpenses = async (query: string): Promise<Expense[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM expenses WHERE description LIKE ? ORDER BY date DESC',
    [`%${query}%`]
  );
  const expenses: Expense[] = [];
  for (const row of rows) {
    const payers = await database.getAllAsync<any>('SELECT * FROM expense_payers WHERE expense_id = ?', [row.id]);
    const splits = await database.getAllAsync<any>('SELECT * FROM expense_splits WHERE expense_id = ?', [row.id]);
    expenses.push(mapExpense(row, payers, splits));
  }
  return expenses;
};

export const getExpensesByCategory = async (): Promise<{ category: string; total: number }[]> => {
  const database = await getDatabase();
  return database.getAllAsync<{ category: string; total: number }>(
    'SELECT category, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC'
  );
};

export const getExpensesByMonth = async (): Promise<{ month: string; total: number }[]> => {
  const database = await getDatabase();
  return database.getAllAsync<{ month: string; total: number }>(
    `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12`
  );
};

// ============ ACTIVITY OPERATIONS ============

export const createActivity = async (activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> => {
  const database = await getDatabase();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO activities (id, type, description, amount, currency, group_id, group_name, expense_id, created_by, created_by_name, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, activity.type, activity.description, activity.amount || null, activity.currency || null,
     activity.groupId || null, activity.groupName || null, activity.expenseId || null,
     activity.createdBy, activity.createdByName, createdAt]
  );
  return { ...activity, id, createdAt };
};

export const getActivities = async (limit: number = 50): Promise<Activity[]> => {
  const database = await getDatabase();
  const rows = await database.getAllAsync<any>(
    'SELECT * FROM activities ORDER BY created_at DESC LIMIT ?', [limit]
  );
  return rows.map(mapActivity);
};

// ============ SETTLEMENT OPERATIONS ============

export const createSettlement = async (settlement: Omit<Settlement, 'id' | 'createdAt'>): Promise<Settlement> => {
  const database = await getDatabase();
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  await database.runAsync(
    `INSERT INTO settlements (id, from_user_id, from_user_name, to_user_id, to_user_name, amount, currency, group_id, date, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, settlement.fromUserId, settlement.fromUserName, settlement.toUserId, settlement.toUserName,
     settlement.amount, settlement.currency, settlement.groupId || null, settlement.date, settlement.notes || null, createdAt]
  );
  return { ...settlement, id, createdAt };
};

export const getSettlements = async (groupId?: string): Promise<Settlement[]> => {
  const database = await getDatabase();
  let rows: any[];
  if (groupId) {
    rows = await database.getAllAsync<any>('SELECT * FROM settlements WHERE group_id = ? ORDER BY date DESC', [groupId]);
  } else {
    rows = await database.getAllAsync<any>('SELECT * FROM settlements ORDER BY date DESC');
  }
  return rows.map(mapSettlement);
};

// ============ BALANCE CALCULATIONS ============

export const calculateGroupBalances = async (groupId: string, currentUserId: string): Promise<Balance[]> => {
  const database = await getDatabase();
  const members = await database.getAllAsync<any>('SELECT * FROM group_members WHERE group_id = ?', [groupId]);
  const expenses = await getExpenses(groupId);
  const settlements = await getSettlements(groupId);

  const balanceMap: Record<string, number> = {};
  members.forEach((m: any) => { balanceMap[m.user_id] = 0; });

  for (const expense of expenses) {
    for (const payer of expense.paidBy) {
      if (balanceMap[payer.userId] !== undefined) {
        balanceMap[payer.userId] += payer.amount;
      }
    }
    for (const split of expense.splitBetween) {
      if (balanceMap[split.userId] !== undefined) {
        balanceMap[split.userId] -= split.amount;
      }
    }
  }

  for (const s of settlements) {
    if (balanceMap[s.fromUserId] !== undefined) balanceMap[s.fromUserId] += s.amount;
    if (balanceMap[s.toUserId] !== undefined) balanceMap[s.toUserId] -= s.amount;
  }

  return members.map((m: any) => ({
    userId: m.user_id,
    userName: m.name,
    amount: balanceMap[m.user_id] || 0,
    currency: 'USD',
  }));
};

export const calculateTotalBalance = async (currentUserId: string): Promise<number> => {
  const groups = await getGroups();
  let total = 0;
  for (const group of groups) {
    const balances = await calculateGroupBalances(group.id, currentUserId);
    const myBalance = balances.find((b) => b.userId === currentUserId);
    if (myBalance) total += myBalance.amount;
  }
  return total;
};

export const simplifyDebts = (balances: Balance[]): DebtSimplification[] => {
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
        currency: 'USD',
      });
    }
    debtors[i].amount -= amount;
    creditors[j].amount -= amount;
    if (debtors[i].amount < 0.01) i++;
    if (creditors[j].amount < 0.01) j++;
  }

  return result;
};

// ============ SEED DATA ============

export const seedDemoData = async (currentUserId: string, currentUserName: string): Promise<void> => {
  const database = await getDatabase();
  const existing = await database.getFirstAsync<any>('SELECT COUNT(*) as count FROM groups_table');
  if (existing && existing.count > 0) return;

  const friendIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4()];
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
      { userId: currentUserId, name: currentUserName, email: 'you@example.com' },
      { userId: friendIds[0], name: friends[0].name, email: friends[0].email },
      { userId: friendIds[1], name: friends[1].name, email: friends[1].email },
    ],
    simplifyDebts: true,
    defaultCurrency: 'USD',
  });

  const tripGroup = await createGroup({
    name: 'Europe Trip 2026',
    type: 'trip',
    members: [
      { userId: currentUserId, name: currentUserName, email: 'you@example.com' },
      { userId: friendIds[0], name: friends[0].name, email: friends[0].email },
      { userId: friendIds[2], name: friends[2].name, email: friends[2].email },
      { userId: friendIds[3], name: friends[3].name, email: friends[3].email },
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

// ============ MAPPERS ============

const mapUser = (row: any): User => ({
  id: row.id,
  email: row.email,
  name: row.name,
  phone: row.phone,
  avatarUrl: row.avatar_url,
  defaultCurrency: row.default_currency,
  createdAt: row.created_at,
});

const mapFriend = (row: any): Friend => ({
  id: row.id,
  userId: row.user_id,
  friendId: row.friend_id,
  friendName: row.friend_name,
  friendEmail: row.friend_email || '',
  friendPhone: row.friend_phone || '',
  friendAvatarUrl: row.friend_avatar_url,
  balance: row.balance,
  currency: row.currency,
  createdAt: row.created_at,
});

const mapGroup = (row: any, memberRows: any[]): Group => ({
  id: row.id,
  name: row.name,
  type: row.type as GroupType,
  imageUrl: row.image_url,
  members: memberRows.map((m) => ({
    id: m.id,
    userId: m.user_id,
    name: m.name,
    email: m.email || '',
    phone: m.phone || '',
    avatarUrl: m.avatar_url,
  })),
  simplifyDebts: row.simplify_debts === 1,
  defaultCurrency: row.default_currency,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapExpense = (row: any, payerRows: any[], splitRows: any[]): Expense => ({
  id: row.id,
  groupId: row.group_id,
  description: row.description,
  amount: row.amount,
  currency: row.currency,
  category: row.category as ExpenseCategory,
  paidBy: payerRows.map((p) => ({
    userId: p.user_id,
    userName: p.user_name,
    amount: p.amount,
  })),
  splitBetween: splitRows.map((s) => ({
    userId: s.user_id,
    userName: s.user_name,
    amount: s.amount,
    percentage: s.percentage,
    shares: s.shares,
  })),
  splitType: row.split_type as SplitType,
  date: row.date,
  notes: row.notes,
  receiptUrl: row.receipt_url,
  isRecurring: row.is_recurring === 1,
  recurringInterval: row.recurring_interval,
  createdBy: row.created_by,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapActivity = (row: any): Activity => ({
  id: row.id,
  type: row.type,
  description: row.description,
  amount: row.amount,
  currency: row.currency,
  groupId: row.group_id,
  groupName: row.group_name,
  expenseId: row.expense_id,
  createdBy: row.created_by,
  createdByName: row.created_by_name,
  createdAt: row.created_at,
});

const mapSettlement = (row: any): Settlement => ({
  id: row.id,
  fromUserId: row.from_user_id,
  fromUserName: row.from_user_name,
  toUserId: row.to_user_id,
  toUserName: row.to_user_name,
  amount: row.amount,
  currency: row.currency,
  groupId: row.group_id,
  date: row.date,
  notes: row.notes,
  createdAt: row.created_at,
});
