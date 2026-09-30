import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  itemDescription?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  itemDescription,
  confirmLabel = 'Confirm Delete',
  cancelLabel = 'Cancel',
  isDestructive = true,
  onConfirm,
  onCancel,
  isProcessing = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div 
        className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-zinc-200 overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-10">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className={`p-5 rounded-2xl shrink-0 border ${isDestructive ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {isDestructive ? <Trash2 className="w-10 h-10" /> : <AlertTriangle className="w-10 h-10" />}
            </div>
            <div className="space-y-4">
              <h3 className="text-2xl font-black text-zinc-900 tracking-tight">
                {title}
              </h3>
              <p className="text-sm font-bold text-zinc-500 leading-relaxed max-w-[280px] mx-auto uppercase tracking-wide">
                {message}
              </p>
              {itemDescription && (
                <div className="mt-6 p-4 bg-zinc-50 rounded-2xl text-[10px] font-black text-zinc-400 break-all border border-zinc-100 uppercase tracking-[0.2em]">
                  {itemDescription}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-zinc-50 px-10 py-8 flex flex-col sm:flex-row items-center justify-center gap-4 border-t border-zinc-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="w-full sm:w-auto px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-zinc-900 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`w-full sm:w-auto px-10 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white rounded-2xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-3 active:scale-95 ${
              isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Syncing...</span>
              </>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
