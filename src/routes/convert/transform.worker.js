// Web worker for running transform analysis off the main thread.
// Imports the pure registry — never ./transforms/index.js, which attaches
// Svelte options components that can't load in a worker.
import { allTransforms } from "./transforms/registry.js"

// Listen for messages from main thread
self.addEventListener("message", (event) => {
  const { transformId, input, options, requestId } = event.data

  try {
    // Post status update
    self.postMessage({
      requestId,
      status: "running",
      message: `Analyzing with ${transformId}...`,
    })

    // Get the transform
    const transform = allTransforms[transformId]
    if (!transform) {
      throw new Error(`Transform ${transformId} not found`)
    }

    // Run the analysis
    const result = transform.analyze(input, options)

    // Post result back to main thread
    self.postMessage({
      requestId,
      transformId,
      status: "complete",
      result: {
        score: result.score || 0,
        content: result.content,
        message: result.message,
        options: result.options, // Pass through detected options (e.g., auto-detected time unit)
        display: result.display, // Pass through custom display component (e.g., DateDisplay)
      },
    })
  } catch (error) {
    // Post error back to main thread
    self.postMessage({
      requestId,
      transformId,
      status: "error",
      message: `Error in ${transformId}: ${error.message}`,
      error: error.toString(),
    })
  }
})
