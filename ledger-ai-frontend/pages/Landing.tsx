import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, AnimatedText } from '../components/UI';
import { ArrowRight, Scan, Mic, Users, ArrowUpRight, PieChart } from 'lucide-react';
import { AppRoute } from '../types';

const Landing: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading for skeleton effect
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-white text-zinc-900 font-inter overflow-hidden selection:bg-black selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-zinc-100 p-6 flex justify-between items-center max-w-7xl mx-auto bg-white/80 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300 page-enter">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => navigate(AppRoute.LANDING)}>
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center shadow-lg shadow-black/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <span className="text-white font-bold text-xl">L</span>
            </div>
            <span className="font-bold text-xl tracking-tight group-hover:tracking-normal transition-all duration-300">Ledger AI</span>
        </div>
        <div className="flex gap-4">
            <Button variant="ghost" onClick={() => navigate(AppRoute.LOGIN)}>Login</Button>
            <Button variant="primary" onClick={() => navigate(AppRoute.REGISTER)}>Get Started</Button>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6 max-w-7xl mx-auto text-center relative">
        {/* Ambient Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-b from-zinc-100 to-transparent rounded-full blur-3xl -z-10 animate-pulse" />
        <div className="absolute top-20 right-20 w-32 h-32 bg-zinc-200 rounded-full blur-2xl -z-10 animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-20 left-20 w-48 h-48 bg-zinc-100 rounded-full blur-3xl -z-10 animate-float" style={{ animationDelay: '2s' }} />
        
        <div className="mb-8">
            <h1 className="text-6xl md:text-9xl font-bold tracking-tighter mb-4 text-black leading-[0.9]">
                <AnimatedText text="Master your money" delay={0} />
                <br/>
                <span className="text-zinc-400 block mt-2">
                    <AnimatedText text="with minimalist AI." delay={500} />
                </span>
            </h1>
        </div>

        <p className="text-xl md:text-2xl text-zinc-500 max-w-2xl mx-auto mb-12 leading-relaxed font-light page-enter stagger-5">
          Effortless tracking. Smart receipt scanning. Voice logging.
          All wrapped in a beautiful, distraction-free monochrome interface.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center gap-4 page-enter stagger-5" style={{ animationDelay: '800ms' }}>
            <Button variant="primary" className="px-10 py-5 text-lg rounded-full" onClick={() => navigate(AppRoute.REGISTER)}>
                Start for Free <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button variant="secondary" className="px-10 py-5 text-lg rounded-full" onClick={() => navigate(AppRoute.LOGIN)}>
                Live Demo
            </Button>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="py-24 bg-zinc-50/50 border-t border-zinc-100 relative">
        <div className="max-w-7xl mx-auto px-6">
            <div className="mb-20 md:text-center max-w-3xl mx-auto page-enter stagger-1">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 tracking-tight">Everything you need.</h2>
                <p className="text-zinc-500 text-xl">Powerful AI features to take control of your finances, displayed in a grid designed for clarity.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 auto-rows-[340px]">
                {/* Feature 1: OCR */}
                <BentoCard 
                    loading={loading}
                    colSpan="md:col-span-2"
                    title="Receipt OCR"
                    desc="Snap a photo of any receipt. Our Gemini-powered AI instantly extracts merchant names, dates, and line items with 99% accuracy."
                    icon={<Scan size={40} />}
                    delay={100}
                />

                {/* Feature 2: Voice */}
                <BentoCard 
                    loading={loading}
                    title="Voice Logging"
                    desc="Just say 'Spent $20 on lunch'. We parse natural language into structured data automatically."
                    icon={<Mic size={40} />}
                    delay={200}
                />

                {/* Feature 3: Forecast */}
                <BentoCard 
                    loading={loading}
                    title="Smart Forecasts"
                    desc="Predict future spending trends based on your history to avoid overspending."
                    icon={<PieChart size={40} />}
                    delay={300}
                />

                {/* Feature 4: Groups */}
                <BentoCard 
                    loading={loading}
                    colSpan="md:col-span-2"
                    title="Group Splitting"
                    desc="Seamlessly split bills with friends, track who owes what, and settle debts without the awkward math."
                    icon={<Users size={40} />}
                    delay={400}
                />
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-zinc-200 text-center text-zinc-500 text-sm bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
            <p>&copy; 2023 Ledger AI. Built for the future of finance.</p>
            <div className="flex gap-8">
                <a href="#" className="hover:text-black transition-colors hover:scale-105 inline-block">Privacy</a>
                <a href="#" className="hover:text-black transition-colors hover:scale-105 inline-block">Terms</a>
                <a href="#" className="hover:text-black transition-colors hover:scale-105 inline-block">Contact</a>
            </div>
        </div>
      </footer>
    </div>
  );
};

// --- Components for Bento Grid ---

interface BentoCardProps {
    loading: boolean;
    colSpan?: string;
    title: string;
    desc: string;
    icon: React.ReactNode;
    delay?: number;
}

const BentoCard: React.FC<BentoCardProps> = ({ loading, colSpan = "", title, desc, icon, delay = 0 }) => {
    if (loading) {
        return <BentoSkeleton colSpan={colSpan} delay={delay} />;
    }

    return (
        <div 
            className={`
                relative group overflow-hidden rounded-[2rem] bg-white border border-zinc-200 p-10 
                hover:shadow-2xl hover:shadow-zinc-200 transition-all duration-700 hover:scale-[1.02] hover:border-zinc-300
                page-enter
                ${colSpan}
            `}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Hover Reveal Arrow */}
            <div className="absolute top-8 right-8 opacity-0 -translate-y-4 translate-x-4 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all duration-500 ease-out text-zinc-400 bg-zinc-50 p-3 rounded-full">
                <ArrowUpRight size={24} />
            </div>

            {/* Background Decoration */}
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-zinc-50/80 rounded-full blur-3xl group-hover:bg-zinc-100 transition-colors duration-700 -z-0" />

            <div className="h-full flex flex-col justify-between relative z-10 pointer-events-none">
                <div className="w-20 h-20 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center shadow-sm text-zinc-900 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-black group-hover:text-white transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
                    {icon}
                </div>
                
                <div className="transform transition-transform duration-500 group-hover:translate-x-2">
                    <h3 className="text-3xl font-bold mb-4 text-zinc-900 tracking-tight">{title}</h3>
                    <p className="text-zinc-500 leading-relaxed font-medium text-lg group-hover:text-zinc-700 transition-colors">
                        {desc}
                    </p>
                </div>
            </div>
        </div>
    );
};

const BentoSkeleton: React.FC<{ colSpan?: string; delay?: number }> = ({ colSpan = "", delay = 0 }) => {
    return (
        <div 
            className={`rounded-[2rem] bg-zinc-100 border border-zinc-200 p-10 ${colSpan} flex flex-col justify-between overflow-hidden relative page-enter`}
            style={{ animationDelay: `${delay}ms` }}
        >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent z-20" />
            
            <div className="w-20 h-20 bg-zinc-200 rounded-2xl animate-pulse" />
            
            <div className="space-y-4">
                <div className="h-8 w-1/2 bg-zinc-200 rounded-lg animate-pulse" />
                <div className="space-y-3">
                    <div className="h-4 w-full bg-zinc-200 rounded animate-pulse" />
                    <div className="h-4 w-5/6 bg-zinc-200 rounded animate-pulse" />
                </div>
            </div>
        </div>
    );
};

export default Landing;