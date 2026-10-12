import { RakazActionKind, type RakazAbsenceReport, type RakazDriverEventInput } from '@rakaz/contract';

import { client, driverApi } from '@/services/api';
import type { PendingAction } from '@/types/models';

function toEvent(action: PendingAction): RakazDriverEventInput {
  return {
    id: action.id,
    tripKind: action.tripKind,
    // The two enums are kept identical by design; the API rejects anything it does not know.
    action: action.kind as unknown as RakazActionKind,
    studentId: action.studentId,
    at: action.timestamp,
    location: action.location,
    detail: action.detail,
    schemaVersion: 1,
  };
}

/** Sends queued driver actions to the API. Safe to repeat: the server ignores events it already has. */
export const SyncService = {
  async send(actions: PendingAction[]): Promise<void> {
    if (actions.length === 0) return;
    await driverApi.sendEvents(actions.map(toEvent));
  },

  ping(): Promise<boolean> {
    return client.ping();
  },

  /** Today's guardian absence reports for this driver's route; empty when offline. */
  async pullAbsences(): Promise<RakazAbsenceReport[]> {
    try {
      return await driverApi.absencesToday();
    } catch {
      return [];
    }
  },
};
