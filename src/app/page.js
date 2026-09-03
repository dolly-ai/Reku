'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getTransactions, getBudget, getUser } from '@/lib/storage';
import { calculateStreak, getWeekStart, getTodayString } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/components/HomeScreen';
import AddTransaction from '@/components/AddTransaction';
import TransactionList from '@/components/TransactionList';
import SummaryScreen from '@/components/SummaryScreen';
import SettingScreen from '@/components/SettingScreen';
import Toast from '@/components/Toast';

export default function Home() {
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudgetState] = useState(null);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState('');
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Muat data dari Supabase saat pertama kali
  useEffect(() => {
    async function loadData() {
      const txs = await getTransactions();
      const bgt = await getBudget();
      const usr = await getUser();
      
      setTransactions(txs);
      setBudgetState(bgt);
      if (usr.name) setUserName(usr.name);
      
      setMounted(true);
    }
    loadData();
  }, []);

  // Hitung ulang streak setiap kali transaksi atau budget berubah
  useEffect(() => {
    setStreak(calculateStreak(transactions, budget));
  }, [transactions, budget]);

  // Daftarkan service worker untuk PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  const handleSaveTransaction = useCallback(async (newTransactions, tx) => {
    setTransactions(newTransactions);
    // Muat ulang nama user (bisa saja baru di-set di settings)
    const user = await getUser();
    if (user.name) setUserName(user.name);

    // Cek alert budget
    if (budget && tx.type === 'expense') {
      const today = getTodayString();
      let expenses;
      if (budget.period === 'daily') {
        expenses = newTransactions
          .filter(t => t.type === 'expense' && t.date === today)
          .reduce((s, t) => s + t.amount, 0);
      } else {
        const ws = getWeekStart(today);
        expenses = newTransactions
          .filter(t => t.type === 'expense' && t.date >= ws && t.date <= today)
          .reduce((s, t) => s + t.amount, 0);
      }
      const pct = (expenses / budget.amount) * 100;
      if (pct >= 100) {
        setToast({ message: 'Budget sudah terlampaui!', type: 'danger' });
      } else if (pct >= 80) {
        setToast({ message: 'Pengeluaran mendekati batas budget', type: 'warning' });
      } else {
        setToast({ message: 'Transaksi tersimpan', type: 'success' });
      }
    } else {
      setToast({ message: tx.type === 'income' ? 'Pemasukan dicatat' : 'Transaksi tersimpan', type: 'success' });
    }
    setActiveTab('home');
  }, [budget]);

  const handleDeleteTransaction = useCallback((newTransactions) => {
    setTransactions(newTransactions);
  }, []);

  const handleBudgetChange = useCallback((newBudget) => {
    setBudgetState(newBudget);
  }, []);

  const handleUserNameChange = useCallback((name) => {
    setUserName(name);
  }, []);

  // Loading state sebelum localStorage siap
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-100">
        <div className="w-8 h-8 border-2 border-coral-300 border-t-coral-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen pb-24 overflow-x-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <HomeScreen
                onNavigate={setActiveTab}
                transactions={transactions}
                budget={budget}
                streak={streak}
                userName={userName}
              />
            </motion.div>
          )}
          {activeTab === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <AddTransaction onSave={handleSaveTransaction} budget={budget} />
            </motion.div>
          )}
          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <TransactionList transactions={transactions} onDelete={handleDeleteTransaction} />
            </motion.div>
          )}
          {activeTab === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SummaryScreen transactions={transactions} />
            </motion.div>
          )}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <SettingScreen
                onBudgetChange={handleBudgetChange}
                onUserNameChange={handleUserNameChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}