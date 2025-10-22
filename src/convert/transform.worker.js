// Web worker for running transform analysis in parallel
import base16 from './transforms/base16.js';
import base58 from './transforms/base58.js';
import base64 from './transforms/base64.js';
import json from './transforms/json.js';
import jsonpath from './transforms/jsonpath.js';
import substring from './transforms/substring.js';
import uri from './transforms/uri.js';
import utf8 from './transforms/utf8.js';
import yaml from './transforms/yaml.js';

// Combine all transforms
const allTransforms = {
  ...base16,
  ...base58,
  ...base64,
  ...json,
  ...jsonpath,
  ...substring,
  ...uri,
  ...utf8,
  ...yaml,
};

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  const { transformId, input, options, requestId } = event.data;

  try {
    // Post status update
    self.postMessage({
      requestId,
      status: 'running',
      message: `Analyzing with ${transformId}...`
    });

    // Get the transform
    const transform = allTransforms[transformId];
    if (!transform) {
      throw new Error(`Transform ${transformId} not found`);
    }

    // Run the analysis
    const result = transform.analyze(input, options);

    // Post result back to main thread
    self.postMessage({
      requestId,
      transformId,
      status: 'complete',
      result: {
        score: result.score || 0,
        content: result.content,
        message: result.message,
        // Note: we can't transfer the inverse function to the main thread
        // The main thread will need to recreate it
        hasInverse: typeof result.inverse === 'function'
      }
    });
  } catch (error) {
    // Post error back to main thread
    self.postMessage({
      requestId,
      transformId,
      status: 'error',
      message: `Error in ${transformId}: ${error.message}`,
      error: error.toString()
    });
  }
});
