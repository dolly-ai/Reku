// Definisi kategori pengeluaran dan pemasukan

export const EXPENSE_CATEGORIES = [
  { id: 'makanan',   name: 'Makanan',   color: '#FDDCB5', textColor: '#8B5E3C' },
  { id: 'transport',  name: 'Transport',  color: '#B5D8F0', textColor: '#2C5F7C' },
  { id: 'jajan',     name: 'Jajan',     color: '#F5C6D0', textColor: '#8B3A4A' },
  { id: 'minuman',   name: 'Minuman',   color: '#C5D8E8', textColor: '#3A5C8B' },
  { id: 'belanja',   name: 'Belanja',   color: '#B5E8D0', textColor: '#2C7C5F' },
  { id: 'tagihan',   name: 'Tagihan',   color: '#F0E0B5', textColor: '#7C6B2C' },
  { id: 'lainnya',   name: 'Lainnya',   color: '#D5D5D5', textColor: '#5A5A5A' },
];

export const INCOME_CATEGORIES = [
  { id: 'pemasukan', name: 'Pemasukan', color: '#A8E6CF', textColor: '#2C7C5F' },
];

export function getCategoryById(id) {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.id === id) || null;
}