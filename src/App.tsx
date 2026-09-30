import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logout,
  getAccessToken
} from './services/auth';
import {
  fetchFullStructure,
  createSubject,
  createTopic,
  saveTopicSettings,
  uploadFileToTopic,
  deleteDriveFile,
  renameDriveItem
} from './services/driveService';
import {
  createOrUpdateRevisionCalendarEvent,
  deleteCalendarEvent
} from './services/calendarService';
import {
  createOrUpdateRevisionTask,
  deleteTask,
  completeTask
} from './services/tasksService';
import { SubjectItem, TopicItem, DriveFileItem, RevisionSettings, UploadProgress } from './types';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { TopicDetail } from './components/TopicDetail';
import { RevisionPlanner } from './components/RevisionPlanner';
import { StudyDashboard } from './components/StudyDashboard';
import { AuthLanding } from './components/AuthLanding';
import { ConfirmationModal } from './components/ConfirmationModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { getRevisionStatus } from './utils/revisionUtils';
import { BookOpen, FolderPlus, Layers, Plus } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);

  // App data state
  const [rootFolderId, setRootFolderId] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'topic' | 'planner' | 'dashboard'>('topic');

  // Sync state
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);

  // Modals & Preview
  const [previewFile, setPreviewFile] = useState<DriveFileItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Confirmation Modal State (MANDATORY for destructive Workspace actions)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    itemDescription?: string;
    confirmLabel?: string;
    onConfirm: () => Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: async () => {},
  });
  const [isConfirmProcessing, setIsConfirmProcessing] = useState(false);

  // Rename Modal State
  const [renameModal, setRenameModal] = useState<{
    isOpen: boolean;
    itemId: string;
    itemType: 'subject' | 'topic';
    currentName: string;
  } | null>(null);
  const [renameInputValue, setRenameInputValue] = useState('');

  // Show temporary toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // 1. Initialize Firebase Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAuthLoading(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // 2. Fetch full structure from Drive
  const loadData = useCallback(async (quiet = false) => {
    if (!quiet) setIsSyncing(true);
    try {
      const data = await fetchFullStructure();
      setRootFolderId(data.rootFolderId);
      setSubjects(data.subjects);
      setLastSynced(new Date());

      // If no topic is selected, select the first topic available
      setSelectedTopicId((prev) => {
        if (prev && data.subjects.some((s) => s.topics.some((t) => t.id === prev))) {
          return prev;
        }
        for (const s of data.subjects) {
          if (s.topics.length > 0) {
            return s.topics[0].id;
          }
        }
        return null;
      });
    } catch (err: any) {
      console.error('Sync error:', err);
      showToast(err.message || 'Failed to sync with Google Drive');
    } finally {
      if (!quiet) setIsSyncing(false);
    }
  }, []);

  // Sync on auth success
  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token, loadData]);

  // Periodic automatic sync every 60 seconds
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      loadData(true);
    }, 60000);
    return () => clearInterval(interval);
  }, [token, loadData]);

  // Sign in handler
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        showToast('Connected to Google Drive, Calendar, and Tasks');
      }
    } catch (err: any) {
      console.error('Sign in failed:', err);
      showToast(err.message || 'Google sign-in failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Sign out handler
  const handleLogout = async () => {
    await logout();
    setUser(null);
    setToken(null);
    setSubjects([]);
    setSelectedTopicId(null);
  };

  // Create Subject
  const handleCreateSubject = async (name: string) => {
    try {
      setIsSyncing(true);
      const newSub = await createSubject(name);
      setSubjects((prev) => [...prev, newSub]);
      showToast(`Created subject "${name}" in Google Drive`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create subject');
    } finally {
      setIsSyncing(false);
    }
  };

  // Create Topic
  const handleCreateTopic = async (subjectId: string, subjectName: string, name: string) => {
    try {
      setIsSyncing(true);
      const newTopic = await createTopic(subjectId, subjectName, name);

      // Optionally schedule initial calendar event & tasks if sync is on
      if (newTopic.settings.syncToCalendar && newTopic.settings.nextRevisionDate) {
        try {
          const calId = await createOrUpdateRevisionCalendarEvent(undefined, {
            topicName: newTopic.name,
            subjectName: subjectName,
            topicId: newTopic.id,
            revisionDate: newTopic.settings.nextRevisionDate,
            reminderTime: newTopic.settings.reminderTime || '09:00',
            revisionCount: 0,
          });
          newTopic.settings.calendarEventId = calId;
        } catch (e) {
          console.warn('Calendar sync:', e);
        }
      }

      if (newTopic.settings.syncToTasks && newTopic.settings.nextRevisionDate) {
        try {
          const tId = await createOrUpdateRevisionTask(undefined, {
            topicName: newTopic.name,
            subjectName: subjectName,
            revisionDate: newTopic.settings.nextRevisionDate,
            revisionCount: 0,
          });
          newTopic.settings.taskId = tId;
        } catch (e) {
          console.warn('Tasks sync:', e);
        }
      }

      await saveTopicSettings(newTopic.id, newTopic.settings);

      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, topics: [...s.topics, newTopic] } : s))
      );
      setSelectedTopicId(newTopic.id);
      setActiveView('topic');
      showToast(`Created topic "${name}" in Google Drive`);
    } catch (err: any) {
      showToast(err.message || 'Failed to create topic');
    } finally {
      setIsSyncing(false);
    }
  };

  // Update Topic Settings (frequency, date, notes, etc.)
  const handleUpdateTopicSettings = async (topicId: string, newSettings: RevisionSettings) => {
    setIsSavingSettings(true);
    try {
      // Find subject and topic
      let targetTopic: TopicItem | null = null;
      let targetSubject: SubjectItem | null = null;
      for (const s of subjects) {
        const found = s.topics.find((t) => t.id === topicId);
        if (found) {
          targetTopic = found;
          targetSubject = s;
          break;
        }
      }

      if (!targetTopic || !targetSubject) return;

      let calendarEventId = newSettings.calendarEventId;
      let taskId = newSettings.taskId;

      // Sync to Google Calendar
      if (newSettings.syncToCalendar && newSettings.nextRevisionDate) {
        try {
          calendarEventId = await createOrUpdateRevisionCalendarEvent(calendarEventId, {
            topicName: targetTopic.name,
            subjectName: targetSubject.name,
            topicId: targetTopic.id,
            revisionDate: newSettings.nextRevisionDate,
            reminderTime: newSettings.reminderTime || '09:00',
            revisionCount: newSettings.revisionCount || 0,
            notes: newSettings.notes,
          });
        } catch (calErr) {
          console.error('Error syncing to Calendar:', calErr);
        }
      } else if (!newSettings.syncToCalendar && calendarEventId) {
        try {
          await deleteCalendarEvent(calendarEventId);
          calendarEventId = undefined;
        } catch (e) {
          console.warn('Calendar delete error:', e);
        }
      }

      // Sync to Google Tasks
      if (newSettings.syncToTasks && newSettings.nextRevisionDate) {
        try {
          taskId = await createOrUpdateRevisionTask(taskId, {
            topicName: targetTopic.name,
            subjectName: targetSubject.name,
            revisionDate: newSettings.nextRevisionDate,
            revisionCount: newSettings.revisionCount || 0,
            notes: newSettings.notes,
          });
        } catch (taskErr) {
          console.error('Error syncing to Tasks:', taskErr);
        }
      }

      const finalSettings: RevisionSettings = {
        ...newSettings,
        calendarEventId,
        taskId,
      };

      await saveTopicSettings(topicId, finalSettings);

      setSubjects((prev) =>
        prev.map((s) => ({
          ...s,
          topics: s.topics.map((t) => (t.id === topicId ? { ...t, settings: finalSettings } : t)),
        }))
      );
      showToast('Revision schedule and preferences synced!');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Log study time session
  const handleLogStudySession = async (
    topicId: string,
    minutes: number,
    date: string,
    notes?: string
  ) => {
    try {
      let targetTopic: TopicItem | null = null;
      for (const s of subjects) {
        const found = s.topics.find((t) => t.id === topicId);
        if (found) {
          targetTopic = found;
          break;
        }
      }
      if (!targetTopic) return;

      const newEntry = {
        id: 'session_' + Date.now(),
        date,
        minutes,
        completed: true,
        notes,
      };

      const updatedHistory = [...(targetTopic.settings.history || []), newEntry];
      const updatedTotalMinutes = (targetTopic.settings.totalStudyMinutes || 0) + minutes;

      const updatedSettings: RevisionSettings = {
        ...targetTopic.settings,
        totalStudyMinutes: updatedTotalMinutes,
        history: updatedHistory,
      };

      await saveTopicSettings(topicId, updatedSettings);

      setSubjects((prev) =>
        prev.map((s) => ({
          ...s,
          topics: s.topics.map((t) => (t.id === topicId ? { ...t, settings: updatedSettings } : t)),
        }))
      );
      showToast(`Logged ${minutes} mins study session!`);
    } catch (err: any) {
      showToast(err.message || 'Failed to log study session');
    }
  };

  // Upload file (up to 200MB!)
  const handleUploadFile = async (
    topicId: string,
    file: File,
    onProgress: (p: UploadProgress) => void
  ): Promise<DriveFileItem> => {
    const uploadedItem = await uploadFileToTopic(topicId, file, onProgress);
    // Add file to state
    setSubjects((prev) =>
      prev.map((s) => ({
        ...s,
        topics: s.topics.map((t) =>
          t.id === topicId ? { ...t, files: [uploadedItem, ...t.files] } : t
        ),
      }))
    );
    showToast(`Uploaded "${file.name}" to Google Drive`);
    return uploadedItem;
  };

  // Delete file (with user confirmation modal)
  const handleDeleteFile = (topicId: string, file: DriveFileItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete File from Google Drive?',
      message: `Are you sure you want to permanently delete this file from Google Drive? This action cannot be undone.`,
      itemDescription: `File: ${file.name} (${file.size ? (file.size / 1024 / 1024).toFixed(1) + ' MB' : ''})`,
      confirmLabel: 'Delete File',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          await deleteDriveFile(file.id);
          setSubjects((prev) =>
            prev.map((s) => ({
              ...s,
              topics: s.topics.map((t) =>
                t.id === topicId
                  ? { ...t, files: t.files.filter((f) => f.id !== file.id) }
                  : t
              ),
            }))
          );
          showToast(`Deleted "${file.name}" from Google Drive`);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Failed to delete file');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // Delete Topic (with user confirmation modal)
  const handleDeleteTopic = (topic: TopicItem) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Topic & Drive Folder?',
      message: `Are you sure you want to delete the topic "${topic.name}" and all its files from Google Drive? Any calendar reminders and tasks associated with this topic will also be cleaned up.`,
      itemDescription: `Topic: ${topic.name} (${topic.files.length} files)`,
      confirmLabel: 'Delete Topic Folder',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          // Delete Google Drive folder
          await deleteDriveFile(topic.id);

          // Clean up calendar event if any
          if (topic.settings.calendarEventId) {
            try {
              await deleteCalendarEvent(topic.settings.calendarEventId);
            } catch {}
          }
          // Clean up task if any
          if (topic.settings.taskId) {
            try {
              await deleteTask(topic.settings.taskId);
            } catch {}
          }

          setSubjects((prev) =>
            prev.map((s) => ({
              ...s,
              topics: s.topics.filter((t) => t.id !== topic.id),
            }))
          );

          if (selectedTopicId === topic.id) {
            setSelectedTopicId(null);
          }
          showToast(`Deleted topic "${topic.name}"`);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Failed to delete topic');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // Delete Subject (with user confirmation modal)
  const handleDeleteSubject = (subject: SubjectItem) => {
    const totalFiles = subject.topics.reduce((acc, t) => acc + t.files.length, 0);
    setConfirmModal({
      isOpen: true,
      title: 'Delete Subject & All Contained Topics?',
      message: `Are you sure you want to delete the subject "${subject.name}" and all of its ${subject.topics.length} topics and ${totalFiles} files from Google Drive? This action is permanent.`,
      itemDescription: `Subject Folder: ${subject.name}`,
      confirmLabel: 'Delete Subject Folder',
      onConfirm: async () => {
        setIsConfirmProcessing(true);
        try {
          await deleteDriveFile(subject.id);
          setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
          if (subject.topics.some((t) => t.id === selectedTopicId)) {
            setSelectedTopicId(null);
          }
          showToast(`Deleted subject "${subject.name}"`);
          setConfirmModal((m) => ({ ...m, isOpen: false }));
        } catch (err: any) {
          showToast(err.message || 'Failed to delete subject');
        } finally {
          setIsConfirmProcessing(false);
        }
      },
    });
  };

  // Rename handlers
  const openRenameModal = (item: SubjectItem | TopicItem, type: 'subject' | 'topic') => {
    setRenameInputValue(item.name);
    setRenameModal({
      isOpen: true,
      itemId: item.id,
      itemType: type,
      currentName: item.name,
    });
  };

  const handleSaveRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renameModal || !renameInputValue.trim()) return;

    try {
      await renameDriveItem(renameModal.itemId, renameInputValue.trim());
      if (renameModal.itemType === 'subject') {
        setSubjects((prev) =>
          prev.map((s) => (s.id === renameModal.itemId ? { ...s, name: renameInputValue.trim() } : s))
        );
      } else {
        setSubjects((prev) =>
          prev.map((s) => ({
            ...s,
            topics: s.topics.map((t) =>
              t.id === renameModal.itemId ? { ...t, name: renameInputValue.trim() } : t
            ),
          }))
        );
      }
      showToast(`Renamed to "${renameInputValue.trim()}"`);
      setRenameModal(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to rename item');
    }
  };

  // Compute selected topic
  let currentTopic: TopicItem | null = null;
  for (const s of subjects) {
    const t = s.topics.find((top) => top.id === selectedTopicId);
    if (t) {
      currentTopic = t;
      break;
    }
  }

  // Count revisions due
  const dueCount = subjects
    .flatMap((s) => s.topics)
    .filter((t) => {
      const st = getRevisionStatus(t.settings.nextRevisionDate);
      return st === 'due_today' || st === 'overdue';
    }).length;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-500 font-medium">Connecting to Google Workspace...</p>
        </div>
      </div>
    );
  }

  if (!user || !token) {
    return <AuthLanding onLogin={handleLogin} isLoading={isLoggingIn} />;
  }

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans antialiased">
      {/* Navbar */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        onSync={() => loadData(false)}
        isSyncing={isSyncing}
        lastSynced={lastSynced}
        rootFolderId={rootFolderId}
        revisionsDueCount={dueCount}
        onOpenPlanner={() => setActiveView('planner')}
        onOpenDashboard={() => setActiveView('dashboard')}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          subjects={subjects}
          selectedTopic={currentTopic}
          onSelectTopic={(t) => {
            setSelectedTopicId(t.id);
            setActiveView('topic');
          }}
          onCreateSubject={handleCreateSubject}
          onCreateTopic={handleCreateTopic}
          onRenameSubject={(s) => openRenameModal(s, 'subject')}
          onDeleteSubject={handleDeleteSubject}
          onRenameTopic={(t) => openRenameModal(t, 'topic')}
          onDeleteTopic={handleDeleteTopic}
          activeView={activeView}
          setActiveView={setActiveView}
        />

        {/* Center / Right Content Panel */}
        <main className="flex-1 flex flex-col bg-zinc-50 dark:bg-zinc-900/60 overflow-hidden">
          {activeView === 'dashboard' ? (
            <StudyDashboard
              subjects={subjects}
              onLogStudySession={handleLogStudySession}
              onSelectTopic={(t) => {
                setSelectedTopicId(t.id);
                setActiveView('topic');
              }}
            />
          ) : activeView === 'planner' ? (
            <RevisionPlanner
              subjects={subjects}
              onSelectTopic={(t) => {
                setSelectedTopicId(t.id);
                setActiveView('topic');
              }}
              onUpdateSettings={handleUpdateTopicSettings}
            />
          ) : currentTopic ? (
            <TopicDetail
              key={currentTopic.id}
              topic={currentTopic}
              onUpdateSettings={handleUpdateTopicSettings}
              onUploadFile={handleUploadFile}
              onDeleteFile={handleDeleteFile}
              onPreviewFile={(f) => setPreviewFile(f)}
              isSavingSettings={isSavingSettings}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
              <div className="max-w-md">
                <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4 shadow-xs">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Select or Create a Topic
                </h2>
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Choose a subject and topic from the left sidebar to upload PDFs up to 200MB, adjust revision intervals, and sync with your Google Calendar and Tasks.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-3 rounded-2xl shadow-xl text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 duration-200">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mandatory Destructive Action Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        itemDescription={confirmModal.itemDescription}
        confirmLabel={confirmModal.confirmLabel}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((m) => ({ ...m, isOpen: false }))}
        isProcessing={isConfirmProcessing}
      />

      {/* Rename Item Modal */}
      {renameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Rename {renameModal.itemType === 'subject' ? 'Subject' : 'Topic'}
            </h3>
            <form onSubmit={handleSaveRename} className="space-y-4">
              <input
                type="text"
                autoFocus
                value={renameInputValue}
                onChange={(e) => setRenameInputValue(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-800 dark:text-zinc-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRenameModal(null)}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!renameInputValue.trim()}
                  className="px-3.5 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50"
                >
                  Save Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      <FilePreviewModal
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
