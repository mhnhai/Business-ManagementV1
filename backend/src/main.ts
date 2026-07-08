import EnvVars from './common/constants/env';
import app from './server';

const SERVER_START_MESSAGE = 'Express server started on port: ' + EnvVars.Port.toString();

if (process.env.NODE_ENV !== 'production') {
  app.listen(EnvVars.Port, () => {
    console.info(SERVER_START_MESSAGE);
  });
}

export default app;
module.exports = app;