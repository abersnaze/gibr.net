import { propagateForward } from "./pipeline.js"
import type { Step } from "./model.js"

// Conservative cross-browser/cross-service URL length limit (IE capped at
// ~2083; many proxies, chat apps, and link previewers truncate around 2000)
const MAX_URL_LENGTH = 2000

// Build the shareable URL for the current chain, or null if it can't be
// represented (non-text initial input), there's nothing worth sharing yet,
// or the encoded state would make the URL too long.
//
// Shape: input=<step 0 content>&step=<transform id>&step=<transform id>...
// `opt` mirrors `step` one-for-one (empty string where a step has no
// options) and is only included at all when some step actually has one, so
// the common case with no per-step options stays a plain step= list.
export function buildShareableUrl(steps: Step[], baseUrl: string): string | null {
  const input = steps[0]?.content
  if (typeof input !== "string") return null

  const chain = steps.filter((step) => step.transform_id)
  if (chain.length === 0 && input === "") return null

  const params = new URLSearchParams()
  params.set("input", input)
  for (const step of chain) {
    params.append("step", step.transform_id as string)
  }
  if (chain.some((step) => step.options)) {
    for (const step of chain) {
      params.append("opt", step.options ?? "")
    }
  }

  const url = new URL(baseUrl)
  url.search = params.toString()

  return url.toString().length <= MAX_URL_LENGTH ? url.toString() : null
}

// Reconstruct the step chain from a URL's query string (e.g.
// `location.search`), or null if there's no `input` param or a transform id
// is unknown.
export function restoreStepsFromUrl(search: string): Step[] | null {
  const params = new URLSearchParams(search)
  if (!params.has("input")) return null

  const ids = params.getAll("step")
  const opts = params.getAll("opt")

  const steps: Step[] = ids.map((id, i) => ({
    content: "",
    curr: "TextDisplay",
    transform_id: id,
    options: opts[i] || undefined,
  }))
  steps.push({ content: "", curr: "TextDisplay", transform_id: null })
  steps[0].content = params.get("input") ?? ""

  return propagateForward(steps, 0)
}
