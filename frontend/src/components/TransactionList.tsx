import React from "react";
import { Flag, ChevronDown } from "lucide-react";

interface Transaction {
  id: number;
  raw_message_id: number;
  amount: number;
  category: string | null;
  description: string;
  timestamp: string;
  created_at: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  onUpdateCategory: (id: number, category: string) => Promise<void>;
  largeSpendThreshold?: number;
}

const CATEGORY_STYLES: Record<string, { dot: string; text: string; bg: string; emoji: string }> = {
  Food: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-300", bg: "bg-amber-100 dark:bg-amber-900/30", emoji: "🍛" },
  Transport: { dot: "bg-sky-500", text: "text-sky-700 dark:text-sky-300", bg: "bg-sky-100 dark:bg-sky-900/30", emoji: "🚕" },
  Shopping: { dot: "bg-red-500", text: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-900/30", emoji: "🛍️" },
  Utilities: { dot: "bg-yellow-500", text: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-100 dark:bg-yellow-900/30", emoji: "⚡" },
  Health: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-900/30", emoji: "💊" },
  Entertainment: { dot: "bg-purple-500", text: "text-purple-700 dark:text-purple-300", bg: "bg-purple-100 dark:bg-purple-900/30", emoji: "🎮" },
  Other: { dot: "bg-stone-500", text: "text-stone-700 dark:text-stone-300", bg: "bg-stone-100 dark:bg-stone-900/30", emoji: "📦" },
  Uncategorized: { dot: "bg-stone-300 dark:bg-stone-600", text: "text-stone-600 dark:text-stone-400", bg: "bg-stone-100 dark:bg-stone-800/30", emoji: "❓" },
};

const ALLOWED_CATEGORIES = ["Food", "Transport", "Shopping", "Health", "Utilities", "Entertainment", "Other"];

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions = [],
  onUpdateCategory,
  largeSpendThreshold = 2000,
}) => {
  // Group transactions by date string YYYY-MM-DD
  const groupedTransactions: Record<string, Transaction[]> = {};
  transactions.forEach((tx) => {
    const dateStr = new Date(tx.timestamp).toISOString().split("T")[0];
    if (!groupedTransactions[dateStr]) {
      groupedTransactions[dateStr] = [];
    }
    groupedTransactions[dateStr].push(tx);
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  const formatDateHeader = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (date.toDateString() === today.toDateString()) {
        return "Today's Entries";
      } else if (date.toDateString() === yesterday.toDateString()) {
        return "Yesterday's Entries";
      }

      return date.toLocaleDateString(undefined, {
        weekday: "long",
        month: "long",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-bg-surface border border-border-default h-full transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-widest text-text-tertiary font-sans mb-1">
          Log Entries
        </h3>
        <h2 className="text-sm font-bold font-cinzel text-text-primary">
          Transaction History
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 max-h-[320px] pr-1 font-sans text-xs">
        {sortedDates.length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-tertiary py-10">
            No logged plunder entries
          </div>
        ) : (
          sortedDates.map((dateStr) => (
            <div key={dateStr} className="space-y-2">
              <h4 className="text-[11px] font-bold text-text-secondary uppercase border-b border-border-default pb-1">
                {formatDateHeader(dateStr)}
              </h4>
              <div className="space-y-2">
                {groupedTransactions[dateStr].map((tx) => {
                  const isUncategorized = !tx.category;
                  const catKey = tx.category || "Uncategorized";
                  const style = CATEGORY_STYLES[catKey] || CATEGORY_STYLES["Other"];
                  const isFlagged = tx.amount >= largeSpendThreshold;

                  return (
                    <div
                      key={tx.id}
                      className={`group flex items-center justify-between p-3 rounded-xl border transition-all duration-200 relative ${
                        isUncategorized
                          ? "bg-bg-elevated/40 border-dashed border-border-default hover:bg-bg-elevated/65"
                          : "bg-bg-primary border-border-default/50 hover:bg-bg-elevated/30"
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0 mr-4">
                        {/* Dot indicator */}
                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${style.dot}`} />

                        <div className="min-w-0 flex-1">
                          {/* Description */}
                          <p className="font-semibold text-text-primary truncate" title={tx.description}>
                            {tx.description}
                          </p>
                          
                          {/* Subtext info */}
                          <div className="flex items-center space-x-2 mt-1 flex-wrap gap-y-1">
                            <span className="text-[10px] text-text-tertiary">
                              {new Date(tx.timestamp).toLocaleTimeString(undefined, {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>

                            {/* Flagged spends */}
                            {isFlagged && (
                              <span className="flex items-center text-[10px] font-bold text-accent-danger px-1.5 py-0.5 rounded bg-accent-danger/10 border border-accent-danger/20">
                                <Flag className="h-2.5 w-2.5 mr-0.5 fill-current" />
                                Flagged
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {/* Inline Category Picker (Styled Native Dropdown) */}
                        <div className="relative">
                          <select
                            value={tx.category || ""}
                            onChange={(e) => onUpdateCategory(tx.id, e.target.value)}
                            className={`appearance-none pr-6 pl-2 py-1 rounded-lg border text-[10px] font-bold transition-all duration-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-accent-primary ${
                              isUncategorized
                                ? "bg-accent-primary/10 text-accent-primary border-accent-primary/25 hover:bg-accent-primary/20"
                                : `${style.bg} ${style.text} border-transparent hover:brightness-95`
                            }`}
                          >
                            <option value="" disabled className="bg-bg-surface text-text-primary">
                              ❓ Categorize
                            </option>
                            {ALLOWED_CATEGORIES.map((cat) => (
                              <option
                                key={cat}
                                value={cat}
                                className="bg-bg-surface text-text-primary"
                              >
                                {CATEGORY_STYLES[cat].emoji} {cat}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-text-secondary">
                            <ChevronDown className="h-3 w-3" />
                          </div>
                        </div>

                        {/* Amount */}
                        <span className="font-bold text-text-primary text-sm min-w-[70px] text-right">
                          ₹{tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
