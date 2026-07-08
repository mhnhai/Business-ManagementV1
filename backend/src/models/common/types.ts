import EnvVars, { NodeEnvs } from '@src/common/constants/env';
export interface Entity {
  id: number; // @PK
  createdAt: Date;
  updatedAt: Date;
}

export interface ISessionUser {
  userId: number;
  username: string;
  role: string;
}

export { AuthErrors as Errors } from '@src/common/constants/service-errors';

const isProduction = EnvVars.NodeEnv === NodeEnvs.PRODUCTION;

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/',
} as const;

export type AutoCreatePayload<T> = Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>;
