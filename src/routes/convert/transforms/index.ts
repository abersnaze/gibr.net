// Main-thread entry point for the transform registry: re-exports the pure
// registry and attaches Svelte options components, which must never load in
// workers (they import ./registry.js directly).
import { allTransforms } from "./registry.js"

export { allTransforms, defaultOpts, analyze } from "./registry.js"

// Attach options components only in the main thread (not in workers)
if (typeof window !== "undefined" && !("importScripts" in globalThis)) {
  import("./EpochTimeUnitOptions.svelte").then((module) => {
    if (allTransforms.epoch_to_date) {
      allTransforms.epoch_to_date.optionsComponent = module.default
    }
    if (allTransforms.uuid_compose) {
      allTransforms.uuid_compose.optionsComponent = module.default
    }
  })
}
