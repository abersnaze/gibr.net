<script lang="ts">
  import Logo from "../home/Logo.svelte";
  import Step from "./Step.svelte";
  import TextDisplay from "./display/TextDisplay.svelte";
  import BinaryDisplay from "./display/BinaryDisplay.svelte";
  import TreeDisplay from "./display/TreeDisplay.svelte";
  import type { DisplayName, Step as StepType, Success } from "./model";
  import { analyze, defaultOpts } from "./transforms/index";
  import { browser } from '$app/environment';

  if (browser) {
    document.title = "GIBR.net: Convert Things";
  }

  // Map display names to component instances
  const displayComponents = {
    'TextDisplay': TextDisplay,
    'BinaryDisplay': BinaryDisplay,
    'TreeDisplay': TreeDisplay
  };

  // Track the entire conversion chain for bidirectional editing
  let steps: StepType[] = [
    {
      content: "", // Start with empty content
      curr: "TextDisplay" as DisplayName,
      transform_id: null, // transform_id to the next step
      inverse: undefined // Store the inverse function for this step
    },
  ];

  // Type for the result passed from Step component
  type StepResult = Success & { nextComponent?: DisplayName };

  // Handle updates from child steps
  function handleUpdate(event) {
    const { index, result, clearSubsequent }: { index: number; result: StepResult | null; clearSubsequent: boolean } = event.detail;

    console.debug("[Convert] Step update from index:", index, result, "clearSubsequent:", clearSubsequent);

    // If clearSubsequent is set but transform failed (no result), clear subsequent steps
    if (clearSubsequent && !result && index < steps.length - 1) {
      steps = steps.slice(0, index + 1);
      steps = [...steps];
      return;
    }

    // If a transform was selected and we have a result
    if (steps[index].transform_id && result) {
      // If clearSubsequent flag is set, truncate and add single new step
      if (clearSubsequent && index < steps.length - 1) {
        steps = steps.slice(0, index + 1);
        steps = [...steps, {
          content: result.content,
          curr: result.nextComponent || "TextDisplay",
          transform_id: null,
          inverse: undefined
        }];
        return;
      }

      // If this is the last step, add a new step
      if (index === steps.length - 1) {
        steps = [...steps, {
          content: result.content,
          curr: result.nextComponent || "TextDisplay",
          transform_id: null,
          inverse: undefined
        }];
      } else {
        // This is an existing step - propagate changes forward
        // Update the next step with the new result
        steps[index + 1] = {
          content: result.content,
          curr: result.nextComponent || "TextDisplay",
          transform_id: steps[index + 1].transform_id, // Keep existing transform selection
          inverse: steps[index + 1].inverse // Keep existing inverse function
        };

        // Now apply transforms to all subsequent steps
        for (let i = index + 1; i < steps.length - 1; i++) {
          if (steps[i].transform_id) {
            // We need to re-analyze and re-apply the transform for this step
            const nextStepResult = reapplyTransform(steps[i]);
            if (nextStepResult) {
              steps[i + 1] = {
                content: nextStepResult.content,
                curr: nextStepResult.nextComponent || "TextDisplay",
                transform_id: steps[i + 1].transform_id,
                inverse: steps[i + 1].inverse
              };
            }
          } else {
            // If no transform is selected, truncate the chain here
            steps = steps.slice(0, i + 1);
            break;
          }
        }

        // Trigger reactivity
        steps = [...steps];
      }
    } else if (!result) {
      // Content was edited without transform selection
      if (index > 0) {
        // Apply inverse transforms backwards for steps > 0
        applyInverseTransforms(index);
      } else if (index === 0 && steps.length > 1) {
        // Step 0 content changed - propagate forward through the chain
        propagateForward(0);
        steps = [...steps];
      } else {
        // Just trigger reactivity for other updates
        steps = [...steps];
      }
    }
  }

  // Helper function to re-apply a transform on a step
  function reapplyTransform(step): StepResult | null {
    // Build options object, using step.options if the transform_id matches
    const opts = { ...defaultOpts };
    if (step.transform_id && step.options) {
      opts[step.transform_id] = step.options;
    }

    const results = analyze(step, opts);
    const result = results.find((r) => r.from_id === step.transform_id);
    return result && result.content !== undefined ? {
      score: result.score || 0,
      content: result.content,
      inverse: result.inverse,
      nextComponent: result.display
    } : null;
  }

  // Helper function to apply inverse transforms backwards through the chain
  function applyInverseTransforms(startIndex) {
    // Work backwards from the edited step to step 0
    for (let i = startIndex - 1; i >= 0; i--) {
      const currentStep = steps[i];
      const nextStep = steps[i + 1];
      
      // Find the transform that was applied to get from step i to step i+1
      if (currentStep.transform_id && currentStep.inverse) {
        try {
          // Apply the STORED inverse transform to get the new content for step i
          // Use the stored inverse which has the original data captured
          // Pass the options so transforms like substring_select know where to insert the content
          const newContent = currentStep.inverse(nextStep.content, currentStep.options);
          steps[i] = {
            ...currentStep,
            content: newContent
          };
        } catch (error) {
          console.error(`[Convert] Error applying inverse transform for step ${i}:`, error);
          break; // Stop propagation on error
        }
      } else {
        console.warn(`[Convert] No inverse function available for transform ${currentStep.transform_id}`);
        break; // Stop if we can't go backwards
      }
    }
    
    // Also propagate forward from the edited step if there are more steps
    if (startIndex < steps.length - 1) {
      propagateForward(startIndex);
    }
    
    // Trigger reactivity
    steps = [...steps];
  }

  // Helper function to propagate changes forward through the chain
  function propagateForward(startIndex) {
    for (let i = startIndex; i < steps.length - 1; i++) {
      const currentStep = steps[i];

      if (currentStep.transform_id) {
        // Check if current step has empty or invalid content
        if (!currentStep.content ||
            (typeof currentStep.content === 'string' && currentStep.content.trim() === '')) {
          // Clear subsequent steps when content is empty
          for (let j = i + 1; j < steps.length; j++) {
            // Set appropriate empty content based on the existing display type
            let emptyContent;
            if (steps[j].curr === 'TextDisplay') {
              emptyContent = ''; // Empty string for TextDisplay
            } else {
              emptyContent = new Uint8Array(0); // Empty Uint8Array for BinaryDisplay
            }

            steps[j] = {
              ...steps[j],
              content: emptyContent,
              transform_id: null // Clear transform selection
            };
          }
          break;
        }

        const nextStepResult = reapplyTransform(currentStep);

        if (nextStepResult && nextStepResult.content !== undefined) {
          steps[i + 1] = {
            ...steps[i + 1],
            content: nextStepResult.content,
            curr: nextStepResult.nextComponent || "TextDisplay"
          };
        } else {
          // Transform failed - clear subsequent steps
          for (let j = i + 1; j < steps.length; j++) {
            // Set appropriate empty content based on the existing display type
            let emptyContent;
            if (steps[j].curr === 'TextDisplay') {
              emptyContent = ''; // Empty string for TextDisplay
            } else {
              emptyContent = new Uint8Array(0); // Empty Uint8Array for BinaryDisplay
            }
            
            steps[j] = {
              ...steps[j],
              content: emptyContent,
              transform_id: null // Clear transform selection
            };
          }
          break;
        }
      } else {
        // If no transform is selected, truncate the chain here
        steps = steps.slice(0, i + 1);
        break;
      }
    }
  }
</script>

<main>
  <h1><Logo /> Convert Things</h1>
  {#each steps as step, index (index)}
    <section aria-label="Transformation step {index + 1}">
      <Step bind:step {index} onupdate={handleUpdate} />
    </section>
  {/each}
</main>
