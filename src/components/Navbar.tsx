import React from 'react';
import { User } from 'firebase/auth';
import { RefreshCw, HardDrive, LogOut, CheckCircle2, AlertCircle, ExternalLink, Calendar as CalendarIcon, BarChart3 } from 'lucide-react';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onSync: () => void;
  isSyncing: boolean;
  lastSynced: Date | null;
  rootFolderId: string | null;
  revisionsDueCount: number;
  onOpenPlanner: () => void;
  onOpenDashboard: () => void;
  onOpenToday: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onLogout,
  onSync,
  isSyncing,
  lastSynced,
  rootFolderId,
  revisionsDueCount,
  onOpenPlanner,
  onOpenDashboard,
  onOpenToday,
}) => {
  return (
    <header className="h-16 px-4 sm:px-8 bg-[#FDFBF7]/80 backdrop-blur-3xl border-b border-zinc-200/50 flex items-center justify-between sticky top-0 z-40">
      {/* Zone 1: Brand */}
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shrink-0">
          <HardDrive className="w-5 h-5" />
        </div>
        <span className="font-black text-lg text-zinc-900 tracking-tighter uppercase whitespace-nowrap">
          Revise<span className="text-indigo-600">Drive</span>
        </span>
      </div>

      {/* Zone 2: Navigation Links */}
      <nav className="hidden md:flex items-center gap-10 mx-10">
        <button
          onClick={onOpenToday}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-600 transition-all whitespace-nowrap"
        >
          Agenda
        </button>
        <button
          onClick={onOpenDashboard}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-600 transition-all whitespace-nowrap"
        >
          Analysis
        </button>
        <button
          onClick={onOpenPlanner}
          className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-indigo-600 transition-all whitespace-nowrap relative"
        >
          Orbit
          {revisionsDueCount > 0 && (
            <span className="absolute -top-2 -right-4 px-1.5 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-full shadow-lg animate-bounce">
              {revisionsDueCount}
            </span>
          )}
        </button>
      </nav>

      {/* Zone 3: Primary Actions */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 pr-4 border-r border-zinc-200/50 mr-2">
          {lastSynced && (
            <span className="hidden lg:inline text-[10px] font-bold text-zinc-300 font-mono tabular-nums">
              {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="p-2.5 text-zinc-300 hover:text-indigo-600 transition-all disabled:opacity-50"
            title="Sync Now"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-amber-500' : ''}`} />
          </button>
        </div>

        {user && (
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                  className="w-10 h-10 rounded-2xl border border-zinc-200 shadow-sm group-hover:scale-110 transition-transform"
                />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-500 text-xs font-black flex items-center justify-center border border-zinc-200 shadow-sm">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              )}
            </div>
            
            <button
              onClick={onLogout}
              className="p-2.5 text-zinc-300 hover:text-rose-600 transition-all"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
