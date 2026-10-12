import { randomInt } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import bcrypt from 'bcryptjs';

import { AppConfig } from '../../config/app-config.service.js';

// No look-alike characters (0/O, 1/l/I), so a password read out over the phone is typed correctly.
const LETTERS = 'abcdefghjkmnpqrstuvwxyz';
const DIGITS = '23456789';

@Injectable()
export class PasswordService {
  private readonly rounds: number;
  /** Compared against when no account matches, so response time does not reveal which phones exist. */
  private readonly decoyHash: string;

  constructor(config: AppConfig) {
    this.rounds = config.env === 'test' ? 4 : 12;
    this.decoyHash = bcrypt.hashSync('rakaz-decoy-password', this.rounds);
  }

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  /** Pass `null` when there is no account; the comparison still runs and always fails. */
  async verify(plain: string, hash: string | null): Promise<boolean> {
    const matches = await bcrypt.compare(plain, hash ?? this.decoyHash);
    return hash !== null && matches;
  }

  /** A 10-character temporary password the administration hands to the user. */
  generateTemporary(): string {
    const pick = (alphabet: string): string => alphabet[randomInt(alphabet.length)]!;
    const chars = [
      ...Array.from({ length: 6 }, () => pick(LETTERS)),
      ...Array.from({ length: 4 }, () => pick(DIGITS)),
    ];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j]!, chars[i]!];
    }
    return chars.join('');
  }
}
