import React from "react";
import { Compass, ShieldAlert, Award } from "lucide-react";

interface NamiNavigatorProps {
  flaggedCount: number;
  uncategorizedCount: number;
  totalSpend: number;
}

export const NamiNavigator: React.FC<NamiNavigatorProps> = ({
  flaggedCount,
  uncategorizedCount,
  totalSpend,
}) => {
  // Determine badge state
  let badgeColor = "bg-accent-positive/10 text-accent-positive border-accent-positive/30";
  let badgeMessage = "All funds accounted for!";
  let badgeIcon = <Award className="h-4 w-4 mr-1.5" />;

  if (flaggedCount > 0) {
    badgeColor = "bg-accent-danger/10 text-accent-danger border-accent-danger/30 animate-pulse";
    badgeMessage = `${flaggedCount} Flagged spend${flaggedCount > 1 ? "s" : ""} detected!`;
    badgeIcon = <ShieldAlert className="h-4 w-4 mr-1.5" />;
  } else if (uncategorizedCount > 0) {
    badgeColor = "bg-accent-primary/10 text-accent-primary border-accent-primary/30";
    badgeMessage = `${uncategorizedCount} Unplundered log entry${uncategorizedCount > 1 ? "ies" : ""}`;
    badgeIcon = <Compass className="h-4 w-4 mr-1.5" />;
  } else if (totalSpend > 5000) {
    badgeColor = "bg-accent-info/10 text-accent-info border-accent-info/30";
    badgeMessage = "Heavy plundering day!";
    badgeIcon = <Compass className="h-4 w-4 mr-1.5" />;
  }

  return (
    <div className="flex flex-col items-center justify-between p-6 rounded-2xl bg-bg-surface border border-border-default h-full relative overflow-hidden transition-all duration-300 hover:shadow-md">
      {/* Decorative Compass Lines Background */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none">
        <svg width="100%" height="100%">
          <circle cx="50%" cy="50%" r="100" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="50%" cy="50%" r="150" stroke="currentColor" strokeWidth="1" fill="none" />
          <line x1="0" y1="0" x2="100%" y2="100%" stroke="currentColor" strokeWidth="1" />
          <line x1="100%" y1="0" x2="0" y2="100%" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      <div className="w-full text-center z-10">
        <h3 className="text-xs uppercase tracking-widest text-text-tertiary mb-1 font-sans">
          The Navigator
        </h3>
        <h2 className="text-xl font-bold font-cinzel text-accent-primary tracking-wide">
          Nami
        </h2>
        <p className="text-[11px] text-text-secondary italic mb-4 font-sans">
          "Berry Navigator · Straw Hat Treasurer"
        </p>
      </div>

      {/* Styled vector SVG illustration of Log Pose and Gold coins */}
      <div className="my-3 z-10 flex items-center justify-center h-32 w-32 relative">
        <svg viewBox="0 0 120 120" className="w-full h-full text-text-secondary">
          {/* Map scroll backing */}
          <path
            d="M20,100 C30,95 40,105 70,95 C100,85 105,100 110,90 L95,20 C85,25 75,15 45,25 C15,35 15,20 10,30 Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeDasharray="2 2"
            className="text-border-default"
          />
          {/* Grand Line path */}
          <path
            d="M 15,25 Q 50,60 105,92"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          <circle cx="105" cy="92" r="3" fill="var(--accent-primary)" />

          {/* Compass / Log Pose drawing */}
          <circle cx="60" cy="55" r="26" fill="var(--bg-elevated)" stroke="currentColor" strokeWidth="2" />
          <circle cx="60" cy="55" r="21" fill="none" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
          
          {/* Glass dome highlights */}
          <path d="M43,43 A26,26 0 0,1 77,43" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3" />
          
          {/* Log Pose needle */}
          <polygon points="60,38 64,55 60,52" fill="var(--accent-danger)" />
          <polygon points="60,72 64,55 60,52" fill="var(--text-tertiary)" />
          <circle cx="60" cy="55" r="3" fill="currentColor" />

          {/* Gold Coin Stack 1 */}
          <ellipse cx="35" cy="85" rx="10" ry="4" fill="var(--accent-primary)" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="35" cy="82" rx="10" ry="4" fill="var(--accent-primary)" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="35" cy="79" rx="10" ry="4" fill="var(--accent-primary)" stroke="currentColor" strokeWidth="1" />

          {/* Gold Coin Stack 2 */}
          <ellipse cx="85" cy="80" rx="9" ry="3.5" fill="var(--accent-primary)" stroke="currentColor" strokeWidth="1" />
          <ellipse cx="85" cy="77" rx="9" ry="3.5" fill="var(--accent-primary)" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Dynamic Status Badge */}
      <div className={`mt-4 w-full py-2.5 px-4 rounded-xl border flex items-center justify-center font-sans font-medium text-xs text-center z-10 ${badgeColor}`}>
        {badgeIcon}
        <span>{badgeMessage}</span>
      </div>
    </div>
  );
};
