import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import { env } from './env.js';
import { prisma } from '@school-syllabus/database';
import { AppError } from '../middleware/error-handler.js';
import bcrypt from 'bcryptjs';

if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: env.GOOGLE_CALLBACK_URL,
        proxy: true,
      },
      async (
        _accessToken: string,
        _refreshToken: string,
        profile: Profile,
        done: (error: any, user?: any, info?: any) => void,
      ) => {
        try {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            return done(new AppError('No email found in Google profile', 400));
          }

          // Check if user exists
          let user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() },
          });

          if (user) {
            // User exists, return them
            return done(null, user);
          }

          // For new users, create a temporary user with minimal data
          // They will be redirected to complete their profile
          const passwordHash = await bcrypt.hash(Math.random().toString(36).slice(-8), 12);

          user = await prisma.user.create({
            data: {
              email: email.toLowerCase(),
              name: (profile.displayName ||
                profile.name?.givenName ||
                email.split('@')[0]) as string,
              passwordHash,
              role: 'SCHOOL_ADMIN', // Default role for new Google users
              phone: null, // Will be filled in complete profile
            },
          });

          // Mark this user as newly-created so the callback can prompt for
          // additional profile info (school name, phone) only for new users.
          return done(null, user, { isNew: true });
        } catch (error) {
          return done(error);
        }
      },
    ),
  );
}

passport.serializeUser((user: any, done: (err: any, id?: string) => void) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done: (err: any, user?: any) => void) => {
  try {
    const user = await prisma.user.findUnique({ where: { id } });
    done(null, user);
  } catch (error) {
    done(error);
  }
});

export { passport };
