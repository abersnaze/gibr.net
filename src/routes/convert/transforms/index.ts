// Import all transforms
import { default as b16_transforms } from "./base16.js"
import { default as b64_transforms } from "./base64.js"
import { default as b58_transforms } from "./base58.js"
import { default as utf8_transforms } from "./utf8.js"
import { default as json_transforms } from "./json.js"
import { default as yaml_transforms } from "./yaml.js"
import { default as jsonpath_transforms } from "./jsonpath.js"
import { default as substring_transforms } from "./substring.js"
import { default as uri_transforms } from "./uri.js"
import { default as uuid_transforms } from "./uuid.js"
import { default as date_transforms } from "./date.js"
import { getDisplayName, type Transform, type AnalyzeResult } from "../model.js"

const transforms: Record<string, Transform> = Object.assign(
  b16_transforms,
  b64_transforms,
  b58_transforms,
  utf8_transforms,
  json_transforms,
  yaml_transforms,
  jsonpath_transforms,
  substring_transforms,
  uri_transforms,
  uuid_transforms,
  date_transforms
)

// Attach options component only in main thread (not in worker)
// Workers don't need UI components, only transform logic
if (typeof window !== "undefined" && typeof importScripts === "undefined") {
  import("./EpochTimeUnitOptions.svelte").then((module) => {
    if (transforms.epoch_to_date) {
      transforms.epoch_to_date.optionsComponent = module.default
    }
    if (transforms.uuid_compose) {
      transforms.uuid_compose.optionsComponent = module.default
    }
  })
}

// Export transforms for use in Step.svelte
export const allTransforms = transforms

export const defaultOpts = Object.fromEntries(
  Object.entries(transforms).map(([key, value]) => [key, value.defaults])
)

export function analyze(src: any, options: any): AnalyzeResult[] {
  const results = Object.entries(transforms)
    // only show test for compatible transforms - compare display names as strings
    .filter(([transform_id, transform]) => src.curr === transform.prev)
    .map(([transform_id, transform]): AnalyzeResult => {
      // compute the analysis and results of using this convertion
      const result = transform.analyze(src.content, options[transform_id])

      // Create AnalyzeResult with all required properties
      const analyzeResult: AnalyzeResult = {
        score: "score" in result ? result.score : 0,
        content: "content" in result ? result.content : undefined,
        message: "message" in result ? result.message : undefined,
        inverse: "inverse" in result ? result.inverse : undefined,
        from_name: transform.name,
        from_id: transform_id,
        display: undefined,
        optionComponent: transform.optionsComponent,
        defaults: transform.defaults,
        transform_id: undefined,
      }

      // Infer display name from content type if successful
      if (analyzeResult.content !== undefined) {
        analyzeResult.display = getDisplayName(analyzeResult.content)
      }

      return analyzeResult
    })
  const total = results.reduce((sum, result) => sum + result.score, 0)
  if (total > 0) {
    results.forEach((result) => (result.score = result.score / total))
    results.sort((a, b) => b.score - a.score)
  }
  return results
}
