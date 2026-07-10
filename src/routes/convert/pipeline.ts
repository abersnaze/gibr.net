import { analyze, defaultOpts } from "./transforms/index.js"
import type { Content, DisplayName, Step, Success } from "./model.js"

// Result of applying a transform, as dispatched by Step.svelte
export type StepResult = Success & { nextComponent?: DisplayName }

// An update event from a step: the user selected/changed a transform
// (result set) or edited the step's content (result null)
export interface StepUpdate {
  index: number
  result: StepResult | null
  clearSubsequent: boolean
}

// Re-run the transform selected on a step against its current content
export function reapplyTransform(step: Step): StepResult | null {
  const opts = { ...defaultOpts }
  if (step.transform_id && step.options) {
    opts[step.transform_id] = step.options
  }

  const results = analyze(step, opts)
  const result = results.find((r) => r.from_id === step.transform_id)
  return result && result.content !== undefined
    ? {
        score: result.score || 0,
        content: result.content,
        inverse: result.inverse,
        nextComponent: result.display,
      }
    : null
}

function emptyContentFor(display: DisplayName): Content {
  return display === "TextDisplay" ? "" : new Uint8Array(0)
}

// Empty out content and transform selection of every step from `from` on
function clearFrom(steps: Step[], from: number): void {
  for (let j = from; j < steps.length; j++) {
    steps[j] = {
      ...steps[j],
      content: emptyContentFor(steps[j].curr),
      transform_id: null,
    }
  }
}

// Re-apply each step's selected transform in order, starting at startIndex.
// Steps after a blank input or failed transform are cleared; the chain is
// truncated at the first step without a transform selected.
// Returns a new array; the input array and its steps are not modified.
export function propagateForward(steps: Step[], startIndex: number): Step[] {
  const result = [...steps]
  for (let i = startIndex; i < result.length - 1; i++) {
    const currentStep = result[i]

    if (!currentStep.transform_id) {
      // No transform selected — the chain ends here
      return result.slice(0, i + 1)
    }

    const isBlank =
      !currentStep.content ||
      (typeof currentStep.content === "string" && currentStep.content.trim() === "")
    if (isBlank) {
      clearFrom(result, i + 1)
      break
    }

    const next = reapplyTransform(currentStep)
    if (next && next.content !== undefined) {
      result[i] = { ...currentStep, inverse: next.inverse }
      result[i + 1] = {
        ...result[i + 1],
        content: next.content,
        curr: next.nextComponent || "TextDisplay",
      }
    } else {
      // Transform failed — downstream content is stale, clear it
      clearFrom(result, i + 1)
      break
    }
  }
  return result
}

// Walk stored inverses backward from the edited step to step 0, then re-apply
// all transforms forward so every step reflects the edit. The backward walk
// stops at the first step without a stored inverse.
// Returns a new array; the input array and its steps are not modified.
export function applyInverse(steps: Step[], editedIndex: number): Step[] {
  const result = [...steps]
  for (let i = editedIndex - 1; i >= 0; i--) {
    const currentStep = result[i]
    const nextStep = result[i + 1]

    if (!currentStep.transform_id || !currentStep.inverse) {
      break // Can't go further backwards
    }

    try {
      // Options tell inverses like substring_select where to reinsert content
      const newContent = currentStep.inverse(nextStep.content, currentStep.options)
      result[i] = { ...currentStep, content: newContent }
    } catch (error) {
      console.error(`[pipeline] inverse of ${currentStep.transform_id} at step ${i} failed:`, error)
      break
    }
  }
  return propagateForward(result, 0)
}

// Apply an update event from a step to the whole chain.
// Returns a new array; the input array and its steps are not modified.
export function applyStepUpdate(steps: Step[], update: StepUpdate): Step[] {
  const { index, result, clearSubsequent } = update

  // Transform failed or was unselected — drop the steps derived from it
  if (clearSubsequent && !result) {
    return steps.slice(0, index + 1)
  }

  if (steps[index].transform_id && result) {
    const appended: Step = {
      content: result.content,
      curr: result.nextComponent || "TextDisplay",
      transform_id: null,
      inverse: undefined,
    }

    // The transform changed — subsequent steps no longer apply
    if (clearSubsequent && index < steps.length - 1) {
      return [...steps.slice(0, index + 1), appended]
    }

    // Transform selected on the last step — extend the chain
    if (index === steps.length - 1) {
      return [...steps, appended]
    }

    // New result for a step with existing children — update the next step
    // (keeping its transform selection) and re-apply the chain after it
    const updated = [...steps]
    updated[index + 1] = {
      ...updated[index + 1],
      content: result.content,
      curr: result.nextComponent || "TextDisplay",
    }
    return propagateForward(updated, index + 1)
  }

  // Content was edited without a transform selection
  if (!result) {
    if (index > 0) {
      return applyInverse(steps, index)
    }
    if (index === 0 && steps.length > 1) {
      return propagateForward(steps, 0)
    }
  }

  return [...steps]
}
