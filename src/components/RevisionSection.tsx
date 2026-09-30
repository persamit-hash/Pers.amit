import React, { useState, useMemo } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ArrowRight,
  Filter,
  Sliders,
  Check,
  RotateCcw,
  Search,
  LayoutGrid,
  Table as TableIcon,
  CalendarDays,
  History,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpRight
} from 'lucide-react';
import { SubjectItem, TopicItem, RevisionSettings, RevisionLogEntry } from '../types';
import {
  calculateNextDate,
  formatDatePretty,
  formatRelativeDate,
  FREQUENCY_LABELS,
  getDaysDifference,
  getIntervalDays,
  getRevisionStatus
} from '../utils/revisionUtils';

interface RevisionSectionProps {
  subjects: SubjectItem[];
  onSelectTopic: (topic: TopicItem) => void;
  onUpdateSettings: (topicId: string, settings: RevisionSettings) => Promise<void>;
}

export const RevisionSection: React.FC<RevisionSectionProps> = ({
  subjects,
  onSelectTopic,
  onUpdateSettings,
}) => {
  const [filter, setFilter] = useState<'all' | 'due' | 'upcoming' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [expandedHistoryTopicId, setExpandedHistoryTopicId] = useState<string | null>(null);
  const [editingDateTopicId, setEditingDateTopicId] = useState<string | null>(null);
  const [tempNextDate, setTempNextDate] = useState<string>('');

  // Flatten all topics across all subjects
  const allTopicRows = useMemo(() => {
    const rows: { topic: TopicItem; subject: SubjectItem }[] = [];
    subjects.forEach((sub) => {
      sub.topics.forEach((top) => {
        rows.push({ topic: top, subject: sub });
      });
    });
    return rows;
  }, [subjects]);

  // Filter topics
  const filteredRows = useMemo(() => {
    return allTopicRows.filter(({ topic, subject }) => {
      const status = getRevisionStatus(topic.settings.nextRevisionDate);

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = topic.name.toLowerCase().includes(q);
        const matchesSubject = subject.name.toLowerCase().includes(q);
        if (!matchesName && !matchesSubject) return false;
      }

      if (filter === 'due') {
        return status === 'due_today' || status === 'overdue';
      }
      if (filter === 'upcoming') {
        return status === 'upcoming';
      }
      if (filter === 'completed') {
        return (topic.settings.revisionCount || 0) > 0;
      }
      return true;
    }).sort((a, b) => {
      // Priority sorting: Overdue & Due today first, then closest upcoming date
      const dateA = a.topic.settings.nextRevisionDate || '9999-99-99';
      const dateB = b.topic.settings.nextRevisionDate || '9999-99-99';
      return dateA.localeCompare(dateB);
    });
  }, [allTopicRows, filter, searchQuery]);

  // Metric counts
  const stats = useMemo(() => {
    let overdue = 0;
    let dueToday = 0;
    let upcomingThisWeek = 0;
    let completedCount = 0;

    allTopicRows.forEach(({ topic }) => {
      const status = getRevisionStatus(topic.settings.nextRevisionDate);
      if (status === 'overdue') overdue++;
      if (status === 'due_today') dueToday++;
      if (topic.settings.revisionCount > 0) completedCount++;

      const diff = getDaysDifference(topic.settings.nextRevisionDate);
      if (diff !== null && diff >= 0 && diff <= 7) {
        upcomingThisWeek++;
      }
    });

    return { overdue, dueToday, upcomingThisWeek, completedCount };
  }, [allTopicRows]);

  const handleQuickComplete = async (topic: TopicItem) => {
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    const nextCount = (topic.settings.revisionCount || 0) + 1;
    const computedNextDate = calculateNextDate(
      topic.settings.frequency || 'spaced_repetition',
      nextCount,
      topic.settings.customDays
    );
    const todayStr = new Date().toISOString().split('T')[0];

    const newLog: RevisionLogEntry = {
      id: 'rev_' + Date.now(),
      date: todayStr,
      minutes: 45,
      completed: true,
      notes: `Completed revision #${nextCount}`,
    };

    const updatedHistory = [...(topic.settings.history || []), newLog];
    const updatedTotalMinutes = (topic.settings.totalStudyMinutes || 0) + 45;

    const updated: RevisionSettings = {
      ...topic.settings,
      revisionCount: nextCount,
      lastRevisedAt: todayStr,
      nextRevisionDate: computedNextDate,
      totalStudyMinutes: updatedTotalMinutes,
      history: updatedHistory,
    };

    await onUpdateSettings(topic.id, updated);
  };

  const handleSaveReschedule = async (topic: TopicItem) => {
    if (!tempNextDate) return;
    const updated: RevisionSettings = {
      ...topic.settings,
      nextRevisionDate: tempNextDate,
    };
    await onUpdateSettings(topic.id, updated);
    setEditingDateTopicId(null);
    setTempNextDate('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Revision Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <CalendarDays className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>All Revisions &amp; Schedule</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Detailed tracking showing previous revision dates, upcoming due dates, and spaced repetition intervals.
          </p>
        </div>

        {/* View Switcher: Cards vs Table */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-200/60 dark:bg-zinc-800/70 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Card Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-2xs'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Timeline Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 font-medium">All Topics</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 font-mono">
              {allTopicRows.length}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 font-medium">Due / Overdue</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
              {stats.dueToday + stats.overdue}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 font-medium">Coming This Week</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400 font-mono">
              {stats.upcomingThisWeek}
            </p>
          </div>
        </div>

        <div className="p-3.5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-zinc-500 font-medium">Revised at least once</p>
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.completedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by topic or subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden text-zinc-800 dark:text-zinc-200"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            All ({allTopicRows.length})
          </button>
          <button
            onClick={() => setFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              filter === 'due'
                ? 'bg-amber-500 text-white font-semibold shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-amber-600'
            }`}
          >
            Due / Overdue ({stats.dueToday + stats.overdue})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              filter === 'upcoming'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 ${
              filter === 'completed'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            Completed ({stats.completedCount})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRows.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-800/60 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-2">
          <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-1" />
          <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">
            No revision items found
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {searchQuery
              ? `No subjects or topics match "${searchQuery}".`
              : 'You are all caught up with your revision schedule!'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRows.map(({ topic, subject }) => {
            const status = getRevisionStatus(topic.settings.nextRevisionDate);
            const freqLabel = FREQUENCY_LABELS[topic.settings.frequency || 'spaced_repetition'];
            const intervalDays = getIntervalDays(
              topic.settings.frequency || 'spaced_repetition',
              topic.settings.revisionCount || 0,
              topic.settings.customDays
            );
            const isHistoryOpen = expandedHistoryTopicId === topic.id;
            const isEditingDate = editingDateTopicId === topic.id;

            return (
              <div
                key={topic.id}
                className="p-5 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Subject and Status Pill */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 truncate">
                      {subject.name}
                    </span>

                    {status === 'due_today' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
                        Due Today!
                      </span>
                    )}
                    {status === 'overdue' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800">
                        Overdue ({formatRelativeDate(topic.settings.nextRevisionDate, true)})
                      </span>
                    )}
                    {status === 'upcoming' && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-800">
                        {formatRelativeDate(topic.settings.nextRevisionDate, true)}
                      </span>
                    )}
                  </div>

                  {/* Title and Revision Round */}
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      {topic.name}
                    </h3>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md shrink-0">
                      Round #{topic.settings.revisionCount || 0}
                    </span>
                  </div>

                  {/* PROMINENT DATES SECTION: PREVIOUS & NEXT COMING DATES */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5 p-3 bg-zinc-50 dark:bg-zinc-900/70 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
                    {/* Previous Revision Date */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        Previous Revision
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">
                          {topic.settings.lastRevisedAt
                            ? formatDatePretty(topic.settings.lastRevisedAt)
                            : 'Not yet revised'}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400">
                        {topic.settings.lastRevisedAt
                          ? formatRelativeDate(topic.settings.lastRevisedAt, false)
                          : 'Initial study'}
                      </p>
                    </div>

                    {/* Next Coming Date */}
                    <div className="space-y-0.5 border-l border-zinc-200 dark:border-zinc-800 pl-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                          Next Coming Date
                        </span>
                        <button
                          onClick={() => {
                            setEditingDateTopicId(isEditingDate ? null : topic.id);
                            setTempNextDate(topic.settings.nextRevisionDate || '');
                          }}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {isEditingDate ? 'Cancel' : 'Edit'}
                        </button>
                      </div>

                      {isEditingDate ? (
                        <div className="flex items-center gap-1 pt-1">
                          <input
                            type="date"
                            value={tempNextDate}
                            onChange={(e) => setTempNextDate(e.target.value)}
                            className="text-xs p-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-md w-full"
                          />
                          <button
                            onClick={() => handleSaveReschedule(topic)}
                            className="px-2 py-1 bg-indigo-600 text-white rounded-md text-[10px] font-bold"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                            <span className="truncate">
                              {formatDatePretty(topic.settings.nextRevisionDate)}
                            </span>
                          </div>
                          <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                            {formatRelativeDate(topic.settings.nextRevisionDate, true)} (at {topic.settings.reminderTime || '09:00'})
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Frequency & File Info */}
                  <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
                    <div className="flex items-center gap-1.5 truncate pr-2">
                      <Sliders className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{freqLabel} (+{intervalDays}d)</span>
                    </div>

                    <button
                      onClick={() => setExpandedHistoryTopicId(isHistoryOpen ? null : topic.id)}
                      className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      <span>{(topic.settings.history?.length || 0)} log{(topic.settings.history?.length || 0) !== 1 ? 's' : ''}</span>
                      {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  {/* Expanded Revision History Log */}
                  {isHistoryOpen && (
                    <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 space-y-1.5 animate-in fade-in duration-150">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                        Revision History Log
                      </span>
                      {(!topic.settings.history || topic.settings.history.length === 0) ? (
                        <p className="text-[11px] text-zinc-400 italic">No past sessions recorded yet.</p>
                      ) : (
                        <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
                          {topic.settings.history.slice().reverse().map((h) => (
                            <div
                              key={h.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 text-xs"
                            >
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                                  {formatDatePretty(h.date)}
                                </span>
                                {h.notes && (
                                  <span className="text-[11px] text-zinc-500 truncate max-w-[150px]">
                                    • {h.notes}
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-zinc-400">
                                {h.minutes}m
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-700/60">
                  <button
                    onClick={() => onSelectTopic(topic)}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    <span>Open Topic Files ({topic.files.length})</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleQuickComplete(topic)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-2xs active:scale-95 transition-all"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Done Revision</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TIMELINE TABLE VIEW */
        <div className="bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700/80 text-zinc-500 uppercase tracking-wider text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Subject &amp; Topic</th>
                  <th className="px-4 py-3">Round</th>
                  <th className="px-4 py-3">Previous Revision Date</th>
                  <th className="px-4 py-3">Next Coming Date</th>
                  <th className="px-4 py-3">Frequency / Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-700/60">
                {filteredRows.map(({ topic, subject }) => {
                  const status = getRevisionStatus(topic.settings.nextRevisionDate);

                  return (
                    <tr
                      key={topic.id}
                      className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {/* Topic & Subject */}
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block truncate">
                          {subject.name}
                        </span>
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 block truncate">
                          {topic.name}
                        </span>
                      </td>

                      {/* Revision Round */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                          #{topic.settings.revisionCount || 0}
                        </span>
                      </td>

                      {/* Previous Revision Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                          <History className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-medium">
                            {topic.settings.lastRevisedAt
                              ? formatDatePretty(topic.settings.lastRevisedAt)
                              : 'Not revised yet'}
                          </span>
                        </div>
                        {topic.settings.lastRevisedAt && (
                          <span className="text-[10px] text-zinc-400">
                            {formatRelativeDate(topic.settings.lastRevisedAt, false)}
                          </span>
                        )}
                      </td>

                      {/* Next Coming Date */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
                          <CalendarIcon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>{formatDatePretty(topic.settings.nextRevisionDate)}</span>
                        </div>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                          {formatRelativeDate(topic.settings.nextRevisionDate, true)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {status === 'due_today' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 border border-amber-300">
                            Due Today
                          </span>
                        )}
                        {status === 'overdue' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border border-red-300">
                            Overdue
                          </span>
                        )}
                        {status === 'upcoming' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200">
                            Upcoming
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectTopic(topic)}
                            title="Study Topic"
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickComplete(topic)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-2xs"
                          >
                            Done
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
