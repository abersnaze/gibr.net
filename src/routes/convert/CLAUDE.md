# Convert Tool - Bi-directional Transform Pipeline

This directory contains a composable, bi-directional data transformation tool that allows users to build layered transformation pipelines with real-time editing at any stage.

## Overview

The Convert tool enables users to chain multiple data transformations together (e.g., base64 decode → UTF-8 decode → JSON parse) and edit the data at any step, with changes automatically propagating both forward and backward through the transformation chain.

## Architecture

### Core Components

- **model.ts**: Type definitions for the transform system
  - `Content` types: TextContent (string/number/boolean), BinaryContent (Uint8Array), TreeContent (object)
  - `Transform` interface: Defines how transforms analyze and convert data
  - `Step` interface: Represents a single transformation step in the chain
  - `Display` types: Three display modes for different content types

- **Convert.svelte**: Main orchestrator component (src/convert/Convert.svelte)
  - Manages the array of transformation steps
  - Handles forward propagation when transforms are applied
  - Handles backward propagation using inverse transforms when content is edited
  - Implements `handleUpdate()`, `applyInverseTransforms()`, and `propagateForward()` logic

- **Step.svelte**: Individual transformation step component (src/convert/Step.svelte)
  - Displays current step content (editable via display component)
  - Shows available transforms with confidence scores
  - Handles transform selection and content changes
  - Dispatches updates to parent Convert component

- **transforms/**: Transform implementations
  - Each transform exports a Record<string, Transform> with encode/decode variants
  - Transforms include: base64, base58, base16, utf8, JSON, YAML, jsonpath, substring, URI, UUID, dates
  - **index.ts**: Aggregates all transforms and provides the `analyze()` function

- **display/**: Content display components
  - **TextDisplay.svelte**: For string/number/boolean content (editable textarea)
  - **BinaryDisplay.svelte**: For Uint8Array binary data
  - **TreeDisplay.svelte**: For object/JSON tree structures

### Key Data Flow

1. **Forward Propagation (Transform Application)**:
   - User selects a transform on step N (explicit menu selection)
   - OR user clicks a key/value in TreeDisplay (implicit jsonpath selection)
   - Transform's `analyze()` function runs on step N's content
   - Result creates step N+1 with transformed content
   - If intermediate step is changed, all subsequent steps are re-transformed

2. **Backward Propagation (Inverse Transform)**:
   - User edits content at step N (N > 0)
   - System walks backward through steps N-1, N-2, ... 0
   - For each step, calls the transform's `invert(output, originalInput, options)`
     with the step's own content as originalInput
   - Changes propagate to original input (step 0)
   - Then re-applies all transforms forward from step 0

3. **Transform Compatibility**:
   - Transforms specify their compatible input type via the `prev` property
   - Only transforms matching the current step's display type are shown
   - Scores are normalized and displayed as percentages to guide user selection

4. **Interactive Path Selection (JSONPath)**:
   - When viewing JSON/object data in TreeDisplay, keys and values are clickable
   - Clicking a **key** extracts the value at that key (creates new step)
   - Clicking a **value** extracts that specific value (creates new step)
   - This implicitly applies the `jsonpath_select` transform with the computed path
   - The selected path is stored in `step.options` for forward/backward propagation
   - JSONPath transform is hidden from the explicit transform menu

## Transform Interface

Each transform must implement the `Transform` interface:

```typescript
interface Transform {
  name: string // Display name (e.g., "Base 64", "JSON")
  prev: DisplayName // Compatible input display type
  analyze: (input: unknown, options?: string) => Result
  invert?: (output: Content, originalInput: Content, options?: string) => Content
  optionsComponent?: Component // Optional UI for transform options
  defaults?: string // Default options
}
```

The `analyze()` function returns:

- **Success**: `{ score: number, content: Content, options?: string }`
- **Failure**: `{ message: any }` (score defaults to 0)

Results are plain data (no functions) so they can cross the web worker
boundary unchanged.

### Transform Scoring Guidelines

Scores indicate confidence that the transform is appropriate for the input:

- **2.0**: Very sure this is the intended format (e.g., valid UUID with correct structure)
- **1.0**: It works, but not sure if this is the best interpretation
- **<1.0**: It works, but there is probably a better option (e.g., 0.75 for YAML on plain text, 0.1 for URI encode when nothing would change)

### Implementing invert

For bi-directional editing to work, transforms should provide a static `invert`
function alongside `analyze`:

```typescript
analyze: (data: unknown) => {
  if (typeof data !== "string") {
    return { score: 0.0, message: `Expected string, got ${typeof data}` }
  }
  return { score: 2.0, content: JSON.parse(data) }
},
// object -> JSON text
invert: (output: Content) => {
  return JSON.stringify(output, undefined, 2)
},
```

**Important**:

- `invert` receives the (possibly edited) **output** content, the
  **originalInput** that produced it, and the step's options; it returns the
  new **input** content
- It must be **stateless**: derive everything from those three arguments,
  never from closures — analyze results must stay serializable across the
  worker boundary (see `substring.ts` and `jsonpath.ts` for transforms that
  use `originalInput` and `options`)
- Not all transforms need `invert`, but without it, backward propagation stops
  at that step

## Testing (required for all transform changes)

Run `npm test` (or `npx vitest` for watch mode). The conformance suite at
`transforms/__tests__/conformance.test.ts` automatically checks **every**
registered transform:

- **Coverage**: every transform id must have a fixture entry, and every fixture
  must match a registered transform. Adding a transform without fixtures fails
  the suite with the missing id.
- **Robustness**: `analyze()` must never throw, for any input type. Wrap risky
  work in try/catch and return `{ score: 0, message }`.
- **Fixture cases**: each fixture's `valid` cases assert the expected content,
  display type, minimum score, and that `invert(content, input, options)`
  reproduces the input (or its documented normalization via `roundTrip`).
  `invalid` cases assert failure with a message.

To add fixtures: create `transforms/__tests__/fixtures/<name>.ts` exporting
`Record<transformId, TransformFixture>` (see `fixtures/types.ts` for the case
shape), then import and merge it into the `fixtures` object in
`conformance.test.ts`. Never weaken or delete existing fixture cases to make a
change pass — a failing round-trip means the transform or its inverse is wrong.

## Adding New Transforms

To add a new transform:

1. Create a new file in `transforms/` (e.g., `myTransform.ts`)
2. Export a Record<string, Transform> with your transform(s)
3. Import and add to the transforms object in `transforms/registry.ts` (the
   single registry shared by the UI, the worker, and the tests; it must stay
   free of Svelte imports — UI attachment happens in `transforms/index.ts`)
4. Provide both encode and decode variants if applicable
5. Implement `invert` for bi-directional editing support
6. Add fixture cases in `transforms/__tests__/fixtures/` (see Testing above) —
   the conformance suite fails until you do

Example:

```typescript
import { type Transform, type Content } from "../model"

const transforms: Record<string, Transform> = {
  my_transform: {
    name: "My Transform",
    prev: "TextDisplay",
    analyze: (data: unknown) => {
      try {
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }
        return { score: 1.0, content: transformData(data) }
      } catch (error) {
        return { score: 0.0, message: error.message }
      }
    },
    invert: (output: Content) => reverseTransform(output),
  },
}

export default transforms
```

## Display Components

Display components must:

- Accept a `content` prop (bindable)
- Dispatch `content-change` events when edited
- Handle their specific content type (string, Uint8Array, or object)
- See TextDisplay.svelte:22-47 for the content change handling pattern

## Transform Scoring

Transforms return a score (0.0 = failure, > 0.0 = success):

- Scores are normalized across all compatible transforms
- Higher scores appear first in the UI
- Scores displayed as percentages (e.g., "95% JSON")
- Use higher scores for more likely/better matches

## Implementation Notes

### Error Handling

- Failed transforms return `{ score: 0.0, message: errorMessage }`
- Error messages are displayed below the transform selection
- Failed transforms don't create new steps

### Reactivity

- Svelte's reactivity tracks the `steps` array
- Always reassign `steps = [...steps]` after mutations for reactivity
- The `analyze()` function is reactive: `$: results = analyze(step, options)`

### Options

- Transforms can provide an `optionsComponent` for custom configuration UI
- Default options are stored in `defaultOpts` object in transforms/index.ts
- Options are passed to the `analyze()` function

### Content Types

- **Text**: String, number, or boolean values (displayed in textarea)
- **Binary**: Uint8Array (displayed as hex/binary)
- **Tree**: Objects and arrays (displayed as expandable JSON tree)

## Common Patterns

### Chaining Transforms

Example: Decode base64-encoded JSON:

1. Step 0: Input base64 string (TextDisplay)
2. Select "Base 64" transform → Step 1: Binary data (BinaryDisplay)
3. Select "UTF-8" transform → Step 2: JSON string (TextDisplay)
4. Select "JSON" transform → Step 3: Parsed object (TreeDisplay)

### Interactive Path Selection

Example: Extract a value from parsed JSON:

1. Step 0: Input JSON string `{"id": "foo", "payload": "YXNkZg=="}`
2. Select "JSON" transform → Step 1: Parsed object (TreeDisplay with clickable keys/values)
3. Click the **"payload"** key → Step 2: TextDisplay showing `"YXNkZg=="`
4. Select "Base 64" transform → Step 3: Binary data (BinaryDisplay)

The path selection creates an implicit `jsonpath_select` transform with path `.payload`.

### Editing and Inverse Propagation

1. Edit the parsed object at Step 3
2. System applies inverse: object → JSON string (Step 2)
3. System applies inverse: JSON string → UTF-8 bytes (Step 1)
4. System applies inverse: UTF-8 bytes → base64 string (Step 0)
5. All steps update to reflect the change

## Files Reference

- **model.ts**: Core type system
- **Convert.svelte**: Main pipeline orchestrator with bi-directional logic
- **Step.svelte**: Individual step UI and transform selection
- **transforms/index.ts**: Transform registry and analyze function
- **transforms/base64.ts**: Example of binary↔text transforms with inverses
- **transforms/json.ts**: Example of tree↔text transforms with inverses
- **display/TextDisplay.svelte**: Editable text display with debounced change events

## Development Guidelines

1. **Always implement `invert`** for transforms when possible — stateless, no closures
2. **Test both directions**: Ensure `invert(analyze(x).content, x, options)` yields `x` (the conformance suite enforces this via fixtures)
3. **Use appropriate content types**: Choose the right display type for your transform's output
4. **Provide meaningful scores**: Help users select the right transform
5. **Handle edge cases**: Empty content, invalid input, type mismatches
6. **Add options when needed**: Use `optionsComponent` for configurable transforms (see epoch_to_date in date.ts)
7. **Follow naming conventions**: Use descriptive transform IDs like `json_parse` and `json_stringify`
8. **Store transform options**: Use `step.options` to persist transform-specific options for propagation
9. **Interactive displays**: Display components can emit custom events (like `path-select`) for implicit transforms
10. **Hide implicit transforms**: Use template filtering (like in Step.svelte) to hide transforms from the UI menu when they should only be triggered programmatically
