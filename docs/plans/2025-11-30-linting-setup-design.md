# Linting Setup Design

**Date:** 2025-11-30
**Goal:** Add comprehensive linting and formatting to the gibr.net SvelteKit project

## Requirements

- Catch bugs and errors early (ESLint)
- Enforce consistent code style (Prettier)
- Balanced strictness (recommended presets, not strict)
- Multiple workflow integrations: pre-commit hooks, manual scripts, VS Code

## Tools & Dependencies

### ESLint Ecosystem

- `eslint` - Core linter
- `typescript-eslint` - TypeScript-specific rules and parser
- `eslint-plugin-svelte` - Svelte-specific linting rules
- `svelte-eslint-parser` - Parses `.svelte` files for ESLint

### Prettier Ecosystem

- `prettier` - Code formatter
- `prettier-plugin-svelte` - Svelte file formatting

### Integration Tools

- `eslint-config-prettier` - Disables ESLint rules that conflict with Prettier
- `husky` - Git hooks manager
- `lint-staged` - Runs linters on staged files only

### Division of Responsibilities

- **ESLint:** Logic and correctness (unused vars, type errors, potential bugs)
- **Prettier:** Formatting (spacing, quotes, line breaks)
- **Integration package:** Prevents conflicts between tools

## ESLint Configuration

**File:** `/eslint.config.js` (flat config format)

### Configuration Layers

1. `@eslint/js` recommended rules (base)
2. `typescript-eslint` recommended rules (TypeScript files)
3. `eslint-plugin-svelte` recommended rules (`.svelte` files)

### Features

- Glob patterns for different file types
- TypeScript rules for `.ts` and `.svelte` files
- Svelte rules for `.svelte` files only
- Parser configured for ES2022 + modules
- Ignores: `node_modules`, `.svelte-kit`, build output

### Issues Caught

- Unused variables and imports
- Missing type annotations
- Potential null/undefined errors
- Svelte-specific problems (reactive statements, store usage)

## Prettier Configuration

**Files:**

- `/.prettierrc` - Configuration
- `/.prettierignore` - Ignore patterns

### Settings

- **Semi-colons:** No
- **Quotes:** Double
- **Tab width:** 2 spaces
- **Trailing commas:** ES5
- **Print width:** 100 characters
- **Svelte-specific:** Sort order for script/markup/style sections

### Rationale

- Matches Svelte community conventions
- Aligns with existing project code style
- Opinionated enough to prevent bikeshedding

### Ignored Paths

- `node_modules`
- `.svelte-kit`
- `build`, `public`
- Lock files

## NPM Scripts

Add to `package.json`:

### Linting

- `"lint"` - Report linting issues
- `"lint:fix"` - Auto-fix linting issues

### Formatting

- `"format"` - Format all files
- `"format:check"` - Check formatting (CI-friendly, no changes)

### Combined

- `"check"` - Run both lint and format:check

### Target Patterns

- All `.js`, `.ts`, `.svelte` in `src/`
- Config files in root
- Exclude: `node_modules`, `.svelte-kit`, `build`, `public`

## Pre-commit Hooks

**Tools:** husky + lint-staged

### Flow

1. Developer runs `git commit`
2. Husky intercepts with pre-commit hook
3. `lint-staged` identifies staged files
4. Runs ESLint + Prettier on staged files only
5. Auto-fixes applied and re-staged
6. Unfixable errors block commit

### Configuration

**In package.json:**

```json
"lint-staged": {
  "*.{js,ts,svelte}": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

### Setup

- Install dependencies
- Run `npx husky init`
- Configure `.husky/pre-commit` to run `npx lint-staged`
- Add `prepare` script to run `husky install`

### Benefits

- Prevents committing broken/unformatted code
- Fast (only lints changed files)
- Automatic fixes where possible
- Works for all team members after `npm install`

### Bypass

Use `git commit --no-verify` for emergencies (adds ~1-3s to commits)

## VS Code Integration

**Files:**

- `/.vscode/settings.json` - Editor settings
- `/.vscode/extensions.json` - Recommended extensions

### Settings

- Format on save: Enabled (Prettier)
- Default formatter: Prettier for JS/TS/Svelte
- ESLint auto-fix on save: Enabled
- Svelte plugin configured for Prettier

### Benefits

- Automatic formatting and fixes on save
- Real-time error feedback (red squiggles)
- No manual commands needed during development
- Consistent with CLI and pre-commit hooks

### Recommended Extensions

- `dbaeumer.vscode-eslint` - ESLint integration
- `esbenp.prettier-vscode` - Prettier integration
- `svelte.svelte-vscode` - Svelte language support

### Editor Agnostic

Non-VS Code users can still use CLI scripts and pre-commit hooks

## Summary

This setup provides three layers of linting enforcement:

1. **Development (VS Code):** Immediate feedback, auto-fix on save
2. **Manual (npm scripts):** Explicit control when needed
3. **Pre-commit (husky):** Safety net preventing bad commits

All three layers use the same tools and configuration, ensuring consistency across workflows and team members.
