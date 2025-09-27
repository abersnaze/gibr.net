<script lang="ts">
  import { analyze, defaultOpts } from "./transforms/index";

  export let index: number;
  export let step: any;
  export let onupdate: (event: any) => void = () => {};
  
  let options = defaultOpts;
  
  $: results = analyze(step, options);
  $: selected_result = results.find((r) => r.from_id === step.transform_id);

  function handleTransformSelect(transformId: string) {
    step.transform_id = transformId;
    
    // Find the selected result and apply the transform
    const result = results.find((r) => r.from_id === transformId);
    if (result && result.content !== undefined) {
      console.log(`[Step ${index}] Transform applied:`, {
        transformId,
        resultContent: result.content,
        resultType: typeof result.content,
        resultDisplay: result.display
      });
      
      // Pass the result back to parent for creating the next step
      // Include the display component for the next step
      onupdate({ detail: { 
        index, 
        result: {
          ...result,
          resultDisplay: result.display
        }
      } });
      return;
    }
    
    onupdate({ detail: { index } });
  }

  function handleContentChange(event: any) {
    const newContent = event.detail?.content || event.detail;
    step.content = newContent;
    onupdate({ detail: { index } });
  }
</script>

<div>
  <!-- Display current step content (editable) -->
  <svelte:component
    this={step.curr}
    bind:content={step.content}
    on:content-change={handleContentChange}
  />
  
  <!-- Transform menu -->
  <div class="transform-menu">
    {#each results as result, idx (idx)}
      <input
        type="radio"
        bind:group={step.transform_id}
        id={index + "-" + idx + "-transform"}
        value={result.from_id}
        class="transform-radio"
        on:change={() => handleTransformSelect(result.from_id)}
      />
      <label
        for={index + "-" + idx + "-transform"}
        class="transform-label"
        >{Math.round(result.score * 100) + "% " + result.from_name}</label
      >
    {/each}
  </div>
  
  <!-- Options for selected transform -->
  {#if selected_result && selected_result.optionComponent}
    <svelte:component
      this={selected_result.optionComponent}
      bind:content={options[selected_result.from_id]}
    />
  {/if}
  
  <!-- Error message if transform failed -->
  {#if selected_result && selected_result.message}
    <div>
      <small class="error">{selected_result.message}</small>
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
    padding: 0.1em;
    margin: 0.2em;
  }

  .error {
    color: red;
  }
</style>
