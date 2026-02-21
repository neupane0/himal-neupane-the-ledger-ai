import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Receipt, PlusCircle, Users, PieChart,
  TrendingUp, Bell, User, LogOut, Menu, X, Image as ImageIcon, BarChart3,
  ChevronLeft, Repeat
} from 'lucide-react';
import { AppRoute } from '../types';
import { auth } from '../services/api';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isPublicPage = [AppRoute.LANDING, AppRoute.LOGIN, AppRoute.REGISTER].includes(location.pathname as AppRoute);

  if (isPublicPage) {
    return <div>{children}</div>;
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
    { icon: Repeat, label: 'Recurring', path: AppRoute.RECURRING },
    { icon: User, label: 'Profile', path: AppRoute.PROFILE },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-slate-50 to-zinc-100 flex font-inter text-zinc-900">

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-zinc-950/20 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
        transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Floating sidebar container */}
        <div className="h-full flex flex-col m-0 lg:m-3 lg:mr-0 lg:rounded-2xl bg-white/80 backdrop-blur-xl border border-zinc-200/60 shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.02),0_12px_24px_rgba(0,0,0,0.04)]">

          {/* Logo */}
          <div className={`p-5 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-zinc-100/80`}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-xl flex items-center justify-center shadow-md shadow-zinc-900/20 flex-shrink-0">
                <span className="text-white font-bold text-sm">L</span>
              </div>
              {!isCollapsed && (
                <span className="font-semibold text-lg tracking-tight text-zinc-800">Ledger AI</span>
              )}
            </div>
            <button
              className="lg:hidden text-zinc-400 hover:text-zinc-700 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X size={20} strokeWidth={1.5} />
            </button>
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            onClick={() => setCollapsed(!isCollapsed)}
            className="hidden lg:flex items-center justify-center mx-auto -mb-1 mt-3 w-7 h-7 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 transition-all duration-200"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <ChevronLeft size={16} strokeWidth={1.5} className={`transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? item.label : undefined}
                className={({ isActive }) => `
                  flex items-center gap-3 rounded-xl transition-all duration-200 relative
                  ${isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5'}
                  ${isActive
                    ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/20'
                    : 'text-zinc-500 hover:bg-zinc-100/80 hover:text-zinc-800'}
                `}
              >
                <item.icon size={19} strokeWidth={1.5} className="flex-shrink-0" />
                {!isCollapsed && (
                  <span className="font-medium text-[13px] tracking-wide">{item.label}</span>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Logout */}
          <div className="p-3 border-t border-zinc-100/80">
            <button
              onClick={async () => {
                try { await auth.logout(); } catch (e) { console.error('Logout failed', e); }
                navigate(AppRoute.LANDING);
              }}
              className={`flex items-center gap-3 w-full rounded-xl text-zinc-400 hover:bg-red-50 hover:text-red-500 transition-all duration-200 ${isCollapsed ? 'px-0 py-2.5 justify-center' : 'px-3.5 py-2.5'}`}
              title={isCollapsed ? 'Logout' : undefined}
            >
              <LogOut size={19} strokeWidth={1.5} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-medium text-[13px]">Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden h-14 bg-white/80 backdrop-blur-xl border-b border-zinc-200/60 flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-zinc-800 to-zinc-950 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">L</span>
            </div>
            <span className="font-semibold text-base tracking-tight">Ledger AI</span>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-zinc-100 rounded-xl transition-colors">
            <Menu size={20} strokeWidth={1.5} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-[1200px] mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;