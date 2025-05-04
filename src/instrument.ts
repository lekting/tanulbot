import * as Sentry from '@sentry/node';
import { SENTRY_DSN } from './config';

Sentry.init({
  dsn: SENTRY_DSN,
  tracesSampleRate: 1.0
});
