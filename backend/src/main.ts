import EnvVars from './common/constants/env';
import app from './server';

const SERVER_START_MESSAGE = 'Express server started on port: ' + EnvVars.Port.toString();

// Vercel serverless exports app only; Render/Railway need an HTTP listener.
if (!process.env.VERCEL) {
  app.listen(EnvVars.Port, () => {
    console.info(SERVER_START_MESSAGE);
  });
}

export default app;
module.exports = app;