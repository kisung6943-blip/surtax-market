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
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
type RevenueCategory = '스마트스토어' | '쿠팡윙' | '쿠팡로켓배송' | '오늘의집매출' | '옥션' | 'G마켓' | '11번가' | '도매' | '현금입금' | '기타';
const revCategories: RevenueCategory[] = ['스마트스토어', '쿠팡윙', '쿠팡로켓배송', '오늘의집매출', '옥션', 'G마켓', '11번가', '도매', '현금입금', '기타'];

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
}

const getInitialData = (): MonthData[] => {
  return Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    revenues: [],
    purchases: [],
    expenditures: [],
  }));
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  
  const [data, setData] = useState<MonthData[]>(getInitialData());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  // Form states
  const [newRevDay, setNewRevDay] = useState(new Date().getDate().toString().padStart(2, '0'));
  const [newRevCategory, setNewRevCategory] = useState<RevenueCategory>('스마트스토어');
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

    const savedData = localStorage.getItem('surtax_market_data_es');
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to load data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem('surtax_market_data_es', JSON.stringify(data));
    }
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
      const otherPurchases = m.purchases.filter(p => !(p.date === day && p.vendor === vendor && p.isAutoAd));
      if (amt === 0) return { ...m, purchases: otherPurchases };
      return { ...m, purchases: [...otherPurchases, { id: `ad_${day}_${vendor}`, date: day, vendor, amount: amt, isAutoAd: true }] };
    }));
  };

  const handleRemoveItem = (month: number, id: string, type: 'revenues' | 'purchases' | 'expenditures') => {
    setData(prev => prev.map(m => m.month === month ? { ...m, [type]: m[type].filter((item: any) => item.id !== id) } : m));
  };

  const handleReset = () => {
    if (window.confirm("정말로 모든 데이터를 초기화하시겠습니까? (복구 불가능)")) {
      setData(getInitialData());
    }
  };

  // Stats
  const currentMonthData = data.find(m => m.month === selectedMonth) || getInitialData()[0];
  const currentMonthRevenue = currentMonthData.revenues.reduce((sum, r) => sum + r.amount, 0);
  const currentMonthPurchase = currentMonthData.purchases.reduce((sum, p) => sum + p.amount, 0);
  const currentMonthExpenditure = currentMonthData.expenditures.reduce((sum, e) => sum + e.amount, 0);
  const currentMonthProfit = currentMonthRevenue - currentMonthPurchase - currentMonthExpenditure;

  const yearlyRevenue = data.reduce((sum, m) => sum + m.revenues.reduce((s, r) => s + r.amount, 0), 0);
  const yearlyPurchase = data.reduce((sum, m) => sum + m.purchases.reduce((s, p) => s + p.amount, 0), 0);
  const yearlyExpenditure = data.reduce((sum, m) => sum + m.expenditures.reduce((s, e) => s + e.amount, 0), 0);
  const yearlyNetProfit = yearlyRevenue - yearlyPurchase - yearlyExpenditure;

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
            <button onClick={handleLogout} className="p-2 text-slate-300 hover:text-blue-500"><Unlock className="w-5 h-5" /></button>
          </div>
          <button onClick={handleReset} className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
            <Trash2 className="w-3 h-3" /> 데이터 초기화
          </button>
        </header>

        {/* YEARLY SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<ShoppingBag />} color="orange" label="연간 총 매입" value={formatCurrency(yearlyPurchase)} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 지출" value={formatCurrency(yearlyExpenditure)} />
          <SummaryCard icon={<CheckCircle2 />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
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

        {/* DAILY SUMMARY TABLES */}
        <DailyRevenueSummary revenues={currentMonthData.revenues} month={selectedMonth} onUpdateRevenue={(day, cat, amt) => handleUpdateRevenue(selectedMonth, day, cat, amt)} />
        <DailyAdSummary purchases={currentMonthData.purchases} month={selectedMonth} onUpdateAd={(day, cat, amt) => handleUpdateAd(selectedMonth, day, cat, amt)} />

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
      </div>
    </div>
  );
}

// Subcomponents
function SummaryCard({ icon, color, label, value }: any) {
  const colors: any = { 
    blue: "bg-blue-50 text-blue-600", 
    orange: "bg-orange-50 text-orange-600", 
    red: "bg-red-50 text-red-600", 
    green: "bg-green-50 text-green-600" 
  };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
      <CardContent className="p-8 flex items-center gap-5">
        <div className={`p-4 rounded-2xl ${colors[color]}`}>{React.cloneElement(icon, { size: 28 })}</div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
          <h3 className="text-xl font-black text-slate-900">{value}</h3>
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
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">금액</label>
      <div className="relative">
        <input type="text" value={value ? parseInt(value.replace(/[^0-9]/g, "")).toLocaleString() : ""} onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" className={`w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black text-right pr-10 focus:ring-2 outline-none ${rings[focusColor]}`} />
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

function DailyAdSummary({ purchases, month, onUpdateAd }: any) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const categories = ["네이버광고", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집광고"];
  const dailyData = days.map(day => {
    const dayExps = purchases.filter((e: any) => e.date === day && e.isAutoAd);
    const getAmt = (v: string) => dayExps.filter((e: any) => e.vendor === v).reduce((sum: number, e: any) => sum + e.amount, 0);
    const total = categories.reduce((sum, cat) => sum + getAmt(cat), 0);
    return { day, getAmt, total };
  });
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
        <CardTitle className="text-xl font-black flex items-center gap-2"><Percent className="w-6 h-6 text-purple-400" /> {month}월 광고비 일별 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 sticky top-0 font-black text-[10px] text-slate-400 uppercase tracking-widest">
              <tr><th className="px-6 py-4">날짜</th>{categories.map(cat => <th key={cat} className="px-6 py-4">{cat}</th>)}<th className="px-6 py-4 text-right">총액</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData.map(d => (
                <tr key={d.day} className={`hover:bg-slate-50 ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-6 py-4 font-black">{d.day}일</td>
                  {categories.map(cat => (
                    <td key={cat} className="px-2 py-2">
                      <input type="text" value={d.getAmt(cat) || ""} onChange={(e) => onUpdateAd(d.day, cat, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none text-center font-black text-blue-600 outline-none" placeholder="0" />
                    </td>
                  ))}
                  <td className="px-6 py-4 font-black text-right text-slate-900">{d.total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
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
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
        <CardTitle className="text-xl font-black flex items-center gap-2"><TrendingUp className="w-6 h-6 text-blue-400" /> {month}월 매출 일별 요약</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 sticky top-0 font-black text-[10px] text-slate-400 uppercase tracking-widest">
              <tr><th className="px-4 py-4 min-w-[60px]">날짜</th>{revCategories.map(cat => <th key={cat} className="px-2 py-4 min-w-[100px] text-center">{cat}</th>)}<th className="px-4 py-4 text-right">총액</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailyData.map(d => (
                <tr key={d.day} className={`hover:bg-slate-50 ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-4 py-4 font-black">{d.day}일</td>
                  {revCategories.map(cat => (
                    <td key={cat} className="px-1 py-2">
                      <input type="text" value={d.getAmt(cat) || ""} onChange={(e) => onUpdateRevenue(d.day, cat, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)} className="w-full bg-transparent border-none text-center font-black text-blue-500 outline-none" placeholder="0" />
                    </td>
                  ))}
                  <td className="px-4 py-4 font-black text-right text-slate-900">{d.total.toLocaleString()}원</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
