import jsonwebtoken from 'jsonwebtoken';
import EnvVars from '@src/common/constants/env';
import { ISessionUser } from '@src/models/common/types';

function generateAccessToken(user: ISessionUser): string {
  return jsonwebtoken.sign(user, EnvVars.JwtTokenKey, { 
    expiresIn: '15m' 
  });
}

function generateRefreshToken(user: ISessionUser): string {
  return jsonwebtoken.sign({ userId: user.userId }, EnvVars.JwtRefreshTokenKey, { 
    expiresIn: '7d' 
  });
}

function verifyToken<T>(token: string, secretKey: string): Promise<T> {
  return new Promise((res, rej) => {
    jsonwebtoken.verify(token, secretKey, (err, decoded) => {
      return err ? rej(err) : res(decoded as T);
    });
  });
}

function decodeAccessToken(token: string): ISessionUser {
  return jsonwebtoken.verify(token, EnvVars.JwtTokenKey) as ISessionUser;
}

export default { generateAccessToken, generateRefreshToken, verifyToken,decodeAccessToken } as const;