import { RevisionFrequency } from '../types';

export const SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30, 60];

export const FREQUENCY_LABELS: Record<RevisionFrequency, string> = {
  spaced_repetition: 'Spaced Repetition (1d → 3d → 7d → 14d → 30d)',
  daily: 'Daily (Every 1 day)',
  alternate: 'Alternate Days (Every 2 days)',
  biweekly: 'Every 3 Days',
  weekly: 'Weekly (Every 7 days)',
  bimonthly: 'Every 15 Days',
  monthly: 'Monthly (Every 30 days)',
  custom: 'Custom Frequency',
};

export function getIntervalDays(
  frequency: RevisionFrequency,
  revisionCount: number,
  customDays?: number
): number {
  switch (frequency) {
    case 'spaced_repetition': {
      const idx = Math.min(revisionCount, SPACED_REPETITION_INTERVALS.length - 1);
      return SPACED_REPETITION_INTERVALS[idx];
    }
    case 'daily':
      return 1;
    case 'alternate':
      return 2;
    case 'biweekly':
      return 3;
    case 'weekly':
      return 7;
    case 'bimonthly':
      return 15;
    case 'monthly':
      return 30;
    case 'custom':
      return customDays && customDays > 0 ? customDays : 7;
    default:
      return 7;
  }
}

export function calculateNextDate(
  frequency: RevisionFrequency,
  revisionCount: number,
  customDays?: number,
  baseDate: Date = new Date()
): string {
  const days = getIntervalDays(frequency, revisionCount, customDays);
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  return next.toISOString().split('T')[0];
}

export function getRevisionStatus(
  nextRevisionDate?: string
): 'overdue' | 'due_today' | 'upcoming' | 'not_scheduled' {
  if (!nextRevisionDate) return 'not_scheduled';

  const todayStr = new Date().toISOString().split('T')[0];
  if (nextRevisionDate < todayStr) return 'overdue';
  if (nextRevisionDate === todayStr) return 'due_today';
  return 'upcoming';
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(size < 10 && unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

export function formatDatePretty(dateStr?: string): string {
  if (!dateStr) return 'Not set';
  try {
    const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function getDaysDifference(targetDateStr?: string): number | null {
  if (!targetDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(targetDateStr + (targetDateStr.includes('T') ? '' : 'T00:00:00'));
  target.setHours(0, 0, 0, 0);

  const diffTime = target.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

export function formatRelativeDate(dateStr?: string, isNext: boolean = true): string {
  if (!dateStr) return isNext ? 'Not scheduled' : 'Never revised';
  const diff = getDaysDifference(dateStr);
  if (diff === null) return dateStr;

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';

  if (diff > 1) return `In ${diff} days`;
  if (diff < -1) return `${Math.abs(diff)} days ago`;

  return formatDatePretty(dateStr);
}
