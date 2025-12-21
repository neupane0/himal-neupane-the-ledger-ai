import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className = '', isLoading, ...props }) => {
  const baseStyles = "relative overflow-hidden px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 group";
  
  const variants = {
    primary: "bg-black text-white hover:bg-zinc-800 shadow-[0_0_0_0_rgba(0,0,0,0)] hover:shadow-[0_4px_14px_0_rgba(0,0,0,0.3)] hover:-translate-y-0.5 border border-transparent",
    secondary: "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 hover:-translate-y-0.5 border border-transparent",
    outline: "bg-transparent text-zinc-900 border border-zinc-300 hover:bg-zinc-50 hover:border-black transition-colors",
    ghost: "bg-transparent text-zinc-600 hover:text-black hover:bg-zinc-100 border-transparent",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`} 
      disabled={isLoading} 
      {...props}
    >
      {variant === 'primary' && (
        <div className="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      )}
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </button>
  );
};

// --- 3D Tilt Card ---
export const Card: React.FC<{ children: ReactNode; className?: string; title?: string; noHover?: boolean }> = ({ children, className = '', title, noHover = false }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const [transform, setTransform] = useState('');

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (noHover || !cardRef.current) return;
        
        const card = cardRef.current;
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        
        const rotateX = ((y - centerY) / centerY) * -5; // Max 5deg rotation
        const rotateY = ((x - centerX) / centerX) * 5;

        setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`);
    };

    const handleMouseLeave = () => {
        setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)');
    };

    return (
        <div 
            ref={cardRef}
            className={`
                bg-white rounded-xl border border-zinc-200 p-6 
                transition-all duration-300 ease-out
                ${!noHover ? 'hover:shadow-2xl hover:shadow-zinc-200/50 hover:border-zinc-300' : ''} 
                ${className}
            `}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ transform }}
        >
            {title && <h3 className="text-lg font-bold text-zinc-900 mb-4">{title}</h3>}
            <div className="transform-style-preserve-3d">
                {children}
            </div>
        </div>
    );
};

export const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label?: string; icon?: ReactNode }> = ({ label, icon, className = '', ...props }) => (
  <div className="w-full group">
    {label && <label className="block text-sm font-medium text-zinc-700 mb-1.5 transition-colors group-focus-within:text-black">{label}</label>}
    <div className="relative">
        <input
        className={`w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black focus:bg-white transition-all duration-300 placeholder:text-zinc-400 ${icon ? 'pl-10' : ''} ${className}`}
        {...props}
        />
        {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-black transition-colors duration-300">
                {icon}
            </div>
        )}
    </div>
  </div>
);

export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: string[] }> = ({ label, options, className = '', ...props }) => (
  <div className="w-full group">
    {label && <label className="block text-sm font-medium text-zinc-700 mb-1.5 transition-colors group-focus-within:text-black">{label}</label>}
    <select
      className={`w-full px-4 py-3 rounded-lg border border-zinc-200 bg-zinc-50/50 text-zinc-900 focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black focus:bg-white transition-all duration-300 appearance-none cursor-pointer ${className}`}
      {...props}
    >
      {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
    </select>
  </div>
);

export const Badge: React.FC<{ children: ReactNode; type?: 'neutral' | 'success' | 'warning' | 'error' }> = ({ children, type = 'neutral' }) => {
    const styles = {
        neutral: "bg-zinc-100 text-zinc-600 border-zinc-200",
        success: "bg-emerald-50 text-emerald-700 border-emerald-100",
        warning: "bg-amber-50 text-amber-700 border-amber-100",
        error: "bg-red-50 text-red-700 border-red-100"
    };
    return (
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border shadow-sm ${styles[type]} animate-in zoom-in duration-300`}>
            {children}
        </span>
    );
};

// --- Animated Text Component ---
export const AnimatedText: React.FC<{ text: string; className?: string; delay?: number }> = ({ text, className = "", delay = 0 }) => {
    return (
        <span className={`inline-block overflow-hidden align-bottom ${className}`}>
             {text.split(" ").map((word, wIndex) => (
                 <span key={wIndex} className="inline-block whitespace-nowrap mr-2">
                     {word.split("").map((char, cIndex) => (
                         <span 
                            key={cIndex} 
                            className="inline-block reveal-text"
                            style={{ animationDelay: `${delay + (wIndex * 100) + (cIndex * 30)}ms` }}
                         >
                             {char}
                         </span>
                     ))}
                 </span>
             ))}
        </span>
    );
};