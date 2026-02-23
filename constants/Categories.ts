import { ExpenseCategory } from '@/types';

export interface CategoryInfo {
  key: ExpenseCategory;
  label: string;
  icon: string;
  color: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { key: 'general', label: 'General', icon: 'receipt', color: '#636E72' },
  { key: 'food', label: 'Food & Dining', icon: 'restaurant', color: '#E17055' },
  { key: 'drinks', label: 'Drinks', icon: 'local-bar', color: '#A29BFE' },
  { key: 'groceries', label: 'Groceries', icon: 'shopping-cart', color: '#00B894' },
  { key: 'transport', label: 'Transport', icon: 'directions-car', color: '#0984E3' },
  { key: 'fuel', label: 'Fuel', icon: 'local-gas-station', color: '#FDCB6E' },
  { key: 'parking', label: 'Parking', icon: 'local-parking', color: '#6C5CE7' },
  { key: 'rent', label: 'Rent', icon: 'home', color: '#E84393' },
  { key: 'utilities', label: 'Utilities', icon: 'build', color: '#00CEC9' },
  { key: 'electricity', label: 'Electricity', icon: 'flash-on', color: '#FFEAA7' },
  { key: 'water', label: 'Water', icon: 'water-drop', color: '#74B9FF' },
  { key: 'internet', label: 'Internet', icon: 'wifi', color: '#A29BFE' },
  { key: 'phone', label: 'Phone', icon: 'phone-android', color: '#55EFC4' },
  { key: 'insurance', label: 'Insurance', icon: 'security', color: '#636E72' },
  { key: 'medical', label: 'Medical', icon: 'local-hospital', color: '#FF7675' },
  { key: 'clothing', label: 'Clothing', icon: 'checkroom', color: '#FD79A8' },
  { key: 'gifts', label: 'Gifts', icon: 'card-giftcard', color: '#E17055' },
  { key: 'entertainment', label: 'Entertainment', icon: 'celebration', color: '#6C5CE7' },
  { key: 'movies', label: 'Movies', icon: 'movie', color: '#E84393' },
  { key: 'music', label: 'Music', icon: 'music-note', color: '#00CEC9' },
  { key: 'sports', label: 'Sports', icon: 'sports-soccer', color: '#00B894' },
  { key: 'travel', label: 'Travel', icon: 'flight', color: '#0984E3' },
  { key: 'hotel', label: 'Hotel', icon: 'hotel', color: '#6C5CE7' },
  { key: 'flight', label: 'Flight', icon: 'flight-takeoff', color: '#74B9FF' },
  { key: 'taxi', label: 'Taxi', icon: 'local-taxi', color: '#FDCB6E' },
  { key: 'education', label: 'Education', icon: 'school', color: '#A29BFE' },
  { key: 'pets', label: 'Pets', icon: 'pets', color: '#E17055' },
  { key: 'home', label: 'Home', icon: 'home-repair-service', color: '#00CEC9' },
  { key: 'electronics', label: 'Electronics', icon: 'devices', color: '#636E72' },
  { key: 'cleaning', label: 'Cleaning', icon: 'cleaning-services', color: '#55EFC4' },
  { key: 'maintenance', label: 'Maintenance', icon: 'handyman', color: '#FDCB6E' },
  { key: 'subscriptions', label: 'Subscriptions', icon: 'subscriptions', color: '#E84393' },
  { key: 'other', label: 'Other', icon: 'more-horiz', color: '#B2BEC3' },
];

export const getCategoryInfo = (key: ExpenseCategory): CategoryInfo => {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
};
