'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAccountData, syncPendingTransactions } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { calculateStreak, getWeekStart, getTodayString } from '@/lib/utils';
import BottomNav from '@/components/BottomNav';
import HomeScreen from '@/components/HomeScreen';
import AuthScreen from '@/components/AuthScreen';
import AddTransaction from '@/components/AddTransaction';
import TransactionList from '@/components/TransactionList';
import SummaryScreen from '@/components/SummaryScreen';
import SettingScreen from '@/components/SettingScreen';
import Toast from '@/components/Toast';

export default function Home() {
  const [accountUser, setAccountUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const [transactions, setTransactions] = useState([]);
  const [budget, setBudgetState] = useState(null);
  const [streak, setStreak] = useState(0);
  const [userName, setUserName] = useState('');
  const [toast, setToast] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [isRetrying, setIsRetrying] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const handleStorageError = useCallback((message) => {
    setToast({ message, type: 'danger' });
  }, []);
  const handleSignOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const loadData = useCallback(async () => {
    setLoadError('');
    setMounted(false);
    setIsRetrying(true);
    try {
      const data = await getAccountData(accountUser.id);
      setTransactions(data.transactions);
      setBudgetState(data.budget);
      setUserName(data.user.name);
      setPendingCount(data.pendingCount);
      setIsOnline(!data.offline && navigator.onLine);
    } catch (error) {
      console.error('Gagal memuat data aplikasi:', error);
      const code = error.code ? ` (${error.code})` : '';
      setLoadError(`${error.message || 'Kesalahan tidak diketahui'}${code}`);
    } finally {
      setMounted(true);
      setIsRetrying(false);
    }
  }, [accountUser]);

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAccountUser(session?.user || null);
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) {
        console.error('Gagal memeriksa sesi akun:', error);
        setToast({ message: 'Sesi akun gagal dimuat. Coba muat ulang aplikasi.', type: 'danger' });
      }
      setAccountUser(data.session?.user || null);
      setAuthLoading(false);
    }).catch(error => {
      if (!active) return;
      console.error('Gagal memeriksa sesi akun:', error);
      setAuthLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (accountUser) loadData();
    else {
      setMounted(false);
      setTransactions([]);
      setBudgetState(null);
      setUserName('');
      setPendingCount(0);
    }
  }, [accountUser, loadData]);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      if (!accountUser) return;
      try {
        const result = await syncPendingTransactions(accountUser.id);
        setTransactions(result.transactions);
        setPendingCount(result.pendingCount);
        if (pendingCount > 0 && result.pendingCount === 0) {
          setToast({ message: 'Data berhasil disinkronkan', type: 'success' });
        }
      } catch (error) {
        console.error('Gagal menyinkronkan transaksi:', error);
        setToast({ message: 'Sinkronisasi gagal. Data tetap tersimpan di perangkat dan akan dicoba lagi.', type: 'warning' });
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [accountUser, pendingCount]);

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

  const handleSaveTransaction = useCallback((savedTransaction, tx) => {
    const newTransactions = [savedTransaction, ...transactions];
    setTransactions(newTransactions);
    if (savedTransaction.syncStatus === 'pending') {
      setPendingCount(count => count + 1);
      setToast({ message: 'Disimpan di perangkat. Akan disinkronkan saat online.', type: 'warning' });
      setActiveTab('home');
      return;
    }

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
  }, [budget, transactions]);

  const handleDeleteTransaction = useCallback((deletedId) => {
    setTransactions(currentTransactions => currentTransactions.filter(tx => tx.id !== deletedId));
    if (String(deletedId).startsWith('pending-')) {
      setPendingCount(count => Math.max(0, count - 1));
    }
  }, []);

  const handleBudgetChange = useCallback((newBudget) => {
    setBudgetState(newBudget);
  }, []);

  const handleUserNameChange = useCallback((name) => {
    setUserName(name);
  }, []);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-100">
        <div className="w-8 h-8 border-2 border-coral-300 border-t-coral-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!accountUser) return <AuthScreen />;

  // Loading state while data is being fetched from Supabase or local offline cache.
  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-cream-100">
        <div className="w-8 h-8 border-2 border-coral-300 border-t-coral-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-cream-100 p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Data gagal dimuat</h1>
        <p className="mt-2 text-sm text-gray-600">
          Periksa koneksi dan konfigurasi database. Detail: {loadError}
        </p>
        <button
          onClick={loadData}
          disabled={isRetrying}
          className="mt-4 px-5 py-2.5 rounded-xl text-sm font-medium bg-coral-500 text-white disabled:opacity-60"
        >
          {isRetrying ? 'Mencoba...' : 'Coba Lagi'}
        </button>
        <button
          onClick={handleSignOut}
          className="mt-3 px-5 py-2.5 rounded-xl text-sm font-medium text-gray-500"
        >
          Keluar dan coba masuk lagi
        </button>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className="min-h-screen pb-24 overflow-x-hidden">
        {!isOnline && (
          <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-800">
            Offline — transaksi baru disimpan di perangkat
            {pendingCount > 0 && ` · ${pendingCount} menunggu sinkronisasi`}
          </div>
        )}
        {isOnline && pendingCount > 0 && (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
            Menunggu sinkronisasi: {pendingCount} transaksi
          </div>
        )}
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
              <AddTransaction
                onSave={handleSaveTransaction}
                onError={handleStorageError}
                userId={accountUser.id}
                budget={budget}
              />
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
              <TransactionList
                transactions={transactions}
                onDelete={handleDeleteTransaction}
                onError={handleStorageError}
                userId={accountUser.id}
              />
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
                onError={handleStorageError}
                userId={accountUser.id}
                email={accountUser.email}
                onSignOut={handleSignOut}
                budget={budget}
                userName={userName}
                pendingCount={pendingCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </>
  );
}