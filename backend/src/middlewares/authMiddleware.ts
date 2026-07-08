import { NextFunction } from 'express';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { ISessionUser } from '@src/models/common/types';
import JwtUtils from '@src/common/utils/session-authenticate';
import { RouteError } from '@src/common/utils/route-errors';
import { Req, Res } from '@src/routes/common/express-types';
import EnvVars from '@src/common/constants/env';

const AUTH_ERR = 'Session invalid or expired';

/**
 * Middleware to verify the access token from cookies and attach user data to res.locals.
 */
async function auth(req: Req, res: Res, next: NextFunction) {
  try {
    const { accessToken } = req.cookies as { accessToken?: string };
    if (!accessToken) {
      throw new RouteError(HttpStatusCodes.UNAUTHORIZED, AUTH_ERR);
    }
    const sessionUser = await JwtUtils.verifyToken<ISessionUser>(
      accessToken,
      EnvVars.JwtTokenKey
    );
    res.locals.sessionUser = sessionUser;
    return next();
  } catch (_err) {
    return next(new RouteError(HttpStatusCodes.UNAUTHORIZED, AUTH_ERR));
  }
}

/**
 * Middleware to restrict access based on user roles.
 */
function authorize(...allowedRoles: string[]) {
  return (_req: Req, res: Res, next: NextFunction) => {

    const user = res.locals.sessionUser as ISessionUser | undefined;

    if (!user || !allowedRoles.includes(user.role)) {
      return next(
        new RouteError(HttpStatusCodes.FORBIDDEN, 'Permission denied'),
      );
    }
    return next();
  };
}

export default {
  auth,
  authorize,
} as const;