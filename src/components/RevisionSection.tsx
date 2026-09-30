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
      completed: true,
      minutes: 0,
      notes: `Completed revision #${nextCount}`,
    };

    const updatedHistory = [...(topic.settings.history || []), newLog];

    const updated: RevisionSettings = {
      ...topic.settings,
      revisionCount: nextCount,
      lastRevisedAt: todayStr,
      nextRevisionDate: computedNextDate,
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
    <div className="flex-1 overflow-y-auto p-5 sm:p-10 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-10 border-b border-zinc-200/50">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
              Orbital Planner
            </span>
          </div>
          <h1 className="text-4xl font-black text-zinc-900 flex items-center gap-5 tracking-tight">
            <div className="p-4 bg-emerald-600 text-white rounded-3xl shadow-lg shadow-emerald-200 shrink-0">
              <CalendarDays className="w-8 h-8" />
            </div>
            <span>Revision Timeline</span>
          </h1>
          <p className="text-[11px] font-black text-zinc-500 uppercase tracking-[0.2em] max-w-lg leading-relaxed">
            Architecting long-term retention through high-fidelity performance tracking and adaptive scheduling.
          </p>
        </div>

        {/* View Switcher: Cards vs Table */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all font-black uppercase tracking-widest ${
                viewMode === 'cards'
                  ? 'bg-zinc-900 text-white shadow-lg scale-[1.02]'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all font-black uppercase tracking-widest ${
                viewMode === 'table'
                  ? 'bg-zinc-900 text-white shadow-lg scale-[1.02]'
                  : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Linear</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm flex items-center gap-6 group hover:bg-zinc-50 transition-all">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[1.25rem] border border-indigo-100 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Total Base</p>
            <p className="text-3xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter mt-1">
              {allTopicRows.length}
            </p>
          </div>
        </div>

        <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm flex items-center gap-6 group hover:bg-zinc-50 transition-all">
          <div className="p-4 bg-amber-50 text-amber-600 rounded-[1.25rem] border border-amber-100 group-hover:scale-110 transition-transform">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Immediate</p>
            <p className="text-3xl font-black text-amber-600 font-mono tabular-nums tracking-tighter mt-1">
              {stats.dueToday + stats.overdue}
            </p>
          </div>
        </div>

        <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm flex items-center gap-6 group hover:bg-zinc-50 transition-all">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.25rem] border border-blue-100 group-hover:scale-110 transition-transform">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">7D Window</p>
            <p className="text-3xl font-black text-blue-600 font-mono tabular-nums tracking-tighter mt-1">
              {stats.upcomingThisWeek}
            </p>
          </div>
        </div>

        <div className="p-8 bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm flex items-center gap-6 group hover:bg-zinc-50 transition-all">
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-[1.25rem] border border-emerald-100 group-hover:scale-110 transition-transform">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Processed</p>
            <p className="text-3xl font-black text-emerald-600 font-mono tabular-nums tracking-tighter mt-1">
              {stats.completedCount}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-3 bg-white rounded-[2rem] border border-zinc-200 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-4 top-3 text-zinc-400" />
          <input
            type="text"
            placeholder="Query knowledge base..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30 transition-all text-zinc-900 placeholder:text-zinc-300 font-black uppercase tracking-widest"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto p-1 no-scrollbar">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all shrink-0 uppercase tracking-[0.2em] ${
              filter === 'all'
                ? 'bg-zinc-900 text-white shadow-lg'
                : 'text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50'
            }`}
          >
            Universal ({allTopicRows.length})
          </button>
          <button
            onClick={() => setFilter('due')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all shrink-0 uppercase tracking-[0.2em] ${
              filter === 'due'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-100'
                : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50'
            }`}
          >
            Due ({stats.dueToday + stats.overdue})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all shrink-0 uppercase tracking-[0.2em] ${
              filter === 'upcoming'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                : 'text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all shrink-0 uppercase tracking-[0.2em] ${
              filter === 'completed'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                : 'text-zinc-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            Finalized ({stats.completedCount})
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredRows.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-4">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h3 className="text-xl font-black text-zinc-900 tracking-tight">
            Sync Complete
          </h3>
          <p className="text-xs text-zinc-400 font-black uppercase tracking-widest max-w-sm mx-auto">
            {searchQuery
              ? `No entities matching "${searchQuery}" in local storage.`
              : 'Quantum schedule clear. You are performing at peak efficiency.'}
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        /* CARD GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredRows.map(({ topic, subject }) => {
            const status = getRevisionStatus(topic.settings.nextRevisionDate);
            const isEditingDate = editingDateTopicId === topic.id;

            return (
              <div
                key={topic.id}
                className="group relative p-8 bg-white border border-zinc-200 rounded-[2.5rem] transition-all duration-500 hover:bg-zinc-50 hover:scale-[1.02] hover:shadow-xl flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Subject and Status */}
                  <div className="flex items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] truncate">
                      <span className="text-indigo-600">{subject.name}</span>
                      <span aria-hidden="true" className="text-zinc-200">/</span>
                      <span className="text-zinc-500">PHASE {topic.settings.revisionCount || 0}</span>
                    </div>

                    <div className="shrink-0">
                      {status === 'due_today' && (
                        <span className="px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-widest">Due Today</span>
                      )}
                      {status === 'overdue' && (
                        <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-100 text-[9px] font-black uppercase tracking-widest">Critical Delay</span>
                      )}
                      {status === 'upcoming' && (
                        <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                          {formatRelativeDate(topic.settings.nextRevisionDate, true)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="text-2xl font-black text-zinc-900 leading-[1.1] mb-8 group-hover:text-indigo-600 transition-colors tracking-tight">
                    {topic.name}
                  </h3>

                  {/* Dates Section */}
                  <div className="grid grid-cols-2 gap-8 py-6 border-y border-zinc-100">
                    <div className="space-y-2">
                      <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">Last Sync</span>
                      <div className="flex items-center gap-2 text-xs font-black text-zinc-700 font-mono tabular-nums">
                        {topic.settings.lastRevisedAt ? formatDatePretty(topic.settings.lastRevisedAt) : 'Genesis'}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">Next Window</span>
                        <button
                          onClick={() => {
                            setEditingDateTopicId(isEditingDate ? null : topic.id);
                            setTempNextDate(topic.settings.nextRevisionDate || '');
                          }}
                          className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 transition-all uppercase tracking-widest"
                        >
                          {isEditingDate ? 'Cancel' : 'Modify'}
                        </button>
                      </div>

                      {isEditingDate ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            type="date"
                            value={tempNextDate}
                            onChange={(e) => setTempNextDate(e.target.value)}
                            className="text-[10px] p-2 bg-white border border-zinc-200 rounded-xl w-full focus:outline-hidden text-zinc-900 font-black"
                          />
                          <button
                            onClick={() => handleSaveReschedule(topic)}
                            className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-black text-zinc-900 font-mono tabular-nums">
                          {formatDatePretty(topic.settings.nextRevisionDate)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-10 flex items-center justify-between">
                  <button
                    onClick={() => onSelectTopic(topic)}
                    className="text-[10px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-[0.2em] flex items-center gap-2 group/btn"
                  >
                    Load Modules <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => handleQuickComplete(topic)}
                    className="px-6 py-3 bg-zinc-100 hover:bg-emerald-600 text-zinc-600 hover:text-white border border-zinc-200 hover:border-emerald-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95"
                  >
                    Log Delta
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TIMELINE TABLE VIEW */
        <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-400 uppercase tracking-[0.2em] text-[10px] font-black">
                <tr>
                  <th className="px-8 py-5">Module & Entity</th>
                  <th className="px-8 py-5">Iter</th>
                  <th className="px-8 py-5">Retrospective</th>
                  <th className="px-8 py-5">Future Window</th>
                  <th className="px-8 py-5">Status Core</th>
                  <th className="px-8 py-5 text-right">Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredRows.map(({ topic, subject }) => {
                  const status = getRevisionStatus(topic.settings.nextRevisionDate);

                  return (
                    <tr
                      key={topic.id}
                      className="group hover:bg-zinc-50/50 transition-all"
                    >
                      {/* Topic & Subject */}
                      <td className="px-8 py-6 max-w-[250px]">
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 block mb-1">
                          {subject.name}
                        </span>
                        <span className="text-sm font-black text-zinc-900 block truncate group-hover:text-indigo-600 transition-colors">
                          {topic.name}
                        </span>
                      </td>

                      {/* Revision Round */}
                      <td className="px-8 py-6 whitespace-nowrap">
                        <span className="px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 font-black font-mono">
                          #{topic.settings.revisionCount || 0}
                        </span>
                      </td>

                      {/* Previous Revision Date */}
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3 text-zinc-600">
                          <History className="w-4 h-4 text-zinc-300 shrink-0" />
                          <span className="font-black font-mono tabular-nums">
                            {topic.settings.lastRevisedAt
                              ? formatDatePretty(topic.settings.lastRevisedAt)
                              : 'NO DATA'}
                          </span>
                        </div>
                        {topic.settings.lastRevisedAt && (
                          <span className="text-[10px] text-zinc-300 font-black uppercase tracking-widest block mt-1">
                            {formatRelativeDate(topic.settings.lastRevisedAt, false)}
                          </span>
                        )}
                      </td>

                      {/* Next Coming Date */}
                      <td className="px-8 py-6 whitespace-nowrap">
                        <div className="flex items-center gap-3 font-black text-zinc-900">
                          <CalendarIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-mono tabular-nums">{formatDatePretty(topic.settings.nextRevisionDate)}</span>
                        </div>
                        <span className="text-[10px] text-indigo-400 font-black uppercase tracking-widest block mt-1">
                          {formatRelativeDate(topic.settings.nextRevisionDate, true)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-8 py-6 whitespace-nowrap">
                        {status === 'due_today' && (
                          <span className="px-3 py-1 rounded-full text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-widest">
                            Due Now
                          </span>
                        )}
                        {status === 'overdue' && (
                          <span className="px-3 py-1 rounded-full text-[9px] font-black bg-rose-50 text-rose-600 border border-rose-100 uppercase tracking-widest">
                            Overdue
                          </span>
                        )}
                        {status === 'upcoming' && (
                          <span className="px-3 py-1 rounded-full text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest">
                            Stable
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-8 py-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => onSelectTopic(topic)}
                            title="Study Topic"
                            className="p-2.5 text-zinc-400 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-all active:scale-95 border border-transparent hover:border-zinc-200"
                          >
                            <ArrowUpRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleQuickComplete(topic)}
                            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-95"
                          >
                            Mark
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
      )
      }
    </div>
  );
};
