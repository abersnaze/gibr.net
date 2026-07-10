import { describe, it, expect } from "vitest"
import { applyStepUpdate } from "../pipeline.js"
import { analyze, defaultOpts } from "../transforms/index.js"
import { bytesToBase64 } from "../transforms/base64.js"
import type { Content, Step } from "../model.js"

const b64 = (s: string) => bytesToBase64(new TextEncoder().encode(s))

function textStep(content: Content): Step {
  return { content, curr: "TextDisplay", transform_id: null }
}

// Simulate the user picking a transform on a step, as Step.svelte does:
// analyze the content, store the selection on the step, dispatch the result
function selectTransform(
  steps: Step[],
  index: number,
  transformId: string,
  options?: string,
  clearSubsequent = false
): Step[] {
  const updated = [...steps]
  const step: Step = { ...updated[index], transform_id: transformId, options }

  const opts = { ...defaultOpts }
  if (options !== undefined) {
    opts[transformId] = options
  }
  const result = analyze(step, opts).find((r) => r.from_id === transformId)
  if (!result || result.content === undefined) {
    throw new Error(`transform ${transformId} failed: ${String(result?.message)}`)
  }

  updated[index] = step
  return applyStepUpdate(updated, {
    index,
    result: {
      score: result.score,
      content: result.content,
      nextComponent: result.display,
    },
    clearSubsequent,
  })
}

// Simulate the user editing a step's content (a display dispatching
// content-change with no transform result)
function editContent(steps: Step[], index: number, content: Content): Step[] {
  const updated = [...steps]
  updated[index] = { ...updated[index], content }
  return applyStepUpdate(updated, { index, result: null, clearSubsequent: false })
}

// base64(json) → bytes → json text → parsed tree
function buildB64JsonChain(json: string): Step[] {
  let steps: Step[] = [textStep(b64(json))]
  steps = selectTransform(steps, 0, "b64_decode")
  steps = selectTransform(steps, 1, "utf8_decode")
  steps = selectTransform(steps, 2, "json_parse")
  return steps
}

describe("building a chain forward", () => {
  it("base64 → utf8 → json produces a 4-step chain", () => {
    const steps = buildB64JsonChain('{"a":1}')
    expect(steps).toHaveLength(4)
    expect(steps[1].curr).toBe("BinaryDisplay")
    expect(steps[2].content).toBe('{"a":1}')
    expect(steps[2].curr).toBe("TextDisplay")
    expect(steps[3].content).toEqual({ a: 1 })
    expect(steps[3].curr).toBe("TreeDisplay")
  })

  it("editing the only step with no transform selected keeps a single step", () => {
    let steps = [textStep("hello")]
    steps = editContent(steps, 0, "world")
    expect(steps).toHaveLength(1)
    expect(steps[0].content).toBe("world")
  })
})

describe("editing step 0 propagates forward", () => {
  it("re-derives all downstream steps", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = editContent(steps, 0, b64('{"b":5}'))
    expect(steps).toHaveLength(4)
    expect(steps[2].content).toBe('{"b":5}')
    expect(steps[3].content).toEqual({ b: 5 })
  })

  it("clears downstream steps when content becomes blank", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = editContent(steps, 0, "")
    expect(steps).toHaveLength(4)
    expect(steps[1].transform_id).toBeNull()
    expect(steps[1].content).toEqual(new Uint8Array(0))
    expect(steps[2].transform_id).toBeNull()
    expect(steps[2].content).toBe("")
  })

  it("clears downstream steps when the transform fails on the new content", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = editContent(steps, 0, "!!! not base64 !!!")
    expect(steps).toHaveLength(4)
    expect(steps[1].transform_id).toBeNull()
    expect(steps[1].content).toEqual(new Uint8Array(0))
  })
})

describe("editing a downstream step propagates backward then forward", () => {
  it("editing the parsed tree updates the original base64", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = editContent(steps, 3, { a: 2 })

    // json_parse's inverse re-indents, so step 0 holds the pretty-printed form
    const pretty = '{\n  "a": 2\n}'
    expect(steps[0].content).toBe(b64(pretty))
    expect(steps[2].content).toBe(pretty)
    expect(steps[3].content).toEqual({ a: 2 })
  })

  it("editing a middle step updates both directions", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = editContent(steps, 2, '{"c":3}')
    expect(steps[0].content).toBe(b64('{"c":3}'))
    expect(steps[3].content).toEqual({ c: 3 })
  })
})

describe("transforms with options", () => {
  it("jsonpath selection round-trips an edit into the original object", () => {
    let steps: Step[] = [{ content: { a: { b: 1 } }, curr: "TreeDisplay", transform_id: null }]
    steps = selectTransform(steps, 0, "jsonpath_select", ".a.b")
    expect(steps).toHaveLength(2)
    expect(steps[1].content).toBe(1)

    steps = editContent(steps, 1, 2)
    expect(steps[0].content).toEqual({ a: { b: 2 } })
    expect(steps[1].content).toBe(2)
  })

  it("substring selection round-trips an edit into the surrounding text", () => {
    let steps: Step[] = [textStep("hello world")]
    steps = selectTransform(steps, 0, "substring_select", JSON.stringify({ start: 6, end: 11 }))
    expect(steps[1].content).toBe("world")

    steps = editContent(steps, 1, "there")
    expect(steps[0].content).toBe("hello there")
  })
})

describe("transform selection changes", () => {
  it("unselecting a transform truncates the chain", () => {
    let steps = buildB64JsonChain('{"a":1}')
    const updated = [...steps]
    updated[1] = { ...updated[1], transform_id: null }
    steps = applyStepUpdate(updated, { index: 1, result: null, clearSubsequent: true })
    expect(steps).toHaveLength(2)
  })

  it("changing a transform mid-chain replaces the downstream steps", () => {
    let steps = buildB64JsonChain('{"a":1}')
    steps = selectTransform(steps, 2, "utf8_encode", undefined, true)
    expect(steps).toHaveLength(4)
    expect(steps[3].curr).toBe("BinaryDisplay")
    expect(steps[3].transform_id).toBeNull()
  })
})

describe("purity", () => {
  it("does not mutate the input steps or their objects", () => {
    const steps = buildB64JsonChain('{"a":1}')
    const snapshot = steps.map((s) => ({ ...s }))

    editContent(steps, 3, { a: 9 })

    steps.forEach((s, i) => {
      expect(s.content).toEqual(snapshot[i].content)
      expect(s.transform_id).toBe(snapshot[i].transform_id)
      expect(s.curr).toBe(snapshot[i].curr)
    })
  })
})
