import { getDatabase } from './database';

export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalSettlements: number;
  totalMoneyTracked: number;
  totalActivities: number;
  recentSignups: number;
  activeUsersToday: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  defaultCurrency: string;
  createdAt: string;
  groupCount: number;
  expenseCount: number;
  totalSpent: number;
  isSuspended: boolean;
  tags: string;
}

export interface AdminGroup {
  id: string;
  name: string;
  type: string;
  memberCount: number;
  expenseCount: number;
  totalAmount: number;
  defaultCurrency: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminExpense {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  splitType: string;
  date: string;
  groupName: string | null;
  createdByName: string;
  createdAt: string;
  isFlagged: boolean;
}

export interface TopCategory {
  category: string;
  count: number;
  total: number;
}

export interface DailySignup {
  date: string;
  count: number;
}

export interface AdminActivity {
  id: string;
  type: string;
  description: string;
  amount: number | null;
  currency: string | null;
  groupName: string | null;
  createdByName: string;
  createdAt: string;
}

// ============ DASHBOARD STATS ============

export const getAdminStats = async (): Promise<AdminStats> => {
  const db = await getDatabase();

  const users = await db.getFirstAsync<any>('SELECT COUNT(*) as c FROM users');
  const groups = await db.getFirstAsync<any>('SELECT COUNT(*) as c FROM groups_table');
  const expenses = await db.getFirstAsync<any>('SELECT COUNT(*) as c FROM expenses');
  const settlements = await db.getFirstAsync<any>('SELECT COUNT(*) as c FROM settlements');
  const moneyTracked = await db.getFirstAsync<any>('SELECT COALESCE(SUM(amount), 0) as total FROM expenses');
  const activities = await db.getFirstAsync<any>('SELECT COUNT(*) as c FROM activities');

  const recentSignups = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-24 hours')`
  );
  const activeToday = await db.getFirstAsync<any>(
    `SELECT COUNT(*) as c FROM users WHERE created_at >= datetime('now', '-1 day')`
  );

  return {
    totalUsers: users?.c || 0,
    totalGroups: groups?.c || 0,
    totalExpenses: expenses?.c || 0,
    totalSettlements: settlements?.c || 0,
    totalMoneyTracked: moneyTracked?.total || 0,
    totalActivities: activities?.c || 0,
    recentSignups: recentSignups?.c || 0,
    activeUsersToday: activeToday?.c || 0,
  };
};

// ============ USER MANAGEMENT ============

export const getAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  const db = await getDatabase();
  let query = `
    SELECT u.*,
      (SELECT COUNT(*) FROM group_members gm WHERE gm.user_id = u.id) as group_count,
      (SELECT COUNT(*) FROM expense_payers ep WHERE ep.user_id = u.id) as expense_count,
      (SELECT COALESCE(SUM(ep.amount), 0) FROM expense_payers ep WHERE ep.user_id = u.id) as total_spent
    FROM users u
  `;
  const params: any[] = [];

  if (search && search.trim()) {
    query += ` WHERE u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?`;
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  query += ' ORDER BY u.created_at DESC';
  const rows = await db.getAllAsync<any>(query, params);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    email: r.email,
    phone: r.phone,
    defaultCurrency: r.default_currency,
    createdAt: r.created_at,
    groupCount: r.group_count,
    expenseCount: r.expense_count,
    totalSpent: r.total_spent,
    isSuspended: false,
    tags: '',
  }));
};

export const deleteUserAdmin = async (userId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM expense_splits WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM expense_payers WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM group_members WHERE user_id = ?', [userId]);
  await db.runAsync('DELETE FROM friends WHERE user_id = ? OR friend_id = ?', [userId, userId]);
  await db.runAsync('DELETE FROM settlements WHERE from_user_id = ? OR to_user_id = ?', [userId, userId]);
  await db.runAsync('DELETE FROM users WHERE id = ?', [userId]);
};

export const getUserExpenseHistory = async (userId: string): Promise<any[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    `SELECT e.*, ep.amount as paid_amount
     FROM expenses e
     JOIN expense_payers ep ON ep.expense_id = e.id AND ep.user_id = ?
     ORDER BY e.date DESC LIMIT 50`,
    [userId]
  );
};

// ============ GROUP MANAGEMENT ============

export const getAdminGroups = async (search?: string): Promise<AdminGroup[]> => {
  const db = await getDatabase();
  let query = `
    SELECT g.*,
      (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as member_count,
      (SELECT COUNT(*) FROM expenses e WHERE e.group_id = g.id) as expense_count,
      (SELECT COALESCE(SUM(e.amount), 0) FROM expenses e WHERE e.group_id = g.id) as total_amount
    FROM groups_table g
  `;
  const params: any[] = [];

  if (search && search.trim()) {
    query += ` WHERE g.name LIKE ?`;
    params.push(`%${search.trim()}%`);
  }

  query += ' ORDER BY g.updated_at DESC';
  const rows = await db.getAllAsync<any>(query, params);

  return rows.map((r: any) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    memberCount: r.member_count,
    expenseCount: r.expense_count,
    totalAmount: r.total_amount,
    defaultCurrency: r.default_currency,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
};

export const deleteGroupAdmin = async (groupId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM groups_table WHERE id = ?', [groupId]);
};

// ============ EXPENSE OVERSIGHT ============

export const getAdminExpenses = async (search?: string, category?: string): Promise<AdminExpense[]> => {
  const db = await getDatabase();
  let query = `
    SELECT e.*,
      g.name as group_name,
      (SELECT ep.user_name FROM expense_payers ep WHERE ep.expense_id = e.id LIMIT 1) as payer_name
    FROM expenses e
    LEFT JOIN groups_table g ON g.id = e.group_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search && search.trim()) {
    query += ` AND e.description LIKE ?`;
    params.push(`%${search.trim()}%`);
  }
  if (category && category !== 'all') {
    query += ` AND e.category = ?`;
    params.push(category);
  }

  query += ' ORDER BY e.created_at DESC LIMIT 100';
  const rows = await db.getAllAsync<any>(query, params);

  return rows.map((r: any) => ({
    id: r.id,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    category: r.category,
    splitType: r.split_type,
    date: r.date,
    groupName: r.group_name,
    createdByName: r.payer_name || 'Unknown',
    createdAt: r.created_at,
    isFlagged: r.amount > 10000,
  }));
};

export const deleteExpenseAdmin = async (expenseId: string): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM expenses WHERE id = ?', [expenseId]);
};

// ============ ANALYTICS ============

export const getTopCategories = async (): Promise<TopCategory[]> => {
  const db = await getDatabase();
  return db.getAllAsync<TopCategory>(
    'SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses GROUP BY category ORDER BY total DESC'
  );
};

export const getDailySignups = async (): Promise<DailySignup[]> => {
  const db = await getDatabase();
  return db.getAllAsync<DailySignup>(
    `SELECT date(created_at) as date, COUNT(*) as count FROM users GROUP BY date(created_at) ORDER BY date DESC LIMIT 30`
  );
};

export const getMonthlyExpenses = async (): Promise<{ month: string; total: number; count: number }[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    `SELECT strftime('%Y-%m', date) as month, SUM(amount) as total, COUNT(*) as count
     FROM expenses GROUP BY month ORDER BY month DESC LIMIT 12`
  );
};

export const getTopUsers = async (limit: number = 10): Promise<{ name: string; email: string; total: number; count: number }[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    `SELECT u.name, u.email, COALESCE(SUM(ep.amount), 0) as total, COUNT(ep.id) as count
     FROM users u
     LEFT JOIN expense_payers ep ON ep.user_id = u.id
     GROUP BY u.id
     ORDER BY total DESC LIMIT ?`,
    [limit]
  );
};

export const getTopGroups = async (limit: number = 10): Promise<{ name: string; type: string; total: number; members: number }[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    `SELECT g.name, g.type,
      COALESCE((SELECT SUM(e.amount) FROM expenses e WHERE e.group_id = g.id), 0) as total,
      (SELECT COUNT(*) FROM group_members gm WHERE gm.group_id = g.id) as members
     FROM groups_table g
     ORDER BY total DESC LIMIT ?`,
    [limit]
  );
};

export const getCurrencyDistribution = async (): Promise<{ currency: string; count: number }[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    'SELECT currency, COUNT(*) as count FROM expenses GROUP BY currency ORDER BY count DESC'
  );
};

export const getSplitTypeDistribution = async (): Promise<{ splitType: string; count: number }[]> => {
  const db = await getDatabase();
  return db.getAllAsync<any>(
    'SELECT split_type as splitType, COUNT(*) as count FROM expenses GROUP BY split_type ORDER BY count DESC'
  );
};

// ============ ACTIVITY LOG ============

export const getAdminActivityLog = async (limit: number = 100): Promise<AdminActivity[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM activities ORDER BY created_at DESC LIMIT ?',
    [limit]
  );
  return rows.map((r: any) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amount: r.amount,
    currency: r.currency,
    groupName: r.group_name,
    createdByName: r.created_by_name,
    createdAt: r.created_at,
  }));
};

// ============ SYSTEM HEALTH ============

export const getSystemHealth = async (): Promise<{
  tables: { name: string; rows: number }[];
  dbSize: string;
  totalRecords: number;
}> => {
  const db = await getDatabase();

  const tableNames = ['users', 'friends', 'groups_table', 'group_members', 'expenses',
    'expense_payers', 'expense_splits', 'activities', 'settlements'];

  const tables: { name: string; rows: number }[] = [];
  let totalRecords = 0;

  for (const name of tableNames) {
    const result = await db.getFirstAsync<any>(`SELECT COUNT(*) as c FROM ${name}`);
    const count = result?.c || 0;
    tables.push({ name, rows: count });
    totalRecords += count;
  }

  return {
    tables,
    dbSize: `${(totalRecords * 0.5).toFixed(1)} KB`,
    totalRecords,
  };
};

// ============ ADMIN AUTH ============

const ADMIN_CODE = 'admin2026';

export const verifyAdminAccess = (code: string): boolean => {
  return code === ADMIN_CODE;
};
