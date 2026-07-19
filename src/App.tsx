import { DEPLOY_TRIGGER } from './trigger';
console.log('Deploy Trigger:', DEPLOY_TRIGGER);

import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Calendar, 
  Plus, 
  Trash2, 
  KeyRound, 
  Unlock, 
  Percent, 
  BarChart as BarChartIcon,
  ChevronRight,
  Download,
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';

// --- Types ---
type RevenueCategory = '11번가' | 'G마켓' | 'NS홈쇼핑' | '스마트스토어' | '에이블리' | '오늘의집' | '옥션' | '카페24' | '쿠팡(자동)' | '토스쇼핑' | '도매' | '쿠팡로켓' | '현금입금' | '기타';
const revCategories: RevenueCategory[] = ['11번가', 'G마켓', 'NS홈쇼핑', '스마트스토어', '에이블리', '오늘의집', '옥션', '카페24', '쿠팡(자동)', '토스쇼핑', '도매', '쿠팡로켓', '현금입금', '기타'];

const depositCategories = [
  '오늘의집',
  '쿠팡(주)',
  '쿠팡페이',
  '옥션',
  '지마켓',
  'npay정산',
  '11번가 빠른정산',
  '11번가',
  'kg이니시스',
  'kg모바일',
  '에이블리',
  'toss',
  '톡체크아웃',
  '스토어팜정산',
  'NS홈쇼핑',
  '스마일페이먼츠'
];

interface Entry {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  isAutoAd?: boolean;
}

interface RevenueEntry {
  id: string;
  date: string;
  category: RevenueCategory;
  amount: number;
  vendor?: string;
}

interface MonthData {
  month: number;
  revenues: RevenueEntry[];
  purchases: Entry[];
  expenditures: Entry[];
  ads: Entry[];
  deposits?: Entry[];
}

const getInitialData = (): MonthData[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenues: [],
    purchases: [],
    expenditures: [],
    ads: [],
    deposits: [],
  }));
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  
  const [data, setData] = useState<MonthData[]>(getInitialData());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'done' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  
  const calculateTotal = (items: any[]) => items?.reduce((sum, r) => sum + r.amount, 0) || 0;

  // Form states
  const [newRevDay, setNewRevDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [newRevCategory, setNewRevCategory] = useState<RevenueCategory>('11번가');
  const [newRevAmount, setNewRevAmount] = useState("");

  const [newPurDay, setNewPurDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [newPurVendor, setNewPurVendor] = useState("");
  const [newPurAmount, setNewPurAmount] = useState("");

  const [newExpDay, setNewExpDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [newExpVendor, setNewExpVendor] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");

  // Persistence
  useEffect(() => {
    const savedPass = localStorage.getItem('surtax_market_password');
    if (!savedPass) {
      setIsSettingPassword(true);
    }

    const fetchData = async () => {
      try {
        const { data: dbData, error } = await supabase
          .from('surtax_data')
          .select('data')
          .eq('id', 'market_ledger_es')
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (dbData && dbData.data) {
          const rawData = dbData.data;
          // Migration: Map old categories to new ones + move ads
          const adVendors = ["네이버광고", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집광고"];
          const migrated = rawData.map((m: any) => {
            const adEntriesFromPurchases = (m.purchases || []).filter((p: any) => p.isAutoAd || p.id.startsWith('ad_') || adVendors.includes(p.vendor));
            const cleanPurchases = (m.purchases || []).filter((p: any) => !p.isAutoAd && !p.id.startsWith('ad_') && !adVendors.includes(p.vendor));
            // Combine existing ads with those found in purchases, ensuring no duplicates if migration runs twice
            const combinedAds = [...(m.ads || [])];
            adEntriesFromPurchases.forEach((ae: any) => {
              if (!combinedAds.find(x => x.date === ae.date && x.vendor === ae.vendor)) {
                combinedAds.push({ ...ae, isAutoAd: undefined }); 
              }
            });

            return {
              ...m,
              purchases: cleanPurchases,
              ads: combinedAds,
              revenues: (m.revenues || []).map((r: any) => {
                let cat = r.category;
                if (cat === '오늘의집매출') cat = '오늘의집';
                if (cat === '쿠팡윙' || cat === '쿠팡로켓배송') cat = '쿠팡(자동)';
                return { ...r, category: cat };
              }),
              deposits: m.deposits || []
            };
          });
          setData(migrated);
        } else {
          const savedData = localStorage.getItem('surtax_market_data_es');
          if (savedData) {
            const rawData = JSON.parse(savedData);
            const adVendors = ["네이버광고", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집광고"];
            const migrated = rawData.map((m: any) => {
              const adEntriesFromPurchases = (m.purchases || []).filter((p: any) => p.isAutoAd || p.id.startsWith('ad_') || adVendors.includes(p.vendor));
              const cleanPurchases = (m.purchases || []).filter((p: any) => !p.isAutoAd && !p.id.startsWith('ad_') && !adVendors.includes(p.vendor));
              const combinedAds = [...(m.ads || [])];
              adEntriesFromPurchases.forEach((ae: any) => {
                if (!combinedAds.find(x => x.date === ae.date && x.vendor === ae.vendor)) {
                  combinedAds.push({ ...ae, isAutoAd: undefined });
                }
              });

              return {
                ...m,
                purchases: cleanPurchases,
                ads: combinedAds,
                revenues: (m.revenues || []).map((r: any) => {
                  let cat = r.category;
                  if (cat === '오늘의집매출') cat = '오늘의집';
                  if (cat === '쿠팡윙' || cat === '쿠팡로켓배송') cat = '쿠팡(자동)';
                  return { ...r, category: cat };
                }),
                deposits: m.deposits || []
              };
            });
            setData(migrated);
          }
        }
        setIsLoading(false);
      } catch (e) {
        console.error("Supabase load failed", e);
        const savedData = localStorage.getItem('surtax_market_data_es');
        if (savedData) setData(JSON.parse(savedData));
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (isLoading || data.length === 0) return;
    
    localStorage.setItem('surtax_market_data_es', JSON.stringify(data));

    const timeout = setTimeout(async () => {
      setSyncStatus('syncing');
      try {
        const { error } = await supabase
          .from('surtax_data')
          .upsert({ id: 'market_ledger_es', data: data });
        
        if (error) throw error;
        setSyncStatus('done');
      } catch (e) {
        console.error("Supabase save failed", e);
        setSyncStatus('error');
      }
    }, 1000);

    return () => clearTimeout(timeout);
  }, [data]);

  // Handlers
  const handleSetPassword = () => {
    if (inputPassword.length < 4) {
      alert("비밀번호는 4자리 이상이어야 합니다.");
      return;
    }
    localStorage.setItem('surtax_market_password', inputPassword);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPass = localStorage.getItem('surtax_market_password');
    if (inputPassword === savedPass) {
      setIsAuthenticated(true);
    } else {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setInputPassword("");
  };

  const handleAddRevenue = (month: number) => {
    const amount = parseInt(newRevAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;
    const newItem: RevenueEntry = { id: `rev_${Date.now()}`, date: newRevDay, category: newRevCategory, amount };
    setData(prev => prev.map(m => m.month === month ? { ...m, revenues: [...m.revenues, newItem] } : m));
    setNewRevAmount("");
  };

  const handleAddPurchase = (month: number) => {
    const amount = parseInt(newPurAmount.replace(/,/g, ''));
    if (isNaN(amount) || !newPurVendor.trim()) return;
    const newItem: Entry = { id: `pur_${Date.now()}`, date: newPurDay, vendor: newPurVendor, amount };
    setData(prev => prev.map(m => m.month === month ? { ...m, purchases: [...m.purchases, newItem] } : m));
    setNewPurVendor("");
    setNewPurAmount("");
  };

  const handleAddExpenditure = (month: number) => {
    const amount = parseInt(newExpAmount.replace(/,/g, ''));
    if (isNaN(amount) || !newExpVendor.trim()) return;
    const newItem: Entry = { id: `exp_${Date.now()}`, date: newExpDay, vendor: newExpVendor, amount };
    setData(prev => prev.map(m => m.month === month ? { ...m, expenditures: [...m.expenditures, newItem] } : m));
    setNewExpVendor("");
    setNewExpAmount("");
  };

  const handleUpdateRevenue = (month: number, day: string, cat: RevenueCategory, amt: number) => {
    setData(prev => prev.map(m => {
      if (m.month !== month) return m;
      const otherRevs = m.revenues.filter(r => !(r.date === day && r.category === cat));
      if (amt === 0) return { ...m, revenues: otherRevs };
      return { ...m, revenues: [...otherRevs, { id: `rev_${day}_${cat}`, date: day, category: cat, amount: amt }] };
    }));
  };

  const handleUpdateAd = (month: number, day: string, vendor: string, amt: number) => {
    setData(prev => prev.map(m => {
      if (m.month !== month) return m;
      const adVendors = ["네이버광고", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집광고"];
      // DATA CLEANER: Forcefully remove any ad-related entries from purchases when summary table is updated
      const cleanPurchases = (m.purchases || []).filter(p => !p.id.startsWith('ad_') && !adVendors.includes(p.vendor));
      const otherAds = (m.ads || []).filter(p => !(p.date === day && p.vendor === vendor));
      
      if (amt === 0) return { ...m, ads: otherAds, purchases: cleanPurchases };
      return { ...m, ads: [...otherAds, { id: `ad_${day}_${vendor}`, date: day, vendor, amount: amt }], purchases: cleanPurchases };
    }));
  };

  const handleUpdateDeposit = (month: number, day: string, vendor: string, amt: number) => {
    setData(prev => prev.map(m => {
      if (m.month !== month) return m;
      const otherDeposits = (m.deposits || []).filter(d => !(d.date === day && d.vendor === vendor));
      if (amt === 0) return { ...m, deposits: otherDeposits };
      return { ...m, deposits: [...otherDeposits, { id: `dep_${day}_${vendor}`, date: day, vendor, amount: amt }] };
    }));
  };

  const handleRemoveItem = (month: number, id: string, type: 'revenues' | 'purchases' | 'expenditures' | 'ads') => {
    setData(prev => prev.map(m => m.month === month ? { ...m, [type]: (m[type] as any[]).filter((item: any) => item.id !== id) } : m));
  };

  const handleReset = () => {
    if (window.confirm("정말로 모든 데이터를 초기화하시겠습니까? (복구 불가능)")) {
      setData(getInitialData());
    }
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `surtax_market_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        if (Array.isArray(importedData) && importedData.length === 12) {
          if (window.confirm("기존 데이터를 덮어쓰고 백업 데이터를 복원하시겠습니까?")) {
            setData(importedData);
            alert("데이터 복원이 완료되었습니다.");
          }
        } else {
          alert("올바른 백업 파일이 아닙니다.");
        }
      } catch (err) {
        alert("파일 읽기 중 오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  };

  const yearlyRevenue = data.reduce((sum, m) => sum + calculateTotal(m.revenues), 0);
  const yearlyGeneralPurchase = data.reduce((sum, m) => sum + calculateTotal(m.purchases), 0);
  const yearlyAdTotal = data.reduce((sum, m) => sum + calculateTotal(m.ads), 0);
  const yearlyPurchase = yearlyGeneralPurchase + yearlyAdTotal;
  const yearlyExpenditure = data.reduce((sum, m) => sum + calculateTotal(m.expenditures), 0);
  const yearlyNetProfit = yearlyRevenue - yearlyPurchase - yearlyExpenditure;
  const yearlyPurchaseRatio = yearlyRevenue > 0 ? ((yearlyPurchase / yearlyRevenue) * 100).toFixed(1) : "0.0";
  const yearlyDeposit = data.reduce((sum, m) => sum + (m.deposits?.reduce((s, d) => s + d.amount, 0) || 0), 0);


  const currentMonthData = data.find(d => d.month === selectedMonth)!;
  const currentMonthRevenue = calculateTotal(currentMonthData.revenues);
  const currentMonthGeneralPurchase = calculateTotal(currentMonthData.purchases);
  const currentMonthAdTotal = calculateTotal(currentMonthData.ads);
  const currentMonthPurchase = currentMonthGeneralPurchase + currentMonthAdTotal;
  const currentMonthExpenditure = calculateTotal(currentMonthData.expenditures);
  const currentMonthNetProfit = currentMonthRevenue - (currentMonthPurchase + currentMonthExpenditure);
  const currentMonthPurchaseRatio = currentMonthRevenue > 0 ? ((currentMonthPurchase / currentMonthRevenue) * 100).toFixed(1) : "0.0";
  const currentMonthProfitRatio = currentMonthRevenue > 0 ? ((currentMonthNetProfit / currentMonthRevenue) * 100).toFixed(1) : "0.0";
  const currentMonthDeposit = currentMonthData.deposits?.reduce((sum, d) => sum + d.amount, 0) || 0;

  const chartData = data.map(m => {
    const rev = calculateTotal(m.revenues);
    const genPur = calculateTotal(m.purchases);
    const ads = calculateTotal(m.ads);
    const pur = genPur + ads;
    const exp = calculateTotal(m.expenditures);
    return {
      month: m.month,
      revenue: rev,
      purchase: pur,
      expenditure: exp,
      profit: rev - pur - exp
    };
  });

  const formatCurrency = (amt: number) => new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(amt);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-none bg-slate-800/50 backdrop-blur-xl shadow-2xl rounded-[2.5rem] overflow-hidden">
            <CardContent className="p-12 text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-blue-600/30">
                <KeyRound className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white mb-2">{isSettingPassword ? "비밀번호 설정" : "로그인"}</h2>
              <form onSubmit={isSettingPassword ? handleSetPassword : handleLogin} className="space-y-4">
                <input type="password" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder="비밀번호 입력" autoFocus className="w-full bg-slate-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-black text-white focus:ring-2 focus:ring-blue-500 outline-none" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20">{isSettingPassword ? "설정 완료" : "접속하기"}</button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-900">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* HEADER */}
        <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight">마켓 통합 회계 장부</h1>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm font-black text-blue-600">(ES)</div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black border transition-all ${
              syncStatus === 'syncing' ? 'bg-blue-50 text-blue-500 border-blue-100 animate-pulse' :
              syncStatus === 'done' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
              syncStatus === 'error' ? 'bg-red-50 text-red-500 border-red-100' :
              'bg-slate-50 text-slate-400 border-slate-100'
            }`}>
              <Download className={`w-3 h-3 ${syncStatus === 'syncing' ? 'animate-bounce' : ''}`} />
              {syncStatus === 'syncing' ? '클라우드 동기화 중...' : 
               syncStatus === 'done' ? '클라우드 동기화 완료' :
               syncStatus === 'error' ? '동기화 오류' : '오프라인'}
            </div>
            <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-blue-500"><Unlock className="w-5 h-5" /></button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExport} className="px-4 py-2 text-xs font-black text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-100 flex items-center gap-2">
              <Download className="w-3 h-3" /> 데이터 백업
            </button>
            <label className="px-4 py-2 text-xs font-black text-emerald-600 hover:bg-emerald-50 rounded-lg border border-emerald-100 flex items-center gap-2 cursor-pointer">
              <Plus className="w-3 h-3" /> 데이터 복구
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
            <button onClick={handleReset} className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
              <Trash2 className="w-3 h-3" /> 데이터 초기화
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출액" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<ShoppingBag />} color="orange" label="연간 총 매입액" value={formatCurrency(yearlyPurchase)} subtext={`매출대비 ${yearlyPurchaseRatio}%`} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 지출액" value={formatCurrency(yearlyExpenditure)} />
          <SummaryCard icon={<DollarSign />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
          <SummaryCard icon={<TrendingUp />} color="emerald" label="연간 총 입금액" value={formatCurrency(yearlyDeposit)} />
          <SummaryCard icon={<Percent />} color="purple" label="연간 매입율" value={`${yearlyPurchaseRatio}%`} subtext="매출 대비 매입" />
          <SummaryCard icon={<Percent />} color="indigo" label="연간 수익률" value={`${(yearlyRevenue > 0 ? (yearlyNetProfit / yearlyRevenue * 100).toFixed(1) : "0.0")}%`} subtext="매출 대비 순익" />
        </div>

        {/* CHART */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 pb-6 pt-8">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChartIcon className="w-5 h-5 text-blue-500" /> 월별 흐름 추이
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={(v) => `${v}월`} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(v) => (v / 10000).toLocaleString() + '만'} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                  <Bar dataKey="revenue" name="매출" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="purchase" name="매입" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenditure" name="지출" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="순이익" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MONTHLY STATS TABLE */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
            <CardTitle className="text-xl font-black flex items-center gap-2">
              <BarChartIcon className="w-6 h-6 text-emerald-400" /> 연간 월별 손익 요약
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 font-black text-[10px] text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th className="px-6 py-4">월</th>
                    <th className="px-6 py-4">총 매출</th>
                    <th className="px-6 py-4 text-orange-500">총 매입</th>
                    <th className="px-6 py-4 text-red-500">총 지출</th>
                    <th className="px-6 py-4 text-right text-emerald-600">순이익</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-black">
                  {chartData.map(m => (
                    <tr key={m.month} onClick={() => setSelectedMonth(m.month)} className={`cursor-pointer hover:bg-slate-50 transition-colors ${selectedMonth === m.month ? "bg-blue-50/50" : ""}`}>
                      <td className="px-6 py-4">{m.month}월</td>
                      <td className="px-6 py-4 text-slate-900">{formatCurrency(m.revenue)}</td>
                      <td className="px-6 py-4 text-orange-500">{formatCurrency(m.purchase)}</td>
                      <td className="px-6 py-4 text-red-500">{formatCurrency(m.expenditure)}</td>
                      <td className={`px-6 py-4 text-right ${m.profit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {formatCurrency(m.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900 text-white font-black">
                  <tr>
                    <td className="px-6 py-6 text-lg">연간 합계</td>
                    <td className="px-6 py-6 text-lg text-blue-300">{formatCurrency(yearlyRevenue)}</td>
                    <td className="px-6 py-6 text-lg text-orange-300">{formatCurrency(yearlyPurchase)}</td>
                    <td className="px-6 py-6 text-lg text-red-300">{formatCurrency(yearlyExpenditure)}</td>
                    <td className="px-6 py-6 text-right text-2xl text-emerald-400">{formatCurrency(yearlyNetProfit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* MONTH SELECTOR */}
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
            <button key={m} onClick={() => setSelectedMonth(m)} className={`px-6 py-3 rounded-2xl font-black transition-all ${selectedMonth === m ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 hover:bg-slate-100'}`}>
              {m}월
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
          <SummaryCard icon={<TrendingUp />} color="blue" label={`${selectedMonth}월 매출`} value={formatCurrency(currentMonthRevenue)} />
          <SummaryCard icon={<ShoppingBag />} color="orange" label={`${selectedMonth}월 매입`} value={formatCurrency(currentMonthPurchase)} />
          <SummaryCard icon={<TrendingDown />} color="red" label={`${selectedMonth}월 지출`} value={formatCurrency(currentMonthExpenditure)} />
          <SummaryCard icon={<DollarSign />} color="green" label={`${selectedMonth}월 순익`} value={formatCurrency(currentMonthNetProfit)} />
          <SummaryCard icon={<TrendingUp />} color="emerald" label={`${selectedMonth}월 입금액`} value={formatCurrency(currentMonthDeposit)} />
          <SummaryCard icon={<Percent />} color="purple" label={`${selectedMonth}월 매입율`} value={`${currentMonthPurchaseRatio}%`} />
          <SummaryCard icon={<Percent />} color="indigo" label={`${selectedMonth}월 수익률`} value={`${currentMonthProfitRatio}%`} />
        </div>

        <DailyRevenueSummary revenues={currentMonthData.revenues} month={selectedMonth} onUpdateRevenue={(day, cat, amt) => handleUpdateRevenue(selectedMonth, day, cat, amt)} />
        <DailyAdSummary ads={currentMonthData.ads || []} month={selectedMonth} onUpdateAd={(day, cat, amt) => handleUpdateAd(selectedMonth, day, cat, amt)} />

        {/* DETAILS CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SectionCard title={`${selectedMonth}월 매출 상세`} total={currentMonthRevenue} color="blue" icon={<Calendar className="w-6 h-6 text-blue-400" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddRevenue(selectedMonth); }} className="space-y-4 mb-8 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newRevDay} onChange={setNewRevDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">카테고리</label>
                  <select value={newRevCategory} onChange={(e) => setNewRevCategory(e.target.value as RevenueCategory)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black">
                    {revCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <AmountInput value={newRevAmount} onChange={setNewRevAmount} focusColor="blue" />
              <button type="submit" disabled={!newRevAmount.trim()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition">매출 추가</button>
            </form>
            <ItemList items={currentMonthData.revenues} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'revenues')} color="blue" />
          </SectionCard>

          <SectionCard title={`${selectedMonth}월 매입 상세`} total={currentMonthPurchase} color="orange" icon={<ShoppingBag className="w-6 h-6 text-orange-500" />}>
            <div className="mb-6 grid grid-cols-1 gap-2 bg-white/50 p-4 rounded-2xl border border-orange-100/50">
              <div className="flex justify-between items-center text-sm">
                <span className="font-black text-slate-500">일반 매입</span>
                <span className="font-black text-slate-900">{formatCurrency(currentMonthGeneralPurchase)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="font-black text-slate-500">광고비</span>
                <span className="font-black text-orange-500">{formatCurrency(currentMonthAdTotal)}</span>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-100 flex justify-between items-center">
                <span className="font-black text-slate-900">합계 매입</span>
                <span className="text-lg font-black text-orange-600">{formatCurrency(currentMonthPurchase)}</span>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleAddPurchase(selectedMonth); }} className="space-y-4 mb-8 bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newPurDay} onChange={setNewPurDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">거래처/품목</label>
                  <input type="text" value={newPurVendor} onChange={(e) => setNewPurVendor(e.target.value)} placeholder="거래처명 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" />
                </div>
              </div>
              <AmountInput value={newPurAmount} onChange={setNewPurAmount} focusColor="orange" />
              <button type="submit" disabled={!newPurVendor.trim() || !newPurAmount.trim()} className="w-full py-4 bg-orange-500 text-white rounded-xl font-black hover:bg-orange-600 transition">매입 추가</button>
            </form>
            <ItemList items={currentMonthData.purchases.filter(p => !p.isAutoAd)} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'purchases')} color="orange" />
          </SectionCard>

          <SectionCard title={`${selectedMonth}월 지출 상세`} total={currentMonthExpenditure} color="red" icon={<TrendingDown className="w-6 h-6 text-red-500" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddExpenditure(selectedMonth); }} className="space-y-4 mb-8 bg-red-50/50 p-6 rounded-3xl border border-red-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newExpDay} onChange={setNewExpDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">항목명</label>
                  <input type="text" value={newExpVendor} onChange={(e) => setNewExpVendor(e.target.value)} placeholder="지출 항목 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" />
                </div>
              </div>
              <AmountInput value={newExpAmount} onChange={setNewExpAmount} focusColor="red" />
              <button type="submit" disabled={!newExpVendor.trim() || !newExpAmount.trim()} className="w-full py-4 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 transition">지출 추가</button>
            </form>
            <ItemList items={currentMonthData.expenditures} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'expenditures')} color="red" />
          </SectionCard>
        </div>

        <DailyDepositSummary deposits={currentMonthData.deposits || []} month={selectedMonth} onUpdateDeposit={(day, vendor, amt) => handleUpdateDeposit(selectedMonth, day, vendor, amt)} />
      </div>
    </div>
  );
}

function SummaryCard({ icon, color, label, value, subtext }: any) {
  const colors: any = { 
    blue: "bg-blue-50 text-blue-600", 
    orange: "bg-orange-50 text-orange-600", 
    red: "bg-red-50 text-red-600", 
    green: "bg-green-50 text-green-600", 
    purple: "bg-purple-50 text-purple-600",
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600"
  };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardContent className="p-4 md:p-5 flex items-center gap-3">
        <div className={`p-3 rounded-2xl shrink-0 ${colors[color]}`}>{React.cloneElement(icon, { size: 22 })}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
          <h3 className="text-sm md:text-base lg:text-lg font-black text-slate-900 leading-tight">{value}</h3>
          {subtext && <p className="text-[8px] font-bold text-slate-400 mt-0.5">{subtext}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, total, color, icon, children }: any) {
  const bgColors: any = { blue: "bg-slate-900", orange: "bg-orange-600", red: "bg-white border-b border-slate-100" };
  const textColors: any = { blue: "text-blue-400", orange: "text-white", red: "text-red-500" };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] overflow-hidden">
      <CardHeader className={`${bgColors[color]} pb-6 pt-8 flex flex-row items-center justify-between`}>
        <CardTitle className="text-xl font-black flex items-center gap-2 text-white">{icon} {title}</CardTitle>
        <span className={`text-xl font-black ${textColors[color]}`}>{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(total)}</span>
      </CardHeader>
      <CardContent className="pt-8 px-6 pb-8">{children}</CardContent>
    </Card>
  );
}

function DaySelect({ value, onChange, month }: any) {
  const days = new Date(2026, month, 0).getDate();
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">날짜(일)</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black">
        {Array.from({ length: days }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => <option key={d} value={d}>{d}일</option>)}
      </select>
    </div>
  );
}

function AmountInput({ value, onChange, focusColor }: any) {
  const rings: any = { blue: "focus:ring-blue-500", orange: "focus:ring-orange-500", red: "focus:ring-red-500" };
  const displayValue = value === "-" ? "-" : (value ? parseInt(value.replace(/[^0-9-]/g, "")).toLocaleString() : "");
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">금액</label>
      <div className="relative">
        <input type="text" value={displayValue} onChange={(e) => onChange(e.target.value.replace(/[^0-9-]/g, ""))} placeholder="0" className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-right pr-10 focus:ring-2 outline-none ${rings[focusColor]}`} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">원</span>
      </div>
    </div>
  );
}

function ItemList({ items, onRemove, color }: any) {
  const colors: any = { blue: "text-blue-500", orange: "text-orange-500", red: "text-red-500" };
  if (items.length === 0) return <div className="text-center py-12 bg-slate-50 rounded-xl text-slate-400 text-sm font-black">내역이 없습니다.</div>;
  return (
    <div className="space-y-2">
      {items.map((item: any) => (
        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl hover:shadow-md transition-all group">
          <div className="flex items-center gap-4">
            <span className="text-xs font-black text-slate-400 w-6">{item.date}</span>
            <div className="flex flex-col">
              {item.category && <span className={`text-[10px] font-black ${colors[color]}`}>{item.category}</span>}
              <span className="font-black text-sm text-slate-800">{item.vendor || item.category}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-black text-slate-900">{item.amount.toLocaleString()}원</span>
            <button onClick={() => onRemove(item.id)} className="text-slate-200 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyAdSummary({ ads, month, onUpdateAd }: any) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const categories = ["네이버광고", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집광고"];
  const dailyData = days.map(day => {
    const dayAds = (ads || []).filter((e: any) => e.date === day);
    const getAmt = (v: string) => dayAds.filter((e: any) => e.vendor === v).reduce((sum: number, e: any) => sum + e.amount, 0);
    const total = categories.reduce((sum, cat) => sum + getAmt(cat), 0);
    return { day, getAmt, total };
  });
  const columnTotals = categories.map(cat => 
    (ads || []).filter((e: any) => e.vendor === cat).reduce((sum: number, e: any) => sum + e.amount, 0)
  );
  const grandTotal = columnTotals.reduce((sum, val) => sum + val, 0);

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
        <CardTitle className="text-xl font-black flex items-center gap-2"><Percent className="w-6 h-6 text-purple-400" /> {month}월 광고비 일별 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 sticky top-0 font-black text-xs text-slate-900 uppercase tracking-tight border-b border-slate-200">
              <tr><th className="px-6 py-5">날짜</th>{categories.map(cat => <th key={cat} className="px-6 py-5 text-purple-700">{cat}</th>)}<th className="px-6 py-5 text-right bg-slate-900 text-white">총액</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData.map(d => (
                <tr key={d.day} className={`hover:bg-slate-50 ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-6 py-4 font-black text-base text-slate-900">{d.day}일</td>
                  {categories.map((cat, catIdx) => (
                    <td key={cat} className="px-2 py-2">
                      <input 
                        id={`ad-input-${catIdx}-${days.indexOf(d.day)}`}
                        type="text" 
                        value={d.getAmt(cat) ? d.getAmt(cat).toLocaleString() : ""} 
                        onChange={(e) => onUpdateAd(d.day, cat, parseInt(e.target.value.replace(/[^0-9-]/g, "")) || 0)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextId = `ad-input-${catIdx}-${days.indexOf(d.day) + 1}`;
                            const nextEl = document.getElementById(nextId);
                            if (nextEl) (nextEl as HTMLInputElement).focus();
                          }
                        }}
                        className="w-full bg-transparent border-none text-center font-black text-base text-blue-600 outline-none" 
                        placeholder="0" 
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 font-black text-right text-slate-900">{d.total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 border-t border-slate-700">
              <tr>
                <td className="px-6 py-5 text-base">합계</td>
                {columnTotals.map((total, i) => (
                  <td key={i} className="px-2 py-5 text-center text-purple-300 text-base">
                    {total.toLocaleString()}
                  </td>
                ))}
                <td className="px-6 py-5 text-right text-emerald-400 text-lg">
                  {grandTotal.toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyRevenueSummary({ revenues, month, onUpdateRevenue }: any) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const dailyData = days.map(day => {
    const dayRevs = revenues.filter((e: any) => e.date === day);
    const getAmt = (cat: string) => dayRevs.filter((e: any) => e.category === cat).reduce((sum: number, e: any) => sum + e.amount, 0);
    const total = revCategories.reduce((sum, cat) => sum + getAmt(cat), 0);
    return { day, getAmt, total };
  });
  const columnTotals = revCategories.map(cat => 
    revenues.filter((e: any) => e.category === cat).reduce((sum: number, e: any) => sum + e.amount, 0)
  );
  const grandTotal = columnTotals.reduce((sum, val) => sum + val, 0);

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
        <CardTitle className="text-xl font-black flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-400" /> {month}월 매출 일별 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 sticky top-0 font-black text-xs text-slate-900 uppercase tracking-tight border-b border-slate-200">
              <tr><th className="px-4 py-5 min-w-[70px]">날짜</th>{revCategories.map(cat => <th key={cat} className="px-2 py-5 min-w-[110px] text-center text-blue-700">{cat}</th>)}<th className="px-4 py-5 text-right bg-slate-900 text-white">총액</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData.map(d => (
                <tr key={d.day} className={`hover:bg-slate-50 ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-4 py-4 font-black text-base text-slate-900">{d.day}일</td>
                  {revCategories.map((cat, catIdx) => (
                    <td key={cat} className="px-1 py-2">
                      <input 
                        id={`rev-input-${catIdx}-${days.indexOf(d.day)}`}
                        type="text" 
                        value={d.getAmt(cat) ? d.getAmt(cat).toLocaleString() : ""} 
                        onChange={(e) => onUpdateRevenue(d.day, cat, parseInt(e.target.value.replace(/[^0-9-]/g, "")) || 0)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextId = `rev-input-${catIdx}-${days.indexOf(d.day) + 1}`;
                            const nextEl = document.getElementById(nextId);
                            if (nextEl) (nextEl as HTMLInputElement).focus();
                          }
                        }}
                        className="w-full bg-transparent border-none text-center font-black text-base text-blue-600 outline-none" 
                        placeholder="0" 
                      />
                    </td>
                  ))}
                  <td className="px-4 py-4 font-black text-right text-slate-900">{d.total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 border-t border-slate-700">
              <tr>
                <td className="px-4 py-5 text-base">합계</td>
                {columnTotals.map((total, i) => (
                  <td key={i} className="px-1 py-5 text-center text-blue-300 text-base">
                    {total.toLocaleString()}
                  </td>
                ))}
                <td className="px-4 py-5 text-right text-emerald-400 text-lg whitespace-nowrap">
                  {grandTotal.toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyDepositSummary({ deposits, month, onUpdateDeposit }: any) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const dailyData = days.map(day => {
    const dayDeps = (deposits || []).filter((e: any) => e.date === day);
    const getAmt = (vendor: string) => dayDeps.filter((e: any) => e.vendor === vendor).reduce((sum: number, e: any) => sum + e.amount, 0);
    const total = depositCategories.reduce((sum, vendor) => sum + getAmt(vendor), 0);
    return { day, getAmt, total };
  });
  const columnTotals = depositCategories.map(vendor => 
    (deposits || []).filter((e: any) => e.vendor === vendor).reduce((sum: number, e: any) => sum + e.amount, 0)
  );
  const grandTotal = columnTotals.reduce((sum, val) => sum + val, 0);

  const formatHeader = (name: string) => {
    if (name === '11번가 빠른정산') return '11번가\n빠른정산';
    if (name === '스토어팜정산') return '스토어팜\n정산';
    if (name === '톡체크아웃') return '톡\n체크아웃';
    if (name === 'kg이니시스') return 'kg\n이니시스';
    if (name === 'kg모바일') return 'kg\n모바일';
    if (name === 'npay정산') return 'npay\n정산';
    if (name === 'NS홈쇼핑') return 'NS\n홈쇼핑';
    if (name === '스마일페이먼츠') return '스마일\n페이먼츠';
    return name;
  };

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-4 pt-6">
        <CardTitle className="text-lg font-black flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-400" /> {month}월 입금금액 일별 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm text-left table-fixed min-w-[1160px] md:min-w-0">
            <thead className="bg-slate-100 sticky top-0 font-black text-slate-900 uppercase tracking-tight border-b border-slate-200">
              <tr>
                <th className="px-1 py-3 text-[11px] text-center w-[45px]">날짜</th>
                {depositCategories.map(vendor => (
                  <th key={vendor} className="px-0.5 py-2 text-[10px] leading-tight text-center text-emerald-700 whitespace-pre-line">
                    {formatHeader(vendor)}
                  </th>
                ))}
                <th className="px-1 py-3 text-right text-[11px] bg-slate-900 text-white w-[90px] whitespace-nowrap">총액</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData.map(d => (
                <tr key={d.day} className={`hover:bg-slate-50 ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-1 py-1 font-black text-[12px] text-slate-900 text-center">{parseInt(d.day)}일</td>
                  {depositCategories.map((vendor, vendorIdx) => (
                    <td key={vendor} className="px-0.5 py-0.5">
                      <input 
                        id={`dep-input-${vendorIdx}-${days.indexOf(d.day)}`}
                        type="text" 
                        value={d.getAmt(vendor) ? d.getAmt(vendor).toLocaleString() : ""} 
                        onChange={(e) => onUpdateDeposit(d.day, vendor, parseInt(e.target.value.replace(/[^0-9-]/g, "")) || 0)} 
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const nextId = `dep-input-${vendorIdx}-${days.indexOf(d.day) + 1}`;
                            const nextEl = document.getElementById(nextId);
                            if (nextEl) (nextEl as HTMLInputElement).focus();
                          }
                        }}
                        className="w-full bg-transparent border-none text-center font-black text-[12px] text-emerald-600 outline-none px-0" 
                        placeholder="0" 
                      />
                    </td>
                  ))}
                  <td className="px-1 py-1 font-black text-right text-[12px] text-slate-900 whitespace-nowrap">{d.total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 border-t border-slate-700 text-[11px]">
              <tr>
                <td className="px-1 py-3 text-center">합계</td>
                {columnTotals.map((total, i) => (
                  <td key={i} className="px-0.5 py-3 text-center text-emerald-300 text-[11px]">
                    {total.toLocaleString()}
                  </td>
                ))}
                <td className="px-1 py-3 text-right text-emerald-400 text-[13px] whitespace-nowrap">
                  {grandTotal.toLocaleString()}원
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
