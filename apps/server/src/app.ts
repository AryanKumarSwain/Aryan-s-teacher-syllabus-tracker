import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import session from 'express-session';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error-handler.js';
import { passport } from './config/passport.js';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
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
        sameSite: env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    }),
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 500,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  app.use('/api', apiRouter);

  app.use((_req, res) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
