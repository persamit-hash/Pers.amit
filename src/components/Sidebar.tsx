import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  BookOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreVertical,
  Trash2,
  Edit2,
  Calendar,
  AlertCircle,
  HardDrive,
  Search,
  CheckCircle2,
  List,
  BarChart3,
  X,
  FileText,
  Zap
} from 'lucide-react';
import { SubjectItem, TopicItem } from '../types';
import { formatFileSize, getRevisionStatus } from '../utils/revisionUtils';

interface SidebarProps {
  subjects: SubjectItem[];
  selectedTopic: TopicItem | null;
  onSelectTopic: (topic: TopicItem) => void;
  onCreateSubject: (name: string) => Promise<void>;
  onCreateTopic: (subjectId: string, subjectName: string, name: string) => Promise<void>;
  onRenameSubject: (subject: SubjectItem) => void;
  onDeleteSubject: (subject: SubjectItem) => void;
  onRenameTopic: (topic: TopicItem) => void;
  onDeleteTopic: (topic: TopicItem) => void;
  activeView: 'topic' | 'planner' | 'dashboard' | 'today';
  setActiveView: (view: 'topic' | 'planner' | 'dashboard' | 'today') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  subjects,
  selectedTopic,
  onSelectTopic,
  onCreateSubject,
  onCreateTopic,
  onRenameSubject,
  onDeleteSubject,
  onRenameTopic,
  onDeleteTopic,
  activeView,
  setActiveView,
}) => {
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [addingTopicSubjectId, setAddingTopicSubjectId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: '/' or Ctrl/Cmd + K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') ||
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleSubject = (subjectId: string) => {
    setExpandedSubjects((prev) => ({
      ...prev,
      [subjectId]: prev[subjectId] === undefined ? false : !prev[subjectId],
    }));
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Helper to highlight matching text
  const highlightMatch = (text: string, query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return text;
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark
              key={i}
              className="bg-amber-200 dark:bg-amber-900/80 text-amber-900 dark:text-amber-100 font-semibold px-0.5 rounded-xs"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  };

  const handleCreateSubjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    await onCreateSubject(newSubjectName.trim());
    setNewSubjectName('');
    setIsCreatingSubject(false);
  };

  const handleCreateTopicSubmit = async (subject: SubjectItem, e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;
    await onCreateTopic(subject.id, subject.name, newTopicName.trim());
    setNewTopicName('');
    setAddingTopicSubjectId(null);
    setExpandedSubjects((prev) => ({ ...prev, [subject.id]: true }));
  };

  // Calculate statistics
  const totalFiles = subjects.reduce(
    (acc, sub) => acc + sub.topics.reduce((tAcc, top) => tAcc + top.files.length, 0),
    0
  );
  const totalBytes = subjects.reduce(
    (acc, sub) =>
      acc +
      sub.topics.reduce(
        (tAcc, top) =>
          tAcc + top.files.reduce((fAcc, file) => fAcc + (file.size || 0), 0),
        0
      ),
    0
  );

  const allTopics = subjects.flatMap((s) => s.topics);
  const dueCount = allTopics.filter(
    (t) => getRevisionStatus(t.settings.nextRevisionDate) === 'due_today' ||
           getRevisionStatus(t.settings.nextRevisionDate) === 'overdue'
  ).length;

  const trimmedQuery = searchQuery.trim().toLowerCase();

  // Search filtering calculation
  const { filteredSubjects, totalMatchingTopics, totalMatchingSubjects } = useMemo(() => {
    if (!trimmedQuery) {
      return {
        filteredSubjects: subjects,
        totalMatchingTopics: subjects.reduce((acc, s) => acc + s.topics.length, 0),
        totalMatchingSubjects: subjects.length,
      };
    }

    let matchingTopicsCount = 0;
    let matchingSubjectsCount = 0;

    const list = subjects
      .map((sub) => {
        const subjectMatches = sub.name.toLowerCase().includes(trimmedQuery);
        if (subjectMatches) matchingSubjectsCount++;

        const matchingTopics = sub.topics.filter((top) => {
          const topicMatches = top.name.toLowerCase().includes(trimmedQuery);
          const fileMatches = top.files.some((f) => f.name.toLowerCase().includes(trimmedQuery));
          return topicMatches || fileMatches || subjectMatches;
        });

        matchingTopicsCount += matchingTopics.length;

        if (subjectMatches || matchingTopics.length > 0) {
          return {
            ...sub,
            topics: matchingTopics,
            hasDirectSubjectMatch: subjectMatches,
          };
        }
        return null;
      })
      .filter(Boolean) as (SubjectItem & { hasDirectSubjectMatch: boolean })[];

    return {
      filteredSubjects: list,
      totalMatchingTopics: matchingTopicsCount,
      totalMatchingSubjects: matchingSubjectsCount,
    };
  }, [subjects, trimmedQuery]);

  const hasSearchFilter = Boolean(trimmedQuery);

  return (
    <aside className="w-80 shrink-0 h-[calc(100vh-4rem)] bg-[#F7F3E9]/50 backdrop-blur-xl border-r border-zinc-200/50 flex flex-col justify-between select-none z-10">
      {/* Search and Navigation Views */}
      <div className="p-5 space-y-5">
        {/* Search Bar Input */}
        <div className="relative group">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-indigo-400 group-focus-within:text-indigo-600 transition-colors" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search knowledge... (/)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2.5 text-xs bg-white border border-zinc-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-indigo-400 focus:bg-white transition-all placeholder:text-zinc-400 text-zinc-800 font-black uppercase tracking-widest shadow-sm"
          />
        </div>

        {/* View Switcher (Segmented Control) */}
        <div className="flex p-1 bg-zinc-200/50 backdrop-blur-3xl rounded-2xl border border-zinc-200/50 shadow-inner">
          {[
            { id: 'today', label: 'Day', icon: Zap, color: 'text-amber-600' },
            { id: 'topic', label: 'Base', icon: List, color: 'text-blue-600' },
            { id: 'planner', label: 'Orbit', icon: Calendar, color: 'text-emerald-600' },
            { id: 'dashboard', label: 'Pulse', icon: BarChart3, color: 'text-rose-600' },
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id as any)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-[9px] font-black transition-all ${
                activeView === view.id
                  ? 'bg-white text-indigo-600 shadow-xl scale-[1.05]'
                  : 'text-zinc-400 hover:text-zinc-600 hover:bg-white/40'
              }`}
            >
              <view.icon className={`w-3.5 h-3.5 ${activeView === view.id ? 'text-indigo-600' : view.color}`} />
              <span className="uppercase tracking-[0.1em]">{view.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Subjects & Topics Tree */}
      <div className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5 custom-scrollbar">
        <div className="flex items-center justify-between px-1 mb-6">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">
            Vault Library
          </span>
          <button
            onClick={() => setIsCreatingSubject(true)}
            className="p-2 text-indigo-600 hover:text-indigo-700 hover:bg-white rounded-xl transition-all border border-transparent hover:border-zinc-200 shadow-xs hover:shadow-md"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>

        {/* ... (subject/topic rendering) */}

        {/* Add Subject Input form */}
        {isCreatingSubject && (
          <form onSubmit={handleCreateSubjectSubmit} className="p-2 bg-white dark:bg-zinc-800 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm space-y-2">
            <input
              type="text"
              autoFocus
              placeholder="e.g. Pathology, Chemistry..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
            <div className="flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setIsCreatingSubject(false)}
                className="px-2 py-1 text-[11px] text-zinc-500 hover:text-zinc-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newSubjectName.trim()}
                className="px-2.5 py-1 text-[11px] font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Create Folder
              </button>
            </div>
          </form>
        )}

        {/* Empty state when no subjects exist at all */}
        {subjects.length === 0 && !isCreatingSubject && (
          <div className="text-center py-10 px-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <FolderPlus className="w-6 h-6" />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              No subjects yet
            </p>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
              Create your first subject to start organizing topics &amp; files in Google Drive.
            </p>
            <button
              onClick={() => setIsCreatingSubject(true)}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
            >
              <FolderPlus className="w-4 h-4" />
              <span>New Subject</span>
            </button>
          </div>
        )}

        {/* Empty state when search yields no matches */}
        {subjects.length > 0 && hasSearchFilter && filteredSubjects.length === 0 && (
          <div className="text-center py-12 px-4 space-y-2">
            <div className="w-10 h-10 mx-auto rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
              <Search className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              No subjects or topics match "{searchQuery}"
            </p>
            <p className="text-[11px] text-zinc-400 max-w-[200px] mx-auto">
              Check for typos or try searching with a different keyword.
            </p>
            <button
              onClick={handleClearSearch}
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-medium rounded-lg transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear Filter</span>
            </button>
          </div>
        )}

        {/* Subject items */}
        {filteredSubjects.map((sub) => {
          // Auto-expand when search is active, otherwise respect user's manual toggle state
          const isExpanded = hasSearchFilter ? true : expandedSubjects[sub.id] !== false;

          return (
            <div key={sub.id} className="space-y-0.5">
              {/* Subject Row */}
              <div
                className={`group flex items-center justify-between px-4 py-3 rounded-2xl transition-all cursor-pointer ${
                  isExpanded 
                    ? 'bg-white text-indigo-600 shadow-xl scale-[1.02]' 
                    : 'text-zinc-500 hover:bg-white/60 hover:text-zinc-800'
                }`}
                onClick={() => toggleSubject(sub.id)}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-indigo-600' : 'text-zinc-400'}`} />
                  <span className="text-[11px] font-black truncate uppercase tracking-[0.1em]">
                    {highlightMatch(sub.name, searchQuery)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black font-mono tabular-nums px-2 py-0.5 rounded-lg ${isExpanded ? 'bg-indigo-50 text-indigo-600' : 'bg-zinc-200/50 text-zinc-500'}`}>
                    {sub.topics.length}
                  </span>
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onRenameSubject(sub)}
                      className="p-1.5 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteSubject(sub)}
                      className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Topics inside Subject */}
              {isExpanded && (
                <div className="space-y-1 ml-4 pt-1">
                  {sub.topics.map((topic) => {
                    const isSelected = selectedTopic?.id === topic.id && activeView === 'topic';
                    const status = getRevisionStatus(topic.settings.nextRevisionDate);

                    return (
                      <div key={topic.id} className="group/topic">
                        <div
                          className={`flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-indigo-600 shadow-md scale-[1.02]'
                              : 'text-zinc-500 hover:text-zinc-800 hover:bg-white/40'
                          }`}
                          onClick={() => {
                            onSelectTopic(topic);
                            setActiveView('topic');
                          }}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-600' : 'text-zinc-400'}`} />
                            <span className={`text-[11px] truncate ${isSelected ? 'font-black' : 'font-bold'}`}>
                              {highlightMatch(topic.name, searchQuery)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {status === 'overdue' && (
                              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-sm shadow-rose-500/30" title="Overdue" />
                            )}
                            {status === 'due_today' && (
                              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30" title="Due Today" />
                            )}
                            <div className="flex items-center opacity-0 group-hover/topic:opacity-100 transition-all duration-200" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onRenameTopic(topic)}
                                className="p-1.5 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                              >
                                <Edit2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Add Topic Field */}
                  {addingTopicSubjectId === sub.id ? (
                    <form
                      onSubmit={(e) => handleCreateTopicSubmit(sub, e)}
                      className="px-2 py-1.5 mt-1"
                    >
                      <input
                        autoFocus
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        placeholder="Topic name..."
                        onBlur={() => !newTopicName && setAddingTopicSubjectId(null)}
                        className="w-full text-[11px] px-2.5 py-1.5 bg-white dark:bg-zinc-800 border-2 border-purple-200 dark:border-purple-800/60 rounded-lg focus:outline-hidden focus:border-purple-500 dark:focus:border-purple-600 text-zinc-800 dark:text-zinc-200"
                      />
                    </form>
                  ) : (
                    <button
                      onClick={() => setAddingTopicSubjectId(sub.id)}
                      className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors uppercase tracking-wider"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New Topic</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storage & Drive info footer */}
      <div className="p-4 border-t border-zinc-200/50 bg-[#F7F3E9]/80 backdrop-blur-3xl">
        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.2em]">
          <div className="flex items-center gap-2 text-indigo-600">
            <HardDrive className="w-4 h-4" />
            <span className="text-zinc-800">
              {formatFileSize(totalBytes)}
            </span>
          </div>
          <span className="text-zinc-400">{totalFiles} Entities</span>
        </div>
      </div>
    </aside>
  );
};
