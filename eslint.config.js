import js from '@eslint/js'
import globals from 'globals'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

const reactRules = {
  ...reactHooks.configs.recommended.rules,
  'react-refresh/only-export-components': [
    'warn',
    { allowConstantExport: true },
  ],
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', '.build-check', 'venv'] },
  {
    // El código de la app es JS/JSX: antes solo se analizaban archivos TS/TSX
    // y App.jsx quedaba ignorado (auditoría 2026-10-02, H23).
    extends: [js.configs.recommended],
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactRules,
      // Marca como usadas las variables referenciadas desde JSX (<Icon />),
      // que ESLint core no rastrea.
      'react/jsx-uses-vars': 'error',
      // El código importa React explícitamente en cada componente (estilo clásico).
      'react/jsx-uses-react': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{test,spec}.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: reactRules,
  },
)
