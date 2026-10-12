import { useSyncExternalStore } from 'react';

import type { RakazParentNotification } from '@rakaz/contract';

import { client } from '@/services/client';

const POLL_MS = 30_000;

interface AlertsState {
  items: RakazParentNotification[];
  error: boolean;
}

// One inbox shared by the sidebar badge and the alerts page.
let state: AlertsState = { items: [], error: false };
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

const set = (next: AlertsState): void => {
  state = next;
  for (const listener of listeners) listener();
};

async function refresh(): Promise<void> {
  try {
    set({ items: await client.notifications.list(1, 100), error: false });
  } catch {
    set({ ...state, error: true });
  }
}

export const alerts = {
  refresh,
  async markRead(id: string): Promise<void> {
    set({ ...state, items: state.items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    await client.notifications.markRead(id).catch(() => undefined);
  },
  async markAllRead(): Promise<void> {
    set({ ...state, items: state.items.map((n) => ({ ...n, read: true })) });
    await client.notifications.markAllRead().catch(() => undefined);
  },
};

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void refresh();
    timer = setInterval(() => void refresh(), POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** Alerts raised for the administration: emergencies, handover problems, address changes, new tickets. */
export function useAlerts(): AlertsState & { unread: number } {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  return { ...snapshot, unread: snapshot.items.filter((n) => !n.read).length };
}
