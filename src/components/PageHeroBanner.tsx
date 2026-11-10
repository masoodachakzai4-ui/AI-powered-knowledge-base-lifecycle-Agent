import React from 'react';

export interface HeroActionItem {
  label: string;
  onClick: () => void;
  variant?: 'primary-blue' | 'outline-white' | 'primary-green' | 'primary' | 'secondary' | 'success';
  icon?: React.ComponentType<{ className?: string }> | React.ReactNode;
  disabled?: boolean;
}

export interface HeroKpiCardItem {
  label: string;
  value: string | number;
  badge: string;
  icon: React.ComponentType<{ className?: string }> | React.ReactNode;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'teal' | 'red';
  iconBg?: string;
  iconColor?: string;
  onClick?: () => void;
}

interface PageHeroBannerProps {
  eyebrow: string;
  titlePrefix: string;
  titleHighlight: string;
  subtitle: string;
  actions?: HeroActionItem[];
  kpiCards?: HeroKpiCardItem[];
}

const COLOR_MAP: Record<NonNullable<HeroKpiCardItem['color']>, string> = {
  blue: 'bg-[#E4F7F6] text-[#029D97]',
  green: 'bg-[#E3F7EC] text-[#109848]',
  orange: 'bg-[#FFF0E0] text-[#EA7A13]',
  purple: 'bg-[#F1E8FF] text-[#7C3AED]',
  teal: 'bg-[#E2F6F7] text-[#029D97]',
  red: 'bg-[#FFE8E8] text-[#E11D48]',
};

const renderIcon = (
  icon: React.ComponentType<{ className?: string }> | React.ReactNode | undefined,
  className: string
) => {
  if (!icon) return null;
  if (React.isValidElement(icon)) return icon;
  const IconComp = icon as React.ComponentType<{ className?: string }>;
  return <IconComp className={className} />;
};

export const PageHeroBanner: React.FC<PageHeroBannerProps> = ({
  eyebrow,
  titlePrefix,
  titleHighlight,
  subtitle,
  actions = [],
  kpiCards = [],
}) => {
  return (
    <div className="space-y-4">
      {/* University Campus Hero Banner with #029D97 Executive Theme */}
      <div className="relative rounded-2xl overflow-hidden border border-[#B2E6E3] bg-gradient-to-r from-[#DFF5F4] via-[#EBFAF9] to-[#CEEFED] shadow-xs">
        {/* Decorative Architectural Campus Graphic on Right */}
        <div
          aria-hidden="true"
          className="hidden lg:block absolute inset-y-0 right-0 w-[42%] pointer-events-none overflow-hidden"
        >
          <div className="absolute -left-12 inset-y-0 w-28 bg-gradient-to-r from-[#EBFAF9] via-[#EBFAF9]/90 to-transparent z-10" />
          <div className="absolute -right-8 -bottom-10 w-64 h-28 bg-[#029D97]/20 -rotate-12 rounded-3xl" />
          <div className="absolute right-12 -top-10 w-48 h-24 bg-[#029D97]/15 rotate-12 rounded-3xl" />

          <svg
            viewBox="0 0 500 220"
            className="w-full h-full object-cover object-right opacity-95"
            preserveAspectRatio="xMaxYMid slice"
          >
            <defs>
              <linearGradient id="pageHeroSkyGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#B8EBE8" />
                <stop offset="100%" stopColor="#7FD8D3" />
              </linearGradient>
              <linearGradient id="pageHeroBrickGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D99B72" />
                <stop offset="100%" stopColor="#B8764E" />
              </linearGradient>
            </defs>
            <rect width="500" height="220" fill="url(#pageHeroSkyGrad)" />
            <circle cx="140" cy="45" r="26" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="170" cy="48" r="20" fill="#FFFFFF" fillOpacity="0.55" />
            <circle cx="390" cy="38" r="24" fill="#FFFFFF" fillOpacity="0.45" />
            <path d="M80 185 Q280 168 500 185 L500 220 L80 220 Z" fill="#1E8E4E" />
            <rect x="135" y="96" width="95" height="90" fill="url(#pageHeroBrickGrad)" stroke="#F8FAFC" strokeWidth="2" />
            <rect x="330" y="96" width="95" height="90" fill="url(#pageHeroBrickGrad)" stroke="#F8FAFC" strokeWidth="2" />
            <polygon points="128,96 182,68 235,96" fill="#334E68" />
            <polygon points="325,96 378,68 432,96" fill="#334E68" />
            <rect x="215" y="74" width="130" height="112" fill="#E6AD86" stroke="#FFFFFF" strokeWidth="2.5" />
            <polygon points="205,74 280,32 355,74" fill="#243B53" stroke="#FFFFFF" strokeWidth="2.5" />
            <circle cx="280" cy="56" r="9" fill="#F8FAFC" />
            <rect x="232" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="258" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="294" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="320" y="84" width="8" height="96" fill="#F8FAFC" />
            <rect x="269" y="138" width="22" height="48" rx="11" fill="#1E293B" />
            {[152, 178, 204].map((x) => (
              <rect key={`plw-${x}`} x={x} y="112" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            {[346, 372, 398].map((x) => (
              <rect key={`prw-${x}`} x={x} y="112" width="14" height="22" rx="2" fill="#E4F7F6" stroke="#FFFFFF" strokeWidth="1.5" />
            ))}
            <circle cx="125" cy="165" r="24" fill="#15803D" />
            <circle cx="445" cy="155" r="32" fill="#166534" />
            <circle cx="475" cy="168" r="26" fill="#15803D" />
            <polygon points="395,220 500,155 500,220" fill="#029D97" />
            <polygon points="435,220 500,178 500,220" fill="#02847F" />
          </svg>
        </div>

        {/* Left Banner Content */}
        <div className="relative z-10 p-5 sm:p-6 lg:px-7 lg:py-5 max-w-3xl space-y-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#029D97] bg-white/85 backdrop-blur-xs px-2.5 py-0.5 rounded-md border border-[#96E0DC]">
              {eyebrow}
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
              {titlePrefix}{' '}
              <span className="text-[#029D97]">{titleHighlight}</span>
            </h1>
            <p className="text-xs sm:text-sm font-medium text-slate-700 leading-relaxed">
              {subtitle}
            </p>
          </div>

          {actions.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
              {actions.map((act, idx) => {
                const btnClass =
                  act.variant === 'outline-white' || act.variant === 'secondary'
                    ? 'text-[#029D97] bg-white/95 hover:bg-white border border-[#74D2CD] shadow-2xs'
                    : 'text-white bg-[#029D97] hover:bg-[#02847F] shadow-sm';
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={act.disabled}
                    onClick={act.onClick}
                    className={`px-4 py-2 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50 ${btnClass}`}
                  >
                    {renderIcon(act.icon, 'w-3.5 h-3.5')}
                    <span>{act.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Dashboard-Style KPI Summary Row */}
      {kpiCards.length > 0 && (
        <div
          className={`grid grid-cols-2 sm:grid-cols-4 ${
            kpiCards.length > 4 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'
          } gap-3`}
        >
          {kpiCards.map((card, idx) => {
            const colorClass = card.color
              ? COLOR_MAP[card.color]
              : `${card.iconBg || 'bg-[#E4F7F6]'} ${card.iconColor || 'text-[#029D97]'}`;
            return (
              <div
                key={idx}
                onClick={card.onClick}
                className={`bg-white rounded-2xl border border-slate-200/80 p-3.5 text-left shadow-2xs flex items-start justify-between gap-3 transition-all ${
                  card.onClick ? 'hover:border-[#029D97] hover:shadow-md cursor-pointer' : ''
                }`}
              >
                <div>
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${colorClass}`}
                  >
                    {renderIcon(card.icon, 'w-5 h-5')}
                  </div>
                  <div className="text-xl font-extrabold text-slate-900 font-mono tabular-nums leading-none">
                    {card.value}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 mt-1.5">
                    {card.label}
                  </div>
                </div>
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#E4F7F6] text-[#029D97] tabular-nums shrink-0">
                  {card.badge}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
