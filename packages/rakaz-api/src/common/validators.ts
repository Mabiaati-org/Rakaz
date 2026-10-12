import { normalizeIraqiPhone } from '@rakaz/contract';
import { Transform } from 'class-transformer';
import { registerDecorator, type ValidationOptions } from 'class-validator';

import { isDateISO } from './time.js';

/** Validates an Iraqi mobile number and rewrites it to E.164 (`+9647XXXXXXXXX`). */
export function IraqiPhone(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    Transform(({ value }) => (typeof value === 'string' ? (normalizeIraqiPhone(value) ?? value) : value))(
      target,
      propertyKey,
    );
    registerDecorator({
      name: 'iraqiPhone',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: { message: 'رقم الهاتف غير صالح. أدخل رقماً عراقياً يبدأ بـ 07', ...options },
      validator: {
        validate: (value: unknown): boolean => typeof value === 'string' && normalizeIraqiPhone(value) !== null,
      },
    });
  };
}

/** Validates a calendar date in YYYY-MM-DD form. */
export function DateISO(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'dateISO',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: { message: 'صيغة التاريخ يجب أن تكون YYYY-MM-DD', ...options },
      validator: { validate: (value: unknown): boolean => typeof value === 'string' && isDateISO(value) },
    });
  };
}

/** Validates a time of day in HH:mm form. */
export function TimeOfDay(options?: ValidationOptions): PropertyDecorator {
  return (target: object, propertyKey: string | symbol): void => {
    registerDecorator({
      name: 'timeOfDay',
      target: target.constructor,
      propertyName: String(propertyKey),
      options: { message: 'صيغة الوقت يجب أن تكون HH:mm', ...options },
      validator: {
        validate: (value: unknown): boolean => typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value),
      },
    });
  };
}

/** Trims string input before validation. */
export const Trim = (): PropertyDecorator =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
