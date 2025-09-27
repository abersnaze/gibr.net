<script lang="ts">
  import Logo from "../home/Logo.svelte";
  import Step from "./Step.svelte";
  import TextDisplay from "./display/TextDisplay.svelte";
  import type { Content, Display } from "./model";
  import { analyze, defaultOpts } from "./transforms/index";

  document.title = "GIBR.net: Convert Things";

  // Track the entire conversion chain for bidirectional editing
  let steps = [
    {
      // content: "", // Start with empty content
      content: '{"id": "foo", "payload": "YXNkZg=="}' as Content, // Example JSON input so i don't have to type it every reload
      curr: TextDisplay as Display,
      transform_id: null, // transform_id to the next step
    },
  ];

  // Handle updates from child steps
  function handleUpdate(event) {
    const { index, result } = event.detail;

    console.log("[Convert] Step update from index:", index, result);

    // If a transform was selected and we have a result
    if (steps[index].transform_id && result) {
      console.log("[Convert] Transform selected on step", index, "result:", result);
      
      // If this is the last step, add a new step
      if (index === steps.length - 1) {
        console.log("[Convert] Adding new step with transform result:", result);
        
        steps = [...steps, {
          content: result.content,
          curr: result.nextComponent || TextDisplay,
          transform_id: null
        }];
      } else {
        // This is an existing step - propagate changes forward
        console.log("[Convert] Propagating changes from step", index, "to subsequent steps");
        
        // Update the next step with the new result
        steps[index + 1] = {
          content: result.content,
          curr: result.nextComponent || TextDisplay,
          transform_id: steps[index + 1].transform_id // Keep existing transform selection
        };
        
        // Now recursively apply transforms to all subsequent steps
        for (let i = index + 1; i < steps.length - 1; i++) {
          if (steps[i].transform_id) {
            // We need to re-analyze and re-apply the transform for this step
            const nextStepResult = reapplyTransform(steps[i]);
            if (nextStepResult) {
              steps[i + 1] = {
                content: nextStepResult.content,
                curr: nextStepResult.nextComponent || TextDisplay,
                transform_id: steps[i + 1].transform_id
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
        console.log("[Convert] Content edited on step", index, "applying inverse transforms backwards");
        applyInverseTransforms(index);
      } else if (index === 0 && steps.length > 1) {
        // Step 0 content changed - propagate forward through the chain
        console.log("[Convert] Step 0 content changed, propagating forward");
        propagateForward(0);
        steps = [...steps];
      } else {
        // Just trigger reactivity for other updates
        steps = [...steps];
      }
    }
  }

  // Helper function to re-apply a transform on a step
  function reapplyTransform(step) {
    const results = analyze(step, defaultOpts);
    const result = results.find((r) => r.from_id === step.transform_id);
    return result && result.content !== undefined ? {
      ...result,
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
      if (currentStep.transform_id) {
        const results = analyze(currentStep, defaultOpts);
        const appliedTransform = results.find((r) => r.from_id === currentStep.transform_id);
        
        if (appliedTransform && appliedTransform.inverse) {
          console.log(`[Convert] Applying inverse of ${currentStep.transform_id} to step ${i}`);
          
          try {
            // Apply the inverse transform to get the new content for step i
            const newContent = appliedTransform.inverse(nextStep.content);
            steps[i] = {
              ...currentStep,
              content: newContent
            };
            
            console.log(`[Convert] Step ${i} content updated via inverse transform:`, newContent);
          } catch (error) {
            console.error(`[Convert] Error applying inverse transform for step ${i}:`, error);
            break; // Stop propagation on error
          }
        } else {
          console.warn(`[Convert] No inverse function available for transform ${currentStep.transform_id}`);
          break; // Stop if we can't go backwards
        }
      }
    }
    
    // Also propagate forward from the edited step if there are more steps
    if (startIndex < steps.length - 1) {
      console.log("[Convert] Also propagating forward from edited step", startIndex);
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
          console.log(`[Convert] Step ${i} has empty content, clearing subsequent steps`);
          // Clear subsequent steps when content is empty
          for (let j = i + 1; j < steps.length; j++) {
            // Set appropriate empty content based on the existing component type
            let emptyContent;
            if (steps[j].curr === TextDisplay || steps[j].curr?.name === 'TextDisplay') {
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
            curr: nextStepResult.nextComponent || TextDisplay
          };
        } else {
          console.log(`[Convert] Transform failed on step ${i}, clearing subsequent steps`);
          // Transform failed - clear subsequent steps
          for (let j = i + 1; j < steps.length; j++) {
            // Set appropriate empty content based on the existing component type
            let emptyContent;
            if (steps[j].curr === TextDisplay || steps[j].curr?.name === 'TextDisplay') {
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
  <section>
    {#each steps as step, index (index)}
      <Step bind:step {index} onupdate={handleUpdate} />
    {/each}
  </section>
</main>
