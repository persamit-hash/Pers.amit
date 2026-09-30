import React from 'react';
import { HardDrive, Calendar, CheckSquare, UploadCloud, Repeat, ShieldCheck, Sparkles, Layers } from 'lucide-react';

interface AuthLandingProps {
  onLogin: () => void;
  isLoading: boolean;
}

export const AuthLanding: React.FC<AuthLandingProps> = ({ onLogin, isLoading }) => {
  return (
    <div className="min-h-screen bg-[#FDFBF7] text-zinc-900 flex flex-col justify-between selection:bg-indigo-100">
      {/* Top bar */}
      <header className="px-6 lg:px-12 h-24 border-b border-zinc-200/50 bg-white/40 backdrop-blur-3xl sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="font-black text-xl tracking-tighter uppercase text-zinc-900">
            Revise<span className="text-indigo-600">Drive</span>
          </span>
        </div>
      </header>

      {/* Main hero */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
        {/* Soft Background Accents */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10 pointer-events-none overflow-hidden">
          <div className="absolute top-[10%] left-[-5%] w-[40%] h-[40%] rounded-full bg-indigo-100 blur-[120px] opacity-60" />
          <div className="absolute bottom-[10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-amber-100 blur-[120px] opacity-60" />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-24 lg:py-40 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white border border-zinc-200 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em] mb-12 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Refined Learning Ecosystem</span>
          </div>

          <h1 className="text-6xl lg:text-9xl font-black tracking-tighter text-zinc-900 max-w-6xl leading-[0.85]">
            Master your knowledge, <span className="text-indigo-600">effortlessly.</span>
          </h1>

          <p className="mt-12 text-xl sm:text-3xl text-zinc-500 max-w-3xl leading-relaxed font-black uppercase tracking-tight">
            The sophisticated workspace for high-stakes learning. Mirrored with Google Drive. Automated by science.
          </p>

          <div className="mt-16 flex flex-col items-center gap-8">
            <button
              onClick={onLogin}
              disabled={isLoading}
              className="group relative px-12 py-6 bg-zinc-900 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] hover:scale-[1.05] active:scale-[0.95] transition-all disabled:opacity-50 shadow-2xl shadow-indigo-500/20"
            >
              {isLoading ? (
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing...</span>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 48 48">
                    <path d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  <span>Launch Workspace</span>
                </div>
              )}
            </button>
            <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Secure Biometric OAuth · Google Cloud Storage</span>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="max-w-7xl mx-auto px-6 w-full pb-32">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 text-left">
            {[
              { icon: Layers, label: 'Vault', desc: 'Secure subject & topic mirroring in your private Google Drive infrastructure.' },
              { icon: UploadCloud, label: 'Volume', desc: 'Enterprise-grade PDF processing engine for files up to 200MB.' },
              { icon: Repeat, label: 'Logic', desc: 'Scientific spaced-repetition algorithms for deterministic retention.' },
              { icon: Calendar, label: 'Ecosystem', desc: 'Frictionless neural sync with Google Calendar & Tasks reminders.' },
            ].map((f, i) => (
              <div key={i} className="group p-10 rounded-[3rem] border border-zinc-200 bg-white transition-all hover:border-indigo-300 hover:shadow-2xl hover:scale-[1.02] shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all mb-8 shadow-inner border border-indigo-100">
                  <f.icon className="w-7 h-7" />
                </div>
                <h3 className="font-black text-xs text-zinc-900 uppercase tracking-[0.3em] mb-4">{f.label}</h3>
                <p className="text-[11px] font-bold text-zinc-500 leading-relaxed uppercase tracking-widest">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-24 border-t border-zinc-200 flex items-center justify-center px-6 bg-white/40 backdrop-blur-3xl">
        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">
          ReviseDrive · The Spaced Repetition Workspace · MMXXIV
        </span>
      </footer>
    </div>
  );
};
