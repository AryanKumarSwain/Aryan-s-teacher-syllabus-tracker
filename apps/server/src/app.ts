import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { passport } from './config/passport.js';
import { apiLimiter } from './middleware/rate-limiter.js';

export function createApp() {
  const app = express();

  // Trust proxy for reverse proxies (Nginx / Cloudflare / Caddy on VPS)
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Security headers with Helmet
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // Dynamic CORS origin handler (supports single origin, comma-separated origins, and localhost)
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    }),
  );

  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Session middleware for passport
  app.use(
    session({
      secret: env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Normalize duplicate /api prefixes if forwarded by proxy or client (e.g. /api/api/...)
  app.use((req, _res, next) => {
    if (req.url.startsWith('/api/api')) {
      req.url = req.url.replace(/^\/api\/api/, '/api');
    }
    next();
  });

  // Global API Rate Limiter
  app.use('/api', apiLimiter);

  app.use('/api', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
