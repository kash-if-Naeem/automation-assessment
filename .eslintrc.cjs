/** ESLint 8 config. Rules enforce the assessment's "no fixed sleeps" policy. */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: { node: true, es2022: true },
  ignorePatterns: ['node_modules', 'playwright-report', 'test-results', 'reports', '*.js', '*.cjs'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-restricted-properties': [
      'error',
      { property: 'waitForTimeout', message: 'No fixed sleeps: use web-first assertions.' },
    ],
  },
};
