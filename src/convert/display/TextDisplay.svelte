<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';

  export let content;
  
  // Convert Uint8Array to empty string if accidentally passed to TextDisplay
  $: displayContent = content instanceof Uint8Array ? '' : content;
  let textbox;
  let previousContent = content;
  
  console.log('[TextNode] Component mounted with content:', content, 'type:', typeof content, 'isUint8Array:', content instanceof Uint8Array);
  
  const dispatch = createEventDispatcher();

  afterUpdate(() => {
    textbox.style.height = "5px";
    textbox.style.height = `${textbox.scrollHeight}px`;
  });
  
  // Handle manual content changes with debouncing
  let debounceTimer;
  function handleInput(event) {
    const newContent = event.target.value;
    content = newContent; // Update binding immediately for UI responsiveness
    displayContent = newContent; // Also update display content
    
    console.log('[TextNode] Input detected:', {
      newContent,
      previousContent,
      contentLength: newContent.length
    });
    
    // Debounce the propagation event to avoid excessive processing
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      if (newContent !== previousContent) {
        console.log('[TextNode] Dispatching content-change event:', {
          newContent,
          previousContent
        });
        dispatch('content-change', { content: newContent, previousContent });
        previousContent = newContent;
      } else {
        console.log('[TextNode] No change detected, not dispatching event');
      }
    }, 100); // 100ms debounce for faster testing
  }
</script>

<textarea 
  bind:value={displayContent} 
  on:input={handleInput}
  cols="80" 
  rows="4" 
  bind:this={textbox}
></textarea>

<style>
  textarea {
    resize: none;
    overflow: hidden;
    min-height: 50px;
  }
</style>
