import React, { useState, useMemo, useEffect } from "react";
import { DollarSign, TrendingDown, TrendingUp, Plus, Trash2, Calendar, Percent, ChevronRight, Lock, KeyRound, Unlock, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

type RevenueCategory = string;

type RevenueEntry = {
  id: string;
  category: RevenueCategory;
  amount: number;
  date: string;
  vendor: string;
};

type Entry = {
  id: string;
  vendor: string;
  amount: number;
  date: string;
};

type MonthData = {
  month: number;
  revenues: RevenueEntry[];
  purchases: Entry[];
  expenditures: Entry[];
};

type Company = {
  id: string;
  name: string;
};

const getInitialData = (): MonthData[] => Array.from({ length: 12 }, (_, i) => ({
  month: i + 1,
  revenues: [],
  purchases: [],
  expenditures: [],
}));

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [isSettingPassword, setIsSettingPassword] = useState(false);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [data, setData] = useState<MonthData[]>(getInitialData());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);

  // Initial Authentication Check
  useEffect(() => {
    try {
      const saved = localStorage.getItem("surtax_market_password");
      if (saved) {
        setSavedPassword(saved);
        setIsSettingPassword(false);
      } else {
        setIsSettingPassword(true);
      }
    } catch (e) {
      console.error("Auth check failed", e);
      setIsSettingPassword(true);
    }
  }, []);

  // Form states
  const [newRevAmount, setNewRevAmount] = useState("");
  const [newRevCategory, setNewRevCategory] = useState<RevenueCategory>("스마트스토어");
  const [newRevDay, setNewRevDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  const [newPurVendor, setNewPurVendor] = useState("");
  const [newPurAmount, setNewPurAmount] = useState("");
  const [newPurDay, setNewPurDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  const [newExpVendor, setNewExpVendor] = useState("기타");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpDay, setNewExpDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  // Initial Load (Companies and Data)
  useEffect(() => {
    try {
      const savedCompanies = localStorage.getItem("surtax_market_companies");
      const savedActiveId = localStorage.getItem("surtax_market_active_id");
      
      let loadedCompanies: Company[] = [];
      if (savedCompanies) {
        loadedCompanies = JSON.parse(savedCompanies);
      }

      if (loadedCompanies.length === 0) {
        const defaultId = "company_" + Date.now();
        loadedCompanies = [{ id: defaultId, name: "신규 업체" }];
      }

      setCompanies(loadedCompanies);
      setActiveCompanyId(savedActiveId && loadedCompanies.find(c => c.id === savedActiveId) ? savedActiveId : loadedCompanies[0].id);
    } catch (e) {
      console.error("Initial load failed", e);
    }
  }, []);

  // Save Companies List
  useEffect(() => {
    if (companies.length > 0) {
      localStorage.setItem("surtax_market_companies", JSON.stringify(companies));
    }
  }, [companies]);

  // Load/Save Data for Active Company
  useEffect(() => {
    if (!activeCompanyId) return;
    
    localStorage.setItem("surtax_market_active_id", activeCompanyId);
    const savedData = localStorage.getItem(`surtax_market_data_${activeCompanyId}`);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        // Migration check: if old data only has 'expenses', move them to 'purchases'
        const migrated = parsed.map((m: any) => ({
          ...m,
          revenues: m.revenues || [],
          purchases: m.purchases || m.expenses || [],
          expenditures: m.expenditures || [],
          expenses: undefined 
        }));
        setData(migrated);
      } catch (e) {
        setData(getInitialData());
      }
    } else {
      setData(getInitialData());
    }
  }, [activeCompanyId]);

  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem(`surtax_market_data_${activeCompanyId}`, JSON.stringify(data));
    }
  }, [data, activeCompanyId]);

  const handleAddCompany = () => {
    const name = window.prompt("새 업체 이름을 입력하세요:");
    if (name && name.trim()) {
      const newId = "company_" + Date.now();
      const newCompany = { id: newId, name: name.trim() };
      setCompanies(prev => [...prev, newCompany]);
      setActiveCompanyId(newId);
    }
  };

  const handleReset = () => {
    if (window.confirm("현재 업체의 모든 데이터를 초기화하시겠습니까?")) {
      setData(getInitialData());
      localStorage.removeItem(`surtax_market_data_${activeCompanyId}`);
    }
  };

  const handleSetPassword = () => {
    if (inputPassword.length < 4) {
      alert("비밀번호는 최소 4자리 이상이어야 합니다.");
      return;
    }
    localStorage.setItem("surtax_market_password", inputPassword);
    setSavedPassword(inputPassword);
    setIsSettingPassword(false);
    setIsAuthenticated(true);
    setInputPassword("");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === savedPassword) {
      setIsAuthenticated(true);
      setInputPassword("");
    } else {
      alert("비밀번호가 일치하지 않습니다.");
      setInputPassword("");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Handlers
  const handleAddRevenue = (month: number) => {
    if (!newRevAmount.trim()) return;
    const amount = parseInt(newRevAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          revenues: [...(d.revenues || []), { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: "", 
            amount, 
            category: newRevCategory,
            date: newRevDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewRevAmount("");
  };

  const handleAddPurchase = (month: number) => {
    if (!newPurVendor.trim() || !newPurAmount.trim()) return;
    const amount = parseInt(newPurAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          purchases: [...(d.purchases || []), { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: newPurVendor.trim(), 
            amount, 
            date: newPurDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewPurVendor("");
    setNewPurAmount("");
  };

  const handleAddExpenditure = (month: number) => {
    if (!newExpVendor.trim() || !newExpAmount.trim()) return;
    const amount = parseInt(newExpAmount.replace(/[^0-9]/g, ""), 10) || 0;

    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          expenditures: [...(d.expenditures || []), { 
            id: Date.now().toString() + Math.random().toString(), 
            vendor: newExpVendor.trim(), 
            amount, 
            date: newExpDay.padStart(2, '0')
          }].sort((a, b) => a.date.localeCompare(b.date))
        };
      }
      return d;
    }));
    setNewExpVendor("기타");
    setNewExpAmount("");
  };

  const handleRemoveItem = (month: number, id: string, type: 'revenues' | 'purchases' | 'expenditures') => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        return {
          ...d,
          [type]: (d[type] as any[]).filter(item => item.id !== id)
        };
      }
      return d;
    }));
  };
  const handleUpdateRevenue = (month: number, day: string, category: string, amount: number) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        const otherRevenues = (d.revenues || []).filter(r => !(r.date === day && r.category === category));
        if (amount > 0) {
          return {
            ...d,
            revenues: [...otherRevenues, { 
              id: Date.now().toString() + Math.random().toString(), 
              vendor: "", 
              category,
              amount, 
              date: day 
            }].sort((a, b) => a.date.localeCompare(b.date) || a.category.localeCompare(b.category))
          };
        } else {
          return { ...d, revenues: otherRevenues };
        }
      }
      return d;
    }));
  };

  const handleUpdateExpenditure = (month: number, day: string, vendor: string, amount: number) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        const otherExps = (d.expenditures || []).filter(e => !(e.date === day && e.vendor === vendor));
        if (amount > 0) {
          return {
            ...d,
            expenditures: [...otherExps, { 
              id: Date.now().toString() + Math.random().toString(), 
              vendor, 
              amount, 
              date: day 
            }].sort((a, b) => a.date.localeCompare(b.date) || a.vendor.localeCompare(b.vendor))
          };
        } else {
          return { ...d, expenditures: otherExps };
        }
      }
      return d;
    }));
  };

  const handleUpdateAd = (month: number, day: string, category: string, amount: number) => {
    setData(prev => prev.map(d => {
      if (d.month === month) {
        const otherPurchases = (d.purchases || []).filter(p => !(p.date === day && p.vendor === category));
        if (amount > 0) {
          return {
            ...d,
            purchases: [...otherPurchases, { 
              id: Date.now().toString() + Math.random().toString(), 
              vendor: category, 
              amount, 
              date: day 
            }].sort((a, b) => a.date.localeCompare(b.date) || a.vendor.localeCompare(b.vendor))
          };
        } else {
          return { ...d, purchases: otherPurchases };
        }
      }
      return d;
    }));
  };

  // Calculations
  const calculateTotal = (items: any[]) => items?.reduce((sum, r) => sum + r.amount, 0) || 0;

  const yearlyRevenue = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.revenues), 0), [data]);
  const yearlyPurchase = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.purchases), 0), [data]);
  const yearlyExpenditure = useMemo(() => data.reduce((sum, m) => sum + calculateTotal(m.expenditures), 0), [data]);
  const yearlyNetProfit = yearlyRevenue - (yearlyPurchase + yearlyExpenditure);
  const yearlyPurchaseRatio = yearlyRevenue > 0 ? ((yearlyPurchase / yearlyRevenue) * 100).toFixed(1) : "0.0";

  const chartData = useMemo(() => data.map(m => ({
    month: m.month,
    revenue: calculateTotal(m.revenues),
    purchase: calculateTotal(m.purchases),
    expenditure: calculateTotal(m.expenditures),
  })), [data]);

  const currentMonthData = data.find(d => d.month === selectedMonth)!;
  const currentMonthRevenue = calculateTotal(currentMonthData.revenues);
  const currentMonthPurchase = calculateTotal(currentMonthData.purchases);
  const currentMonthExpenditure = calculateTotal(currentMonthData.expenditures);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
          <Card className="border-none shadow-2xl shadow-blue-500/10 rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
            <CardContent className="p-10 text-center">
              <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-600/30">
                {isSettingPassword ? <Lock className="w-10 h-10 text-white" /> : <KeyRound className="w-10 h-10 text-white" />}
              </div>
              <h2 className="text-3xl font-black mb-3 tracking-tight">{isSettingPassword ? "보안 비밀번호 설정" : "보호된 장부"}</h2>
              <p className="text-slate-600 text-sm mb-10 font-medium leading-relaxed whitespace-pre-line">
                {isSettingPassword ? "장부 데이터를 안전하게 보호하기 위해\n새로운 비밀번호를 설정해 주세요." : "이 앱은 비밀번호로 보호되어 있습니다.\n접근하려면 비밀번호를 입력하세요."}
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
        <header className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-4">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 whitespace-nowrap">마켓 통합 회계 장부</h1>
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
                <span className="text-lg font-black text-blue-600">(ES)</span>
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-600 hover:text-blue-500 transition-colors"><Unlock className="w-5 h-5" /></button>
            </div>
          </div>
          <button onClick={handleReset} className="px-4 py-2 text-xs font-black text-red-500 hover:bg-red-50 rounded-lg border border-red-100 transition-colors flex items-center gap-2"><Trash2 className="w-3 h-3" /> 데이터 초기화</button>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
          <SummaryCard icon={<TrendingUp />} color="blue" label="연간 총 매출액" value={formatCurrency(yearlyRevenue)} />
          <SummaryCard icon={<ShoppingBag />} color="orange" label="연간 총 매입액" value={formatCurrency(yearlyPurchase)} subtext={`매출대비 ${yearlyPurchaseRatio}%`} />
          <SummaryCard icon={<TrendingDown />} color="red" label="연간 총 지출액" value={formatCurrency(yearlyExpenditure)} />
          <SummaryCard icon={<DollarSign />} color="green" label="연간 순이익" value={formatCurrency(yearlyNetProfit)} />
          <SummaryCard icon={<Percent />} color="purple" label="연간 매입 비율" value={`${yearlyPurchaseRatio}%`} subtext="지출 제외" />
        </div>

        <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
          <CardHeader><CardTitle className="text-lg font-black flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-500" /> 월별 회계 추이 (매출/매입/지출)</CardTitle></CardHeader>
          <CardContent>
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
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="flex overflow-x-auto pb-4 gap-2 snap-x no-scrollbar">
          {data.map(m => (
            <button key={m.month} onClick={() => setSelectedMonth(m.month)} className={`px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition snap-start border-2 ${selectedMonth === m.month ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/20' : 'bg-white text-slate-700 hover:bg-slate-100 border-white shadow-sm'}`}>{m.month}월</button>
          ))}
        </div>

        <div className="space-y-6">
          <DailyEntryTable 
            title="일별 매출 입력/집계" 
            items={currentMonthData.revenues} 
            month={selectedMonth} 
            categories={["스마트스토어", "쿠팡윙", "쿠팡로켓배송", "오늘의집매출", "옥션", "G마켓", "11번가", "도매", "현금입금", "기타"]} 
            icon={<TrendingUp className="w-6 h-6 text-blue-400" />} 
            color="blue" 
            onUpdate={(day, cat, amt) => handleUpdateRevenue(selectedMonth, day, cat, amt)}
            dataKey="category"
          />

          <DailyEntryTable 
            title="일별 광고비(매입) 입력/집계" 
            items={currentMonthData.purchases} 
            month={selectedMonth} 
            categories={["네이버광고비", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집 광고비"]} 
            icon={<Percent className="w-6 h-6 text-purple-400" />} 
            color="orange" 
            onUpdate={(day, cat, amt) => handleUpdateAd(selectedMonth, day, cat, amt)} 
          />


        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Revenue */}
          <SectionCard title={`${selectedMonth}월 매출 상세`} total={currentMonthRevenue} color="blue" icon={<Calendar className="w-6 h-6 text-blue-400" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddRevenue(selectedMonth); }} className="space-y-4 mb-8 bg-blue-50/50 p-6 rounded-3xl border border-blue-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newRevDay} onChange={setNewRevDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">스토어명</label>
                  <input 
                    list="revenue-options"
                    type="text" 
                    value={newRevCategory} 
                    onChange={(e) => setNewRevCategory(e.target.value)} 
                    placeholder="스토어명 직접 입력"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["스마트스토어", "쿠팡윙", "쿠팡로켓배송", "오늘의집매출", "옥션", "G마켓", "11번가", "홈페이지", "ns홈쇼핑", "에이블리", "토스쇼핑", "도매", "현금입금", "기타"].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewRevCategory(cat)}
                        className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all ${newRevCategory === cat ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <datalist id="revenue-options">
                    <option value="스마트스토어" />
                    <option value="쿠팡윙" />
                    <option value="쿠팡로켓배송" />
                    <option value="오늘의집매출" />
                    <option value="옥션" />
                    <option value="G마켓" />
                    <option value="11번가" />
                    <option value="홈페이지" />
                    <option value="ns홈쇼핑" />
                    <option value="에이블리" />
                    <option value="토스쇼핑" />
                    <option value="도매" />
                    <option value="현금입금" />
                    <option value="기타" />
                  </datalist>
                </div>
              </div>
              <AmountInput value={newRevAmount} onChange={setNewRevAmount} focusColor="blue" />
              <button type="submit" disabled={!newRevAmount.trim()} className="w-full py-4 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 disabled:opacity-50 transition">매출 추가</button>
            </form>
            <ItemList items={currentMonthData.revenues} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'revenues')} color="blue" />
          </SectionCard>

          {/* Purchase */}
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
            <ItemList items={currentMonthData.purchases} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'purchases')} color="orange" />
          </SectionCard>

          {/* Expenditure */}
          <SectionCard title={`${selectedMonth}월 지출 상세`} total={currentMonthExpenditure} color="red" icon={<TrendingDown className="w-6 h-6 text-red-500" />}>
            <form onSubmit={(e) => { e.preventDefault(); handleAddExpenditure(selectedMonth); }} className="space-y-4 mb-8 bg-red-50/50 p-6 rounded-3xl border border-red-100">
              <div className="grid grid-cols-2 gap-4">
                <DaySelect value={newExpDay} onChange={setNewExpDay} month={selectedMonth} />
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">지출항목</label>
                  <input 
                    list="expenditure-options"
                    type="text" 
                    value={newExpVendor} 
                    onChange={(e) => setNewExpVendor(e.target.value)} 
                    placeholder="지출 항목 직접 입력"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" 
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {["식비/간식비", "택배/운송비", "소모품비", "네이버광고비", "쿠팡로켓광고", "쿠팡윙광고", "기타"].map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewExpVendor(cat)}
                        className={`text-[10px] font-black px-2 py-1 rounded-lg border transition-all ${newExpVendor === cat ? 'bg-red-500 border-red-500 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-red-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <datalist id="expenditure-options">
                    <option value="식비/간식비" />
                    <option value="택배/운송비" />
                    <option value="소모품비" />
                    <option value="네이버광고비" />
                    <option value="쿠팡로켓광고" />
                    <option value="쿠팡윙광고" />
                    <option value="오늘의집 광고비" />
                    <option value="기타" />
                  </datalist>
                </div>
              </div>
              <AmountInput value={newExpAmount} onChange={setNewExpAmount} focusColor="red" />
              <button type="submit" disabled={!newExpVendor.trim() || !newExpAmount.trim()} className="w-full py-4 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 disabled:opacity-50 transition">지출 추가</button>
            </form>
            <ItemList items={currentMonthData.expenditures} onRemove={(id) => handleRemoveItem(selectedMonth, id, 'expenditures')} color="red" />
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, color, label, value, subtext }: any) {
  const colors: any = { blue: "bg-blue-50 text-blue-600", orange: "bg-orange-50 text-orange-600", red: "bg-red-50 text-red-600", green: "bg-green-50 text-green-600", purple: "bg-purple-50 text-purple-600" };
  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem]">
      <CardContent className="p-8">
        <div className="flex items-center gap-5">
          <div className={`p-4 ${colors[color]} rounded-[1.25rem] shadow-sm`}>
            {React.cloneElement(icon as React.ReactElement, { size: 28 })}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{label}</p>
              {subtext && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${colors[color]}`}>
                  {subtext}
                </span>
              )}
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

function DailyEntryTable({ 
  items, 
  month, 
  categories, 
  title, 
  icon, 
  color, 
  onUpdate,
  dataKey = "vendor"
}: { 
  items: any[], 
  month: number, 
  categories: string[], 
  title: string, 
  icon: React.ReactNode, 
  color: string, 
  onUpdate: (day: string, cat: string, amt: number) => void,
  dataKey?: "vendor" | "category"
}) {
  const daysInMonth = new Date(2026, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));

  const tableData = days.map(day => {
    const dayItems = items.filter(e => e.date === day);
    const catData: any = { day };
    let total = 0;
    categories.forEach(cat => {
      const amt = dayItems.filter(e => (e as any)[dataKey] === cat).reduce((sum, e) => sum + e.amount, 0);
      catData[cat] = amt;
      total += amt;
    });
    return { ...catData, total };
  });

  const formatKRW = (amount: number) => new Intl.NumberFormat('ko-KR').format(amount);
  
  const textColors: any = { blue: "text-blue-600", orange: "text-orange-600", red: "text-red-600" };
  const ringColors: any = { blue: "focus:ring-blue-100", orange: "focus:ring-orange-100", red: "focus:ring-red-100" };

  return (
    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] overflow-hidden">
      <CardHeader className="bg-slate-900 text-white pb-6 pt-8">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl font-black flex items-center gap-2">
            {icon} {month}월 {title}
          </CardTitle>
          <p className="hidden md:block text-xs font-black text-slate-500">금액을 입력하면 실시간으로 저장됩니다.</p>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[450px] overflow-auto no-scrollbar">
          <table className="w-full text-sm text-left border-collapse min-w-[800px]">
            <thead className="text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-50 sticky top-0 z-20 shadow-sm">
              <tr>
                <th className="px-6 py-4 sticky left-0 bg-slate-50 z-30">날짜</th>
                {categories.map(cat => (
                  <th key={cat} className="px-6 py-4">{cat}</th>
                ))}
                <th className="px-6 py-4 text-right sticky right-0 bg-slate-50 z-30">합계</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((d) => (
                <tr key={d.day} className={`hover:bg-slate-50 transition-colors ${d.total > 0 ? "bg-white" : "bg-slate-50/20 opacity-60"}`}>
                  <td className="px-6 py-4 font-black text-slate-700 sticky left-0 bg-inherit z-10 border-r border-slate-50">{d.day}일</td>
                  {categories.map(cat => (
                    <td key={cat} className="px-2 py-1">
                      <input 
                        type="text" 
                        value={d[cat] > 0 ? d[cat].toLocaleString() : ""} 
                        onChange={(e) => onUpdate(d.day, cat, parseInt(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                        placeholder="0"
                        className={`w-full bg-transparent border-none font-black text-right pr-4 rounded-lg px-2 py-2 text-sm outline-none focus:ring-1 ${textColors[color]} ${ringColors[color]}`}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 font-black text-slate-900 text-right sticky right-0 bg-slate-50/90 z-10 border-l border-slate-50">{formatKRW(d.total)}원</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 text-white font-black sticky bottom-0 z-20 shadow-up">
              <tr>
                <td className="px-6 py-4 sticky left-0 bg-slate-900 z-30">총계</td>
                {categories.map(cat => (
                  <td key={cat} className="px-6 py-4 text-slate-300 text-right pr-6">
                    {formatKRW(tableData.reduce((sum, d) => sum + d[cat], 0))}
                  </td>
                ))}
                <td className="px-6 py-4 text-right text-purple-300 sticky right-0 bg-slate-900 z-30">
                  {formatKRW(tableData.reduce((sum, d) => sum + d.total, 0))}원
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
