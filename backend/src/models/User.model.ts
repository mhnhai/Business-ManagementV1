import { isBoolean, isString, isUnsignedInteger } from 'jet-validators';
import { parseObject, Schema, testObject } from 'jet-validators/utils';
import { transformIsDate } from '@src/common/utils/validators';
import { AutoCreatePayload, Entity } from './common/types';

/**
 * @entity users
 */
export interface IUser extends Entity {
  username: string;
  password: string;
  role: string;
  fullName: string;
  department: string;
  phoneNumber: string;
  email: string;
  isActivated: boolean;
  deletedAt: Date | null;
}

export type IUserPublic = Omit<IUser, 'password'>;

export type IUserCreate = AutoCreatePayload<IUser>;

function isNullableDeletedAt(val: unknown): val is Date | null {
  if (val === null || val === undefined) return true;
  return transformIsDate(val);
}

const GetDefaults = (): IUser => ({
  id: 0,
  username: '',
  password: '',
  role: 'employee',
  fullName: '',
  department: '',
  phoneNumber: '',
  email: '',
  isActivated: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
});

const schema = {
  id: isUnsignedInteger,
  username: isString,
  password: isString,
  role: isString,
  fullName: isString,
  department: isString,
  phoneNumber: isString,
  email: isString,
  isActivated: isBoolean,
  createdAt: transformIsDate,
  updatedAt: transformIsDate,
  deletedAt: isNullableDeletedAt,
} satisfies Schema<IUser>;

const userCreateSchema = {
  username: isString,
  password: isString,
  role: isString,
  fullName: isString,
  department: isString,
  phoneNumber: isString,
  email: isString,
  isActivated: isBoolean,
} satisfies Schema<IUserCreate>;

const parseUserCreate = parseObject(userCreateSchema);
const parseUser = parseObject(schema);

const isCompleteUser = testObject<IUser>({
  ...schema,
  username: isString,
  password: isString,
  fullName: isString,
  email: isString,
  isActivated: isBoolean,
});

function newCreate(payload: unknown): IUserCreate {
  return parseUserCreate(payload, (errors) => {
    throw new Error(`Invalid User Registration: ${JSON.stringify(errors)}`);
  });
}

function new_(user?: Partial<IUser>): IUser {
  return parseUser({ ...GetDefaults(), ...user }, (errors) => {
    throw new Error('Setup new user failed ' + JSON.stringify(errors, null, 2));
  });
}

function toPublic(user: IUser): IUserPublic {
  const { password: _password, ...publicUser } = user;
  return publicUser;
}

function mapRowToUser(row: {
  user_id: number;
  username: string;
  password: string;
  role: string;
  full_name: string;
  department: string;
  phone_number: string;
  email: string;
  is_activated: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}): IUser {
  return {
    id: row.user_id,
    username: row.username,
    password: row.password,
    role: row.role,
    fullName: row.full_name,
    department: row.department,
    phoneNumber: row.phone_number,
    email: row.email,
    isActivated: row.is_activated,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export default {
  new: new_,
  newCreate,
  isComplete: isCompleteUser,
  toPublic,
  mapRow: mapRowToUser,
} as const;
