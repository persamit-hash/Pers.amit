import React from 'react';
import { X, ExternalLink, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { DriveFileItem, TopicItem } from '../types';
import { formatFileSize } from '../utils/revisionUtils';

interface FilePreviewModalProps {
  file: DriveFileItem | null;
  topic: TopicItem | null;
  onClose: (minutes: number) => void;
  onFileChange: (file: DriveFileItem) => void;
  onUpdateRevisionDate: (date: string) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ 
  file, 
  topic, 
  onClose, 
  onFileChange,
  onUpdateRevisionDate 
}) => {
  const [seconds, setSeconds] = React.useState(0);
  const [nextDate, setNextDate] = React.useState('');
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Filter only PDFs from topic
  const pdfFiles = React.useMemo(() => {
    if (!topic) return [];
    return topic.files.filter(f => f.mimeType.includes('pdf') || f.name.toLowerCase().endsWith('.pdf'));
  }, [topic]);

  const currentIndex = pdfFiles.findIndex(f => f.id === file?.id);
  const hasMultipleFiles = pdfFiles.length > 1;

  const handleNextFile = () => {
    if (currentIndex < pdfFiles.length - 1) {
      onFileChange(pdfFiles[currentIndex + 1]);
    }
  };

  const handlePrevFile = () => {
    if (currentIndex > 0) {
      onFileChange(pdfFiles[currentIndex - 1]);
    }
  };

  React.useEffect(() => {
    if (file) {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [file]);

  React.useEffect(() => {
    if (topic) {
      setNextDate(topic.settings.nextRevisionDate || '');
    }
  }, [topic]);

  if (!file) return null;

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNextDate(val);
    onUpdateRevisionDate(val);
  };

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? hrs + ':' : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleClose = () => {
    const elapsedMinutes = Math.max(1, Math.round(seconds / 60));
    onClose(elapsedMinutes);
  };

  const previewUrl = `https://drive.google.com/file/d/${file.id}/preview`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black animate-in fade-in duration-300">
      <div className="relative w-full h-full bg-[#FDFBF7] flex flex-col overflow-hidden">
        {/* Immersive Header */}
        <div className="flex items-center justify-between px-8 py-6 bg-white/90 backdrop-blur-md border-b border-zinc-200 z-10 shadow-sm">
          <div className="flex items-center gap-6 min-w-0 pr-8">
            <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-indigo-600 shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div className="truncate">
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-sm font-black text-zinc-900 truncate uppercase tracking-[0.2em]">
                  {file.name}
                </h3>
                {hasMultipleFiles && (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600 text-[9px] font-black uppercase tracking-widest whitespace-nowrap">
                    {currentIndex + 1} / {pdfFiles.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                <span>{formatFileSize(file.size)}</span>
                <span aria-hidden="true" className="text-zinc-200">·</span>
                <div className="flex items-center gap-3 px-3 py-1 bg-indigo-50 rounded-full border border-indigo-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-700">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse shadow-[0_0_10px_rgba(79,70,229,0.5)]" />
                  <span className="text-indigo-600 font-mono tabular-nums font-black text-[11px] tracking-tight">{formatTime(seconds)}</span>
                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest hidden lg:inline">Live Study Session</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {hasMultipleFiles && (
              <div className="flex items-center gap-2 pr-8 border-r border-zinc-200">
                <button
                  onClick={handlePrevFile}
                  disabled={currentIndex === 0}
                  className="p-2 text-zinc-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Previous Asset"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={handleNextFile}
                  disabled={currentIndex === pdfFiles.length - 1}
                  className="p-2 text-zinc-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Next Asset"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}

            {topic && (
              <div className="flex items-center gap-4 pr-8 border-r border-zinc-200">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] hidden sm:inline">Next Calibration</span>
                <input
                  type="date"
                  value={nextDate}
                  onChange={handleDateChange}
                  className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[10px] font-black text-indigo-600 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer uppercase tracking-widest shadow-sm"
                />
              </div>
            )}
            
            <div className="flex items-center gap-6">
              {file.webViewLink && (
                <a
                  href={file.webViewLink}
                  target="_blank"
                  rel="noreferrer"
                  className="hidden sm:inline-flex text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 hover:text-zinc-900 transition-all"
                >
                  Drive Link
                </a>
              )}
              <button
                onClick={handleClose}
                className="px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center gap-3"
              >
                <X className="w-5 h-5" />
                <span>Finalize Session</span>
              </button>
            </div>
          </div>
        </div>

        {/* Full-Screen Preview Frame */}
        <div className="flex-1 w-full bg-black relative">
          <iframe
            src={previewUrl}
            title={file.name}
            className="w-full h-full border-0"
            allow="autoplay"
          />
        </div>
      </div>
    </div>
  );
};
