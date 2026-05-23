import React from "react";

export const NamiLogo: React.FC<{ className?: string }> = ({ className = "h-8 w-8" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      className={`${className} fill-current text-accent-primary`}
    >
      {/* Dynamic nautical treasure motif: Stylized compass + tangerine windwheel */}
      <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="4" fill="none" />
      <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" fill="none" />
      
      {/* 4 cardinal points */}
      <polygon points="50,12 53,24 47,24" fill="currentColor" />
      <polygon points="50,88 53,76 47,76" fill="currentColor" />
      <polygon points="12,50 24,53 24,47" fill="currentColor" />
      <polygon points="88,50 76,53 76,47" fill="currentColor" />
      
      {/* Center Orange Blossom/Windwheel Tattoo motif */}
      <circle cx="50" cy="50" r="10" fill="currentColor" />
      
      {/* Curved pinwheel blades representing windwheel/tangerine petals */}
      <path
        d="M 50,40 A 10,10 0 0,1 60,50 A 10,10 0 0,1 50,60 A 10,10 0 0,1 40,50 A 10,10 0 0,1 50,40"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M 50,18 C 65,18 78,32 78,50 C 78,55 74,60 68,60 C 60,60 58,45 50,45 C 42,45 40,60 32,60 C 26,60 22,55 22,50 C 22,32 35,18 50,18 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      
      {/* Decorative Tangerine dots */}
      <circle cx="35" cy="35" r="3" fill="currentColor" />
      <circle cx="65" cy="35" r="3" fill="currentColor" />
      <circle cx="35" cy="65" r="3" fill="currentColor" />
      <circle cx="65" cy="65" r="3" fill="currentColor" />
    </svg>
  );
};
