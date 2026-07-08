/******************************************************************************
                                 Constants
******************************************************************************/

export const NodeEnvs = {
  DEV: 'development',
  TEST: 'test',
  PRODUCTION: 'production',
} as const;

type NodeEnvValue = typeof NodeEnvs[keyof typeof NodeEnvs];

function getStr(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env variable: ${key}`);
  return val;
}

function getNum(key: string): number {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env variable: ${key}`);
  const num = Number(val);
  if (isNaN(num)) throw new Error(`Env variable ${key} must be a number`);
  return num;
}

function getNodeEnv(key: string): NodeEnvValue {
  const val = process.env[key];
  const valid = Object.values(NodeEnvs) as string[];
  if (!val || !valid.includes(val)) {
    throw new Error(`Env variable ${key} must be one of: ${valid.join(', ')}`);
  }
  return val as NodeEnvValue;
}

/******************************************************************************
                                 Setup
******************************************************************************/

const EnvVars = {
  NodeEnv: getNodeEnv('NODE_ENV'),
  Port: getNum('PORT'),
  PostgresHost: getStr('POSTGRES_HOST'),
  PostgresPort: getNum('POSTGRES_PORT'),
  PostgresUser: getStr('POSTGRES_USER'),
  PostgresPassword: getStr('POSTGRES_PASSWORD'),
  PostgresDb: getStr('POSTGRES_DB'),
  DatabaseUrl: getStr('DATABASE_URL'),
  FrontendUrl: getStr('FRONTEND_URL'),
  JwtTokenKey: getStr('JWT_TOKEN_KEY'),
  JwtRefreshTokenKey: getStr('JWT_REFRESH_TOKEN_KEY'),
  MailUser: getStr('MAIL_USER'),
  MailPass: getStr('MAIL_PASS'),
};

/******************************************************************************
                            Export default
******************************************************************************/

export default EnvVars;