import React, { useState, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  FileText,
  UploadCloud,
  Calendar,
  CheckCircle2,
  Clock,
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
  CalendarDays
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
  isSavingSettings: boolean;
}

export const TopicDetail: React.FC<TopicDetailProps> = ({
  topic,
  onUpdateSettings,
  onUploadFile,
  onDeleteFile,
  onPreviewFile,
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
      minutes: 45,
      completed: true,
      notes: `Completed revision #${nextCount}`,
    };

    const existingHistory = topic.settings.history || [];
    const updatedHistory = [...existingHistory, newLogEntry];
    const newTotalMinutes = (topic.settings.totalStudyMinutes || 0) + 45;

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
      totalStudyMinutes: newTotalMinutes,
      history: updatedHistory,
    };

    setNextRevisionDate(computedNextDate);
    await onUpdateSettings(topic.id, updated);
  };

  const handleQuickLogStudy = async (minutes: number) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newLogEntry: RevisionLogEntry = {
      id: 'study_' + Date.now(),
      date: todayStr,
      minutes,
      completed: false,
      notes: `Studied for ${minutes} mins`,
    };

    const existingHistory = topic.settings.history || [];
    const updatedHistory = [...existingHistory, newLogEntry];
    const newTotalMinutes = (topic.settings.totalStudyMinutes || 0) + minutes;

    const updated: RevisionSettings = {
      ...topic.settings,
      totalStudyMinutes: newTotalMinutes,
      history: updatedHistory,
    };
    await onUpdateSettings(topic.id, updated);
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Check size limit: 200MB (200 * 1024 * 1024 bytes)
    const MAX_SIZE = 200 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`File is too large (${formatFileSize(file.size)}). Max allowed is 200MB.`);
      return;
    }

    setUploadError(null);
    try {
      await onUploadFile(topic.id, file, (p) => {
        setCurrentUpload(p);
      });
      setCurrentUpload(null);
    } catch (err: any) {
      setUploadError(err.message || 'Upload failed');
      setCurrentUpload(null);
    }
  };

  const status = getRevisionStatus(nextRevisionDate);
  const currentIntervalDays = getIntervalDays(frequency, topic.settings.revisionCount || 0, customDays);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Topic Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mb-1">
            <span className="hover:underline cursor-pointer">Subjects</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">{topic.subjectName}</span>
            <ArrowRight className="w-3 h-3 text-zinc-400" />
            <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{topic.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {topic.name}
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Google Drive Topic Folder • {topic.files.length} file{topic.files.length !== 1 ? 's' : ''} stored
          </p>
        </div>

        {/* Status Badge & Mark Done Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
            <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            <span className="text-zinc-500">Studied:</span>
            <span className="font-bold text-zinc-800 dark:text-zinc-200 font-mono">
              {((topic.settings.totalStudyMinutes || (topic.settings.revisionCount * 45)) / 60).toFixed(1)}h
            </span>
          </div>

          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-[11px]">
            <span className="text-zinc-400 px-1 font-medium">+Log:</span>
            <button
              onClick={() => handleQuickLogStudy(30)}
              title="Log 30 minutes study session"
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 font-semibold shadow-2xs transition-colors"
            >
              30m
            </button>
            <button
              onClick={() => handleQuickLogStudy(45)}
              title="Log 45 minutes study session"
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 font-semibold shadow-2xs transition-colors"
            >
              45m
            </button>
            <button
              onClick={() => handleQuickLogStudy(60)}
              title="Log 60 minutes study session"
              className="px-2 py-0.5 rounded-lg bg-white dark:bg-zinc-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 text-zinc-700 dark:text-zinc-200 hover:text-indigo-600 font-semibold shadow-2xs transition-colors"
            >
              60m
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-xs">
            <span className="text-zinc-500">Round:</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
              #{topic.settings.revisionCount || 0}
            </span>
          </div>

          <button
            onClick={handleMarkRevisionDone}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Revision Done</span>
          </button>
        </div>
      </div>

      {/* Revision Schedule & Preferences Card */}
      <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-700/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Revision Reminders &amp; Frequency Preferences
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Frequently adjust intervals anytime to match topic difficulty and learning curve.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status === 'due_today' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
                Due Today!
              </span>
            )}
            {status === 'overdue' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                Overdue
              </span>
            )}
            {status === 'upcoming' && (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                Next: {formatDatePretty(nextRevisionDate)}
              </span>
            )}
          </div>
        </div>

        {/* Prominent Revision Timeline Dates Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-50 dark:bg-zinc-900/70 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span>Previous Revision Date</span>
            </span>
            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
              {topic.settings.lastRevisedAt ? formatDatePretty(topic.settings.lastRevisedAt) : 'No previous revision yet'}
            </div>
            <p className="text-xs text-zinc-400">
              {topic.settings.lastRevisedAt ? formatRelativeDate(topic.settings.lastRevisedAt, false) : 'Start with your first revision session!'}
            </p>
          </div>

          <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-zinc-200 dark:border-zinc-800 pt-2 sm:pt-0 sm:pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
              <span>Next Coming Date</span>
            </span>
            <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>{formatDatePretty(nextRevisionDate)}</span>
              <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                ({formatRelativeDate(nextRevisionDate, true)})
              </span>
            </div>
            <p className="text-xs text-zinc-500">
              Alert scheduled for {reminderTime || '09:00'} • Revision Round #{topic.settings.revisionCount + 1}
            </p>
          </div>
        </div>

        {/* Frequency & Date Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Frequency selector */}
          <div className="space-y-1.5 md:col-span-1">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
              <span>Revision Frequency</span>
              <span className="text-[11px] text-zinc-400 font-mono">+{currentIntervalDays} days</span>
            </label>
            <select
              value={frequency}
              onChange={(e) => handleFrequencyChange(e.target.value as RevisionFrequency)}
              className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            >
              {Object.entries(FREQUENCY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>

            {frequency === 'custom' && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-xs text-zinc-600 dark:text-zinc-400">Interval:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={customDays}
                  onChange={(e) => handleCustomDaysChange(parseInt(e.target.value, 10) || 1)}
                  className="w-20 text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
                />
                <span className="text-xs text-zinc-600 dark:text-zinc-400">days</span>
              </div>
            )}
          </div>

          {/* Next Revision Date Picker */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Next Revision Due Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={nextRevisionDate}
                onChange={(e) => setNextRevisionDate(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Last revised: {topic.settings.lastRevisedAt ? formatDatePretty(topic.settings.lastRevisedAt) : 'Never'}
            </p>
          </div>

          {/* Reminder Time */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Reminder Notification Time
            </label>
            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
            />
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Time for calendar notification alert
            </p>
          </div>
        </div>

        {/* Workspace Sync Options */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-100 dark:border-zinc-700/60">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sync to Google Calendar</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={syncToTasks}
                onChange={(e) => setSyncToTasks(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Sync to Google Tasks</span>
            </label>
          </div>

          <button
            onClick={handleSaveSettings}
            disabled={isSavingSettings}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingSettings ? 'Saving...' : 'Save & Sync Schedule'}</span>
          </button>
        </div>

        {/* Study notes for this topic */}
        <div className="pt-2">
          <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1 block">
            Revision Notes &amp; Key Focus Areas (included in Calendar event)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key high-yield concepts, formulas, mnemonics, or page numbers to focus on during this revision..."
            className="w-full text-xs p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {/* Previous Revisions History Timeline */}
        {topic.settings.history && topic.settings.history.length > 0 && (
          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-700/60">
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 mb-2">
              <History className="w-3.5 h-3.5 text-indigo-500" />
              <span>Previous Revision Sessions ({topic.settings.history.length})</span>
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {topic.settings.history.slice().reverse().map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="flex items-center justify-between p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {formatDatePretty(item.date)}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      ({formatRelativeDate(item.date, false)})
                    </span>
                    {item.notes && (
                      <span className="text-[11px] text-zinc-500 italic max-w-xs truncate">
                        • {item.notes}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-zinc-400 shrink-0">
                    {item.minutes}m studied
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* File Upload & PDF Management Section (Up to 200MB) */}
      <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Files &amp; PDFs in this Topic</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Up to 200MB Support
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Uploaded directly to your Google Drive topic folder with resumable chunks.
              </p>
            </div>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!!currentUpload}
            className="flex items-center gap-2 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload PDF / File</span>
          </button>
        </div>

        {/* Drag and Drop Zone */}
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
          onClick={() => {
            if (!currentUpload) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/20'
              : 'border-zinc-300 dark:border-zinc-700 hover:border-purple-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFilesSelected(e.target.files)}
          />

          <div className="w-12 h-12 mx-auto rounded-2xl bg-purple-100 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
            <UploadCloud className="w-6 h-6" />
          </div>

          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Click to upload or drag &amp; drop study PDFs, notes, or slides
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Fast resumable uploads supported up to <strong>200MB</strong> per file
          </p>
        </div>

        {/* Error message */}
        {uploadError && (
          <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Resumable Upload Progress Card */}
        {currentUpload && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-purple-200 dark:border-purple-900/60 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0 pr-4">
                <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                  {currentUpload.fileName}
                </span>
              </div>
              <span className="font-mono text-purple-600 dark:text-purple-400 font-semibold shrink-0">
                {currentUpload.percentage}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-purple-600 to-indigo-600 h-full transition-all duration-200"
                style={{ width: `${currentUpload.percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono">
              <span>
                {formatFileSize(currentUpload.uploadedBytes)} of {formatFileSize(currentUpload.fileSize)}
              </span>
              <span className="text-purple-600 dark:text-purple-400">
                Uploading to Google Drive...
              </span>
            </div>
          </div>
        )}

        {/* Files List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500 px-1">
            <span>Uploaded Study Files ({topic.files.length})</span>
            <span>File Size</span>
          </div>

          {topic.files.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-400">
              No files uploaded to this topic yet. Add PDFs, slides, or documents above.
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {topic.files.map((file) => {
                const isPdf = file.mimeType.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');

                return (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-800/60 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-4">
                      <div className={`p-2 rounded-lg shrink-0 ${isPdf ? 'bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400' : 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                          {file.name}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {file.createdTime ? formatDatePretty(file.createdTime) : 'Uploaded to Drive'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                        {formatFileSize(file.size)}
                      </span>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onPreviewFile(file)}
                          title="Preview File"
                          className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noreferrer"
                            title="Open in Google Drive"
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}

                        <button
                          onClick={() => onDeleteFile(topic.id, file)}
                          title="Delete from Google Drive"
                          className="p-1.5 text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
