import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { normalizeIraqiPhone } from '@rakaz/contract';
import type { Request } from 'express';

/**
 * Rate limits per account rather than per IP address.
 *
 * Mobile operators put thousands of subscribers behind one public address, so an IP-only limit
 * would let one busy family throttle everyone else on the same network.
 */
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async getTracker(req: Request): Promise<string> {
    const ip = req.ip ?? 'unknown';

    // The token is only read here, not trusted: JwtAuthGuard verifies it right after this guard.
    const header = req.headers.authorization ?? '';
    const payload = header.startsWith('Bearer ') ? header.slice(7).split('.')[1] : undefined;
    if (payload) {
      try {
        const { sub } = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { sub?: unknown };
        if (typeof sub === 'string' && sub.length > 0) return `user:${sub}`;
      } catch {
        // Not a JWT; fall through to the address.
      }
    }

    // Sign-in attempts are counted per phone number, so guessing one account's password is limited
    // without locking out other people who share the address.
    const phone = normalizeIraqiPhone((req.body as { phone?: unknown } | undefined)?.phone as string | undefined);
    return phone ? `${ip}|${phone}` : ip;
  }
}
