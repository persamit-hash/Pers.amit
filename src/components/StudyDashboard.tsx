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
  Clock,
  CheckCircle2,
  Calendar,
  TrendingUp,
  Award,
  AlertCircle,
  Plus,
  BookOpen,
  Filter,
  BarChart3,
  PieChart as PieIcon,
  Zap,
} from 'lucide-react';
import { SubjectItem, TopicItem, RevisionLogEntry, RevisionSettings } from '../types';
import { getRevisionStatus } from '../utils/revisionUtils';

interface StudyDashboardProps {
  subjects: SubjectItem[];
  onLogStudySession: (topicId: string, minutes: number, date: string, notes?: string) => Promise<void>;
  onSelectTopic: (topic: TopicItem) => void;
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
  onLogStudySession,
  onSelectTopic,
}) => {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [logTopicId, setLogTopicId] = useState<string>('');
  const [logMinutes, setLogMinutes] = useState<number>(45);
  const [logDate, setLogDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [logNotes, setLogNotes] = useState<string>('');
  const [isLogging, setIsLogging] = useState(false);

  // Flatten all topics
  const allTopics = useMemo(() => {
    return subjects.flatMap((s) => s.topics);
  }, [subjects]);

  // Set default topic for modal
  React.useEffect(() => {
    if (!logTopicId && allTopics.length > 0) {
      setLogTopicId(allTopics[0].id);
    }
  }, [allTopics, logTopicId]);

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

  // Compute subject study time
  const subjectStudyData = useMemo(() => {
    return subjects.map((sub, idx) => {
      let totalMinutes = 0;
      let totalRevisions = 0;

      sub.topics.forEach((t) => {
        // Collect logged history minutes
        if (t.settings.history && t.settings.history.length > 0) {
          t.settings.history.forEach((h) => {
            if (last30Days.includes(h.date)) {
              totalMinutes += h.minutes || 0;
            }
          });
        } else if (t.settings.totalStudyMinutes) {
          totalMinutes += t.settings.totalStudyMinutes;
        } else {
          // Estimated time: 45 min per completed revision count
          const completedCount = t.settings.revisionCount || 0;
          totalMinutes += completedCount * 45;
        }
        totalRevisions += t.settings.revisionCount || 0;
      });

      const hours = parseFloat((totalMinutes / 60).toFixed(1));

      return {
        id: sub.id,
        name: sub.name,
        minutes: totalMinutes,
        hours,
        topicsCount: sub.topics.length,
        totalRevisions,
        color: SUBJECT_COLORS[idx % SUBJECT_COLORS.length],
      };
    }).sort((a, b) => b.hours - a.hours);
  }, [subjects, last30Days]);

  // Compute daily revision status & study time over last 30 days
  const dailyTrendData = useMemo(() => {
    return last30Days.map((dateStr) => {
      let completedCount = 0;
      let scheduledCount = 0;
      let studyHours = 0;

      subjects.forEach((sub) => {
        if (selectedSubjectId !== 'all' && sub.id !== selectedSubjectId) return;

        sub.topics.forEach((top) => {
          // Check explicit logs
          if (top.settings.history && top.settings.history.length > 0) {
            top.settings.history.forEach((h) => {
              if (h.date === dateStr) {
                if (h.completed) completedCount++;
                studyHours += (h.minutes || 0) / 60;
              }
            });
          } else {
            // Check last revised date
            if (top.settings.lastRevisedAt === dateStr) {
              completedCount++;
              studyHours += 0.75; // 45 mins
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
        studyHours: parseFloat(studyHours.toFixed(1)),
      };
    });
  }, [last30Days, subjects, selectedSubjectId]);

  // Overall statistics
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completed30d = 0;
    let scheduled30d = 0;
    let overdueCount = 0;
    let dueTodayCount = 0;
    let upcomingCount = 0;
    let masteredCount = 0;

    dailyTrendData.forEach((d) => {
      totalMinutes += d.studyHours * 60;
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

    const completionRate =
      scheduled30d + completed30d > 0
        ? Math.round((completed30d / (scheduled30d + completed30d)) * 100)
        : 100;

    const topSubject = subjectStudyData.length > 0 ? subjectStudyData[0] : null;

    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      completed30d,
      scheduled30d,
      completionRate,
      topSubject,
      overdueCount,
      dueTodayCount,
      upcomingCount,
      masteredCount,
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

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logTopicId || logMinutes <= 0) return;

    setIsLogging(true);
    try {
      await onLogStudySession(logTopicId, logMinutes, logDate, logNotes);
      setIsLogModalOpen(false);
      setLogNotes('');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>Study &amp; Revision Insights (Last 30 Days)</span>
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Visual breakdown of time invested per subject and revision completion performance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Subject Filter */}
          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="px-2.5 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 text-xs focus:outline-hidden"
            >
              <option value="all">All Subjects</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsLogModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Study Time</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Study Time */}
        <div className="p-4 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">Study Time (30d)</span>
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {stats.totalHours} <span className="text-sm font-semibold text-zinc-500">hrs</span>
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Across all subjects</p>
        </div>

        {/* Revisions Completed */}
        <div className="p-4 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">Revisions Done (30d)</span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
            {stats.completed30d}
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
            {stats.completionRate}% completion rate
          </p>
        </div>

        {/* Top Studied Subject */}
        <div className="p-4 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">Most Studied Subject</span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 rounded-lg">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate">
            {stats.topSubject ? stats.topSubject.name : 'None yet'}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {stats.topSubject ? `${stats.topSubject.hours} hrs spent` : 'Start studying!'}
          </p>
        </div>

        {/* Schedule Health */}
        <div className="p-4 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-medium">Pending Revisions</span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <span>{stats.dueTodayCount + stats.overdueCount}</span>
            {stats.overdueCount > 0 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                {stats.overdueCount} overdue
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            {stats.dueTodayCount} due today
          </p>
        </div>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Study Time Spent per Subject */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Study Time per Subject
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Total hours spent in the last 30 days
              </p>
            </div>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
              {stats.totalHours} hrs total
            </span>
          </div>

          <div className="h-72 w-full pt-2">
            {subjectStudyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-zinc-400">
                No subjects found. Create a subject to see study time breakdown.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 11 }} unit="h" />
                  <Tooltip
                    formatter={(value: any) => [`${value} hours`, 'Study Time']}
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    radius={[8, 8, 0, 0]}
                    fill="#6366f1"
                  >
                    {subjectStudyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Status Breakdown Pie Chart */}
        <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Revision Completion Status
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Current topic health &amp; mastery level
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
              {allTopics.length} Topics
            </span>
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
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {statusPieData.map((entry, index) => (
                      <Cell key={`pie-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(24, 24, 27, 0.95)',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Chart 3: 30-Day Revision Timeline (Completed vs Scheduled Revisions) */}
      <div className="p-5 sm:p-6 bg-white dark:bg-zinc-800/80 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Revision Completion Trend &amp; Scheduled Timeline (Last 30 Days)</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Comparing daily completed revisions vs scheduled revision milestones
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Completed Revisions</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-indigo-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Scheduled Milestones</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 10 }}>
              <defs>
                <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorScheduled" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 10 }}
                interval={4}
              />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(24, 24, 27, 0.95)',
                  borderRadius: '12px',
                  border: 'none',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed Revisions"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorCompleted)"
              />
              <Area
                type="monotone"
                dataKey="scheduled"
                name="Scheduled Revisions"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorScheduled)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Log Study Session Modal */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span>Log Study Time</span>
              </h3>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-xs"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleLogSubmit} className="space-y-4">
              {/* Topic selector */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Select Topic
                </label>
                <select
                  value={logTopicId}
                  onChange={(e) => setLogTopicId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                >
                  {allTopics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.subjectName} → {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Study duration presets & input */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Duration (Minutes)
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[25, 45, 60, 90].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setLogMinutes(mins)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                        logMinutes === mins
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="5"
                  max="600"
                  value={logMinutes}
                  onChange={(e) => setLogMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Study Date
                </label>
                <input
                  type="date"
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                  Session Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Completed Chapter 4 review..."
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-3 py-2 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLogging || !logTopicId || logMinutes <= 0}
                  className="px-4 py-2 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                >
                  {isLogging ? 'Logging...' : 'Save Study Log'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
