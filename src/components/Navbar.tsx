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
}) => {
  return (
    <header className="h-16 px-4 sm:px-6 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 z-40 shadow-2xs">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-xs">
          <HardDrive className="w-5 h-5" />
        </div>
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-bold text-base text-zinc-900 dark:text-zinc-100 tracking-tight">
              ReviseDrive
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Drive Synced
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
            Subject &amp; Topics Hub • 200MB PDF Support
          </p>
        </div>
      </div>

      {/* Center Actions / Due Alert */}
      <div className="flex items-center gap-2 sm:gap-3">
        {revisionsDueCount > 0 && (
          <button
            onClick={onOpenPlanner}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors shadow-2xs"
          >
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>{revisionsDueCount} Due for Revision</span>
          </button>
        )}

        <button
          onClick={onOpenPlanner}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
        >
          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Revisions &amp; Schedule</span>
        </button>

        <button
          onClick={onOpenDashboard}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/40 hover:bg-indigo-100/60 dark:hover:bg-indigo-900/50 text-xs font-semibold text-indigo-700 dark:text-indigo-300 transition-colors shadow-2xs"
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Study Insights</span>
        </button>

        {/* Sync Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSync}
            disabled={isSyncing}
            title="Sync with Google Drive & Calendar"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors disabled:opacity-50 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Drive'}</span>
          </button>

          {lastSynced && (
            <span className="hidden lg:inline text-[11px] text-zinc-400 dark:text-zinc-500">
              Synced {lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>

        {/* Open in Drive Folder */}
        {rootFolderId && (
          <a
            href={`https://drive.google.com/drive/folders/${rootFolderId}`}
            target="_blank"
            rel="noreferrer"
            title="Open ReviseDrive root folder in Google Drive"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-colors shadow-2xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
            <span className="hidden md:inline">Open Drive Folder</span>
          </a>
        )}
      </div>

      {/* User profile & Logout */}
      <div className="flex items-center gap-3">
        {user && (
          <div className="flex items-center gap-2.5 pl-2 sm:pl-3 border-l border-zinc-200 dark:border-zinc-800">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-8 h-8 rounded-full border border-zinc-300 dark:border-zinc-700 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center">
                {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
              </div>
            )}
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">
                {user.displayName || 'Google User'}
              </p>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate max-w-[130px]">
                {user.email}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Sign Out"
              className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
