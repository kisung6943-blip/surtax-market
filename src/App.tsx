import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, ShoppingBag, DollarSign, Calendar, 
  Plus, Trash2, KeyRound, Unlock, Percent, BarChart as BarChartIcon,
  Search, ChevronRight, AlertCircle, Save, Database, History,
  FileText, Download, CheckCircle2, XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from './lib/supabase';

// Types
type RevenueCategory = '11번가' | 'g마켓' | 'ns홈쇼핑' | '스마트스토어' | '에이블리' | '오늘의집' | '옥션' | '카페24' | '쿠팡(윙)' | '토스' | '도매' | '기타';
const revCategories: RevenueCategory[] = ['11번가', 'g마켓', 'ns홈쇼핑', '스마트스토어', '에이블리', '오늘의집', '옥션', '카페24', '쿠팡(윙)', '토스', '도매', '기타'];

type Entry = {
  id: string;
  date: string;
  vendor: string;
  amount: number;
  isAutoAd?: boolean;
};

type RevenueEntry = {
  id: string;
  date: string;
  category: RevenueCategory;
  amount: number;
  vendor?: string;
};

type MonthData = {
  month: number;
  revenues: RevenueEntry[];
  purchases: Entry[];
  expenditures: Entry[];
};

type SyncStatus = 'idle' | 'syncing' | 'done' | 'error';

const getInitialData = (): MonthData[] => {
  const initialData: MonthData[] = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenues: [],
    purchases: [],
    expenditures: [],
  }));

  // Emergency Manual Reconstruction from Screenshots (v3.0)
  const april = initialData[3];
  april.revenues = [
    { id: 'rec_r1', date: '30', category: '11번가', amount: 538940, vendor: '' },
    { id: 'rec_r2', date: '30', category: 'g마켓', amount: 1341406, vendor: '' },
    { id: 'rec_r3', date: '30', category: 'ns홈쇼핑', amount: 50400, vendor: '' },
    { id: 'rec_r4', date: '30', category: '스마트스토어', amount: 40509780, vendor: '' },
    { id: 'rec_r5', date: '30', category: '에이블리', amount: 68000, vendor: '' },
    { id: 'rec_r6', date: '30', category: '오늘의집', amount: 11399450, vendor: '' },
    { id: 'rec_r7', date: '30', category: '옥션', amount: 345634, vendor: '' },
    { id: 'rec_r8', date: '30', category: '카페24', amount: 1516720, vendor: '' },
    { id: 'rec_r9', date: '30', category: '쿠팡(윙)', amount: 40581620, vendor: '' },
    { id: 'rec_r10', date: '30', category: '토스', amount: 133000, vendor: '' },
    { id: 'rec_r11', date: '30', category: '도매', amount: 4830400, vendor: '' },
  ];
  april.purchases = [
    { id: 'rec_p1', date: '30', vendor: '4월 매입 총계 (복구됨)', amount: 133607804, isAutoAd: false }
  ];
  april.expenditures = [
    { id: 'rec_e1', date: '30', vendor: '4월 지출 총계 (복구됨)', amount: 18701479 }
  ];

  const may = initialData[4];
  may.revenues = [
    { id: 'rec_r12', date: '10', category: '기타', amount: 23301862, vendor: '' }
  ];

  return initialData;
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  
  const [data, setData] = useState<MonthData[]>(getInitialData());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [hasLoaded, setHasLoaded] = useState(false);

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

  // Persistent storage (SAVE DISABLED FOR SAFETY)
  useEffect(() => {
    const loadData = async () => {
      const savedPass = localStorage.getItem('surtax_market_password');
      if (!savedPass) {
        setIsSettingPassword(true);
      } else {
        setIsAuthenticated(false);
      }

      // Priority check for data
      const localData = localStorage.getItem('surtax_market_data_company_1778021612050');
      if (localData) {
        const parsed = JSON.parse(localData);
        // Only use if NOT empty
        if (parsed.some((m:any) => m.revenues.length > 0 || m.purchases.length > 0)) {
          setData(parsed);
        }
      }
      setHasLoaded(true);
    };
    loadData();
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const savedPass = localStorage.getItem('surtax_market_password');
    if (inputPassword === savedPass) {
      setIsAuthenticated(true);
    } else {
      alert("비밀번호가 틀렸습니다.");
    }
  };

  const handleSetPassword = () => {
    if (inputPassword.length < 4) {
      alert("비밀번호는 4자리 이상이어야 합니다.");
      return;
    }
    localStorage.setItem('surtax_market_password', inputPassword);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setInputPassword("");
  };

  // Actions
  const handleAddRevenue = (month: number) => {
    const amount = parseInt(newRevAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;

    const newItem: RevenueEntry = {
      id: `rev_${Date.now()}`,
      date: newRevDay,
      category: newRevCategory,
      amount,
      vendor: ''
    };

    setData(prev => prev.map(m => m.month === month ? { ...m, revenues: [...m.revenues, newItem] } : m));
    setNewRevAmount("");
  };

  const handleAddPurchase = (month: number) => {
    const amount = parseInt(newPurAmount.replace(/,/g, ''));
    if (isNaN(amount) || !newPurVendor.trim()) return;

    const newItem: Entry = {
      id: `pur_${Date.now()}`,
      date: newPurDay,
      vendor: newPurVendor,
      amount
    };

    setData(prev => prev.map(m => m.month === month ? { ...m, purchases: [...m.purchases, newItem] } : m));
    setNewPurVendor("");
    setNewPurAmount("");
  };

  const handleAddExpenditure = (month: number) => {
    const amount = parseInt(newExpAmount.replace(/,/g, ''));
    if (isNaN(amount) || !newExpVendor.trim()) return;

    const newItem: Entry = {
      id: `exp_${Date.now()}`,
      date: newExpDay,
      vendor: newExpVendor,
      amount
    };

    setData(prev => prev.map(m => m.month === month ? { ...m, expenditures: [...m.expenditures, newItem] } : m));
    setNewExpVendor("");
    setNewExpAmount("");
  };

  const handleUpdateAd = (month: number, day: string, cat: string, amt: number) => {
    setData(prev => prev.map(m => {
      if (m.month !== month) return m;
      const otherPurchases = m.purchases.filter(p => !(p.date === day && p.vendor === cat && p.isAutoAd));
      if (amt === 0) return { ...m, purchases: otherPurchases };
      const newAd: Entry = { id: `ad_${day}_${cat}`, date: day, vendor: cat, amount: amt, isAutoAd: true };
      return { ...m, purchases: [...otherPurchases, newAd] };
    }));
  };

  const handleUpdateRevenue = (month: number, day: string, cat: RevenueCategory, amt: number) => {
    setData(prev => prev.map(m => {
      if (m.month !== month) return m;
      const otherRevs = m.revenues.filter(r => !(r.date === day && r.category === cat));
      if (amt === 0) return { ...m, revenues: otherRevs };
      const newRev: RevenueEntry = { id: `rev_${day}_${cat}`, date: day, category: cat, amount: amt, vendor: '' };
      return { ...m, revenues: [...otherRevs, newRev] };
    }));
  };

  const handleRemoveItem = (month: number, id: string, type: 'revenues' | 'purchases' | 'expenditures') => {
    setData(prev => prev.map(m => m.month === month ? { ...m, [type]: m[type].filter((item: any) => item.id !== id) } : m));
  };

  const handleReset = () => {
    if (window.confirm("정말로 모든 데이터를 초기화하시겠습니까? (복구된 데이터도 사라집니다)")) {
      setData(getInitialData());
    }
  };

  // Calculations
  const currentMonthData = data.find(m => m.month === selectedMonth) || getInitialData()[0];
  const currentMonthRevenue = currentMonthData.revenues.reduce((sum, r) => sum + r.amount, 0);
  const currentMonthPurchase = currentMonthData.purchases.reduce((sum, p) => sum + p.amount, 0);
  const currentMonthExpenditure = currentMonthData.expenditures.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthProfit = currentMonthRevenue - currentMonthPurchase - currentMonthExpenditure;

  const yearlyRevenue = data.reduce((sum, m) => sum + m.revenues.reduce((s, r) => s + r.amount, 0), 0);
  const yearlyPurchase = data.reduce((sum, m) => sum + m.purchases.reduce((s, p) => s + p.amount, 0), 0);
  const yearlyExpenditure = data.reduce((sum, m) => sum + m.expenditures.reduce((s, e) => s + e.amount, 0), 0);
  const yearlyNetProfit = yearlyRevenue - yearlyPurchase - yearlyExpenditure;
  const yearlyPurchaseRatio = yearlyRevenue > 0 ? ((yearlyPurchase / yearlyRevenue) * 100).toFixed(1) : "0.0";

  const chartData = data.map(m => ({
    month: m.month,
    revenue: m.revenues.reduce((s, r) => s + r.amount, 0),
    purchase: m.purchases.reduce((s, p) => s + p.amount, 0),
    expenditure: m.expenditures.reduce((s, e) => s + e.amount, 0),
    profit: m.revenues.reduce((s, r) => s + r.amount, 0) - m.purchases.reduce((s, p) => s + p.amount, 0) - m.expenditures.reduce((s, e) => s + e.amount, 0)
  }));

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
              <h2 className="text-3xl font-black text-white mb-2">{isSettingPassword ? "비밀번호 설정" : "보안 잠금"}</h2>
              <p className="text-slate-400 font-bold mb-10 text-sm">
                {isSettingPassword ? "장부 보호를 위한 비밀번호를 설정하세요." : "금액 보호를 위해 비밀번호가 필요합니다."}
              </p>
              <form onSubmit={isSettingPassword ? (e) => { e.preventDefault(); handleSetPassword(); } : handleLogin} className="space-y-4">
                <input type="password" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder="비밀번호 입력" autoFocus className="w-full bg-slate-800 border-none rounded-2xl py-4 px-6 text-center text-2xl font-black tracking-[0.5em] placeholder:tracking-normal placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 outline-none text-white" />
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]">{isSettingPassword ? "설정 완료" : "잠금 해제"}</button>
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
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 whitespace-nowrap">마켓 통합 회계 장부 <span className="text-blue-500 text-sm ml-2">v3.0 (복구됨)</span></h1>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                <span className="text-lg font-black text-blue-600">(ES)</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-blue-500 transition-colors"><Unlock className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors flex items-center gap-2"><Trash2 className="w-3 h-3" /> 전체 초기화</button>
          </div>
        </header>

        {/* YEARLY SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출액" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<ShoppingBag />} color="orange" label="연간 총 매입액" value={formatCurrency(yearlyPurchase)} subtext={`매출대비 ${yearlyPurchaseRatio}%`} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 지출액" value={formatCurrency(yearlyExpenditure)} />
          <SummaryCard icon={<DollarSign />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
          <SummaryCard icon={<Percent />} color="purple" label="연간 매입 비율" value={`${yearlyPurchaseRatio}%`} subtext="지출 제외" />
        </div>

        {/* CHART */}
        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 pb-6 pt-8">
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <BarChartIcon className="w-5 h-5 text-blue-500" /> 월별 회계 추이 (매출/매입/지출/순익)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" tickFormatter={(val) => `${val}월`} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => new Intl.NumberFormat('ko-KR', { notation: 'compact' }).format(val)} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" name="매출" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="purchase" name="매입" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="expenditure" name="지출" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="profit" name="순익" fill="#10B981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* MONTH SELECTOR & MONTH SUMMARY */}
        <div className="space-y-6">
          <div className="flex overflow-x-auto pb-4 gap-2 snap-x no-scrollbar">
            {data.map(m => (
              <button key={m.month} onClick={() => setSelectedMonth(m.month)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition snap-start border-2 ${selectedMonth === m.month ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-700 hover:bg-slate-100 border-white shadow-sm'}`}>{m.month}월</button>
            ))}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedMonth}월 매출</p>
              <h4 className="text-lg font-black text-blue-600">{formatCurrency(currentMonthRevenue)}</h4>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedMonth}월 매입</p>
              <h4 className="text-lg font-black text-orange-500">{formatCurrency(currentMonthPurchase)}</h4>
            </div>
            <div className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedMonth}월 지출</p>
              <h4 className="text-lg font-black text-red-500">{formatCurrency(currentMonthExpenditure)}</h4>
            </div>
            <div className="bg-slate-900 p-5 rounded-[1.5rem] shadow-lg shadow-emerald-500/10 border border-slate-800">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{selectedMonth}월 순이익</p>
              <h4 className={`text-lg font-black ${currentMonthProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(currentMonthProfit)}</h4>
            </div>
          </div>
        </div>

        {/* INPUT TABLES */}
        <DailyRevenueSummary revenues={currentMonthData.revenues} month={selectedMonth} onUpdateRevenue={(day, cat, amt) => handleUpdateRevenue(selectedMonth, day, cat, amt)} />
        <DailyAdSummary purchases={currentMonthData.purchases} month={selectedMonth} onUpdateAd={(day, cat, amt) => handleUpdateAd(selectedMonth, day, cat, amt)} />

        {/* DETAILS CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <SectionCard title={`${selectedMonth}월 매출 상세`} total={currentMonthRevenue} color="blue" icon={<Calendar className="w-6 h-6 text-blue-400" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddRevenue(selectedMonth); }} className="space-y-4 mb-8 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newRevDay} onChange={setNewRevDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">스토어명</label>
                  <select value={newRevCategory} onChange={(e) => setNewRevCategory(e.target.value as RevenueCategory)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black">
                    {revCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
              </div>
              <AmountInput value={newRevAmount} onChange={setNewRevAmount} focusColor="blue" />
              <button type="submit" disabled={!newRevAmount.trim()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 transition">매출 추가</button>
            </form>
            <ItemList items={currentMonthData.revenues} onRemove={(id:string) => handleRemoveItem(selectedMonth, id, 'revenues')} color="blue" />
          </SectionCard>

          <SectionCard title={`${selectedMonth}월 매입 상세`} total={currentMonthPurchase} color="orange" icon={<ShoppingBag className="w-6 h-6 text-orange-500" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddPurchase(selectedMonth); }} className="space-y-4 mb-8 bg-orange-50/50 p-6 rounded-3xl border border-orange-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newPurDay} onChange={setNewPurDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">매입처/품목</label>
                  <input type="text" value={newPurVendor} onChange={(e) => setNewPurVendor(e.target.value)} placeholder="도매처/물건명" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" />
                </div>
              </div>
              <AmountInput value={newPurAmount} onChange={setNewPurAmount} focusColor="orange" />
              <button type="submit" disabled={!newPurVendor.trim() || !newPurAmount.trim()} className="w-full py-4 bg-orange-500 text-white rounded-xl font-black hover:bg-orange-600 disabled:opacity-50 transition">매입 추가</button>
            </form>
            <ItemList items={currentMonthData.purchases.filter(p => !p.isAutoAd)} onRemove={(id:string) => handleRemoveItem(selectedMonth, id, 'purchases')} color="orange" />
          </SectionCard>

          <SectionCard title={`${selectedMonth}월 지출 상세`} total={currentMonthExpenditure} color="red" icon={<TrendingDown className="w-6 h-6 text-red-500" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddExpenditure(selectedMonth); }} className="space-y-4 mb-8 bg-red-50/50 p-6 rounded-3xl border border-red-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newExpDay} onChange={setNewExpDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">지출항목</label>
                  <input type="text" value={newExpVendor} onChange={(e) => setNewExpVendor(e.target.value)} placeholder="항목 직접 입력" className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" />
                </div>
              </div>
              <AmountInput value={newExpAmount} onChange={setNewExpAmount} focusColor="red" />
              <button type="submit" disabled={!newExpVendor.trim() || !newExpAmount.trim()} className="w-full py-4 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 disabled:opacity-50 transition">지출 추가</button>
            </form>
            <ItemList items={currentMonthData.expenditures} onRemove={(id:string) => handleRemoveItem(selectedMonth, id, 'expenditures')} color="red" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// Subcomponents
function SummaryCard({ icon, color, label, value, subtext }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
      <CardContent className="p-8">
        <div className="flex items-center gap-5">
          <div className={`p-4 ${colors[color]} rounded-[1.25rem] shadow-sm`}>{React.cloneElement(icon, { size: 28 })}</div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
              {subtext && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors[color]}`}>{subtext}</span>}
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{value}</h3>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, total, color, icon, children }: any) {
  const bgColors: any = { blue: "bg-slate-900 text-white", orange: "bg-orange-600 text-white", red: "bg-white border-b border-slate-100" };
  const textColors: any = { blue: "text-blue-400", orange: "text-white", red: "text-red-500" };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className={`${bgColors[color]} pb-6 pt-8`}><div className="flex justify-between items-center"><CardTitle className="text-xl font-black flex items-center gap-2">{icon} {title}</CardTitle><span className={`text-xl font-black ${textColors[color]}`}>{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(total)}</span></div></CardHeader>
      <CardContent className="pt-8 px-6 pb-8">{children}</CardContent>
    </Card>
  );
}

function DaySelect({ value, onChange, month }: any) {
  return (
    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">날짜(일)</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black appearance-none cursor-pointer">
        {Array.from({ length: new Date(2026, month, 0).getDate() }, (_, i) => (<option key={i + 1} value={(i + 1).toString().padStart(2, '0')}>{(i + 1).toString().padStart(2, '0')}일</option>))}
      </select>
    </div>
  );
}

function AmountInput({ value, onChange, focusColor }: any) {
  const focusColors: any = { blue: "focus:ring-blue-500", orange: "focus:ring-orange-500", red: "focus:ring-red-500" };
  return (
    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">금액</label>
      <div className="relative"><input type="text" value={value ? parseInt(value.replace(/[^0-9]/g, '')).toLocaleString() : ""} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-lg text-right pr-12 focus:ring-2 outline-none ${focusColors[focusColor]}`} /><span className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-slate-600">원</span></div>
    </div>
  );
}

function ItemList({ items, onRemove, color }: any) {
  const textColors: any = { blue: "text-blue-500", orange: "text-orange-500", red: "text-red-500" };
  const borderColors: any = { blue: "hover:border-blue-200", orange: "hover:border-orange-200", red: "hover:border-red-200" };
  return (
    <div className="space-y-3"><h4 className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1 mb-2">리스트</h4>
      {items?.length > 0 ? (<div className="space-y-2">{items.map((item: any) => (
        <div key={item.id} className={`flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl transition-colors group ${borderColors[color]}`}>
          <div className="flex items-center gap-4"><span className="text-xs font-black text-slate-600 w-6">{item.date}일</span><div className="flex flex-col">{item.category && <span className={`text-[10px] font-black ${textColors[color]} mb-0.5`}>{item.category}</span>}<span className="font-black text-sm text-slate-800">{item.vendor || item.category}</span></div></div>
          <div className="flex items-center gap-4"><span className="font-black text-slate-900">{new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(item.amount)}</span><button onClick={() => onRemove(item.id)} className="p-1.5 text-slate-200 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button></div>
        </div>))}</div>) : (<div className="text-center py-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-slate-600 text-sm font-black">내역이 없습니다.</div>)}
    </div>
  );
}

function DailyAdSummary({ purchases, month, onUpdateAd }: { purchases: Entry[], month: number, onUpdateAd: (day: string, cat: string, amt: number) => void }) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const dailyData = days.map(day => {
    const dayExps = purchases.filter(e => e.date === day && e.isAutoAd);
    const naver = dayExps.filter(e => e.vendor === "네이버광고비").reduce((sum, e) => sum + e.amount, 0);
    const coupangRocket = dayExps.filter(e => e.vendor === "쿠팡로켓광고").reduce((sum, e) => sum + e.amount, 0);
    const coupangWing = dayExps.filter(e => e.vendor === "쿠팡윙광고").reduce((sum, e) => sum + e.amount, 0);
    const ohouse = dayExps.filter(e => e.vendor === "오늘의집 광고비").reduce((sum, e) => sum + e.amount, 0);
    return { day, naver, coupangRocket, coupangWing, ohouse, total: naver + coupangRocket + coupangWing + ohouse };
  });
  const formatKRW = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden mb-8">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8"><div className="flex justify-between items-center"><CardTitle className="text-xl font-black flex items-center gap-2"><Percent className="w-6 h-6 text-purple-400" /> {month}월 일별 광고비 입력/집계</CardTitle></div></CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 sticky top-0 z-10 shadow-sm"><tr><th className="px-6 py-4">날짜</th><th className="px-6 py-4">네이버광고</th><th className="px-6 py-4">쿠팡로켓</th><th className="px-6 py-4">쿠팡윙</th><th className="px-6 py-4">오늘의집</th><th className="px-6 py-4 text-right">일별 합계</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{dailyData.map((d) => (
              <tr key={d.day} className={`hover:bg-slate-50 transition-colors ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                <td className="px-6 py-4 font-black text-slate-700">{d.day}일</td>
                <td className="px-4 py-2"><input type="text" value={d.naver > 0 ? d.naver.toLocaleString() : ""} onChange={(e) => onUpdateAd(d.day, "네이버광고비", parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none font-black text-blue-600 focus:ring-1 focus:ring-blue-100 rounded-lg px-2 py-1 text-sm outline-none" placeholder="0" /></td>
                <td className="px-4 py-2"><input type="text" value={d.coupangRocket > 0 ? d.coupangRocket.toLocaleString() : ""} onChange={(e) => onUpdateAd(d.day, "쿠팡로켓광고", parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none font-black text-orange-500 focus:ring-1 focus:ring-orange-100 rounded-lg px-2 py-1 text-sm outline-none" placeholder="0" /></td>
                <td className="px-4 py-2"><input type="text" value={d.coupangWing > 0 ? d.coupangWing.toLocaleString() : ""} onChange={(e) => onUpdateAd(d.day, "쿠팡윙광고", parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none font-black text-orange-400 focus:ring-1 focus:ring-orange-100 rounded-lg px-2 py-1 text-sm outline-none" placeholder="0" /></td>
                <td className="px-4 py-2"><input type="text" value={d.ohouse > 0 ? d.ohouse.toLocaleString() : ""} onChange={(e) => onUpdateAd(d.day, "오늘의집 광고비", parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none font-black text-red-500 focus:ring-1 focus:ring-red-100 rounded-lg px-2 py-1 text-sm outline-none" placeholder="0" /></td>
                <td className="px-6 py-4 font-black text-slate-900 text-right bg-slate-50/50">{formatKRW(d.total)}원</td>
              </tr>))}</tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 z-10 shadow-up"><tr><td className="px-6 py-4">총계</td><td className="px-6 py-4 text-blue-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.naver, 0))}</td><td className="px-6 py-4 text-orange-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.coupangRocket, 0))}</td><td className="px-6 py-4 text-orange-200">{formatKRW(dailyData.reduce((sum, d) => sum + d.coupangWing, 0))}</td><td className="px-6 py-4 text-red-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.ohouse, 0))}</td><td className="px-6 py-4 text-right text-purple-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.total, 0))}원</td></tr></tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function DailyRevenueSummary({ revenues, month, onUpdateRevenue }: { revenues: RevenueEntry[], month: number, onUpdateRevenue: (day: string, cat: string, amt: number) => void }) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const dailyData = days.map(day => {
    const dayRevs = revenues.filter(e => e.date === day);
    const catAmounts = revCategories.reduce((acc, cat) => { acc[cat] = dayRevs.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0); return acc; }, {} as Record<string, number>);
    const total = Object.values(catAmounts).reduce((sum, amt) => sum + amt, 0);
    return { day, catAmounts, total };
  });
  const formatKRW = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden mb-8">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8"><div className="flex justify-between items-center"><CardTitle className="text-xl font-black flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-400" /> {month}월 일별 매출 입력/집계</CardTitle></div></CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[500px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 sticky top-0 z-10 shadow-sm"><tr><th className="px-4 py-4 min-w-[50px]">날짜</th>{revCategories.map(cat => <th key={cat} className="px-2 py-4 min-w-[100px] text-center">{cat}</th>)}<th className="px-4 py-4 min-w-[100px] text-right">일별 합계</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{dailyData.map((d) => (
              <tr key={d.day} className={`hover:bg-slate-50 transition-colors ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                <td className="px-4 py-4 font-black text-slate-700">{d.day}일</td>
                {revCategories.map(cat => (
                  <td key={cat} className="px-2 py-2"><input type="text" value={d.catAmounts[cat] > 0 ? d.catAmounts[cat].toLocaleString() : ""} onChange={(e) => onUpdateRevenue(d.day, cat as RevenueCategory, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full min-w-[90px] bg-transparent border-none font-black text-blue-500 focus:ring-1 focus:ring-blue-100 rounded-lg px-2 py-1 text-sm outline-none text-center" placeholder="0" /></td>
                ))}
                <td className="px-4 py-4 font-black text-slate-900 text-right bg-slate-50/50">{formatKRW(d.total)}원</td>
              </tr>))}</tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 z-10 shadow-up"><tr><td className="px-4 py-4">총계</td>{revCategories.map(cat => (<td key={cat} className="px-2 py-4 text-center text-blue-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.catAmounts[cat], 0))}</td>))}<td className="px-4 py-4 text-right text-purple-300">{formatKRW(dailyData.reduce((sum, d) => sum + d.total, 0))}원</td></tr></tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
/ /   T r i g g e r   R e d e p l o y   3 . 1  
 