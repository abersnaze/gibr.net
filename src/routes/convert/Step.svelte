<script lang="ts">
  import { defaultOpts, allTransforms } from "./transforms/index";
  import { onMount, onDestroy, getContext } from 'svelte';
  import TextDisplay from "./display/TextDisplay.svelte";
  import BinaryDisplay from "./display/BinaryDisplay.svelte";
  import TreeDisplay from "./display/TreeDisplay.svelte";
  import DateDisplay from "./display/DateDisplay.svelte";
  import { getDisplayName } from "./model";
  import type { Writable } from 'svelte/store';

  export let index: number;
  export let step: any;
  export let onupdate: (event: any) => void = () => {};

  // Get pauseAnalysis store from context
  const pauseAnalysis = getContext<Writable<boolean>>('pauseAnalysis');

  let options = defaultOpts;
  let textSelection = null;
  let previousTransformId = step.transform_id;

  // Map display names to component instances
  const displayComponents = {
    'TextDisplay': TextDisplay,
    'BinaryDisplay': BinaryDisplay,
    'TreeDisplay': TreeDisplay,
    'DateDisplay': DateDisplay
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

  // Track if content changed while paused
  let contentChangedWhilePaused = false;

  // Reactive trigger to restart analysis when step content or display type changes
  // Do NOT restart when only transform_id changes
  // Also skip analysis when pauseAnalysis flag is set (during bulk updates)
  $: if (step && step.content !== undefined && step.curr) {
    if (step.content !== previousContent || step.curr !== previousCurr) {
      if ($pauseAnalysis) {
        // Mark that content changed while paused and update tracking
        console.debug(`[Step ${index}] Content changed while paused, deferring analysis`);
        contentChangedWhilePaused = true;
        previousContent = step.content;
        previousCurr = step.curr;
      } else {
        console.debug(`[Step ${index}] Content changed, restarting analysis`);
        previousContent = step.content;
        previousCurr = step.curr;
        restartAnalysis();
      }
    }
  }

  // When analysis resumes, restart if content changed while paused
  $: if (!$pauseAnalysis && contentChangedWhilePaused) {
    console.debug(`[Step ${index}] Analysis resumed, starting deferred analysis`);
    contentChangedWhilePaused = false;
    restartAnalysis();
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

  // Onboarding hint state (only for first step)
  let showHint = false;
  let showHint2 = false;
  let hintTimeout;
  let hint2Timeout;
  const HINT_DELAY = 5000; // 5 seconds
  const HINT2_DELAY = 8000; // 8 seconds
  const HINT_STORAGE_KEY = 'convert-hint-dismissed';

  function checkAndShowHint() {
    // Only show hint for first step
    if (index !== 0) {
      console.log('[Hint] Not showing hint - not first step, index:', index);
      return;
    }

    // Check if user has already seen and dismissed the hint
    const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem(HINT_STORAGE_KEY) === 'true';
    console.log('[Hint] Checking localStorage:', { dismissed, key: HINT_STORAGE_KEY });
    if (dismissed) {
      console.log('[Hint] Hint already dismissed, not showing');
      return;
    }

    // Start timer for showing first hint after inactivity
    console.log('[Hint] Starting hint timer for', HINT_DELAY, 'ms');
    hintTimeout = setTimeout(() => {
      console.log('[Hint] Timer expired, showing hint');
      showHint = true;
    }, HINT_DELAY);

    // Start timer for showing second hint
    console.log('[Hint] Starting hint2 timer for', HINT2_DELAY, 'ms');
    hint2Timeout = setTimeout(() => {
      console.log('[Hint] Timer 2 expired, showing hint 2');
      showHint2 = true;
    }, HINT2_DELAY);
  }

  let hintFading = false;
  let hint2Fading = false;

  function dismissHint() {
    // Start fade-out animation for both hints
    hintFading = true;
    hint2Fading = true;

    // Clear both timers
    if (hintTimeout) {
      clearTimeout(hintTimeout);
      hintTimeout = null;
    }
    if (hint2Timeout) {
      clearTimeout(hint2Timeout);
      hint2Timeout = null;
    }

    // Store dismissal in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(HINT_STORAGE_KEY, 'true');
    }

    // Actually hide after animation completes
    setTimeout(() => {
      showHint = false;
      showHint2 = false;
      hintFading = false;
      hint2Fading = false;
    }, 1000);
  }

  function handleUserActivity(event) {
    // Any user activity dismisses the hint forever
    dismissHint();
  }

  onMount(() => {
    // Initialize tracking variables
    previousContent = step.content;
    previousCurr = step.curr;

    // Start spinner animation
    spinnerInterval = setInterval(() => {
      spinnerFrame = (spinnerFrame + 1) % 4;
    }, 200); // 200ms per frame

    restartAnalysis();

    // Set up hint timer for first step
    if (index === 0) {
      checkAndShowHint();

      // Add event listeners for user activity
      window.addEventListener('click', handleUserActivity);
      window.addEventListener('keydown', handleUserActivity);
    }
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

    // Clean up hint timers and event listeners
    if (hintTimeout) {
      clearTimeout(hintTimeout);
    }
    if (hint2Timeout) {
      clearTimeout(hint2Timeout);
    }
    if (index === 0) {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
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
              if ('content' in freshResult) {
                inverse = freshResult.inverse;
              }
            }

            const analyzeResult = {
              score: 'score' in result ? result.score : 0,
              content: 'content' in result ? result.content : undefined,
              message: 'message' in result ? result.message : undefined,
              inverse,
              from_name: transform?.name || transformId,
              from_id: transformId,
              display: ('display' in result && result.display)
                ? result.display
                : (('content' in result && result.content !== undefined) ? getDisplayName(result.content) : undefined),
              optionComponent: transform?.optionsComponent,
              defaults: transform?.defaults
            };

            // If the transform returned updated options (e.g., from auto-detection), use them
            if ('options' in result && result.options) {
              options[transformId] = result.options;
              options = { ...options }; // Trigger reactivity
            }

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

            // If this transform is currently selected, update the inverse function
            // but don't propagate (onupdate) as that would clear subsequent steps
            // The transform is already applied, we just need to update the inverse
            if (step.transform_id === transformId && analyzeResult.content !== undefined) {
              step.options = options[transformId];
              step.inverse = analyzeResult.inverse;
            }
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

  function reapplyTransform(transformId: string) {
    // Re-run the worker with the new options
    // First, clear the current worker state to force a re-run
    const currentState = workerStates.get(transformId);
    if (currentState?.worker) {
      currentState.worker.terminate();
    }
    workerStates.delete(transformId);
    workerStates = new Map(workerStates);

    // Restart the worker with new options
    startWorker(transformId);
  }

  function handleTransformSelect(transformId: string) {
    const state = workerStates.get(transformId);
    if (!state || state.state !== 'complete') {
      return;
    }

    // If clicking on already selected transform, unselect it
    if (step.transform_id === transformId) {
      step.transform_id = null;
      step.inverse = undefined;
      previousTransformId = null;

      // Clear subsequent steps
      onupdate({ detail: {
        index,
        result: null,
        clearSubsequent: true
      } });
      return;
    }

    const isTransformChange = previousTransformId !== null && previousTransformId !== transformId;
    step.transform_id = transformId;
    previousTransformId = transformId;

    const result = state.result;

    if (result && 'content' in result && result.content !== undefined) {
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

      if (result && 'content' in result && result.content !== undefined) {
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

      if (result && 'content' in result && result.content !== undefined) {
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
        showSpinner: state.showSpinner,
        normalizedScore: 0 // Will be calculated below
      }))
      .filter(item => item.id !== 'jsonpath_select' && item.id !== 'substring_select');

    // Calculate total score for normalization
    const total = results
      .filter(item => item.state === 'complete' && item.result)
      .reduce((sum, item) => sum + (item.result?.score || 0), 0);

    // Calculate normalized scores without mutating original
    if (total > 0) {
      results.forEach(item => {
        if (item.state === 'complete' && item.result) {
          item.normalizedScore = item.result.score / total;
        }
      });
    }

    // Sort by normalized score (complete items first, then by score)
    results.sort((a, b) => {
      if (a.state === 'complete' && b.state !== 'complete') return -1;
      if (a.state !== 'complete' && b.state === 'complete') return 1;
      if (a.state === 'complete' && b.state === 'complete') {
        return b.normalizedScore - a.normalizedScore;
      }
      return 0;
    });

    return results;
  })();
</script>

<div class="step-wrapper">
  <div class="content-row">
    <!-- Display current step content (editable) -->
    <div class="display-container">
      <svelte:component
        this={currentComponent}
        bind:content={step.content}
        on:content-change={handleContentChange}
        on:path-select={handlePathSelect}
        on:selection-change={handleSelectionChange}
      />
    </div>

    <!-- Onboarding hint (only for first step) -->
    {#if showHint && index === 0}
      <div class="hint-message" class:fading={hintFading} role="status" aria-live="polite">
        <div class="hint-arrow" aria-hidden="true">←</div>
        <div class="hint-text">
          Paste text or structured data here to get started
        </div>
      </div>
    {/if}
  </div>

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
          checked={step.transform_id === item.id}
          id={index + "-" + item.id + "-transform"}
          value={item.id}
          class="transform-radio"
        />
        <label
          for={index + "-" + item.id + "-transform"}
          class="transform-label"
          on:click|preventDefault={() => {
            // Handle both select and unselect
            handleTransformSelect(item.id);
          }}
        >
          {Math.round(item.normalizedScore * 100) + "% "}
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

  <!-- Options component if transform has one -->
  {#if step.transform_id && selected_result && selected_result.optionComponent}
    <div class="options-container">
      <svelte:component
        this={selected_result.optionComponent}
        bind:value={options[step.transform_id]}
        on:change={() => {
          // Re-run the transform when options change
          reapplyTransform(step.transform_id);
        }}
      />
    </div>
  {/if}

  <!-- Error message if transform failed -->
  {#if selected_result && selected_result.message}
    <div>
      <small class="error-message">{selected_result.message}</small>
    </div>
  {/if}

  <!-- Second onboarding hint (below transform menu) -->
  {#if showHint2 && index === 0}
    <div class="hint2-message" class:fading={hint2Fading} role="status" aria-live="polite">
      <div class="hint2-arrow" aria-hidden="true">←</div>
      <div class="hint2-text">
        Then select a transformation
      </div>
    </div>
  {/if}
</div>

<style>
  .step-wrapper {
    display: flex;
    flex-direction: column;
  }

  .content-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 20px;
  }

  .display-container {
    flex: 0 1 auto;
  }

  .hint-message {
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
    white-space: nowrap;
    animation: fadeIn 0.3s ease-in;
  }

  .hint-message.fading {
    animation: fadeOut 1s ease-out forwards;
  }

  .hint-arrow {
    font-size: 2em;
    color: var(--text-color);
    opacity: 0.6;
    font-weight: normal;
    line-height: 1;
  }

  .hint-text {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 0.9em;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    opacity: 0.85;
  }

  .hint2-arrow {
    font-size: 2em;
    color: var(--text-color);
    opacity: 0.6;
    font-weight: normal;
    line-height: 1;
    transform: rotate(90deg);
    display: inline-block;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateX(-10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }

  .hint2-message {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
    pointer-events: none;
    margin-top: 10px;
    margin-left: 60px;
    animation: fadeIn 0.3s ease-in;
  }

  .hint2-message.fading {
    animation: fadeOut 1s ease-out forwards;
  }

  .hint2-text {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 0.9em;
    line-height: 1.4;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    opacity: 0.85;
    white-space: nowrap;
  }

  .transform-menu {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    /* Min height to prevent collapsing while re-processing
     * margin + border + padding + content + padding + border + margin
     */
    min-height: calc(0.2em + 1px + 0.1em + 1em + 0.1em + 1px + 0.2em);
  }

  .transform-radio {
    display: none;
  }

  .transform-radio:checked + .transform-label {
    background-color: var(--text-color);
    color: var(--bg-color);
  }

  .transform-label {
    background-color: var(--bg-color);
    color: var(--text-color);
    border: solid thin var(--border-color);
    border-radius: 0.3em;
    padding: 0.1em 0.5em;
    margin: 0.2em;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.3em;
    white-space: nowrap;
  }

  .transform-label.spinner {
    background-color: var(--status-spinner-bg);
    color: var(--status-spinner-color);
    cursor: pointer;
  }

  .transform-label.canceled {
    background-color: var(--status-canceled-bg);
    color: var(--status-canceled-color);
    cursor: pointer;
  }

  .transform-label.error {
    background-color: var(--status-error-bg);
    color: var(--status-error-color);
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
    background-color: var(--text-color);
    color: var(--bg-color);
  }

  .error-message {
    color: var(--status-error-color);
    white-space: pre-wrap;
  }

  .options-container {
    margin-top: 0.5em;
  }
</style>
