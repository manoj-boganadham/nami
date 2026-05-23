import React, { useState, useEffect } from "react";
import { Sun, Moon, Calendar, Coins, TrendingUp, Flag, List, BookOpen } from "lucide-react";
import { NamiLogo } from "./components/NamiLogo";
import { NamiNavigator } from "./components/NamiNavigator";
import { CategoryPanel } from "./components/CategoryPanel";
import { TrendChart } from "./components/TrendChart";
import { TransactionList } from "./components/TransactionList";
import { LogBookPanel } from "./components/LogBookPanel";

interface Transaction {
  id: number;
  raw_message_id: number;
  amount: number;
  category: string | null;
  description: string;
  timestamp: string;
  created_at: string;
}

interface StatsData {
  total_spend: number;
  category_breakdown: Record<string, number>;
  seven_day_trend: { date: string; amount: number }[];
  todays_haul: number;
  flagged_count: number;
}

type DateRangePreset = "today" | "7d" | "30d" | "custom";
type DashboardTab = "chart" | "logbook";

export const App: React.FC = () => {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("nami-theme") as "light" | "dark") || "light"
  );

  // Tab State (Chart Room vs Log Book)
  const [activeTab, setActiveTab] = useState<DashboardTab>("chart");

  // Date range presets state
  const [preset, setPreset] = useState<DateRangePreset>("7d");
  
  // Custom date range state
  const todayStr = new Date().toISOString().split("T")[0];
  const [customFrom, setCustomFrom] = useState<string>(todayStr);
  const [customTo, setCustomTo] = useState<string>(todayStr);

  // Computed API filter dates
  const [fromFilter, setFromFilter] = useState<string>("");
  const [toFilter, setToFilter] = useState<string>("");

  // API Data states
  const [stats, setStats] = useState<StatsData>({
    total_spend: 0,
    category_breakdown: {},
    seven_day_trend: [],
    todays_haul: 0,
    flagged_count: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Trigger state to manually force data refresh
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Apply theme class on load / change
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else {
      root.removeAttribute("data-theme");
    }
    localStorage.setItem("nami-theme", theme);
  }, [theme]);

  // Compute from/to filters based on active preset
  useEffect(() => {
    const today = new Date();
    let fromDate = new Date();
    
    if (preset === "today") {
      const dateStr = today.toISOString().split("T")[0];
      setFromFilter(dateStr);
      setToFilter(dateStr);
    } else if (preset === "7d") {
      fromDate.setDate(today.getDate() - 6); // Last 7 days including today
      setFromFilter(fromDate.toISOString().split("T")[0]);
      setToFilter(today.toISOString().split("T")[0]);
    } else if (preset === "30d") {
      fromDate.setDate(today.getDate() - 29); // Last 30 days
      setFromFilter(fromDate.toISOString().split("T")[0]);
      setToFilter(today.toISOString().split("T")[0]);
    } else if (preset === "custom") {
      setFromFilter(customFrom);
      setToFilter(customTo);
    }
  }, [preset, customFrom, customTo]);

  // Fetch API data when filter dates change or a refresh is triggered
  useEffect(() => {
    if (!fromFilter || !toFilter) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const statsRes = await fetch(`/api/stats?from=${fromFilter}&to=${toFilter}`);
        if (!statsRes.ok) throw new Error("Failed to load statistics");
        const statsData = await statsRes.json();
        setStats(statsData);

        const txRes = await fetch(`/api/transactions?from=${fromFilter}&to=${toFilter}`);
        if (!txRes.ok) throw new Error("Failed to load transactions");
        const txData = await txRes.json();
        setTransactions(txData);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An error occurred while fetching ledger data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [fromFilter, toFilter, refreshTrigger]);

  const handleUpdateCategory = async (id: number, category: string) => {
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ category }),
      });
      if (!response.ok) throw new Error("Failed to update category");
      
      // Force trigger refresh of stats and transaction lists
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      alert("Error saving category update");
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const uncategorizedCount = transactions.filter((tx) => !tx.category).length;

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary p-4 md:p-8 flex flex-col font-sans transition-colors duration-200">
      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-border-default/50 mb-6 gap-4">
        <div className="flex items-center space-x-3">
          <NamiLogo className="h-10 w-10 text-accent-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold font-cinzel text-accent-primary tracking-wide leading-none flex items-center">
              Nami
            </h1>
            <p className="text-[10px] text-text-tertiary font-bold tracking-widest uppercase mt-1">
              Berry Tracker · Personal Finance
            </p>
          </div>
        </div>

        {/* Navigation Tabs + Date Filter Pills + Theme Toggle */}
        <div className="flex items-center space-x-3 self-end md:self-auto flex-wrap gap-y-2">
          {/* Main Navigation (Chart Room vs Log Book) */}
          <div className="flex items-center bg-bg-surface p-1 rounded-full border border-border-default">
            <button
              onClick={() => setActiveTab("chart")}
              className={`flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${
                activeTab === "chart"
                  ? "bg-accent-primary text-bg-primary shadow"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
              }`}
            >
              <Coins className="h-3 w-3 mr-1" />
              The Chart Room
            </button>
            <button
              onClick={() => setActiveTab("logbook")}
              className={`flex items-center px-3.5 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${
                activeTab === "logbook"
                  ? "bg-accent-primary text-bg-primary shadow"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
              }`}
            >
              <BookOpen className="h-3 w-3 mr-1" />
              The Log Book
            </button>
          </div>

          {/* Date range presets (only visible in Chart Room) */}
          {activeTab === "chart" && (
            <div className="flex items-center bg-bg-surface p-1 rounded-full border border-border-default animate-in fade-in duration-200">
              {(["today", "7d", "30d", "custom"] as DateRangePreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPreset(p)}
                  className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 ${
                    preset === p
                      ? "bg-accent-primary text-bg-primary shadow"
                      : "text-text-secondary hover:text-text-primary hover:bg-bg-elevated/50"
                  }`}
                >
                  {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : p}
                </button>
              ))}
            </div>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full border border-border-default bg-bg-surface text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-colors"
            title="Toggle theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>
        </div>
      </header>

      {/* CUSTOM DATE PICKER PANEL (Only shown when 'custom' & 'chart' is active) */}
      {activeTab === "chart" && preset === "custom" && (
        <div className="mb-6 p-4 rounded-xl border border-border-default bg-bg-surface flex items-center space-x-4 animate-in slide-in-from-top-2 duration-200 font-sans text-xs">
          <Calendar className="h-4 w-4 text-accent-primary flex-shrink-0" />
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <span className="font-medium text-text-secondary">From:</span>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="bg-bg-primary border border-border-default rounded px-2.5 py-1 text-text-primary focus:outline-none focus:border-accent-primary font-bold"
            />
            <span className="font-medium text-text-secondary">To:</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="bg-bg-primary border border-border-default rounded px-2.5 py-1 text-text-primary focus:outline-none focus:border-accent-primary font-bold"
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-accent-danger/10 border border-accent-danger/20 text-accent-danger rounded-xl text-xs font-sans">
          {error}
        </div>
      )}

      {/* STAT ROW (Top row of Cards) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today's Haul */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default border-t-[3px] border-t-accent-primary flex flex-col justify-between h-24 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-text-tertiary uppercase text-[9px] tracking-wider font-bold">
            <span>Today's Haul</span>
            <Coins className="h-3.5 w-3.5 text-accent-primary" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl md:text-2xl font-bold font-cinzel text-text-primary truncate">
              ₹{stats.todays_haul.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Range Total Spend */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default border-t-[3px] border-t-accent-positive flex flex-col justify-between h-24 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-text-tertiary uppercase text-[9px] tracking-wider font-bold">
            <span>Ledger Total</span>
            <TrendingUp className="h-3.5 w-3.5 text-accent-positive" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl md:text-2xl font-bold font-cinzel text-text-primary truncate">
              ₹{stats.total_spend.toLocaleString("en-IN", { minimumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Flagged Spends */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default border-t-[3px] border-t-accent-danger flex flex-col justify-between h-24 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-text-tertiary uppercase text-[9px] tracking-wider font-bold">
            <span>⚑ Flagged Spends</span>
            <Flag className="h-3.5 w-3.5 text-accent-danger" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl md:text-2xl font-bold font-cinzel text-text-primary">
              {stats.flagged_count}
            </span>
            {stats.flagged_count > 0 && (
              <span className="text-[10px] font-bold text-accent-danger px-1 py-0.5 rounded bg-accent-danger/10">
                Action Required
              </span>
            )}
          </div>
        </div>

        {/* Log Entries count */}
        <div className="p-4 rounded-2xl bg-bg-surface border border-border-default border-t-[3px] border-t-accent-info flex flex-col justify-between h-24 hover:shadow-sm transition-all">
          <div className="flex items-center justify-between text-text-tertiary uppercase text-[9px] tracking-wider font-bold">
            <span>Log Entries</span>
            <List className="h-3.5 w-3.5 text-accent-info" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl md:text-2xl font-bold font-cinzel text-text-primary">
              {transactions.length}
            </span>
            {uncategorizedCount > 0 && (
              <span className="text-[9px] font-bold text-accent-primary px-1.5 py-0.5 rounded bg-accent-primary/10">
                {uncategorizedCount} Uncategorized
              </span>
            )}
          </div>
        </div>
      </section>

      {/* DASHBOARD CORE CONTENT (Responsive Layout grid) */}
      {loading && refreshTrigger === 0 ? (
        <div className="flex-1 flex items-center justify-center py-20 text-text-tertiary font-sans text-xs">
          Reading the pirate ledger logs...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Main Swapped Content View (8 cols) */}
          {activeTab === "chart" ? (
            <div className="lg:col-span-8 flex flex-col space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Category Panel */}
                <div>
                  <CategoryPanel breakdown={stats.category_breakdown} totalSpend={stats.total_spend} />
                </div>

                {/* Transaction List */}
                <div>
                  <TransactionList
                    transactions={transactions}
                    onUpdateCategory={handleUpdateCategory}
                    largeSpendThreshold={2000}
                  />
                </div>
              </div>

              {/* 7-Day Trend Chart */}
              <div className="flex-1">
                <TrendChart data={stats.seven_day_trend} />
              </div>
            </div>
          ) : (
            <div className="lg:col-span-8 flex flex-col">
              {/* Raw Ingestion Log Book Panel */}
              <LogBookPanel onMessageProcessed={() => setRefreshTrigger((prev) => prev + 1)} />
            </div>
          )}

          {/* RIGHT COLUMN: Navigator Illustration Panel (4 cols) - Always visible */}
          <div className="lg:col-span-4 h-full">
            <NamiNavigator
              flaggedCount={stats.flagged_count}
              uncategorizedCount={uncategorizedCount}
              totalSpend={stats.total_spend}
            />
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="mt-8 pt-4 border-t border-border-default/30 flex justify-between items-center text-[10px] text-text-tertiary uppercase tracking-wider font-bold">
        <span>"Wealth is not about how much you make, but how much you save."</span>
        <span>Nami Ledger v2.0</span>
      </footer>
    </div>
  );
};
export default App;
