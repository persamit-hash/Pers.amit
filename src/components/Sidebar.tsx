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
  FileText
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
  activeView: 'topic' | 'planner' | 'dashboard';
  setActiveView: (view: 'topic' | 'planner' | 'dashboard') => void;
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
    <aside className="w-80 shrink-0 h-[calc(100vh-4rem)] bg-zinc-50 dark:bg-zinc-900/95 border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between select-none">
      {/* Search and Navigation Views */}
      <div className="p-3 border-b border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
        {/* Search Bar Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search subjects or topics... (/ to focus)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                handleClearSearch();
              }
            }}
            className="w-full pl-9 pr-8 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-400"
          />
          {searchQuery ? (
            <button
              onClick={handleClearSearch}
              title="Clear search"
              className="absolute right-2.5 top-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <span className="hidden sm:inline-block absolute right-2.5 top-2.5 text-[10px] text-zinc-400 font-mono border border-zinc-200 dark:border-zinc-700 px-1 rounded-xs bg-zinc-50 dark:bg-zinc-900">
              /
            </span>
          )}
        </div>

        {/* Search match stats badge */}
        {hasSearchFilter && (
          <div className="flex items-center justify-between px-1 text-[11px] text-zinc-500">
            <span>
              Matches: <strong className="text-indigo-600 dark:text-indigo-400">{totalMatchingTopics}</strong> topic{totalMatchingTopics !== 1 ? 's' : ''}, <strong className="text-indigo-600 dark:text-indigo-400">{totalMatchingSubjects}</strong> subject{totalMatchingSubjects !== 1 ? 's' : ''}
            </span>
            <button
              onClick={handleClearSearch}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {/* Quick View Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-200/60 dark:bg-zinc-800/70 rounded-xl">
          <button
            onClick={() => setActiveView('topic')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeView === 'topic'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <List className="w-3 h-3 shrink-0" />
            <span className="truncate">Topics</span>
          </button>
          <button
            onClick={() => setActiveView('planner')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-all relative ${
              activeView === 'planner'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <Calendar className="w-3 h-3 shrink-0" />
            <span className="truncate">Revisions</span>
            {dueCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            )}
          </button>
          <button
            onClick={() => setActiveView('dashboard')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-lg text-[11px] font-medium transition-all ${
              activeView === 'dashboard'
                ? 'bg-white dark:bg-zinc-700 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
            }`}
          >
            <BarChart3 className="w-3 h-3 shrink-0" />
            <span className="truncate">Insights</span>
          </button>
        </div>
      </div>

      {/* Subjects & Topics Tree */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Drive Subjects ({subjects.length})
          </span>
          <button
            onClick={() => setIsCreatingSubject(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Subject</span>
          </button>
        </div>

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
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-xl shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Subject</span>
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
            <div key={sub.id} className="rounded-xl overflow-hidden">
              {/* Subject Row */}
              <div
                className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/60 transition-colors text-zinc-800 dark:text-zinc-200 cursor-pointer"
                onClick={() => toggleSubject(sub.id)}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                  )}
                  <Folder className="w-4 h-4 text-indigo-500 shrink-0" />
                  <span className="text-xs font-semibold truncate">
                    {highlightMatch(sub.name, searchQuery)}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono shrink-0">
                    ({sub.topics.length})
                  </span>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setAddingTopicSubjectId(sub.id);
                      setExpandedSubjects((prev) => ({ ...prev, [sub.id]: true }));
                    }}
                    title="Add Topic"
                    className="p-1 hover:text-indigo-600 rounded text-zinc-400"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onRenameSubject(sub)}
                    title="Rename Subject"
                    className="p-1 hover:text-zinc-700 dark:hover:text-zinc-200 rounded text-zinc-400"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => onDeleteSubject(sub)}
                    title="Delete Subject"
                    className="p-1 hover:text-red-600 rounded text-zinc-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Topics inside Subject */}
              {isExpanded && (
                <div className="pl-6 pr-1 py-0.5 space-y-0.5 border-l-2 border-zinc-200 dark:border-zinc-800 ml-3.5 my-0.5">
                  {sub.topics.map((topic) => {
                    const isSelected = selectedTopic?.id === topic.id && activeView === 'topic';
                    const status = getRevisionStatus(topic.settings.nextRevisionDate);

                    // Check if a file name inside this topic matched
                    const matchingFile = hasSearchFilter
                      ? topic.files.find((f) => f.name.toLowerCase().includes(trimmedQuery))
                      : null;

                    return (
                      <div
                        key={topic.id}
                        onClick={() => {
                          onSelectTopic(topic);
                          setActiveView('topic');
                        }}
                        className={`group flex flex-col px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-indigo-600 text-white font-medium shadow-2xs'
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`} />
                            <span className="truncate">
                              {highlightMatch(topic.name, searchQuery)}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* File count */}
                            <span className={`text-[10px] font-mono ${isSelected ? 'text-indigo-200' : 'text-zinc-400'}`}>
                              {topic.files.length}
                            </span>

                            {/* Revision Status Dot */}
                            {status === 'overdue' && (
                              <span title="Revision Overdue" className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            )}
                            {status === 'due_today' && (
                              <span title="Revision Due Today" className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                            )}
                            {status === 'upcoming' && (
                              <span title="Revision Scheduled" className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                            )}

                            {/* Quick Topic Actions */}
                            <div
                              className={`opacity-0 group-hover:opacity-100 transition-opacity flex items-center ${
                                isSelected ? 'text-white' : 'text-zinc-400'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() => onRenameTopic(topic)}
                                title="Rename Topic"
                                className="p-0.5 hover:text-amber-300"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => onDeleteTopic(topic)}
                                title="Delete Topic"
                                className="p-0.5 hover:text-red-300"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Matching File sub-label if topic appeared because of file match */}
                        {matchingFile && (
                          <div className={`mt-0.5 flex items-center gap-1 text-[10px] pl-5 truncate ${isSelected ? 'text-indigo-100' : 'text-zinc-400'}`}>
                            <FileText className="w-3 h-3 shrink-0" />
                            <span className="truncate">
                              Matched file: {highlightMatch(matchingFile.name, searchQuery)}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Inline Add Topic input for this Subject */}
                  {addingTopicSubjectId === sub.id ? (
                    <form
                      onSubmit={(e) => handleCreateTopicSubmit(sub, e)}
                      className="p-2 bg-white dark:bg-zinc-800 rounded-lg border border-indigo-200 dark:border-indigo-800 shadow-2xs space-y-1.5"
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. Cranial Nerves..."
                        value={newTopicName}
                        onChange={(e) => setNewTopicName(e.target.value)}
                        className="w-full text-xs px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200 focus:outline-hidden"
                      />
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setAddingTopicSubjectId(null)}
                          className="px-2 py-0.5 text-[10px] text-zinc-500"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!newTopicName.trim()}
                          className="px-2 py-0.5 text-[10px] font-medium bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                        >
                          Add Topic
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setAddingTopicSubjectId(sub.id)}
                      className="w-full text-left flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Add Topic in {sub.name}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Storage & Drive info footer */}
      <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50">
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {formatFileSize(totalBytes)}
            </span>
          </div>
          <span>{totalFiles} file{totalFiles !== 1 ? 's' : ''} in Drive</span>
        </div>
      </div>
    </aside>
  );
};
