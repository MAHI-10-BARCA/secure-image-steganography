import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Lock,
  Unlock,
  BarChart3,
  Info,
  Shield,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/hide', label: 'Hide Message', icon: Lock },
  { to: '/extract', label: 'Extract Message', icon: Unlock },
  { to: '/analysis', label: 'Image Analysis', icon: BarChart3 },
  { to: '/about', label: 'About Project', icon: Info },
];

export default function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-navy-900">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-navy-800 border-b md:border-b-0 md:border-r border-navy-600/50 flex-shrink-0">
        <div className="p-5 flex items-center gap-3 border-b border-navy-600/50">
          <div className="p-2 rounded-lg bg-accent-blue/20 text-accent-blue">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-tight">Secure Stego</h1>
            <p className="text-xs text-slate-400">AES + LSB</p>
          </div>
        </div>
        <nav className="p-3 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-blue/15 text-accent-blue'
                    : 'text-slate-300 hover:bg-navy-700 hover:text-white'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
