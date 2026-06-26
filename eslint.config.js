import js from '@eslint/js';

export default [
  {
    // Ignore the auto-generated Prisma/database client
    ignores: ['packages/database/src/generated/**/*'],
  },
  js.configs.recommended,
];
