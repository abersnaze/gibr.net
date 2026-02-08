# Design Guidelines for gibr.net Tools

Guidelines derived from the existing Convert and Minecraft Line tools. Follow these patterns when building new tools.

## Project Stack

- **Framework**: SvelteKit 2 with Svelte 5, static adapter (CSR only, no SSR)
- **Language**: TypeScript for models/logic, JavaScript acceptable in components
- **Styling**: Pure CSS with custom properties — no Tailwind, no UI framework
- **Font**: Inconsolata (monospace), loaded from `/public/inconsolata.ttf`
- **Build**: Vite 7, outputs to `/public/`
- **Formatting**: Prettier (100 char width, no semicolons, 2-space indent)

## File Organization

### Route Structure

Each tool gets a route directory under `src/routes/`:

```
src/routes/mytool/
  +page.svelte          # Thin route shell — imports the main component
  CLAUDE.md             # AI context doc (for complex tools)
```

Keep `+page.svelte` minimal. It should import and render a component, nothing more:

```svelte
<script>
  import MyTool from "../../mytool/MyTool.svelte"
</script>

<MyTool />
```

### Component Structure

Tool logic lives in a feature directory under `src/`:

```
src/mytool/
  MyTool.svelte         # Main component (state, layout, orchestration)
  SubComponent.svelte   # Child components as needed
  model.ts              # Types and interfaces (if the tool has a data model)
```

This separation keeps route files clean and components reusable. See `src/mc/` (Minecraft tools) and `src/routes/convert/` for examples.

### When to Split Files

- **Separate file**: Component exceeds ~200 lines, or is reused
- **Subdirectory**: 3+ related components (e.g., `display/` for display variants)
- **model.ts**: When you have 3+ type definitions or shared interfaces
- **Workers**: CPU-intensive analysis belongs in a Web Worker (see Convert's `transform.worker.js`)

## Page Layout

Every tool page follows this structure:

```svelte
<script>
  import Logo from "../home/Logo.svelte"
  document.title = "GIBR.net: Tool Name"
</script>

<main>
  <h1><Logo /> Tool Name</h1>
  <!-- tool content -->
</main>
```

Required elements:
- Set `document.title` to `"GIBR.net: Tool Name"`
- Wrap content in `<main>`
- `<h1>` with `<Logo />` prefix for consistent navigation back to home
- Use `<section>` to group logical areas with `<h2>` headings

### Registering the Tool

Add the tool to the home page in `src/home/Home.svelte`:

```svelte
<dl>
  <dt><a href="/mytool">My Tool</a></dt>
  <dd>Brief description of what it does</dd>
</dl>
```

## Styling

### Use CSS Custom Properties

All colors must come from the theme variables defined in `public/global.css`. Never hardcode colors.

```css
/* Good */
background-color: var(--bg-color);
color: var(--text-color);
border: 1px solid var(--border-color);

/* Bad */
background-color: #1a1a1a;
color: white;
```

Key variables:

| Variable | Purpose |
|---|---|
| `--bg-color` | Page/component background |
| `--text-color` | Primary text |
| `--text-secondary` | Secondary/muted text |
| `--border-color` | Borders and dividers |
| `--link-color` | Links |
| `--button-bg` | Button backgrounds |
| `--highlight-bg` / `--highlight-color` | Selected/active items |
| `--status-error-bg` / `--status-error-color` | Error states |

### Light/Dark Mode

The global CSS handles theming via `@media (prefers-color-scheme: dark)`. If you need new color variables, add both light and dark variants in `public/global.css` — not in component styles.

### Component-Scoped Styles

Use Svelte's `<style>` block (scoped by default). Only use `:global()` when absolutely necessary (e.g., styling slotted content).

### Responsive Design

Use flexbox layouts that adapt with `@media` queries. The Minecraft Line tool is a good reference:

```css
.content-container {
  display: flex;
  flex-direction: row;
  gap: 2rem;
}

@media (max-width: 768px) {
  .content-container {
    flex-direction: column;
  }
}
```

## State Management

### Prefer Simple Reactive Variables

Use Svelte's built-in reactivity. Reach for stores only when you need cross-component state that isn't easily passed via props.

```svelte
<!-- Simple state: reactive variables -->
let count = 0
$: doubled = count * 2

<!-- Cross-component state (rare): writable store + context -->
const myStore = writable(false)
setContext("myStore", myStore)
```

### State Persistence

Tools should persist user input so it survives page reloads. Two strategies, in priority order:

**1. URL parameters** (preferred for shareable state):
```js
import { replaceState } from "$app/navigation"

// Save to URL
const params = new URLSearchParams()
params.set("key", value)
replaceState({}, "", `${window.location.pathname}?${params}`)

// Load from URL on mount
onMount(() => {
  const params = new URLSearchParams(window.location.search)
  if (params.has("key")) {
    value = params.get("key")
  }
})
```

**2. localStorage** (for non-shareable or supplemental state):
```js
// Save
localStorage.setItem("tool-name-key", JSON.stringify(value))

// Load (with fallback to defaults)
const saved = localStorage.getItem("tool-name-key")
if (saved !== null) {
  try {
    value = JSON.parse(saved)
  } catch {
    // Use default
  }
}
```

Use both together: URL params take priority, localStorage is the fallback. Prefix localStorage keys with the tool name (e.g., `minecraft-line-start`).

### Guard Reactive Persistence

Use an `initialized` flag to prevent writing default values to storage before loading saved values:

```svelte
let initialized = false

onMount(() => {
  // ... load saved state ...
  initialized = true
})

$: {
  if (initialized && typeof window !== "undefined") {
    // Safe to persist now
  }
}
```

## Input Handling

- Use `bind:value` for two-way binding on inputs
- Use `type="number"` for numeric inputs
- Label all inputs with `<label for="id">` and matching `id` attributes
- Debounce expensive computations triggered by input (100ms is the convention, see TextDisplay)

## Error Handling

- Wrap transform/computation logic in `try-catch`
- Show errors inline near the relevant input, not in alerts or modals
- Use `--status-error-bg` and `--status-error-color` for error styling
- Log debug info with prefixed `console.debug()` (e.g., `[ToolName] message`)
- Let Sentry catch unhandled errors automatically (no manual Sentry calls needed)

## Performance

- **Web Workers**: Use for CPU-intensive analysis that could block the UI (see `transform.worker.js`)
- **Batch rendering**: For large lists, render in batches (see TreeDisplay's 100-item batches)
- **Debounce input**: Don't recompute on every keystroke
- **Pause reactivity**: Use a flag to prevent cascading updates during bulk operations

## Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Components | PascalCase | `TextDisplay.svelte` |
| Route directories | kebab-case | `src/routes/my-tool/` |
| Feature directories | lowercase | `src/mytool/` |
| Functions | camelCase | `handleUpdate()` |
| Variables | camelCase | `allPoints` |
| Constants | UPPER_SNAKE_CASE | `SPINNER_DELAY` |
| IDs/keys | snake_case | `json_parse`, `base64_encode` |
| CSS classes | kebab-case | `.content-container` |
| localStorage keys | kebab-case with tool prefix | `minecraft-line-start` |

## External Links

Use the `external` CSS class for links that leave the site:

```html
<a class="external" href="https://example.com">Example</a>
```

This adds an external link icon via `background-image`.

## Dependencies

Keep dependencies minimal. The site currently uses very few runtime dependencies:
- `base-58`, `yaml` — small, purpose-built libraries for specific transforms
- `@sentry/sveltekit` — error tracking

Before adding a dependency, consider whether the functionality can be implemented in a few lines of code. Prefer browser APIs and small focused libraries over large frameworks.

## Documentation

For complex tools with extensible architectures, add a `CLAUDE.md` in the route directory covering:
- Architecture overview
- Key interfaces and data flow
- How to extend the tool (add transforms, display modes, etc.)
- Common patterns and gotchas

See `src/routes/convert/CLAUDE.md` for the reference example.

## Checklist for New Tools

1. Create route directory: `src/routes/toolname/+page.svelte`
2. Create feature directory: `src/toolname/ToolName.svelte`
3. Set `document.title` and add `<Logo />` in `<h1>`
4. Add tool to `src/home/Home.svelte` navigation
5. Use CSS custom properties for all colors
6. Persist user state (URL params and/or localStorage)
7. Guard persistence behind `initialized` flag
8. Handle errors gracefully with inline feedback
9. Test in both light and dark mode
10. Test mobile layout (stack vertical at 768px)
11. Add `CLAUDE.md` if the tool has extensible architecture
