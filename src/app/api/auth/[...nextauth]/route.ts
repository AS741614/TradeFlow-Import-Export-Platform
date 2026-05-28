import { GET as authGET, POST as authPOST } from '@/lib/auth';
import { withRateLimit } from '@/lib/rate-limiter';

// Apply rate limiting to POST (sign-in callback) requests: 5 attempts per 15 minutes
export const GET = authGET;
export const POST = withRateLimit(authPOST, {
  keyPrefix: 'signin',
  limit: 5,
  windowMs: 15 * 60 * 1000,
  onlyMethods: ['POST'],
});
