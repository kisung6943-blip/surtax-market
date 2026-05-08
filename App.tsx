import React, { useState, useEffect, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  ShoppingBag, 
  Plus, 
  Trash2, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Upload,
  Percent,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';


// --- Types ---
type Category = string;
type RevenueCategory = string;

interface Entry {
  id: string;
  date: string;
  amount: number;
  category?: Category;
  vendor?: string;
}

interface MonthlyData {
  month: string;
  revenues: Entry[];
  purchases: Entry[];
  expenditures: Entry[];
}

interface Company {
  id: string;
  name: string;
}

// --- Components ---
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-3xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
}

export default function App() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string | null>(null);
  const [data, setData] = useState<MonthlyData[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));


  // Form states
  const [newRevAmount, setNewRevAmount] = useState("");
  const [newRevCategory, setNewRevCategory] = useState<RevenueCategory>("스마트스토어");
  const [newRevDay, setNewRevDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  const [newPurVendor, setNewPurVendor] = useState("");
  const [newPurAmount, setNewPurAmount] = useState("");
  const [newPurDay, setNewPurDay] = useState(new Date().getDate().toString().padStart(2, '0'));

  const [newExpVendor, setNewExpVendor] = useState("");
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

      const savedData = localStorage.getItem("surtax_market_data");
      if (savedData) {
        setData(JSON.parse(savedData));
      }
    } catch (err) {
      console.error("Failed to load local data", err);
    }
  }, []);



  // Save to LocalStorage when data changes
  useEffect(() => {
    if (data.length > 0) {
      localStorage.setItem("surtax_market_data", JSON.stringify(data));
    }
  }, [data]);

  // Update active company in localStorage
  useEffect(() => {
    if (activeCompanyId) {
      localStorage.setItem("surtax_market_active_id", activeCompanyId);
    }
  }, [activeCompanyId]);

  // Helper: Get Current Month Data
  const currentMonthData = useMemo(() => {
    const monthData = data.find(d => d.month === selectedMonth);
    return monthData || { month: selectedMonth, revenues: [], purchases: [], expenditures: [] };
  }, [data, selectedMonth]);

  // Totals
  const currentMonthRevenue = currentMonthData.revenues.reduce((sum, item) => sum + item.amount, 0);
  const currentMonthPurchase = currentMonthData.purchases.reduce((sum, item) => sum + item.amount, 0);
  const currentMonthExpenditure = currentMonthData.expenditures.reduce((sum, item) => sum + item.amount, 0);
  const currentMonthProfit = currentMonthRevenue - currentMonthPurchase - currentMonthExpenditure;

  // Handlers
  const handleAddRevenue = (month: string) => {
    const amount = parseInt(newRevAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;
    
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      const newEntry = { id: Date.now().toString(), date: `${month}-${newRevDay}`, amount, category: newRevCategory };
      
      if (monthIdx >= 0) {
        newData[monthIdx] = { ...newData[monthIdx], revenues: [...newData[monthIdx].revenues, newEntry] };
      } else {
        newData.push({ month, revenues: [newEntry], purchases: [], expenditures: [] });
      }
      return newData;
    });
    setNewRevAmount("");
  };

  const handleUpdateRevenue = (month: string, day: string, category: string, amount: number) => {
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      const date = `${month}-${day}`;
      
      if (monthIdx >= 0) {
        const revenues = [...newData[monthIdx].revenues];
        const existingIdx = revenues.findIndex(r => r.date === date && r.category === category);
        
        if (existingIdx >= 0) {
          if (amount === 0) {
            revenues.splice(existingIdx, 1);
          } else {
            revenues[existingIdx] = { ...revenues[existingIdx], amount };
          }
        } else if (amount > 0) {
          revenues.push({ id: Date.now().toString(), date, category, amount });
        }
        newData[monthIdx] = { ...newData[monthIdx], revenues };
      } else if (amount > 0) {
        newData.push({ month, revenues: [{ id: Date.now().toString(), date, category, amount }], purchases: [], expenditures: [] });
      }
      return newData;
    });
  };

  const handleAddPurchase = (month: string) => {
    const amount = parseInt(newPurAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;
    
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      const newEntry = { id: Date.now().toString(), date: `${month}-${newPurDay}`, amount, vendor: newPurVendor };
      
      if (monthIdx >= 0) {
        newData[monthIdx] = { ...newData[monthIdx], purchases: [...newData[monthIdx].purchases, newEntry] };
      } else {
        newData.push({ month, revenues: [], purchases: [newEntry], expenditures: [] });
      }
      return newData;
    });
    setNewPurAmount("");
  };

  const handleUpdateAd = (month: string, day: string, vendor: string, amount: number) => {
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      const date = `${month}-${day}`;
      
      if (monthIdx >= 0) {
        const purchases = [...newData[monthIdx].purchases];
        const existingIdx = purchases.findIndex(p => p.date === date && p.vendor === vendor);
        
        if (existingIdx >= 0) {
          if (amount === 0) {
            purchases.splice(existingIdx, 1);
          } else {
            purchases[existingIdx] = { ...purchases[existingIdx], amount };
          }
        } else if (amount > 0) {
          purchases.push({ id: Date.now().toString(), date, vendor, amount });
        }
        newData[monthIdx] = { ...newData[monthIdx], purchases };
      } else if (amount > 0) {
        newData.push({ month, revenues: [], purchases: [{ id: Date.now().toString(), date, vendor, amount }], expenditures: [] });
      }
      return newData;
    });
  };

  const handleAddExpenditure = (month: string) => {
    const amount = parseInt(newExpAmount.replace(/,/g, ''));
    if (isNaN(amount)) return;
    
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      const newEntry = { id: Date.now().toString(), date: `${month}-${newExpDay}`, amount, vendor: newExpVendor };
      
      if (monthIdx >= 0) {
        newData[monthIdx] = { ...newData[monthIdx], expenditures: [...newData[monthIdx].expenditures, newEntry] };
      } else {
        newData.push({ month, revenues: [], purchases: [], expenditures: [newEntry] });
      }
      return newData;
    });
    setNewExpVendor("");
    setNewExpAmount("");
  };

  const handleRemoveItem = (month: string, id: string, type: 'revenues' | 'purchases' | 'expenditures') => {
    setData(prev => {
      const newData = [...prev];
      const monthIdx = newData.findIndex(d => d.month === month);
      if (monthIdx >= 0) {
        newData[monthIdx] = { ...newData[monthIdx], [type]: newData[monthIdx][type].filter((item: any) => item.id !== id) };
      }
      return newData;
    });
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8 font-['Outfit'] text-slate-900">
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-600 rounded-3xl shadow-lg shadow-blue-200">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">매출/매입 장부</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">로컬 보관 모드</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select 
              value={activeCompanyId || ""} 
              onChange={(e) => setActiveCompanyId(e.target.value)}
              className="px-6 py-4 bg-white border-none shadow-xl shadow-slate-200/50 rounded-2xl font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer appearance-none"
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button 
              onClick={() => {
                const name = prompt("업체명을 입력하세요:");
                if (name) {
                  const newCompany = { id: "company_" + Date.now(), name };
                  setCompanies([...companies, newCompany]);
                  setActiveCompanyId(newCompany.id);
                  localStorage.setItem("surtax_market_companies", JSON.stringify([...companies, newCompany]));
                }
              }}
              className="p-4 bg-white text-slate-600 rounded-2xl shadow-xl shadow-slate-200/50 hover:bg-slate-50 transition-all"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Month Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 bg-white p-3 rounded-[2.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
          {Array.from({ length: 12 }, (_, i) => {
            const m = `${new Date().getFullYear()}-${(i + 1).toString().padStart(2, '0')}`;
            const isActive = selectedMonth === m;
            return (
              <button
                key={m}
                onClick={() => setSelectedMonth(m)}
                className={`px-6 py-3 rounded-2xl font-black transition-all ${
                  isActive 
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-300 scale-105' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              >
                {i + 1}월
              </button>
            );
          })}
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard label="총 매출" value={currentMonthRevenue} color="blue" icon={<TrendingUp />} />
          <SummaryCard label="광고비(매입)" value={currentMonthPurchase} color="purple" icon={<Percent />} />
          <SummaryCard label="기타 지출" value={currentMonthExpenditure} color="red" icon={<TrendingDown />} />
          <SummaryCard label="당월 순이익" value={currentMonthProfit} color={currentMonthProfit >= 0 ? "green" : "red"} icon={<CheckCircle2 />} subtext="매출 - 매입 - 지출" />
        </div>

        {/* Daily Entry Tables */}
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
            title="일별 광고비 입력/집계" 
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
          <SectionCard title={`${selectedMonth}월 매출 상세`} total={currentMonthRevenue} color="blue" icon={<TrendingUp className="w-6 h-6 text-blue-500" />}>
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
                    placeholder="스토어명 입력" 
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black" 
                  />
                  <datalist id="revenue-options">
                    {["스마트스토어", "쿠팡윙", "쿠팡로켓배송", "오늘의집매출", "옥션", "G마켓", "11번가", "홈페이지", "ns홈쇼핑", "에이블리", "토스쇼핑", "도매", "현금입금", "기타"].map(opt => (
                      <option key={opt} value={opt} />
                    ))}
                  </datalist>
                </div>
              </div>
              <AmountInput value={newRevAmount} onChange={setNewRevAmount} focusColor="blue" />
              <button type="submit" disabled={!newRevCategory.trim() || !newRevAmount.trim()} className="w-full py-4 bg-blue-500 text-white rounded-xl font-black hover:bg-blue-600 disabled:opacity-50 transition">매출 추가</button>
            </form>
            <ItemList 
              items={currentMonthData.revenues} 
              onRemove={(id) => handleRemoveItem(selectedMonth, id, 'revenues')} 
              color="blue" 
            />
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
            <ItemList 
              items={currentMonthData.purchases.filter(p => !["네이버광고비", "쿠팡로켓광고", "쿠팡윙광고", "오늘의집 광고비"].includes(p.vendor))} 
              onRemove={(id) => handleRemoveItem(selectedMonth, id, 'purchases')} 
              color="orange" 
            />
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
          <div className={`p-4 rounded-2xl ${colors[color] || colors.blue}`}>
            {React.cloneElement(icon, { className: "w-7 h-7" })}
          </div>
          <div>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{label}</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl font-black">₩{value.toLocaleString()}</p>
            </div>
            {subtext && <p className="text-[10px] font-bold text-slate-400 mt-1">{subtext}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, total, children, color, icon }: any) {
  const borderColors: any = { blue: "border-blue-100", orange: "border-orange-100", red: "border-red-100" };
  const textColors: any = { blue: "text-blue-600", orange: "text-orange-600", red: "text-red-600" };

  return (
    <Card className={`border ${borderColors[color]} shadow-2xl shadow-slate-200/30 rounded-[2.5rem]`}>
      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
        <div className="flex items-center gap-3">
          {icon}
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <p className={`text-xl font-black ${textColors[color]}`}>₩{total.toLocaleString()}</p>
      </div>
      <CardContent className="p-8">
        {children}
      </CardContent>
    </Card>
  );
}

function DaySelect({ value, onChange, month }: any) {
  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">날짜(일)</label>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl font-black outline-none focus:ring-2 focus:ring-slate-400 transition-all appearance-none cursor-pointer"
      >
        {Array.from({ length: daysInMonth }, (_, i) => {
          const d = (i + 1).toString().padStart(2, '0');
          return <option key={d} value={d}>{d}일</option>;
        })}
      </select>
    </div>
  );
}

function AmountInput({ value, onChange, focusColor }: any) {
  const ringColors: any = { blue: "focus:ring-blue-500", orange: "focus:ring-orange-500", red: "focus:ring-red-500" };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    onChange(val ? parseInt(val).toLocaleString() : "");
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1">금액</label>
      <div className="relative">
        <input 
          type="text" 
          value={value} 
          onChange={handleChange}
          placeholder="0"
          className={`w-full pl-6 pr-12 py-4 bg-white border border-slate-200 rounded-2xl font-black text-2xl text-right outline-none ring-offset-2 transition-all ${ringColors[focusColor] || "focus:ring-slate-400"} focus:ring-2`}
        />
        <span className="absolute right-5 top-1/2 -translate-y-1/2 font-black text-slate-400">원</span>
      </div>
    </div>
  );
}

function ItemList({ items, onRemove, color }: any) {
  const textColors: any = { blue: "text-blue-600", orange: "text-orange-600", red: "text-red-600" };
  const sortedItems = [...items].sort((a, b) => b.date.localeCompare(a.date));

  if (sortedItems.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="w-8 h-8 text-slate-300" />
        </div>
        <p className="text-slate-400 font-bold">내역이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2">리스트</p>
      {sortedItems.map((item: any) => (
        <div key={item.id} className="group flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:border-slate-200 hover:shadow-lg hover:shadow-slate-200/30 transition-all">
          <div className="flex items-center gap-5">
            <div className="text-center bg-slate-50 px-3 py-2 rounded-2xl">
              <p className="text-[10px] font-black text-slate-400 leading-tight">{item.date.split('-')[1]}월</p>
              <p className="text-sm font-black text-slate-600">{item.date.split('-')[2]}일</p>
            </div>
            <div>
              <p className={`text-[10px] font-black ${textColors[color]}`}>{item.category || item.vendor}</p>
              <p className="font-black text-slate-700">{item.category || item.vendor}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="font-black text-lg">₩{item.amount.toLocaleString()}</p>
            <button 
              onClick={() => onRemove(item.id)}
              className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyEntryTable({ title, items, month, categories, icon, color, onUpdate, dataKey = "vendor" }: any) {
  const daysInMonth = new Date(parseInt(month.split('-')[0]), parseInt(month.split('-')[1]), 0).getDate();
  const dayList = Array.from({ length: daysInMonth }, (_, i) => (i + 1).toString().padStart(2, '0'));
  
  const colors: any = {
    blue: { bg: "bg-blue-600", text: "text-blue-600", light: "bg-blue-50" },
    orange: { bg: "bg-orange-500", text: "text-orange-500", light: "bg-orange-50" },
    red: { bg: "bg-red-500", text: "text-red-500", light: "bg-red-50" }
  };

  const getAmount = (day: string, category: string) => {
    const date = `${month}-${day}`;
    const entry = items.find((i: any) => i.date === date && (i[dataKey] === category));
    return entry ? entry.amount : 0;
  };

  const totals = categories.map((cat: string) => 
    items.filter((i: any) => i[dataKey] === cat).reduce((sum: number, i: any) => sum + i.amount, 0)
  );
  
  const grandTotal = totals.reduce((sum: number, t: number) => sum + t, 0);

  return (
    <Card className="border border-slate-100 shadow-2xl shadow-slate-200/30 rounded-[2.5rem]">
      <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/10 rounded-xl">
            {React.cloneElement(icon, { className: "w-6 h-6 text-white" })}
          </div>
          <h2 className="text-xl font-black">{parseInt(month.split('-')[1])}월 {title}</h2>
        </div>
        <p className="text-xs font-bold opacity-60">금액을 입력하면 실시간으로 저장됩니다.</p>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky left-0 bg-white z-10">날짜</th>
              {categories.map((cat: string) => (
                <th key={cat} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center min-w-[120px]">{cat}</th>
              ))}
              <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center sticky right-0 bg-white z-10">합계</th>
            </tr>
          </thead>
          <tbody>
            {dayList.map(day => {
              const dayTotal = categories.reduce((sum: number, cat: string) => sum + getAmount(day, cat), 0);
              return (
                <tr key={day} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-all">
                  <td className="p-4 text-center sticky left-0 bg-white z-10">
                    <div className="w-10 h-10 flex flex-col items-center justify-center rounded-xl bg-slate-50 mx-auto">
                      <span className="text-xs font-black text-slate-600">{day}</span>
                      <span className="text-[8px] font-bold text-slate-400">일</span>
                    </div>
                  </td>
                  {categories.map((cat: string) => (
                    <td key={cat} className="p-2">
                      <input 
                        type="text"
                        value={getAmount(day, cat) || ""}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '');
                          onUpdate(day, cat, val ? parseInt(val) : 0);
                        }}
                        placeholder="0"
                        className="w-full p-3 bg-transparent text-center font-black text-blue-600 focus:bg-white focus:shadow-inner rounded-xl outline-none transition-all placeholder:opacity-20"
                      />
                    </td>
                  ))}
                  <td className="p-4 text-center sticky right-0 bg-white z-10 border-l border-slate-50">
                    <p className="font-black text-sm text-slate-700">{dayTotal.toLocaleString()}원</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-900 text-white">
              <td className="p-6 font-black text-center sticky left-0 bg-slate-900">총계</td>
              {totals.map((t: number, i: number) => (
                <td key={i} className="p-6 text-center font-black text-lg">{t.toLocaleString()}</td>
              ))}
              <td className="p-6 text-center sticky right-0 bg-slate-900 border-l border-white/10">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black">{grandTotal.toLocaleString()}</span>
                  <span className="text-[10px] font-bold opacity-60">원</span>
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
}
