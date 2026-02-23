import { create } from 'zustand';
import { Group, Balance, DebtSimplification } from '@/types';
import * as db from '@/services/database';

interface GroupState {
  groups: Group[];
  currentGroup: Group | null;
  balances: Balance[];
  debts: DebtSimplification[];
  isLoading: boolean;
  fetchGroups: () => Promise<void>;
  fetchGroup: (id: string) => Promise<void>;
  fetchBalances: (groupId: string, currentUserId: string) => Promise<void>;
  createGroup: (group: Omit<Group, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Group>;
  updateGroup: (id: string, updates: Partial<Group>) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  addMember: (groupId: string, member: { userId: string; name: string; email: string }) => Promise<void>;
  removeMember: (groupId: string, memberId: string) => Promise<void>;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  groups: [],
  currentGroup: null,
  balances: [],
  debts: [],
  isLoading: false,

  fetchGroups: async () => {
    set({ isLoading: true });
    try {
      const groups = await db.getGroups();
      set({ groups, isLoading: false });
    } catch (error) {
      console.error('Error fetching groups:', error);
      set({ isLoading: false });
    }
  },

  fetchGroup: async (id: string) => {
    try {
      const group = await db.getGroup(id);
      set({ currentGroup: group });
    } catch (error) {
      console.error('Error fetching group:', error);
    }
  },

  fetchBalances: async (groupId: string, currentUserId: string) => {
    try {
      const balances = await db.calculateGroupBalances(groupId, currentUserId);
      const debts = db.simplifyDebts(balances);
      set({ balances, debts });
    } catch (error) {
      console.error('Error calculating balances:', error);
    }
  },

  createGroup: async (group) => {
    const created = await db.createGroup(group);
    const { groups } = get();
    set({ groups: [created, ...groups] });
    return created;
  },

  updateGroup: async (id, updates) => {
    await db.updateGroup(id, updates);
    const { groups } = get();
    set({
      groups: groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      currentGroup: get().currentGroup?.id === id
        ? { ...get().currentGroup!, ...updates }
        : get().currentGroup,
    });
  },

  deleteGroup: async (id) => {
    await db.deleteGroup(id);
    const { groups } = get();
    set({ groups: groups.filter((g) => g.id !== id) });
  },

  addMember: async (groupId, member) => {
    const added = await db.addGroupMember(groupId, member);
    await get().fetchGroup(groupId);
  },

  removeMember: async (groupId, memberId) => {
    await db.removeGroupMember(groupId, memberId);
    await get().fetchGroup(groupId);
  },
}));
