<script>
  import { analyze, defaultOpts } from "./transforms";

  export let depth;
  export let source;

  let options = defaultOpts;
  $: results = analyze(source, options);
  $: selected_result = results.find((r) => r.from_id === source.transform_id);
</script>

<div>
  <div class="transform-menu">
    {#each results as result, idx (idx)}
      <input
        type="radio"
        bind:group={source.transform_id}
        id={depth + "-" + idx + "-transform"}
        value={result.from_id}
        class="transform-radio"
      />
      <label
        type="radio"
        value={result.from_name}
        for={depth + "-" + idx + "-transform"}
        class="transform-label"
        >{Math.round(result.score * 100) + "% " + result.from_name}</label
      >
    {/each}
  </div>
  {#if selected_result}
    {#if selected_result.optionComp}
      <svelte:component
        this={selected_result.optionComp}
        bind:content={options[selected_result.from_id]}
      />
    {/if}
    {#if selected_result.message}
      <div>
        <small class="error">{selected_result.message}</small>
      </div>
    {/if}
    <hr />
    {#if selected_result.content !== undefined}
      <svelte:component
        this={selected_result.curr}
        bind:content={selected_result.content}
      />
      <svelte:self source={selected_result} depth={depth + 1} />
    {/if}
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
