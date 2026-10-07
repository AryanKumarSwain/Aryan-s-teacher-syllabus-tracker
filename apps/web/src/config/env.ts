export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api',
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? 'School Syllabus Tracker',
};

export const getGoogleAuthUrl = (): string => {
  const base = (env.apiUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api').replace(/\/+$/, '');
  return base.endsWith('/api') ? `${base}/auth/google` : `${base}/api/auth/google`;
};

