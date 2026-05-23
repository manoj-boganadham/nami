import React from "react";

interface CategoryPanelProps {
  breakdown: Record<string, number>;
  totalSpend: number;
}

interface CategoryConfig {
  emoji: string;
  colorClass: string;
}

const CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  Food: { emoji: "🍛", colorClass: "bg-amber-500" },
  Transport: { emoji: "🚕", colorClass: "bg-sky-500" },
  Shopping: { emoji: "🛍️", colorClass: "bg-red-500" },
  Utilities: { emoji: "⚡", colorClass: "bg-yellow-500" },
  Health: { emoji: "💊", colorClass: "bg-emerald-500" },
  Entertainment: { emoji: "🎮", colorClass: "bg-purple-500" },
  Other: { emoji: "📦", colorClass: "bg-stone-500" },
  Uncategorized: { emoji: "❓", colorClass: "bg-stone-400" },
};

export const CategoryPanel: React.FC<CategoryPanelProps> = ({ breakdown = {}, totalSpend }) => {
  // Filter out entries that have 0 spend to keep UI clean, but keep at least something
  const activeCategories = Object.entries(breakdown)
    .map(([category, amount]) => ({
      name: category,
      amount,
      percentage: totalSpend > 0 ? (amount / totalSpend) * 100 : 0,
      config: CATEGORY_CONFIGS[category] || CATEGORY_CONFIGS["Other"],
    }))
    .sort((a, b) => b.amount - a.amount); // Sort by highest spend first

  return (
    <div className="p-6 rounded-2xl bg-bg-surface border border-border-default h-full transition-all duration-300 hover:shadow-md flex flex-col">
      <div className="mb-4">
        <h3 className="text-xs uppercase tracking-widest text-text-tertiary font-sans mb-1">
          Plunder by Category
        </h3>
        <h2 className="text-sm font-bold font-cinzel text-text-primary">
          Category Breakdown
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 max-h-[320px] pr-1 font-sans text-xs">
        {activeCategories.filter(c => c.amount > 0).length === 0 ? (
          <div className="h-full flex items-center justify-center text-text-tertiary py-10">
            No plunder logged in this window
          </div>
        ) : (
          activeCategories
            .filter((c) => c.amount > 0)
            .map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base" role="img" aria-label={cat.name}>
                      {cat.config.emoji}
                    </span>
                    <span className="font-semibold text-text-primary">{cat.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-text-primary">
                      ₹{cat.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-text-tertiary ml-1.5">
                      ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-bg-elevated overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${cat.config.colorClass}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  );
};
