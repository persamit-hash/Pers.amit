import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  AlertCircle,
  ArrowRight,
  Flame,
  Layout,
  FileText
} from 'lucide-react';
import { SubjectItem, TopicItem } from '../types';
import { formatDatePretty, getRevisionStatus } from '../utils/revisionUtils';

interface TodayRevisionProps {
  subjects: SubjectItem[];
  onSelectTopic: (topic: TopicItem) => void;
}

export const TodayRevision: React.FC<TodayRevisionProps> = ({
  subjects,
  onSelectTopic,
}) => {
  const [selectedDate, setSelectedSubjectDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const allTopics = useMemo(() => {
    return subjects.flatMap((s) => s.topics);
  }, [subjects]);

  const filteredTopics = useMemo(() => {
    return allTopics.filter((t) => t.settings.nextRevisionDate === selectedDate);
  }, [allTopics, selectedDate]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const completed = filteredTopics.filter(t => t.settings.lastRevisedAt === selectedDate).length;
    return {
      total: filteredTopics.length,
      completed,
      pending: filteredTopics.length - completed
    };
  }, [filteredTopics, selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedSubjectDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedSubjectDate(d.toISOString().split('T')[0]);
  };

  const handleGoToToday = () => {
    setSelectedSubjectDate(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-10 max-w-5xl mx-auto space-y-10">
      {/* Header & Date Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 pb-8 border-b border-zinc-200/50">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-4">
            <div className="p-3 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-[1.25rem] shadow-xl shadow-indigo-500/20 shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="tracking-tight bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">Daily Agenda</span>
          </h1>
          <p className="text-[10px] font-black text-zinc-400 mt-3 uppercase tracking-[0.3em]">
            {isToday ? "Tracking your performance for today" : `Schedule for ${formatDatePretty(selectedDate)}`}
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm backdrop-blur-md">
          <button
            onClick={handlePrevDay}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 hover:text-indigo-600"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="px-5 flex flex-col items-center min-w-[150px]">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedSubjectDate(e.target.value)}
              className="bg-transparent text-sm font-black text-zinc-800 focus:outline-hidden text-center cursor-pointer font-mono tabular-nums"
            />
            {!isToday && (
              <button 
                onClick={handleGoToToday}
                className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 uppercase tracking-widest mt-0.5 transition-colors"
              >
                Reset to Today
              </button>
            )}
          </div>

          <button
            onClick={handleNextDay}
            className="p-2 hover:bg-zinc-100 rounded-xl transition-all text-zinc-400 hover:text-indigo-600"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-zinc-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-2">Capacity</p>
          <div className="text-4xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">{stats.total}</div>
          <p className="text-[11px] font-bold text-zinc-500 mt-2 uppercase tracking-widest">Total topics</p>
        </div>

        <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-emerald-500/10 transition-colors" />
          <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-2">Performance</p>
          <div className="text-4xl font-black text-emerald-600 font-mono tabular-nums tracking-tighter">{stats.completed}</div>
          <p className="text-[11px] font-bold text-emerald-600 mt-2 uppercase tracking-widest">Completed</p>
        </div>

        <div className="bg-rose-50 p-8 rounded-[2rem] border border-rose-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl -mr-12 -mt-12 group-hover:bg-rose-500/10 transition-colors" />
          <p className="text-[10px] font-black text-rose-600/60 uppercase tracking-[0.2em] mb-2">Backlog</p>
          <div className="text-4xl font-black text-rose-600 font-mono tabular-nums tracking-tighter">{stats.pending}</div>
          <p className="text-[11px] font-bold text-rose-600 mt-2 uppercase tracking-widest">Remaining</p>
        </div>
      </div>

      {/* Revision List */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-zinc-900 px-2 flex items-center gap-3">
          <span>Priority Sessions</span>
          <span className="text-[10px] font-black px-3 py-1 rounded-full bg-white text-zinc-400 border border-zinc-200">{filteredTopics.length}</span>
        </h2>

        {filteredTopics.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center bg-white border border-zinc-200 rounded-[3rem] text-center space-y-6 shadow-sm">
            <div className="p-6 bg-indigo-50 text-indigo-600 rounded-[2rem] border border-indigo-100 shadow-xl">
              <BookOpen className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <p className="text-2xl font-black text-zinc-900 tracking-tight">Vault Secure</p>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Your revision queue is clear!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredTopics.map((topic) => {
              const isCompleted = topic.settings.lastRevisedAt === selectedDate;
              return (
                <div 
                  key={topic.id}
                  className={`group p-8 rounded-[2.5rem] border transition-all duration-500 cursor-pointer flex flex-col justify-between h-full ${
                    isCompleted 
                      ? 'bg-zinc-50 border-zinc-100 opacity-60' 
                      : 'bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-2xl hover:scale-[1.02] shadow-sm'
                  }`}
                  onClick={() => onSelectTopic(topic)}
                >
                  <div className="space-y-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">
                          <span className="text-zinc-400">SESSION</span>
                          <span aria-hidden="true" className="text-zinc-200">·</span>
                          <span className="text-purple-600">ROUND {topic.settings.revisionCount}</span>
                        </div>
                        <h3 className={`text-2xl font-black leading-tight tracking-tight group-hover:translate-x-1 transition-transform ${isCompleted ? 'text-zinc-400' : 'text-zinc-900'}`}>
                          {topic.name}
                        </h3>
                      </div>
                      <div className={`w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center transition-transform group-hover:scale-110 ${isCompleted ? 'bg-emerald-100 text-emerald-600' : 'bg-indigo-50 text-indigo-600 shadow-xl'}`}>
                        {isCompleted ? <CheckCircle2 className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600" />
                        <span className="font-mono tabular-nums">{topic.settings.reminderTime || '09:00'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span className="font-mono tabular-nums">
                          {topic.files.filter(f => f.mimeType.includes('pdf') || f.name.toLowerCase().endsWith('.pdf')).length} ASSETS
                        </span>
                      </div>
                    </div>

                    {topic.settings.notes && (
                      <p className="text-sm font-medium text-zinc-500 line-clamp-2 px-4 border-l-2 border-zinc-200 leading-relaxed italic">
                        {topic.settings.notes}
                      </p>
                    )}
                  </div>

                  <div className="mt-12 pt-6 border-t border-zinc-100 flex items-center justify-between">
                    <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-all group-hover:translate-x-2 ${isCompleted ? 'text-zinc-400' : 'text-indigo-600'}`}>
                      {isCompleted ? 'Validated' : 'Begin Interface'}
                    </span>
                    <ArrowRight className={`w-6 h-6 transition-transform group-hover:translate-x-2 ${isCompleted ? 'text-zinc-200' : 'text-indigo-600'}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
