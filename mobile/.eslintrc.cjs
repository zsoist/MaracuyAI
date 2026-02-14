module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    es2022: true,
  },
  ignorePatterns: ['node_modules/', '.expo/'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
  },
};
