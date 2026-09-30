import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';
import {
  CheckCircle2,
  TrendingUp,
  Award,
  AlertCircle,
  BookOpen,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Zap,
  Clock,
} from 'lucide-react';
import { SubjectItem, TopicItem, RevisionLogEntry, RevisionSettings } from '../types';
import { getRevisionStatus } from '../utils/revisionUtils';
import { D3StudyHeatmap } from './D3StudyHeatmap';

interface StudyDashboardProps {
  subjects: SubjectItem[];
  onSelectTopic: (topic: TopicItem) => void;
  onManageTopic?: (topic: TopicItem) => void;
}

const SUBJECT_COLORS = [
  '#6366f1', // Indigo
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#3b82f6', // Blue
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

const STATUS_COLORS = {
  completed: '#10b981', // Emerald
  upcoming: '#6366f1',  // Indigo
  due_today: '#f59e0b', // Amber
  overdue: '#ef4444',   // Red
};

export const StudyDashboard: React.FC<StudyDashboardProps> = ({
  subjects,
  onSelectTopic,
  onManageTopic,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');

  // Flatten all topics
  const allTopics = useMemo(() => {
    return subjects.flatMap((s) => s.topics);
  }, [subjects]);

  // Generate 30 days array [dateStr...]
  const last30Days = useMemo(() => {
    const dates: string[] = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  // Compute subject revision data
  const subjectStudyData = useMemo(() => {
    return subjects.map((sub, idx) => {
      let totalRevisions = 0;

      sub.topics.forEach((t) => {
        totalRevisions += t.settings.revisionCount || 0;
      });

      return {
        id: sub.id,
        name: sub.name,
        topicsCount: sub.topics.length,
        totalRevisions,
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      };
    }).sort((a, b) => b.totalRevisions - a.totalRevisions);
  }, [subjects]);

  // Compute daily revision status over last 30 days
  const dailyTrendData = useMemo(() => {
    return last30Days.map((dateStr) => {
      let completedCount = 0;
      let scheduledCount = 0;

      subjects.forEach((sub) => {
        if (selectedSubjectId !== 'all' && sub.id !== selectedSubjectId) return;

        sub.topics.forEach((top) => {
          // Check explicit logs
          if (top.settings.history && top.settings.history.length > 0) {
            top.settings.history.forEach((h) => {
              if (h.date === dateStr) {
                if (h.completed) completedCount++;
              }
            });
          } else {
            // Check last revised date
            if (top.settings.lastRevisedAt === dateStr) {
              completedCount++;
            }
          }

          // Check scheduled next revision date
          if (top.settings.nextRevisionDate === dateStr) {
            scheduledCount++;
          }
        });
      });

      const dateObj = new Date(dateStr + 'T00:00:00');
      const label = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      return {
        date: dateStr,
        displayDate: label,
        completed: completedCount,
        scheduled: scheduledCount,
      };
    });
  }, [last30Days, subjects, selectedSubjectId]);

  // Overall statistics
  const stats = useMemo(() => {
    let completed30d = 0;
    let scheduled30d = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let upcomingCount = 0;
    let masteredCount = 0;

    dailyTrendData.forEach((d) => {
      completed30d += d.completed;
      scheduled30d += d.scheduled;
    });

    allTopics.forEach((t) => {
      const status = getRevisionStatus(t.settings.nextRevisionDate);
      if (t.settings.revisionCount >= 3) {
        masteredCount++;
      } else if (status === 'overdue') {
        overdueCount++;
      } else if (status === 'due_today') {
        dueTodayCount++;
      } else {
        upcomingCount++;
      }
    });

    const totalStudyMinutes = allTopics.reduce((acc, t) => acc + (t.settings.totalStudyMinutes || 0), 0);

    const completionRate =
      scheduled30d + completed30d > 0
        ? Math.round((completed30d / (scheduled30d + completed30d)) * 100)
        : 100;

    const topSubject = subjectStudyData.length > 0 ? subjectStudyData[0] : null;

    return {
      completed30d,
      scheduled30d,
      completionRate,
      topSubject,
      overdueCount,
      dueTodayCount,
      upcomingCount,
      masteredCount,
      totalStudyMinutes,
    };
  }, [dailyTrendData, allTopics, subjectStudyData]);

  // Status distribution for PieChart
  const statusPieData = useMemo(() => {
    return [
      { name: 'Completed / Mastered', value: stats.masteredCount, color: STATUS_COLORS.completed },
      { name: 'Upcoming Scheduled', value: stats.upcomingCount, color: STATUS_COLORS.upcoming },
      { name: 'Due Today', value: stats.dueTodayCount, color: STATUS_COLORS.due_today },
      { name: 'Overdue', value: stats.overdueCount, color: STATUS_COLORS.overdue },
    ].filter((item) => item.value > 0);
  }, [stats]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-10 max-w-6xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-zinc-200/50">
        <div>
          <h1 className="text-3xl font-black text-zinc-900 flex items-center gap-4 tracking-tight">
            <div className="p-2.5 bg-linear-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-xl shadow-indigo-500/20 shrink-0">
              <BarChart3 className="w-7 h-7" />
            </div>
            <span className="bg-linear-to-r from-zinc-900 via-zinc-800 to-zinc-600 bg-clip-text text-transparent">Learning Analytics</span>
          </h1>
          <p className="text-[10px] font-black text-zinc-400 mt-3 uppercase tracking-[0.3em]">
            Visual breakdown of your intellectual momentum
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-3 text-xs bg-white px-4 py-2 rounded-2xl border border-zinc-200 shadow-sm">
            <Filter className="w-4 h-4 text-zinc-400" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="bg-transparent text-zinc-800 text-[11px] font-black uppercase tracking-widest focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="text-zinc-900">All Disciplines</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id} className="text-zinc-900">
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revisions Completed */}
        <div className="group p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:border-indigo-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center justify-between text-zinc-400 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600/60">Efficiency</span>
            <div className="p-3 bg-indigo-50 rounded-2xl border border-indigo-100">
              <Zap className="w-5 h-5 text-indigo-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">
            {stats.completionRate}%
          </div>
          <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em]">
            <TrendingUp className="w-4 h-4" />
            <span>{stats.completed30d} Successes</span>
          </div>
        </div>

        {/* Mastered Topics */}
        <div className="group p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:border-fuchsia-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-fuchsia-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-fuchsia-500/10 transition-colors" />
          <div className="flex items-center justify-between text-zinc-400 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-600/60">Mastery</span>
            <div className="p-3 bg-fuchsia-50 rounded-2xl border border-fuchsia-100">
              <Award className="w-5 h-5 text-fuchsia-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">
            {stats.masteredCount}
          </div>
          <div className="mt-4 text-[10px] font-black text-fuchsia-600/60 uppercase tracking-[0.2em]">
            Topics Optimized
          </div>
        </div>

        {/* Priority Items */}
        <div className="group p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:border-rose-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between text-zinc-400 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-600/60">Priority</span>
            <div className="p-3 bg-rose-50 rounded-2xl border border-rose-100">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="flex items-baseline gap-3">
            <div className="text-4xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">
              {stats.dueTodayCount + stats.overdueCount}
            </div>
            {stats.overdueCount > 0 && (
              <span className="text-[9px] font-black px-2 py-1 rounded-xl bg-rose-100 text-rose-600 border border-rose-200 uppercase tracking-widest animate-pulse">
                Critical
              </span>
            )}
          </div>
          <div className="mt-4 text-[10px] font-black text-amber-600/60 uppercase tracking-[0.2em]">
            Sessions Pending
          </div>
        </div>

        {/* Total Study Effort */}
        <div className="group p-8 bg-white border border-zinc-200 rounded-3xl shadow-sm transition-all duration-500 hover:scale-[1.02] hover:shadow-xl hover:border-emerald-200 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between text-zinc-400 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600/60">Effort</span>
            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">
            {Math.floor(stats.totalStudyMinutes / 60)}h {stats.totalStudyMinutes % 60}m
          </div>
          <div className="mt-4 text-[10px] font-black text-emerald-600/60 uppercase tracking-[0.2em]">
            Time Dashboard
          </div>
        </div>
      </div>

      {/* D3.js Study Consistency Heatmap & Weekly Momentum */}
      <D3StudyHeatmap
        subjects={subjects}
        selectedSubjectId={selectedSubjectId}
      />

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Revisions per Subject */}
        <div className="p-8 sm:p-12 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
                Subject Mastery
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">
                Revision volume per category
              </p>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {subjectStudyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No subjects found. Create a subject to see revision breakdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }}
                    axisLine={false}
                    tickLine={false}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(value: any) => [value, 'Total Revisions']}
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: '#1e293b',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}
                  />
                  <Bar
                    dataKey="totalRevisions"
                    radius={[10, 10, 0, 0]}
                    fill="#6366f1"
                  >
                    {subjectStudyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Status Breakdown Pie Chart */}
        <div className="p-8 sm:p-12 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">
                Current Health
              </h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">
                Retention & schedule distribution
              </p>
            </div>
          </div>

          <div className="h-72 w-full flex items-center justify-center">
            {statusPieData.length === 0 ? (
              <div className="text-xs text-zinc-400">No topic data available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={6}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} stroke="none" fillOpacity={0.9} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      borderRadius: '16px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                      color: '#1e293b',
                      fontSize: '11px',
                      fontWeight: 800,
                      textTransform: 'uppercase'
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '10px', fontWeight: 900, paddingTop: '20px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94A3B8' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: 30-Day Revision Timeline (Completed vs Scheduled Revisions) */}
      <div className="p-8 sm:p-12 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-zinc-900 flex items-center gap-4">
              <TrendingUp className="w-7 h-7 text-indigo-600" />
              <span>Velocity Timeline</span>
            </h3>
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-2">
              Comparing output vs scheduled milestones
            </p>
          </div>

          <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
              <span className="text-zinc-500">Output</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm" />
              <span className="text-zinc-500">Plan</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }}
                axisLine={false}
                tickLine={false}
                interval={4}
              />
              <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  borderRadius: '16px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                  color: '#1e293b',
                  fontSize: '11px',
                  fontWeight: 800,
                  textTransform: 'uppercase'
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
              <Area
                type="monotone"
                dataKey="scheduled"
                name="Scheduled"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorScheduled)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Study Topics & Time invested */}
      <div className="p-8 sm:p-12 bg-white rounded-[3rem] border border-zinc-200 shadow-sm space-y-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl border border-indigo-100">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">Active Vault</h3>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-1">Invested effort per discipline</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {allTopics.filter(t => selectedSubjectId === 'all' || t.subjectId === selectedSubjectId).map((topic) => (
            <div
              key={topic.id}
              onClick={() => onSelectTopic(topic)}
              className="group flex flex-col p-8 bg-[#FDFBF7] border border-zinc-200 rounded-3xl hover:border-indigo-300 hover:shadow-xl transition-all duration-500 text-left relative overflow-hidden cursor-pointer"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3 text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">
                  <span className="text-indigo-600">{topic.subjectName}</span>
                  {onManageTopic && (
                    <>
                      <span aria-hidden="true" className="text-zinc-200">/</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onManageTopic(topic);
                        }}
                        className="hover:text-indigo-600 transition-colors"
                        title="Manage Topic"
                      >
                        Tune
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-mono tabular-nums text-xs font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{topic.settings.revisionCount}</span>
                </div>
              </div>
              
              <h4 className="text-xl font-black text-zinc-900 mb-10 group-hover:translate-x-1 transition-transform line-clamp-1 tracking-tight">
                {topic.name}
              </h4>

              <div className="mt-auto pt-6 border-t border-zinc-100 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-zinc-300 uppercase tracking-[0.3em] mb-1">Time Logged</span>
                  <span className="text-2xl font-black text-zinc-900 font-mono tabular-nums tracking-tighter">
                    {Math.floor((topic.settings.totalStudyMinutes || 0) / 60)}h {(topic.settings.totalStudyMinutes || 0) % 60}m
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center text-zinc-300 group-hover:text-indigo-600 group-hover:border-indigo-100 group-hover:shadow-lg transition-all">
                  <Zap className="w-6 h-6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
