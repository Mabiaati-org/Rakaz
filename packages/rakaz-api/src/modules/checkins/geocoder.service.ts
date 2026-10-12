import { Injectable, Logger } from '@nestjs/common';

import { AppConfig } from '../../config/app-config.service.js';

const TIMEOUT_MS = 4000;

/** Turns coordinates into a street address using OpenStreetMap's Nominatim service. */
@Injectable()
export class GeocoderService {
  private readonly logger = new Logger(GeocoderService.name);

  constructor(private readonly config: AppConfig) {}

  /** Never throws: a check-in is still recorded when the address cannot be looked up. */
  async reverse(latitude: number, longitude: number): Promise<string | null> {
    const base = this.config.nominatimUrl;
    if (!base || this.config.env === 'test') return null;

    const url = `${base}/reverse?format=jsonv2&zoom=18&accept-language=ar&lat=${latitude}&lon=${longitude}`;
    const contact = this.config.osmContactEmail;
    try {
      const response = await fetch(url, {
        // The service's usage policy requires an identifying User-Agent.
        headers: { 'User-Agent': `rakaz-api/1.0${contact ? ` (${contact})` : ''}`, Accept: 'application/json' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { display_name?: unknown };
      return typeof body.display_name === 'string' ? body.display_name.slice(0, 500) : null;
    } catch (error) {
      this.logger.warn(`Address lookup failed: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }
}
