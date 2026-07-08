import { isDate, isUnsignedInteger } from 'jet-validators';
import { transform, type Schema } from 'jet-validators/utils';

import type { Entity } from '@src/models/common/types';

export const transformIsDate = transform<Date>(
  (arg) => new Date(arg as string | number | Date),
  (arg) => isDate(arg),
);

function isDateValue(val: unknown): val is Date {
  if (isDate(val)) return true;
  if (typeof val === 'string' || typeof val === 'number') {
    return !Number.isNaN(new Date(val).getTime());
  }
  return false;
}

export function isNullableUnsignedInteger(val: unknown): val is number | null {
  return val === null || val === undefined || isUnsignedInteger(val);
}

export function isNullableDate(val: unknown): val is Date | null {
  if (val === null || val === undefined) return true;
  return isDateValue(val);
}

export const entitySchemaFields = {
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Pick<Schema<Entity>, 'createdAt' | 'updatedAt'>;
