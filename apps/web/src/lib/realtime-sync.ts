import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

const CHANNEL_NAME = 'syllabus_realtime_sync';
const STORAGE_KEY = 'syllabus_last_activity_sync';

export interface ProgressSyncEvent {
  type: 'CHAPTER_PROGRESS_UPDATED' | 'TEACHER_PROGRESS_UPDATED';
  chapterId?: string;
  teacherId?: string;
  timestamp: number;
}

/**
 * Broadcast an update event to all other tabs and browser windows
 */
export function broadcastProgressUpdate(payload?: Partial<ProgressSyncEvent>) {
  if (typeof window === 'undefined') return;

  const eventData: ProgressSyncEvent = {
    type: payload?.type || 'CHAPTER_PROGRESS_UPDATED',
    chapterId: payload?.chapterId,
    teacherId: payload?.teacherId,
    timestamp: Date.now(),
  };

  try {
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channel.postMessage(eventData);
      channel.close();
    }
  } catch (err) {
    // ignore
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eventData));
  } catch (err) {
    // ignore
  }
}

/**
 * Hook to listen for real-time progress updates across tabs and invalidate relevant query keys
 */
export function useRealtimeSync(queryKeys: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleSync = () => {
      queryKeys.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key as any });
      });
    };

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME);
        channel.onmessage = () => {
          handleSync();
        };
      } catch (e) {
        // channel unavailable
      }
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        handleSync();
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      if (channel) {
        channel.close();
      }
      window.removeEventListener('storage', handleStorage);
    };
  }, [queryClient, queryKeys]);
}

/**
 * Format timestamp into human-readable date and time, e.g. "Sep 21, 2026, 11:28 AM"
 */
export function formatActivityDateTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format relative time (e.g. "Just now", "2m ago", "1h ago", "2d ago")
 */
export function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (isNaN(diffMs)) return '';

    const diffSec = Math.floor(diffMs / 1000);
    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1m ago';

    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;

    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}
