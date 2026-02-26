import {
  collection, doc, getDoc, getDocs, deleteDoc,
  query, where, orderBy, limit, setDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import * as dbService from './database';

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
  role?: 'admin' | 'user';
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
  const [users, groups, expenses, settlements, activities] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'groups')),
    getDocs(collection(db, 'expenses')),
    getDocs(collection(db, 'settlements')),
    getDocs(collection(db, 'activities')),
  ]);

  let totalMoneyTracked = 0;
  expenses.docs.forEach((d) => { totalMoneyTracked += d.data().amount || 0; });

  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  let recentSignups = 0;
  let activeUsersToday = 0;
  users.docs.forEach((d) => {
    const created = new Date(d.data().createdAt).getTime();
    if (created >= oneDayAgo) { recentSignups++; activeUsersToday++; }
  });

  return {
    totalUsers: users.size,
    totalGroups: groups.size,
    totalExpenses: expenses.size,
    totalSettlements: settlements.size,
    totalMoneyTracked,
    totalActivities: activities.size,
    recentSignups,
    activeUsersToday,
  };
};

// ============ USER MANAGEMENT ============

export const getAdminUsers = async (search?: string): Promise<AdminUser[]> => {
  const usersSnap = await getDocs(collection(db, 'users'));
  const expensesSnap = await getDocs(collection(db, 'expenses'));
  const groupsSnap = await getDocs(collection(db, 'groups'));

  // Pre-compute per-user stats
  const expenseCountMap: Record<string, number> = {};
  const totalSpentMap: Record<string, number> = {};
  expensesSnap.docs.forEach((d) => {
    const data = d.data();
    const paidBy = data.paidBy || [];
    for (const p of paidBy) {
      expenseCountMap[p.userId] = (expenseCountMap[p.userId] || 0) + 1;
      totalSpentMap[p.userId] = (totalSpentMap[p.userId] || 0) + (p.amount || 0);
    }
  });

  const groupCountMap: Record<string, number> = {};
  groupsSnap.docs.forEach((d) => {
    const members = d.data().members || [];
    for (const m of members) {
      groupCountMap[m.userId] = (groupCountMap[m.userId] || 0) + 1;
    }
  });

  let users = usersSnap.docs.map((d) => {
    const data = d.data();
    const rawRole = (data.role ?? 'user') as string;
    const normRole = typeof rawRole === 'string' && rawRole.toLowerCase() === 'admin' ? 'admin' : 'user';
    return {
      id: d.id,
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || null,
      defaultCurrency: data.defaultCurrency || 'USD',
      createdAt: data.createdAt || '',
      groupCount: groupCountMap[d.id] || 0,
      expenseCount: expenseCountMap[d.id] || 0,
      totalSpent: totalSpentMap[d.id] || 0,
      isSuspended: false,
      tags: '',
      role: normRole,
    };
  });

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    users = users.filter((u) =>
      u.name.toLowerCase().includes(s) ||
      u.email.toLowerCase().includes(s) ||
      (u.phone && u.phone.includes(s))
    );
  }

  users.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return users;
};

export const deleteUserAdmin = async (
  userId: string,
  options?: { adminUserId: string; adminUserName: string; targetUserName?: string }
): Promise<void> => {
  const friendsSnap = await getDocs(query(collection(db, 'friends'), where('userId', '==', userId)));
  for (const d of friendsSnap.docs) await deleteDoc(d.ref);
  const friendOfSnap = await getDocs(query(collection(db, 'friends'), where('friendId', '==', userId)));
  for (const d of friendOfSnap.docs) await deleteDoc(d.ref);
  await deleteDoc(doc(db, 'users', userId));

  if (options?.adminUserId) {
    await dbService.createActivity({
      type: 'admin_user_deleted',
      description: `Admin ${options.adminUserName} deleted user ${options.targetUserName || userId}`,
      createdBy: options.adminUserId,
      createdByName: options.adminUserName,
    });
  }
};

export const getUserExpenseHistory = async (userId: string): Promise<any[]> => {
  const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
  return expensesSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((e: any) => e.paidBy?.some((p: any) => p.userId === userId))
    .slice(0, 50);
};

// ============ GROUP MANAGEMENT ============

export const getAdminGroups = async (search?: string): Promise<AdminGroup[]> => {
  const groupsSnap = await getDocs(query(collection(db, 'groups'), orderBy('updatedAt', 'desc')));
  const expensesSnap = await getDocs(collection(db, 'expenses'));

  // Pre-compute per-group expense stats
  const groupExpenseCount: Record<string, number> = {};
  const groupTotalAmount: Record<string, number> = {};
  expensesSnap.docs.forEach((d) => {
    const gid = d.data().groupId;
    if (gid) {
      groupExpenseCount[gid] = (groupExpenseCount[gid] || 0) + 1;
      groupTotalAmount[gid] = (groupTotalAmount[gid] || 0) + (d.data().amount || 0);
    }
  });

  let groups = groupsSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      name: data.name || '',
      type: data.type || 'other',
      memberCount: (data.members || []).length,
      expenseCount: groupExpenseCount[d.id] || 0,
      totalAmount: groupTotalAmount[d.id] || 0,
      defaultCurrency: data.defaultCurrency || 'USD',
      createdAt: data.createdAt || '',
      updatedAt: data.updatedAt || '',
    };
  });

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    groups = groups.filter((g) => g.name.toLowerCase().includes(s));
  }

  return groups;
};

export const deleteGroupAdmin = async (
  groupId: string,
  options?: { adminUserId: string; adminUserName: string; groupName?: string }
): Promise<void> => {
  await deleteDoc(doc(db, 'groups', groupId));
  if (options?.adminUserId) {
    await dbService.createActivity({
      type: 'admin_group_deleted',
      description: `Admin ${options.adminUserName} deleted group "${options.groupName || groupId}"`,
      createdBy: options.adminUserId,
      createdByName: options.adminUserName,
    });
  }
};

// ============ EXPENSE OVERSIGHT ============

export const getAdminExpenses = async (search?: string, category?: string): Promise<AdminExpense[]> => {
  const expensesSnap = await getDocs(query(collection(db, 'expenses'), orderBy('date', 'desc')));
  const groupsSnap = await getDocs(collection(db, 'groups'));

  const groupNameMap: Record<string, string> = {};
  groupsSnap.docs.forEach((d) => { groupNameMap[d.id] = d.data().name; });

  let expenses = expensesSnap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      description: data.description || '',
      amount: data.amount || 0,
      currency: data.currency || 'USD',
      category: data.category || 'general',
      splitType: data.splitType || 'equal',
      date: data.date || '',
      groupName: data.groupId ? (groupNameMap[data.groupId] || null) : null,
      createdByName: data.paidBy?.[0]?.userName || 'Unknown',
      createdAt: data.createdAt || '',
      isFlagged: (data.amount || 0) > 10000,
    };
  });

  if (search && search.trim()) {
    const s = search.trim().toLowerCase();
    expenses = expenses.filter((e) => e.description.toLowerCase().includes(s));
  }
  if (category && category !== 'all') {
    expenses = expenses.filter((e) => e.category === category);
  }

  return expenses.slice(0, 100);
};

export const deleteExpenseAdmin = async (
  expenseId: string,
  options?: { adminUserId: string; adminUserName: string; description?: string }
): Promise<void> => {
  await deleteDoc(doc(db, 'expenses', expenseId));
  if (options?.adminUserId) {
    await dbService.createActivity({
      type: 'admin_expense_deleted',
      description: `Admin ${options.adminUserName} deleted expense "${options.description || expenseId}"`,
      createdBy: options.adminUserId,
      createdByName: options.adminUserName,
    });
  }
};

export const setUserRole = async (
  userId: string,
  role: 'admin' | 'user',
  adminUserId: string,
  adminUserName: string,
  targetUserName?: string
): Promise<void> => {
  await dbService.updateUser(userId, { role });
  await dbService.createActivity({
    type: 'admin_role_changed',
    description: `Admin ${adminUserName} set ${targetUserName || userId} as ${role}`,
    createdBy: adminUserId,
    createdByName: adminUserName,
  });
};

// ============ ANALYTICS ============

export const getTopCategories = async (): Promise<TopCategory[]> => {
  const snap = await getDocs(collection(db, 'expenses'));
  const map: Record<string, { count: number; total: number }> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const cat = data.category || 'general';
    if (!map[cat]) map[cat] = { count: 0, total: 0 };
    map[cat].count++;
    map[cat].total += data.amount || 0;
  });
  return Object.entries(map)
    .map(([category, { count, total }]) => ({ category, count, total }))
    .sort((a, b) => b.total - a.total);
};

export const getDailySignups = async (): Promise<DailySignup[]> => {
  const snap = await getDocs(collection(db, 'users'));
  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const date = (d.data().createdAt || '').substring(0, 10);
    if (date) map[date] = (map[date] || 0) + 1;
  });
  return Object.entries(map)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 30);
};

export const getMonthlyExpenses = async (): Promise<{ month: string; total: number; count: number }[]> => {
  const snap = await getDocs(collection(db, 'expenses'));
  const map: Record<string, { total: number; count: number }> = {};
  snap.docs.forEach((d) => {
    const data = d.data();
    const month = (data.date || '').substring(0, 7);
    if (month) {
      if (!map[month]) map[month] = { total: 0, count: 0 };
      map[month].total += data.amount || 0;
      map[month].count++;
    }
  });
  return Object.entries(map)
    .map(([month, { total, count }]) => ({ month, total, count }))
    .sort((a, b) => b.month.localeCompare(a.month))
    .slice(0, 12);
};

export const getTopUsers = async (limitCount: number = 10): Promise<{ name: string; email: string; total: number; count: number }[]> => {
  const usersSnap = await getDocs(collection(db, 'users'));
  const expensesSnap = await getDocs(collection(db, 'expenses'));

  const userMap: Record<string, { name: string; email: string; total: number; count: number }> = {};
  usersSnap.docs.forEach((d) => {
    const data = d.data();
    userMap[d.id] = { name: data.name, email: data.email, total: 0, count: 0 };
  });

  expensesSnap.docs.forEach((d) => {
    const paidBy = d.data().paidBy || [];
    for (const p of paidBy) {
      if (userMap[p.userId]) {
        userMap[p.userId].total += p.amount || 0;
        userMap[p.userId].count++;
      }
    }
  });

  return Object.values(userMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, limitCount);
};

export const getTopGroups = async (limitCount: number = 10): Promise<{ name: string; type: string; total: number; members: number }[]> => {
  const groupsSnap = await getDocs(collection(db, 'groups'));
  const expensesSnap = await getDocs(collection(db, 'expenses'));

  const groupTotalMap: Record<string, number> = {};
  expensesSnap.docs.forEach((d) => {
    const gid = d.data().groupId;
    if (gid) groupTotalMap[gid] = (groupTotalMap[gid] || 0) + (d.data().amount || 0);
  });

  return groupsSnap.docs
    .map((d) => {
      const data = d.data();
      return {
        name: data.name,
        type: data.type || 'other',
        total: groupTotalMap[d.id] || 0,
        members: (data.members || []).length,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, limitCount);
};

export const getCurrencyDistribution = async (): Promise<{ currency: string; count: number }[]> => {
  const snap = await getDocs(collection(db, 'expenses'));
  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const cur = d.data().currency || 'USD';
    map[cur] = (map[cur] || 0) + 1;
  });
  return Object.entries(map)
    .map(([currency, count]) => ({ currency, count }))
    .sort((a, b) => b.count - a.count);
};

export const getSplitTypeDistribution = async (): Promise<{ splitType: string; count: number }[]> => {
  const snap = await getDocs(collection(db, 'expenses'));
  const map: Record<string, number> = {};
  snap.docs.forEach((d) => {
    const st = d.data().splitType || 'equal';
    map[st] = (map[st] || 0) + 1;
  });
  return Object.entries(map)
    .map(([splitType, count]) => ({ splitType, count }))
    .sort((a, b) => b.count - a.count);
};

// ============ ACTIVITY LOG ============

export const getAdminActivityLog = async (limitCount: number = 100): Promise<AdminActivity[]> => {
  const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      type: data.type,
      description: data.description,
      amount: data.amount || null,
      currency: data.currency || null,
      groupName: data.groupName || null,
      createdByName: data.createdByName || 'Unknown',
      createdAt: data.createdAt || '',
    };
  });
};

// ============ SYSTEM HEALTH ============

export const getSystemHealth = async (): Promise<{
  tables: { name: string; rows: number }[];
  dbSize: string;
  totalRecords: number;
}> => {
  const collectionNames = ['users', 'friends', 'groups', 'expenses', 'activities', 'settlements'];
  const tables: { name: string; rows: number }[] = [];
  let totalRecords = 0;

  for (const name of collectionNames) {
    const snap = await getDocs(collection(db, name));
    tables.push({ name, rows: snap.size });
    totalRecords += snap.size;
  }

  return {
    tables,
    dbSize: `${(totalRecords * 0.5).toFixed(1)} KB (estimated)`,
    totalRecords,
  };
};

// ============ ADMIN AUTH ============

const ADMIN_CODE = 'admin2026';

export const verifyAdminAccess = (code: string): boolean => {
  return code === ADMIN_CODE;
};

// For future: check Firebase custom claims
export const checkAdminClaim = async (): Promise<boolean> => {
  try {
    const { auth: firebaseAuth } = await import('./firebase');
    const user = firebaseAuth.currentUser;
    if (!user) return false;
    const token = await user.getIdTokenResult();
    return token.claims.admin === true;
  } catch {
    return false;
  }
};
