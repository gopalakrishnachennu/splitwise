import { create } from 'zustand';
import { Friend } from '@/types';
import * as db from '@/services/database';
import { useAuthStore } from '@/stores/useAuthStore';

interface FriendState {
  friends: Friend[];
  isLoading: boolean;
  fetchFriends: (userId: string) => Promise<void>;
  addFriend: (friend: Omit<Friend, 'id' | 'createdAt'>) => Promise<Friend>;
  removeFriend: (friendId: string) => Promise<void>;
  updateBalance: (friendId: string, balance: number) => Promise<void>;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  friends: [],
  isLoading: false,

  fetchFriends: async (userId: string) => {
    set({ isLoading: true });
    try {
      const friends = await db.getFriends(userId);
      const friendIds = friends.filter((f) => (f.status ?? 'linked') === 'linked').map((f) => f.friendId);
      const computed = await db.getComputedFriendBalances(userId, friendIds);
      const userCurrency = useAuthStore.getState().user?.defaultCurrency || 'USD';
      const withBalances = friends.map((f) => ({
        ...f,
        balance: (f.status ?? 'linked') === 'linked' ? (computed[f.friendId] ?? 0) : 0,
        currency: userCurrency,
      }));
      set({ friends: withBalances, isLoading: false });
    } catch (error) {
      console.error('Error fetching friends:', error);
      set({ isLoading: false });
    }
  },

  addFriend: async (friend) => {
    const created = await db.addFriend(friend);
    const { friends } = get();
    set({ friends: [...friends, created] });
    return created;
  },

  removeFriend: async (friendId: string) => {
    await db.deleteFriend(friendId);
    const { friends } = get();
    set({ friends: friends.filter((f) => f.id !== friendId) });
  },

  updateBalance: async (friendId: string, balance: number) => {
    await db.updateFriendBalance(friendId, balance);
    const { friends } = get();
    set({
      friends: friends.map((f) =>
        f.id === friendId ? { ...f, balance } : f
      ),
    });
  },
}));
