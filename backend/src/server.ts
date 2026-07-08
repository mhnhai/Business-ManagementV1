import express, { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
// import logger from 'jet-logger';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import Paths from '@src/common/constants/Paths';
import { RouteError } from '@src/common/utils/route-errors';
import { getCorsOrigins } from '@src/common/utils/cors-origins';
import BaseRouter from '@src/routes/apiRouter';
import EnvVars, { NodeEnvs } from './common/constants/env';

/******************************************************************************
                                Setup
******************************************************************************/

const app = express();

app.set('trust proxy', 1); 

// **** Middleware **** //

const corsOrigins = getCorsOrigins();

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && corsOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization',
    );
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS',
    );
  }
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Show routes called in console during development
if (EnvVars.NodeEnv === NodeEnvs.DEV) {
  app.use(morgan('dev'));
}

// Security
if (EnvVars.NodeEnv === NodeEnvs.PRODUCTION) {
  app.use(helmet());
}


app.use(Paths._, BaseRouter);


app.use((err: Error, _: Request, res: Response, next: NextFunction) => {
  if (EnvVars.NodeEnv !== NodeEnvs.TEST.valueOf()) {
    console.error(err);
  }
  if (err instanceof RouteError) {
    res.status(err.status).json({ error: err.message });
  }
  return next(err);
});

/******************************************************************************
                                Export default
******************************************************************************/

export default app;
