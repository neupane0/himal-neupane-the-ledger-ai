import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

// ---------------------------------------------------------------------------
// Button
// ---------------------------------------------------------------------------

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', size = 'md', className = '', isLoading, ...props }) => {
  const base =
    'relative overflow-hidden rounded-xl font-medium transition-all duration-200 active:scale-[0.97] flex items-center justify-center gap-2 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400';

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const variants = {
    primary:
      'bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm shadow-zinc-900/10 hover:shadow-md hover:shadow-zinc-900/15 hover:-translate-y-px border border-zinc-800',
    secondary:
      'bg-zinc-100 text-zinc-800 hover:bg-zinc-200/80 hover:-translate-y-px border border-zinc-200/60',
    outline:
      'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300 shadow-sm',
    ghost:
      'bg-transparent text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/60',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className} ${isLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
      disabled={isLoading}
      {...props}
    >
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      )}
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

// ---------------------------------------------------------------------------
// Card — premium glass/soft-UI variant
// ---------------------------------------------------------------------------

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  /** Apply a subtle indigo/violet "AI" gradient border */
  ai?: boolean;
  noHover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle, ai = false, noHover = false }) => {
  return (
    <div
      className={`
        rounded-2xl p-6
        ${ai
          ? 'bg-gradient-to-br from-white/70 via-white/60 to-indigo-50/40 backdrop-blur-xl border border-indigo-200/50 ring-1 ring-inset ring-indigo-100/30 shadow-[0_0_0_1px_rgba(99,102,241,0.06),0_2px_6px_rgba(99,102,241,0.06),0_12px_24px_rgba(99,102,241,0.04)]'
          : 'bg-white/70 backdrop-blur-xl border border-zinc-200/60 ring-1 ring-inset ring-zinc-100/50 shadow-[0_0_0_1px_rgba(0,0,0,0.02),0_1px_3px_rgba(0,0,0,0.04),0_8px_20px_rgba(0,0,0,0.03)]'
        }
        ${!noHover ? 'hover:shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_4px_12px_rgba(0,0,0,0.06),0_16px_32px_rgba(0,0,0,0.04)] hover:-translate-y-px transition-all duration-300' : 'transition-colors duration-300'}
        ${className}
      `}
    >
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <h3 className="text-sm font-semibold text-zinc-800 tracking-wide">{title}</h3>}
          {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

export const Input: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: ReactNode }
> = ({ label, icon, className = '', ...props }) => (
  <div className="w-full group">
    {label && (
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-zinc-800">
        {label}
      </label>
    )}
    <div className="relative">
      <input
        className={`
          w-full px-4 py-2.5 rounded-xl border border-zinc-200/80 bg-white/60 backdrop-blur-sm text-zinc-800
          focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 focus:bg-white
          transition-all duration-200 placeholder:text-zinc-300 text-sm
          ${icon ? 'pl-10' : ''}
          ${className}
        `}
        {...props}
      />
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-600 transition-colors duration-200">
          {icon}
        </div>
      )}
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Select
// ---------------------------------------------------------------------------

export const Select: React.FC<
  React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: string[] }
> = ({ label, options, className = '', ...props }) => (
  <div className="w-full group">
    {label && (
      <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5 transition-colors group-focus-within:text-zinc-800">
        {label}
      </label>
    )}
    <select
      className={`
        w-full px-4 py-2.5 rounded-xl border border-zinc-200/80 bg-white/60 backdrop-blur-sm text-zinc-800
        focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-400 focus:bg-white
        transition-all duration-200 appearance-none cursor-pointer text-sm
        ${className}
      `}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  </div>
);

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

export const Badge: React.FC<{
  children: ReactNode;
  type?: 'neutral' | 'success' | 'warning' | 'error';
}> = ({ children, type = 'neutral' }) => {
  const styles = {
    neutral: 'bg-zinc-100/80 text-zinc-600 border-zinc-200/60 ring-zinc-100/50',
    success: 'bg-emerald-50/80 text-emerald-700 border-emerald-100/60 ring-emerald-50/50',
    warning: 'bg-amber-50/80 text-amber-700 border-amber-100/60 ring-amber-50/50',
    error:   'bg-red-50/80 text-red-700 border-red-100/60 ring-red-50/50',
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border ring-1 ring-inset ${styles[type]}`}
    >
      {children}
    </span>
  );
};

// ---------------------------------------------------------------------------
// Stat Number — animated counter for dashboard stats
// ---------------------------------------------------------------------------

export const StatNumber: React.FC<{ value: number; prefix?: string; suffix?: string; className?: string }> = ({
  value,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<number>();

  useEffect(() => {
    const start = displayed;
    const diff = value - start;
    if (diff === 0) return;
    const duration = 600;
    const startTime = performance.now();
    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(start + diff * eased);
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [value]);

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{displayed.toFixed(2)}{suffix}
    </span>
  );
};

// ---------------------------------------------------------------------------
// AnimatedText
// ---------------------------------------------------------------------------

export const AnimatedText: React.FC<{
  text: string;
  className?: string;
  delay?: number;
}> = ({ text, className = '', delay = 0 }) => {
  return (
    <span className={`inline-block overflow-hidden align-bottom ${className}`}>
      {text.split(' ').map((word, wIndex) => (
        <span key={wIndex} className="inline-block whitespace-nowrap mr-2">
          {word.split('').map((char, cIndex) => (
            <span
              key={cIndex}
              className="inline-block reveal-text"
              style={{ animationDelay: `${delay + wIndex * 100 + cIndex * 30}ms` }}
            >
              {char}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
};