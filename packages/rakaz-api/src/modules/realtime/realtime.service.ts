import { Injectable } from '@nestjs/common';
import { auditTime, type Observable, Subject } from 'rxjs';

/**
 * In-process fan-out for live dashboard updates.
 * It lives in memory, so the API must run as a single process (pm2 fork mode, one instance).
 */
@Injectable()
export class RealtimeService {
  private readonly trips = new Subject<void>();

  /** Call after anything that changes what the live trips page shows. */
  tripsChanged(): void {
    this.trips.next();
  }

  /** Emits at most twice a second, however often trips change. */
  get tripsChanged$(): Observable<void> {
    return this.trips.pipe(auditTime(500));
  }
}
