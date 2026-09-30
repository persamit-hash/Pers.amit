import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  UploadCloud,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Trash2,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  Sliders,
  Check,
  Download,
  Eye,
  Info,
  Layers,
  ArrowRight,
  History,
  CalendarDays,
  ChevronRight,
  HardDrive,
  Plus,
  Edit2,
  X
} from 'lucide-react';
import { DriveFileItem, RevisionFrequency, RevisionLogEntry, RevisionSettings, TopicItem, UploadProgress } from '../types';
import {
  calculateNextDate,
  formatDatePretty,
  formatRelativeDate,
  formatFileSize,
  FREQUENCY_LABELS,
  getIntervalDays,
  getRevisionStatus
} from '../utils/revisionUtils';

interface TopicDetailProps {
  topic: TopicItem;
  onUpdateSettings: (topicId: string, settings: RevisionSettings) => Promise<void>;
  onUploadFile: (topicId: string, file: File, onProgress: (p: UploadProgress) => void) => Promise<DriveFileItem>;
  onDeleteFile: (topicId: string, file: DriveFileItem) => void;
  onPreviewFile: (file: DriveFileItem) => void;
  onRenameTopic: (topic: TopicItem) => void;
  isSavingSettings: boolean;
}

export const TopicDetail: React.FC<TopicDetailProps> = ({
  topic,
  onUpdateSettings,
  onUploadFile,
  onDeleteFile,
  onPreviewFile,
  onRenameTopic,
  isSavingSettings,
}) => {
  // Local state for editable settings
  const [frequency, setFrequency] = useState<RevisionFrequency>(topic.settings.frequency || 'spaced_repetition');
  const [customDays, setCustomDays] = useState<number>(topic.settings.customDays || 7);
  const [reminderTime, setReminderTime] = useState<string>(topic.settings.reminderTime || '09:00');
  const [nextRevisionDate, setNextRevisionDate] = useState<string>(
    topic.settings.nextRevisionDate || calculateNextDate(topic.settings.frequency || 'spaced_repetition', topic.settings.revisionCount || 0)
  );
  const [syncToCalendar, setSyncToCalendar] = useState<boolean>(topic.settings.syncToCalendar ?? true);
  const [syncToTasks, setSyncToTasks] = useState<boolean>(topic.settings.syncToTasks ?? true);
  const [notes, setNotes] = useState<string>(topic.settings.notes || '');

  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadProgress | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever topic changes
  React.useEffect(() => {
    setFrequency(topic.settings.frequency || 'spaced_repetition');
    setCustomDays(topic.settings.customDays || 7);
    setReminderTime(topic.settings.reminderTime || '09:00');
    setNextRevisionDate(
      topic.settings.nextRevisionDate ||
      calculateNextDate(topic.settings.frequency || 'spaced_repetition', topic.settings.revisionCount || 0)
    );
    setSyncToCalendar(topic.settings.syncToCalendar ?? true);
    setSyncToTasks(topic.settings.syncToTasks ?? true);
    setNotes(topic.settings.notes || '');
    setUploadError(null);
  }, [topic.id, topic.settings]);

  // When frequency changes, offer to auto-recalculate next date if desired
  const handleFrequencyChange = (newFreq: RevisionFrequency) => {
    setFrequency(newFreq);
    const newDate = calculateNextDate(newFreq, topic.settings.revisionCount || 0, customDays);
    setNextRevisionDate(newDate);
  };

  const handleCustomDaysChange = (days: number) => {
    const val = Math.max(1, days);
    setCustomDays(val);
    if (frequency === 'custom') {
      const newDate = calculateNextDate('custom', topic.settings.revisionCount || 0, val);
      setNextRevisionDate(newDate);
    }
  };

  const handleSaveSettings = async () => {
    const updated: RevisionSettings = {
      ...topic.settings,
      frequency,
      customDays,
      reminderTime,
      nextRevisionDate,
      syncToCalendar,
      syncToTasks,
      notes,
    };
    await onUpdateSettings(topic.id, updated);
  };

  const handleMarkRevisionDone = async () => {
    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    const nextCount = (topic.settings.revisionCount || 0) + 1;
    const computedNextDate = calculateNextDate(frequency, nextCount, customDays);
    const todayStr = new Date().toISOString().split('T')[0];

    const newLogEntry: RevisionLogEntry = {
      id: 'rev_' + Date.now(),
      date: todayStr,
      completed: true,
      minutes: 0,
      notes: `Completed revision #${nextCount}`,
    };

    const existingHistory = topic.settings.history || [];
    const updatedHistory = [...existingHistory, newLogEntry];

    const updated: RevisionSettings = {
      ...topic.settings,
      revisionCount: nextCount,
      lastRevisedAt: todayStr,
      nextRevisionDate: computedNextDate,
      frequency,
      customDays,
      reminderTime,
      syncToCalendar,
      syncToTasks,
      notes,
      history: updatedHistory,
    };

    setNextRevisionDate(computedNextDate);
    await onUpdateSettings(topic.id, updated);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    setUploadError(null);
    const fileArray = Array.from(files);
    
    // Process one by one for now to keep progress UI simple, or we could parallelize
    for (const file of fileArray) {
      // Check size limit: 200MB (200 * 1024 * 1024 bytes)
      const MAX_SIZE = 200 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        setUploadError(`File "${file.name}" is too large (${formatFileSize(file.size)}). Max allowed is 200MB.`);
        continue;
      }

      try {
        await onUploadFile(topic.id, file, (p) => {
          setCurrentUpload(p);
        });
        setCurrentUpload(null);
      } catch (err: any) {
        setUploadError(err.message || `Upload of "${file.name}" failed`);
        setCurrentUpload(null);
        break; // Stop on first error
      }
    }
  };

  const status = getRevisionStatus(nextRevisionDate);
  const currentIntervalDays = getIntervalDays(frequency, topic.settings.revisionCount || 0, customDays);

  // Filter only PDF files as requested
  const pdfFiles = topic.files.filter(f => 
    f.mimeType.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col h-full bg-[#FDFBF7]">
      {/* Topic Header & Top Settings (Fixed at top) */}
      <div className="shrink-0 p-5 sm:p-10 border-b border-zinc-200/50 z-20 bg-white/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-[10px] font-black text-indigo-600/40 uppercase tracking-[0.3em]">
                <span className="text-zinc-500">Vault</span>
                <span aria-hidden="true" className="text-zinc-300">/</span>
                <span className="truncate text-indigo-600">{topic.subjectName}</span>
              </div>
              <h1 className="text-3xl font-black text-zinc-900 tracking-tight flex items-center gap-4 group">
                <span className="truncate bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">{topic.name}</span>
                <button
                  onClick={() => onRenameTopic(topic)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  title="Rename Topic"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-4 pr-6 border-r border-zinc-200">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Next Calibration</span>
                  <input
                    type="date"
                    value={nextRevisionDate}
                    onChange={(e) => setNextRevisionDate(e.target.value)}
                    className="bg-transparent text-sm font-black text-indigo-600 focus:outline-hidden text-right cursor-pointer font-mono tabular-nums"
                  />
                </div>
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="p-2.5 bg-white text-zinc-600 hover:text-zinc-900 transition-all rounded-xl border border-zinc-200 shadow-sm active:scale-95 group/save"
                >
                  <Save className="w-5 h-5 group-hover:text-emerald-600 transition-colors" />
                </button>
              </div>

              <button
                onClick={handleMarkRevisionDone}
                className="flex items-center gap-3 px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg shadow-indigo-200 active:scale-95 shrink-0"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>Log Delta</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-5 text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">
            <div className="flex items-center gap-2 text-indigo-600/80">
              <FileText className="w-4 h-4" />
              <span className="font-mono tabular-nums">{pdfFiles.length} Assets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="p-8 sm:p-12 max-w-6xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Revision Preferences */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-zinc-900">
                  <div className="p-2 bg-zinc-100 rounded-xl">
                    <Sliders className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">Algorithmic Tuning</h3>
                </div>
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Intensity Profile</label>
                    <select
                      value={frequency}
                      onChange={(e) => handleFrequencyChange(e.target.value as RevisionFrequency)}
                      className="w-full text-xs font-black px-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-sm text-zinc-900"
                    >
                      {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                        <option key={key} value={key} className="text-zinc-900">{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Review Window</label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={(e) => setReminderTime(e.target.value)}
                      className="w-full text-xs font-black px-4 py-3 bg-white border border-zinc-200 rounded-2xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30 transition-all shadow-sm font-mono tabular-nums text-zinc-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sync Toggles */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 text-zinc-900">
                  <div className="p-2 bg-zinc-100 rounded-xl">
                    <RotateCcw className="w-5 h-5 text-zinc-600" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em]">External Ecosystem</h3>
                </div>
                <div className="flex gap-10">
                  <label className="group flex items-center gap-4 cursor-pointer">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={syncToCalendar}
                        onChange={(e) => setSyncToCalendar(e.target.checked)}
                        className="peer w-5 h-5 rounded-lg border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500/30 cursor-pointer transition-all"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 peer-checked:text-zinc-900 group-hover:text-zinc-900 transition-colors tracking-widest">Calendar Sync</span>
                  </label>
                  <label className="group flex items-center gap-4 cursor-pointer">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={syncToTasks}
                        onChange={(e) => setSyncToTasks(e.target.checked)}
                        className="peer w-5 h-5 rounded-lg border-zinc-300 bg-white text-indigo-600 focus:ring-indigo-500/30 cursor-pointer transition-all"
                      />
                    </div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 peer-checked:text-zinc-900 group-hover:text-zinc-900 transition-colors tracking-widest">Google Tasks</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Study notes for this topic */}
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 ml-1">
                Strategic Intelligence
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Document your current understanding, focus areas, or specific goals for this topic..."
                className="w-full text-sm font-medium p-6 bg-white border border-zinc-200 rounded-[2rem] focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder:text-zinc-300 leading-relaxed shadow-sm text-zinc-900"
              />
            </div>

            {/* Previous Revisions History Timeline */}
            {topic.settings.history && topic.settings.history.length > 0 && (
              <div className="space-y-8">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div className="flex items-center gap-3 text-zinc-500">
                    <History className="w-5 h-5" />
                    <span className="text-sm font-black uppercase tracking-[0.2em]">Quantum History ({topic.settings.history.length})</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {topic.settings.history.slice().reverse().map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between p-5 rounded-2xl border border-zinc-200 bg-white group/log hover:bg-zinc-50 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-zinc-900 font-mono tabular-nums">
                            {formatDatePretty(item.date)}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-0.5">
                            {formatRelativeDate(item.date, false)}
                            {item.minutes > 0 && ` · ${item.minutes}m session`}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File Upload & PDF Management Section (Up to 200MB) */}
            <div className="space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-zinc-100 text-zinc-900 rounded-2xl border border-zinc-200">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-sm font-black text-zinc-900 uppercase tracking-[0.2em] flex items-center gap-3">
                      Knowledge Assets
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">DRIVE</span>
                    </h2>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Manage core materials for this topic</p>
                  </div>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!!currentUpload}
                  className="px-6 py-3 bg-white hover:bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-3 shadow-sm active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Data</span>
                </button>
              </div>

              {/* Drag and Drop Zone */}
              {!currentUpload && pdfFiles.length === 0 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    handleFilesSelected(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`group relative border-2 border-dashed rounded-[2.5rem] p-16 text-center cursor-pointer transition-all duration-500 ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                      : 'border-zinc-200 hover:border-indigo-400 hover:bg-zinc-50 shadow-sm'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    multiple
                    onChange={(e) => handleFilesSelected(e.target.files)}
                  />
                  <div className="mb-6 relative">
                    <UploadCloud className="w-12 h-12 mx-auto text-zinc-200 group-hover:text-indigo-400 transition-all duration-500 relative" />
                  </div>
                  <p className="text-base font-black text-zinc-900 tracking-tight">Deploy study materials</p>
                  <p className="text-[10px] text-zinc-400 mt-2 font-black uppercase tracking-[0.2em]">Supports PDF assets up to 200MB</p>
                </div>
              )}

              {/* Resumable Upload Progress Card */}
              {currentUpload && (
                <div className="p-8 bg-white text-zinc-900 rounded-[2rem] border border-zinc-200 shadow-lg space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 truncate pr-6">
                       <div className="p-2 bg-indigo-100 rounded-xl">
                        <RotateCcw className="w-5 h-5 animate-spin text-indigo-600" />
                       </div>
                       <span className="font-black text-xs truncate uppercase tracking-widest">{currentUpload.fileName}</span>
                    </div>
                    <span className="font-mono tabular-nums text-sm font-black text-zinc-400">{currentUpload.percentage}%</span>
                  </div>

                  <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200 p-0.5">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${currentUpload.percentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">
                    <span>{formatFileSize(currentUpload.uploadedBytes)} / {formatFileSize(currentUpload.fileSize)}</span>
                    <span className="flex items-center gap-2 text-indigo-600">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
                      Syncing to Drive
                    </span>
                  </div>
                </div>
              )}

              {/* Files List */}
              {pdfFiles.length > 0 && (
                <div className="grid grid-cols-1 gap-4">
                  {pdfFiles.map((file) => {
                    return (
                      <div
                        key={file.id}
                        className="group/file flex items-center justify-between p-5 bg-white border border-zinc-200 rounded-[1.5rem] hover:bg-zinc-50 transition-all shadow-sm"
                      >
                        <div className="flex items-center gap-5 min-w-0 flex-1 cursor-pointer" onClick={() => onPreviewFile(file)}>
                          <div className="p-3 bg-zinc-100 text-zinc-600 rounded-xl group-hover/file:bg-zinc-200 transition-colors">
                            <FileText className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-black text-zinc-900 truncate group-hover/file:text-indigo-600 transition-colors tracking-tight">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mt-1">
                              {file.createdTime ? formatDatePretty(file.createdTime) : 'Synced'} · {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 opacity-0 group-hover/file:opacity-100 transition-all transform translate-x-2 group-hover/file:translate-x-0">
                          <a
                            href={file.webContentLink}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="p-2.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-all"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => onPreviewFile(file)}
                            className="p-2.5 text-zinc-400 hover:text-indigo-600 hover:bg-zinc-100 rounded-xl transition-all"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => onDeleteFile(topic.id, file)}
                            className="p-2.5 text-zinc-400 hover:text-rose-600 hover:bg-zinc-100 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  );
};
