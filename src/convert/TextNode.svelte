<script>
  import { afterUpdate } from 'svelte';

  export let content;
  let textbox;

  afterUpdate(() => {
    textbox.style.height = "5px";
    textbox.style.height = `${textbox.scrollHeight}px`;
  })
</script>

<textarea bind:value={content} cols="80" rows="4" bind:this={textbox}/>

<style>
  textarea {
    resize: none;
    overflow: hidden;
    min-height: 50px;
  }
</style>
