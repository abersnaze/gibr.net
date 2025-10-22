<script lang="ts">
  import { defaultOpts } from "./transforms/index";
  import { onMount, onDestroy } from 'svelte';
  import TextDisplay from "./display/TextDisplay.svelte";
  import BinaryDisplay from "./display/BinaryDisplay.svelte";
  import TreeDisplay from "./display/TreeDisplay.svelte";
  import { getDisplayName } from "./model";

  // Import all transforms to get the list
  import base16 from "./transforms/base16";
  import base58 from "./transforms/base58";
  import base64 from "./transforms/base64";
  import json from "./transforms/json";
  import jsonpath from "./transforms/jsonpath";
  import substring from "./transforms/substring";
  import uri from "./transforms/uri";
  import utf8 from "./transforms/utf8";
  import yaml from "./transforms/yaml";

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

  export let index: number;
  export let step: any;
  export let onupdate: (event: any) => void = () => {};

  let options = defaultOpts;
  let textSelection = null;
  let previousTransformId = step.transform_id;

  // Map display names to component instances
  const displayComponents = {
    'TextDisplay': TextDisplay,
    'BinaryDisplay': BinaryDisplay,
    'TreeDisplay': TreeDisplay
  };

  // Get the actual component from the display name
  $: currentComponent = displayComponents[step.curr] || TextDisplay;

  // Worker state tracking
  // State: 'pending' | 'running' | 'complete' | 'canceled' | 'error'
  let workerStates = new Map(); // transformId -> { state, worker, result, message, requestId, showSpinner, spinnerTimeout }
  let requestCounter = 0;

  // Delay before showing spinner (ms) to avoid flashing during fast analysis
  const SPINNER_DELAY = 300;

  // Get compatible transforms for the current step
  $: compatibleTransforms = Object.entries(allTransforms)
    .filter(([_, transform]) => step.curr === transform.prev)
    .map(([id, transform]) => ({ id, name: transform.name }));

  // Track previous values to detect actual changes
  let previousContent = step.content;
  let previousCurr = step.curr;

  // Reactive trigger to restart analysis when step content or display type changes
  // Do NOT restart when only transform_id changes
  $: if (step && step.content !== undefined && step.curr) {
    if (step.content !== previousContent || step.curr !== previousCurr) {
      previousContent = step.content;
      previousCurr = step.curr;
      restartAnalysis();
    }
  }

  // Selected result
  $: selected_result = (() => {
    if (!step.transform_id) return null;
    const state = workerStates.get(step.transform_id);
    return state?.result;
  })();

  // Spinner animation state
  let spinnerFrame = 0;
  let spinnerInterval;
  const spinnerChars = ['▖', '▘', '▝', '▗'];

  onMount(() => {
    // Initialize tracking variables
    previousContent = step.content;
    previousCurr = step.curr;

    // Start spinner animation
    spinnerInterval = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % 4;
    }, 200); // 200ms per frame

    restartAnalysis();
  });

  onDestroy(() => {
    // Terminate all workers
    for (const [_, state] of workerStates.entries()) {
      if (state.worker) {
        state.worker.terminate();
      }
    }

    // Clear spinner animation
    if (spinnerInterval) {
      clearInterval(spinnerInterval);
    }
  });

  function restartAnalysis() {
    // Terminate existing workers and clear spinner timeouts
    for (const [_, state] of workerStates.entries()) {
      if (state.worker) {
        state.worker.terminate();
      }
      if (state.spinnerTimeout) {
        clearTimeout(state.spinnerTimeout);
      }
    }

    // Clear state
    workerStates.clear();
    workerStates = new Map();

    // Start analysis for each compatible transform
    for (const { id } of compatibleTransforms) {
      startWorker(id);
    }
  }

  function startWorker(transformId: string) {
    const requestId = ++requestCounter;

    try {
      // Create worker
      const worker = new Worker(
        new URL('./transform.worker.js', import.meta.url),
        { type: 'module' }
      );

      // Set up delayed spinner display
      const spinnerTimeout = setTimeout(() => {
        const currentState = workerStates.get(transformId);
        if (currentState && currentState.requestId === requestId &&
            (currentState.state === 'pending' || currentState.state === 'running')) {
          workerStates.set(transformId, {
            ...currentState,
            showSpinner: true
          });
          workerStates = new Map(workerStates);
        }
      }, SPINNER_DELAY);

      // Initialize state
      workerStates.set(transformId, {
        state: 'pending',
        worker,
        result: null,
        message: 'Starting analysis...',
        requestId,
        showSpinner: false,
        spinnerTimeout
      });
      workerStates = new Map(workerStates);

      // Handle messages from worker
      worker.onmessage = (event) => {
        const { requestId: msgRequestId, status, result, message, error } = event.data;

        // Ignore messages from old requests
        const currentState = workerStates.get(transformId);
        if (!currentState || currentState.requestId !== msgRequestId) {
          return;
        }

        if (status === 'running') {
          workerStates.set(transformId, {
            ...currentState,
            state: 'running',
            message
          });
          workerStates = new Map(workerStates);
        } else if (status === 'complete') {
          try {
            // Clear spinner timeout since we're done
            if (currentState.spinnerTimeout) {
              clearTimeout(currentState.spinnerTimeout);
            }

            // Recreate the inverse function from the main thread
            const transform = allTransforms[transformId];
            let inverse = null;
            if (result.hasInverse && transform) {
              // Re-run the transform to get the inverse function
              const freshResult = transform.analyze(step.content, options[transformId]);
              inverse = freshResult.inverse;
            }

            const analyzeResult = {
              score: result.score,
              content: result.content,
              message: result.message,
              inverse,
              from_name: transform?.name || transformId,
              from_id: transformId,
              display: result.content !== undefined ? getDisplayName(result.content) : undefined
            };

            workerStates.set(transformId, {
              ...currentState,
              state: 'complete',
              result: analyzeResult,
              message: null,
              spinnerTimeout: null,
              showSpinner: false
            });
            workerStates = new Map(workerStates);

            // Terminate worker
            worker.terminate();
          } catch (error) {
            console.error(`[Step ${index}] Error processing worker result for ${transformId}:`, error);
            // Clear spinner timeout on error
            if (currentState.spinnerTimeout) {
              clearTimeout(currentState.spinnerTimeout);
            }
            workerStates.set(transformId, {
              ...currentState,
              state: 'error',
              result: {
                score: 0,
                from_name: allTransforms[transformId]?.name || transformId,
                from_id: transformId,
                message: `Error processing result: ${error.message}`
              },
              message: `Error processing result: ${error.message}`,
              spinnerTimeout: null,
              showSpinner: false
            });
            workerStates = new Map(workerStates);
            worker.terminate();
          }
        } else if (status === 'error') {
          // Clear spinner timeout on error
          if (currentState.spinnerTimeout) {
            clearTimeout(currentState.spinnerTimeout);
          }
          workerStates.set(transformId, {
            ...currentState,
            state: 'error',
            result: {
              score: 0,
              from_name: allTransforms[transformId]?.name || transformId,
              from_id: transformId,
              message: error || message
            },
            message: error || message,
            spinnerTimeout: null,
            showSpinner: false
          });
          workerStates = new Map(workerStates);

          // Terminate worker
          worker.terminate();
        }
      };

      worker.onerror = (error) => {
        console.error(`[Step] Worker error for ${transformId}:`, error);
        const currentState = workerStates.get(transformId);
        if (currentState && currentState.requestId === requestId) {
          // Clear spinner timeout on error
          if (currentState.spinnerTimeout) {
            clearTimeout(currentState.spinnerTimeout);
          }
          workerStates.set(transformId, {
            ...currentState,
            state: 'error',
            result: {
              score: 0,
              from_name: allTransforms[transformId]?.name || transformId,
              from_id: transformId,
              message: `Worker error: ${error.message}`
            },
            message: `Worker error: ${error.message}`,
            spinnerTimeout: null,
            showSpinner: false
          });
          workerStates = new Map(workerStates);
        }
        worker.terminate();
      };

      // Send message to worker
      worker.postMessage({
        transformId,
        input: step.content,
        options: options[transformId],
        requestId
      });

    } catch (error) {
      console.error(`[Step] Failed to create worker for ${transformId}:`, error);
      workerStates.set(transformId, {
        state: 'error',
        worker: null,
        result: {
          score: 0,
          from_name: allTransforms[transformId]?.name || transformId,
          from_id: transformId,
          message: `Failed to create worker: ${error.message}`
        },
        message: `Failed to create worker: ${error.message}`,
        requestId,
        showSpinner: false,
        spinnerTimeout: null
      });
      workerStates = new Map(workerStates);
    }
  }

  function cancelWorker(transformId: string) {
    const state = workerStates.get(transformId);
    if (!state) return;

    // Terminate worker
    if (state.worker) {
      state.worker.terminate();
    }

    // Clear spinner timeout
    if (state.spinnerTimeout) {
      clearTimeout(state.spinnerTimeout);
    }

    // Update state to canceled
    workerStates.set(transformId, {
      ...state,
      state: 'canceled',
      result: {
        score: 0,
        from_name: allTransforms[transformId]?.name || transformId,
        from_id: transformId,
        message: `Analysis canceled. Last status: ${state.message || 'pending'}`
      },
      message: `Canceled: ${state.message || 'pending'}`,
      worker: null,
      spinnerTimeout: null,
      showSpinner: false
    });
    workerStates = new Map(workerStates);
  }

  function retryWorker(transformId: string) {
    startWorker(transformId);
  }

  function handleWorkerClick(transformId: string) {
    const state = workerStates.get(transformId);
    if (!state) return;

    if (state.state === 'pending' || state.state === 'running') {
      // Cancel the worker
      cancelWorker(transformId);
    } else if (state.state === 'canceled' || state.state === 'error') {
      // Retry the worker
      retryWorker(transformId);
    }
  }

  function handleTransformSelect(transformId: string) {
    const state = workerStates.get(transformId);
    if (!state || state.state !== 'complete') {
      return;
    }

    const isTransformChange = previousTransformId !== null && previousTransformId !== transformId;
    step.transform_id = transformId;
    previousTransformId = transformId;

    const result = state.result;

    if (result && result.content !== undefined) {
      // Store the inverse function
      step.inverse = result.inverse;

      // Pass the result back to parent
      onupdate({ detail: {
        index,
        result: {
          ...result,
          nextComponent: result.display
        },
        clearSubsequent: isTransformChange
      } });
      return;
    }

    // Transform failed
    onupdate({ detail: { index, clearSubsequent: isTransformChange } });
  }

  function handleContentChange(event: any) {
    const newContent = event.detail?.content !== undefined ? event.detail.content : event.detail;
    step.content = newContent;
    onupdate({ detail: { index } });
  }

  function handlePathSelect(event: any) {
    const { path, value } = event.detail;
    console.log(`[Step ${index}] Path selected:`, { path, value });

    const isTransformChange = previousTransformId !== null && previousTransformId !== 'jsonpath_select';

    step.options = path;

    const newOptions = {
      ...options,
      jsonpath_select: path
    };

    // Run jsonpath_select synchronously for immediate feedback
    const transform = allTransforms['jsonpath_select'];
    if (transform) {
      const result = transform.analyze(step.content, newOptions.jsonpath_select);

      if (result && result.content !== undefined) {
        console.log(`[Step ${index}] JSONPath transform applied:`, {
          path,
          resultContent: result.content,
          resultType: typeof result.content,
          isTransformChange
        });

        step.transform_id = 'jsonpath_select';
        step.inverse = result.inverse;
        previousTransformId = 'jsonpath_select';

        const display = getDisplayName(result.content);

        onupdate({ detail: {
          index,
          result: {
            score: result.score,
            content: result.content,
            inverse: result.inverse,
            from_name: transform.name,
            from_id: 'jsonpath_select',
            display,
            nextComponent: display
          },
          clearSubsequent: isTransformChange
        } });
      }
    }
  }

  function handleSelectionChange(event: any) {
    textSelection = event.detail;
    console.log(`[Step ${index}] Selection changed:`, textSelection);
  }

  function handleExtractSelection() {
    if (textSelection) {
      handleTextSelect({ detail: textSelection });
    }
  }

  function handleTextSelect(event: any) {
    const { text, start, end } = event.detail;
    console.log(`[Step ${index}] Text selected:`, { text, start, end });

    const isTransformChange = previousTransformId !== null && previousTransformId !== 'substring_select';

    const substringOptions = JSON.stringify({ start, end });
    step.options = substringOptions;

    const newOptions = {
      ...options,
      substring_select: substringOptions
    };

    // Run substring_select synchronously
    const transform = allTransforms['substring_select'];
    if (transform) {
      const result = transform.analyze(step.content, newOptions.substring_select);

      if (result && result.content !== undefined) {
        console.log(`[Step ${index}] Substring transform applied:`, {
          start,
          end,
          resultContent: result.content,
          resultType: typeof result.content,
          isTransformChange
        });

        step.transform_id = 'substring_select';
        step.inverse = result.inverse;
        previousTransformId = 'substring_select';

        const display = getDisplayName(result.content);

        onupdate({ detail: {
          index,
          result: {
            score: result.score,
            content: result.content,
            inverse: result.inverse,
            from_name: transform.name,
            from_id: 'substring_select',
            display,
            nextComponent: display
          },
          clearSubsequent: isTransformChange
        } });
      }
    }
  }

  // Get sorted results for display
  $: sortedResults = (() => {
    const results = Array.from(workerStates.entries())
      .map(([id, state]) => ({
        id,
        state: state.state,
        result: state.result,
        message: state.message,
        showSpinner: state.showSpinner
      }))
      .filter(item => item.id !== 'jsonpath_select' && item.id !== 'substring_select');

    // Calculate total score for normalization
    const total = results
      .filter(item => item.state === 'complete' && item.result)
      .reduce((sum, item) => sum + (item.result?.score || 0), 0);

    // Normalize scores
    if (total > 0) {
      results.forEach(item => {
        if (item.state === 'complete' && item.result) {
          item.result.score = item.result.score / total;
        }
      });
    }

    // Sort by score (complete items first, then by score)
    results.sort((a, b) => {
      if (a.state === 'complete' && b.state !== 'complete') return -1;
      if (a.state !== 'complete' && b.state === 'complete') return 1;
      if (a.state === 'complete' && b.state === 'complete') {
        return (b.result?.score || 0) - (a.result?.score || 0);
      }
      return 0;
    });

    return results;
  })();
</script>

<div>
  <!-- Display current step content (editable) -->
  <svelte:component
    this={currentComponent}
    bind:content={step.content}
    on:content-change={handleContentChange}
    on:path-select={handlePathSelect}
    on:selection-change={handleSelectionChange}
  />

  <!-- Transform menu -->
  <div class="transform-menu">
    <!-- Extract Selection option (shown when text is selected) -->
    {#if textSelection}
      <button
        class="transform-label extract-selection"
        class:selected={step.transform_id === 'substring_select'}
        on:click={handleExtractSelection}
        title="Extract selected text to new step"
      >
        Extract Selection
      </button>
    {/if}

    <!-- Regular transforms -->
    {#each sortedResults as item (item.id)}
      {#if item.state === 'complete'}
        <input
          type="radio"
          bind:group={step.transform_id}
          id={index + "-" + item.id + "-transform"}
          value={item.id}
          class="transform-radio"
          on:change={() => handleTransformSelect(item.id)}
        />
        <label
          for={index + "-" + item.id + "-transform"}
          class="transform-label"
        >
          {Math.round((item.result?.score || 0) * 100) + "% "}
          {item.result?.from_name || item.id}
        </label>
      {:else if (item.state === 'pending' || item.state === 'running') && item.showSpinner}
        <button
          class="transform-label spinner"
          on:click={() => handleWorkerClick(item.id)}
          title="Click to cancel"
        >
          <span class="spinner-icon">{spinnerChars[spinnerFrame]}</span>
          {item.result?.from_name || item.id}
        </button>
      {:else if item.state === 'canceled'}
        <button
          class="transform-label canceled"
          on:click={() => handleWorkerClick(item.id)}
          title="Click to retry: {item.message}"
        >
          <span class="canceled-icon">⏸</span>
          {item.result?.from_name || item.id}
        </button>
      {:else if item.state === 'error'}
        <button
          class="transform-label error"
          on:click={() => handleWorkerClick(item.id)}
          title="Click to retry: {item.message}"
        >
          <span class="error-icon">⚠</span>
          {item.result?.from_name || item.id}
        </button>
      {/if}
    {/each}
  </div>

  <!-- Error message if transform failed -->
  {#if selected_result && selected_result.message}
    <div>
      <small class="error-message">{selected_result.message}</small>
    </div>
  {/if}
</div>

<style>
  .transform-menu {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .transform-radio {
    display: none;
  }

  .transform-radio:checked + .transform-label {
    filter: invert(1);
  }

  .transform-label {
    background-color: white;
    border: solid thin;
    border-radius: 0.3em;
    padding: 0.1em 0.5em;
    margin: 0.2em;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3em;
  }

  .transform-label.spinner {
    background-color: #fffacd;
    cursor: pointer;
  }

  .transform-label.canceled {
    background-color: #f0f0f0;
    color: #666;
    cursor: pointer;
  }

  .transform-label.error {
    background-color: #ffe0e0;
    color: #cc0000;
    cursor: pointer;
  }

  .spinner-icon {
    display: inline-block;
    min-width: 1ch;
  }

  .canceled-icon {
    font-weight: bold;
  }

  .error-icon {
    font-weight: bold;
  }

  .extract-selection {
    cursor: pointer;
  }

  .extract-selection.selected {
    filter: invert(1);
  }

  .error-message {
    color: red;
    white-space: pre-wrap;
  }
</style>
