export type RevisionFrequency = 
  | 'spaced_repetition' // 1, 3, 7, 14, 30 days
  | 'daily'             // 1 day
  | 'alternate'         // 2 days
  | 'biweekly'          // 3 days
  | 'weekly'            // 7 days
  | 'bimonthly'         // 15 days
  | 'monthly'           // 30 days
  | 'custom';           // user specified days

export interface RevisionLogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  minutes: number;
  notes?: string;
}

export interface RevisionSettings {
  frequency: RevisionFrequency;
  customDays?: number;
  reminderTime: string; // e.g., "09:00"
  syncToCalendar: boolean;
  syncToTasks: boolean;
  calendarEventId?: string;
  taskId?: string;
  lastRevisedAt?: string;
  nextRevisionDate?: string;
  revisionCount: number;
  totalStudyMinutes: number;
  notes?: string;
  history?: RevisionLogEntry[];
}

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  size?: number; // size in bytes
  webViewLink?: string;
  webContentLink?: string;
  thumbnailLink?: string;
  iconLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export interface TopicItem {
  id: string; // Drive folder ID
  name: string;
  subjectId: string;
  subjectName: string;
  createdTime?: string;
  files: DriveFileItem[];
  settings: RevisionSettings;
}

export interface SubjectItem {
  id: string; // Drive folder ID
  name: string;
  topics: TopicItem[];
  createdTime?: string;
  color?: string;
}

export interface UploadProgress {
  fileName: string;
  fileSize: number;
  uploadedBytes: number;
  percentage: number;
  status: 'uploading' | 'completed' | 'error' | 'paused';
  errorMessage?: string;
}
