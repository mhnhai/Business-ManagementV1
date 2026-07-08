import { isBoolean, isNumber, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';
import { transformIsDate } from '@src/common/utils/validators';
import { Entity } from './common/types';

/**
 * @entity salaries
 */
export interface ISalary extends Entity {
  userId: number;
  month: number;
  year: number;
  baseSalary: number;
  commission: number;
  bonus: number;
  isPaid: boolean;
}

export interface ISalaryWithUser extends ISalary {
  user: {
    username: string;
    fullName: string;
    department: string;
    email: string;
    phoneNumber: string;
    role: string;
  } | null;
}

const GetDefaults = (): ISalary => ({
  id: 0,
  userId: 0,
  month: new Date().getMonth() + 1,
  year: new Date().getFullYear(),
  baseSalary: 0,
  commission: 0,
  bonus: 0,
  isPaid: false,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const schema = {
  id: isUnsignedInteger,
  userId: isUnsignedInteger,
  month: (val: unknown): val is number =>
    typeof val === 'number' && val >= 1 && val <= 12,
  year: (val: unknown): val is number =>
    typeof val === 'number' && val >= 1900,
  baseSalary: isNumber,
  commission: isNumber,
  bonus: isNumber,
  isPaid: isBoolean,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
} satisfies Schema<ISalary>;

const parseSalary = parseObject(schema);

const isCompleteSalary = testObject<ISalary>(schema);

function new_(salary?: Partial<ISalary>): ISalary {
  return parseSalary({ ...GetDefaults(), ...salary }, (errors) => {
    throw new Error('Setup new salary failed ' + JSON.stringify(errors, null, 2));
  });
}

export default {
  new: new_,
  isComplete: isCompleteSalary,
} as const;
