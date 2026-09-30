import React from 'react';
import { HardDrive, Calendar, CheckSquare, UploadCloud, Repeat, ShieldCheck, Sparkles, Layers } from 'lucide-react';

interface AuthLandingProps {
  onLogin: () => void;
  isLoading: boolean;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-indigo-50/40 dark:from-zinc-950 dark:via-zinc-900 dark:to-indigo-950/20 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between">
      {/* Top bar */}
      <header className="px-6 lg:px-12 py-5 border-b border-zinc-200/60 dark:border-zinc-800/80 backdrop-blur-md bg-white/70 dark:bg-zinc-900/70 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight tracking-tight flex items-center gap-1.5">
              ReviseDrive
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Workspace Hub
              </span>
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Drive Organization &amp; Smart Revision System
            </p>
          </div>
        </div>
      </header>

      {/* Main hero */}
      <main className="max-w-6xl mx-auto px-6 py-12 lg:py-16 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Integrated with Google Drive, Calendar &amp; Tasks</span>
        </div>

        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-4xl text-zinc-900 dark:text-zinc-50">
          Save by <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">Subject &amp; Topic</span> in Drive, Upload up to <span className="underline decoration-indigo-500 decoration-wavy decoration-2">200MB PDFs</span> &amp; Never Miss a Revision.
        </h2>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
          Keep your study files cleanly organized into subjects and topics directly in your Google Drive. Upload full medical, engineering, or legal notes up to 200MB with resumable syncing, and schedule tailored spaced repetition reminders on Google Calendar and Google Tasks.
        </p>

        {/* Google Sign-in Card */}
        <div className="mt-10 p-6 sm:p-8 bg-white dark:bg-zinc-800/90 rounded-2xl shadow-xl border border-zinc-200/80 dark:border-zinc-700/80 max-w-md w-full flex flex-col items-center">
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-4 text-center">
            Sign in with your Google account to automatically sync your Drive folders and revision schedule.
          </p>

          <button
            onClick={onLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl border border-zinc-300 dark:border-zinc-600 bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 font-medium shadow-xs hover:shadow-md transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Connecting securely...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span className="text-sm font-semibold">Sign in with Google</span>
              </>
            )}
          </button>

          <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Files stored directly in your personal Google Drive</span>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-left w-full">
          <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
              <Layers className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Subject &amp; Topic Folders</h4>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Folders are automatically mirrored to your Drive. Keep Anatomy, Physiology, or Math neatly structured.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Up to 200MB PDF Uploads</h4>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              High-speed chunked resumable upload handles massive slides, scanned textbooks, and question banks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
              <Repeat className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Adjustable Revision Schedules</h4>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Use Spaced Repetition (1-3-7-14-30d) or customize frequencies anytime based on topic difficulty.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 shadow-2xs hover:shadow-md transition-shadow">
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5" />
            </div>
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Calendar &amp; Tasks Sync</h4>
            <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Revision dates automatically create Google Calendar events and Google Tasks with timely push reminders.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-zinc-200 dark:border-zinc-800 text-center text-xs text-zinc-500">
        ReviseDrive • Study Materials &amp; Spaced Repetition Hub connected to Google Drive, Calendar, and Tasks
      </footer>
    </div>
  );
};
