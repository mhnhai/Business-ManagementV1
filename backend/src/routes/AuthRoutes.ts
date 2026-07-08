import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { COOKIE_OPTIONS, Errors, ISessionUser } from '@src/models/common/types';
import AuthRepo from '@src/repos/AuthRepo';
import AuthService from '@src/services/AuthService';
import JwtUtils from '@src/common/utils/session-authenticate';
import { RouteError } from '@src/common/utils/route-errors';
import { isNonEmptyString, isString } from 'jet-validators';
import bcrypt from 'bcryptjs';
import { Req, Res } from './common/express-types';
import parseReq from './common/parseReq';
import EnvVars from '@src/common/constants/env';
import UserRepo from '@src/repos/UserRepo';
import crypto from 'node:crypto';
import { getRedisClient } from '@src/common/utils/redis';
import UserService from '@src/services/UserService';
import { Prisma } from '@prisma/client';

/******************************************************************************
                                Constants
******************************************************************************/

interface PendingUser {
  username: string;
  password: string;
  email: string;
  role: string;
  fullName: string;
  department: string;
  phoneNumber: string;
}

interface DBUserRelation {
  user_id: number;
  username: string;
  role: string;
}

const reqValidators = {
  login: parseReq({ 
    username: isNonEmptyString, 
    password: isNonEmptyString 
  }),
  register: parseReq({
    username: isNonEmptyString,
    password: isNonEmptyString,
    email: isNonEmptyString,
    role: isString,
  }),
  forgotPassword: parseReq({
    email: isNonEmptyString,
  }),
  resetPassword: parseReq({
    token: isNonEmptyString,
    password: isNonEmptyString,
  }),
} as const;

/******************************************************************************
                                Functions
******************************************************************************/

/**
 * Check authentication status and return current user data.
 * @route GET /api/auth/check
 */
function check(req: Req, res: Res) {
  const token = req.cookies.accessToken as string | undefined;
  if (!token) {
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, 'Session not found');
  }

  try {
    const userData = JwtUtils.decodeAccessToken(token);
    
    return res.status(HttpStatusCodes.OK).json({ 
      user: userData,
      isLoggedIn: true 
    });
  } catch (_err) {
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, 'Invalid or expired session');
  }
}

/**
 * Register a new user - Step 1: Save temporary data to Redis & Send Link
 * @route POST /api/auth/register
 */
async function register(req: Req, res: Res) {
  const { username, password, email, role } = reqValidators.register(req.body);
  
  const existingUser = await UserRepo.getOne(username);
  if (existingUser) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'Username already exists in the system');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const SALT_ROUNDS = 12;
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const pendingUserData: PendingUser = {
    username: username,
    password: hashedPassword,
    email: email || '',
    role: role || 'employee',
    fullName: '',
    department: '',
    phoneNumber: ''
  };

  const redisKey = `pending_user:${token}`;
  const redis = await getRedisClient();
  await redis.set(redisKey, JSON.stringify(pendingUserData), {
    EX: 3600 
  });

  try {
    if (email) {
      await AuthService.sendVerificationLinkEmail(email, username, token);
    }
  } catch (mailError) {
    console.error('Failed to dispatch activation email:', mailError);
    await redis.del(redisKey);
    throw new RouteError(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Mailer service error. Registration rolled back.');
  }

  return res.status(HttpStatusCodes.CREATED).json({ 
    message: 'Registration link sent! Please verify your email within 1 hour to complete registration.' 
  });
}

/**
 * Verify Email - Step 2: Extract from Redis and officially write to Database & Send Success Email
 * @route GET /api/auth/verify-email
 */
async function verifyEmail(req: Req, res: Res) {
  const token = req.query.token as string;
  if (!token) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'Verification token is required.');
  }
  const redisKey = `pending_user:${token}`;
  const redis = await getRedisClient();
  const rawData = await redis.get(redisKey);

  if (!rawData) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'The activation link is invalid or has expired.');
  }

  const pendingUser = JSON.parse(rawData) as PendingUser;

  try {
    await UserService.addOne({
      username: pendingUser.username,
      password: pendingUser.password,
      role: pendingUser.role,
      fullName: pendingUser.fullName,
      department: pendingUser.department,
      phoneNumber: pendingUser.phoneNumber,
      email: pendingUser.email,
      isActivated: false, 
    });

    if (pendingUser.email) {
      await AuthService.sendActivationSuccessEmail(pendingUser.email, pendingUser.username);
    }

  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const targetFields = (error.meta?.target as string[]) || [];
      
      let clientErrorMessage = 'Tài khoản hoặc địa chỉ Email này đã tồn tại trên hệ thống.';
      
      if (targetFields.includes('email')) {
        clientErrorMessage = 'Địa chỉ email này đã được sử dụng bởi một nhân sự khác.';
      } else if (targetFields.includes('username')) {
        clientErrorMessage = 'Tên đăng nhập này đã tồn tại. Vui lòng thực hiện đăng ký lại với tên khác.';
      }

      throw new RouteError(HttpStatusCodes.CONFLICT, clientErrorMessage);
    }
    throw error;
  }  

  await redis.del(redisKey);

  return res.status(HttpStatusCodes.OK).json({
    message: 'Account successfully activated and registered! Please wait for administrator to activate your account'
  });
}

/**
 * Forgot Password - Step 1: Validate email, create reset token in Redis & Send email
 * @route POST /api/auth/forgot-password
 */
async function forgotPassword(req: Req, res: Res) {
  const { email } = reqValidators.forgotPassword(req.body);

  const user = await UserRepo.getOneByEmail(email); 
  if (!user) {
    throw new RouteError(HttpStatusCodes.NOT_FOUND, 'Địa chỉ email không tồn tại trong hệ thống.');
  }

  const token = crypto.randomBytes(32).toString('hex');
  const redisKey = `password_reset:${token}`;
  const redis = await getRedisClient();

  await redis.set(redisKey, JSON.stringify({ userId: user.id }), {
    EX: 900
  });

  try {
    await AuthService.sendForgotPasswordEmail(email, user.username, token);
  } catch (mailError) {
    console.error('Failed to dispatch forgot password email:', mailError);
    await redis.del(redisKey);
    throw new RouteError(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Mailer service error. Request rolled back.');
  }

  return res.status(HttpStatusCodes.OK).json({
    message: 'Yêu cầu khôi phục đã được ghi nhận. Vui lòng kiểm tra hộp thư email của bạn.'
  });
}

/**
 * Reset Password - Step 2: Validate token from Redis and update new password in Database.
 * @route POST /api/auth/reset-password
 */
async function resetPassword(req: Req, res: Res) {
  const { token, password } = reqValidators.resetPassword(req.body);

  const redisKey = `password_reset:${token}`;
  const redis = await getRedisClient();
  const rawData = await redis.get(redisKey);

  if (!rawData) {
    throw new RouteError(HttpStatusCodes.BAD_REQUEST, 'The password reset link is invalid or has expired.');
  }

  const data = JSON.parse(rawData) as { userId: number };
  try {
    await UserService.updatePassword(data.userId, password);
  } catch (error) {
    console.error('Failed to update new password in DB:', error);
    throw new RouteError(HttpStatusCodes.INTERNAL_SERVER_ERROR, 'Internal server error. Failed to update password.');
  }

  await redis.del(redisKey);

  return res.status(HttpStatusCodes.OK).json({
    message: 'Your password has been successfully updated.'
  });
}

/**
 * Login user.
 * @route POST /api/auth/login
 */
async function login(req: Req, res: Res) {
  const { username, password } = reqValidators.login(req.body);
  const user = await AuthService.authenticate(username, password);
  if (!user) {
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, Errors.INVALID_CREDENTIALS);
  }
  const sessionUser: ISessionUser = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  const accessToken = JwtUtils.generateAccessToken(sessionUser);
  const refreshToken = JwtUtils.generateRefreshToken(sessionUser);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await AuthRepo.saveToken(sessionUser.userId, refreshToken, expiresAt);

  res.cookie('accessToken', accessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });
  res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });

  return res.status(HttpStatusCodes.OK).json({ message: 'Login successfully' });
}

/**
 * Refresh Access Token.
 * @route GET /api/auth/refresh
 */
async function refresh(req: Req, res: Res) {
  const refreshToken = req.cookies.refreshToken as string | undefined;

  if (!refreshToken) {
    throw new RouteError(HttpStatusCodes.UNAUTHORIZED, 'No refresh token provided');
  }
  const tokenDb = await AuthRepo.findToken(refreshToken);

  if (!tokenDb) {
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Session expired');
  }

  if (tokenDb.expires_at < new Date()) {
    await AuthRepo.deleteToken(refreshToken);
    throw new RouteError(HttpStatusCodes.FORBIDDEN, 'Session expired');
  }

  await JwtUtils.verifyToken(refreshToken, EnvVars.JwtRefreshTokenKey);

  const tokenUser = tokenDb.user as unknown as DBUserRelation;

  const sessionUser: ISessionUser = {
    userId: tokenUser.user_id,
    username: tokenUser.username,
    role: tokenUser.role,
  };
  
  const newAccessToken = JwtUtils.generateAccessToken(sessionUser);

  res.cookie('accessToken', newAccessToken, { ...COOKIE_OPTIONS, maxAge: 15 * 60 * 1000 });

  return res.status(HttpStatusCodes.OK).json({ message: 'Token refreshed' });
}

/**
 * Logout.
 * @route GET /api/auth/logout
 */
async function logout(req: Req, res: Res) {
  const refreshToken = req.cookies.refreshToken as string | undefined;
  if (refreshToken) {
    await AuthRepo.deleteToken(refreshToken);
  }
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
  return res.status(HttpStatusCodes.OK).end();
}

/******************************************************************************
                                Export default
******************************************************************************/

export default {
  login,
  refresh,
  logout,
  register,
  verifyEmail,
  forgotPassword,
  resetPassword,
  check
} as const;