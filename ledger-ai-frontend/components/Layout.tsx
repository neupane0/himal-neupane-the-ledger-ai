import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, PlusCircle, Users, PieChart,
  TrendingUp, Bell, User, LogOut, Menu, X, Image as ImageIcon, BarChart3
} from 'lucide-react';
import { AppRoute } from '../types';
import CursorTracker from './CursorTracker';
import { auth } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Hide layout on landing and auth pages
  const isPublicPage = [AppRoute.LANDING, AppRoute.LOGIN, AppRoute.REGISTER].includes(location.pathname as AppRoute);

  // If public page, we still want to render children, but not the sidebar layout.
  if (isPublicPage) {
    return (
      <>
        <CursorTracker />
        {/* Animated Page Wrapper for Public Pages */}
        <div key={location.pathname} className="page-enter">
          {children}
        </div>
      </>
    );
  }

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: AppRoute.DASHBOARD },
    { icon: Receipt, label: 'Transactions', path: AppRoute.TRANSACTIONS },
    { icon: PlusCircle, label: 'Add Expense', path: AppRoute.ADD_EXPENSE },
    { icon: ImageIcon, label: 'Receipts', path: AppRoute.RECEIPTS },
    { icon: BarChart3, label: 'Categories', path: AppRoute.CATEGORY_ANALYTICS },
    { icon: Users, label: 'Groups', path: AppRoute.GROUPS },
    { icon: PieChart, label: 'Budgets', path: AppRoute.BUDGETS },
    { icon: TrendingUp, label: 'Forecast', path: AppRoute.FORECAST },
    { icon: Bell, label: 'Reminders', path: AppRoute.REMINDERS },
    { icon: User, label: 'Profile', path: AppRoute.PROFILE },
  ];

  return (
    <div className="min-h-screen bg-zinc-50 flex font-inter text-zinc-900 relative">
      <CursorTracker />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-zinc-200 transform transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-full flex flex-col">
          <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center shadow-lg shadow-zinc-200">
                <span className="text-white font-bold text-lg">L</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Ledger AI</span>
            </div>
            <button className="lg:hidden text-zinc-500 hover:text-black transition-colors" onClick={() => setSidebarOpen(false)}>
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 relative z-50">
            {navItems.map((item, index) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                style={{ animationDelay: `${index * 50}ms` }}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden page-enter
                  ${isActive
                    ? 'bg-black text-white shadow-lg shadow-black/20 translate-x-2'
                    : 'text-zinc-500 hover:bg-zinc-100 hover:text-black hover:translate-x-1'}
                `}
              >
                <item.icon size={20} className="stroke-[1.5] relative z-10" />
                <span className="font-medium text-sm relative z-10">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-zinc-100 relative z-50">
            <button
              onClick={async () => {
                try {
                  await auth.logout();
                } catch (e) {
                  // Even if logout fails, still navigate away.
                  console.error('Logout failed', e);
                }
                navigate(AppRoute.LANDING);
              }}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-zinc-500 hover:bg-red-50 hover:text-red-600 transition-all duration-300 hover:translate-x-1"
            >
              <LogOut size={20} className="stroke-[1.5]" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden relative z-10">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 bg-white/80 backdrop-blur-md border-b border-zinc-200 flex items-center justify-between px-4 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">L</span>
            </div>
            <span className="font-bold text-lg">Ledger AI</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          {/* Apply Page Transition Key here */}
          <div key={location.pathname} className="max-w-6xl mx-auto page-enter">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;