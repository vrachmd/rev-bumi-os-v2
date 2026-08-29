import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'compact' | 'light';
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ variant = 'full', className = '' }) => {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Hexagon Emblem */}
      <div className="relative w-9 h-9 rounded-md bg-[#003C16] flex items-center justify-center shadow-xs border border-[#0B5A2A]/40 shrink-0">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" aria-label="REV Bumi Logo">
          {/* Stylized Mountain / Quarry Rock Pyramid */}
          <path d="M12 2L2 19.5H22L12 2ZM12 6.8L18.2 17.5H5.8L12 6.8Z" fill="#F8FAFC" fillOpacity="0.95" />
          <path d="M12 10.5L8.5 16.5H15.5L12 10.5Z" fill="#10B981" />
        </svg>
      </div>

      {variant !== 'compact' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className="font-extrabold text-sm tracking-tight text-slate-900">
              REV BUMI
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-1 py-0.5 rounded bg-[#003C16] text-white">
              OS
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-medium tracking-wide mt-0.5">
            REV BUMI NUSANTARA
          </span>
        </div>
      )}
    </div>
  );
};
