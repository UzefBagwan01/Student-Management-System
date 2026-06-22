import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { 
  LayoutDashboard, Users, CheckSquare, FileText, 
  PieChart, UserCircle, LogOut, Menu, X, Moon, Sun, QrCode, ScanLine, Wallet
} from 'lucide-react';

import { cn } from '../../lib/utils';

export default function Layout() {
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'teacher', 'student'] },
    { to: '/students', icon: Users, label: 'Students', roles: ['admin', 'teacher'] },
    { to: '/teachers', icon: Users, label: 'Teachers', roles: ['admin'] },
    { to: '/attendance', icon: CheckSquare, label: 'Attendance', roles: ['admin', 'teacher', 'student'] },
    { to: '/qr-attendance', icon: QrCode, label: 'QR Attendance', roles: ['admin', 'teacher'] },
    { to: '/qr-scan', icon: ScanLine, label: 'Scan Attendance', roles: ['student', 'admin', 'teacher'] },
    { to: '/marks', icon: FileText, label: 'Marks', roles: ['admin', 'teacher', 'student'] },
    { to: '/fees', icon: Wallet, label: 'Fee Management', roles: ['admin'] },
    { to: '/my-fees', icon: Wallet, label: 'My Fees', roles: ['student'] },
    { to: '/reports', icon: PieChart, label: 'Reports', roles: ['admin'] },
    { to: '/profile', icon: UserCircle, label: 'Profile', roles: ['admin', 'teacher', 'student'] },
  ];

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-900 transition-colors">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-neutral-950 border-r border-gray-200 dark:border-neutral-800 transition-transform duration-300 transform lg:translate-x-0 lg:static lg:inset-0 flex flex-col",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 flex items-center justify-between border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight">StudentMS</span>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-neutral-300">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.filter(item => item.roles.includes(role || 'student')).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                isActive 
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400" 
                  : "text-gray-600 hover:bg-gray-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
              )}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-100 dark:border-neutral-800">
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-neutral-900 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-neutral-700 flex-shrink-0 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-neutral-300">
                {role === 'admin' ? 'A' : role === 'teacher' ? 'T' : 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold truncate uppercase tracking-wider">{role === 'admin' ? 'Admin Panel' : role === 'teacher' ? 'Teacher Panel' : 'Student Panel'}</p>
                <p className="text-[10px] text-gray-500 dark:text-neutral-400 truncate">Portal Access</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-red-600 transition-colors bg-white dark:bg-neutral-800 p-1 rounded-md"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#F3F4F6] dark:bg-neutral-900">
        {/* Header */}
        <header className="h-16 bg-white dark:bg-neutral-950 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between px-8 z-10 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="mr-4 text-gray-500 hover:text-gray-700 dark:hover:text-neutral-300 lg:hidden"
            >
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-neutral-100 hidden sm:block">
              {role === 'admin' ? 'Dashboard Overview' : role === 'teacher' ? 'Teacher Dashboard' : 'Student Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="w-8 h-8 flex items-center justify-center text-gray-500 bg-gray-100 dark:bg-neutral-800 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 text-gray-900 dark:text-neutral-100">
          <div className="max-w-7xl mx-auto flex flex-col gap-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
