import { createApp } from './app.js';
import { env } from './config/env.js';
import { verifyEmailTransport } from './emails/email.service.js';

const app = createApp();

void verifyEmailTransport();

app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
  console.log(`📚 API: http://localhost:${env.PORT}/api`);
});
