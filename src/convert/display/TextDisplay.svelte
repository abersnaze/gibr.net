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

    // Clear selection when user starts typing
    currentSelection = null;

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

  // Track current selection
  let currentSelection = null;

  // Handle text selection - track it and notify parent
  function handleSelection(event) {
    const textarea = event.target;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Only track if there's an actual selection (not just cursor position)
    if (start !== end) {
      const selectedText = textarea.value.substring(start, end);
      console.log('[TextDisplay] Text selected:', {
        start,
        end,
        selectedText
      });

      currentSelection = {
        text: selectedText,
        start,
        end
      };
    } else {
      currentSelection = null;
    }

    // Notify parent of selection change
    dispatch('selection-change', currentSelection);
  }
</script>

<textarea
  bind:value={displayContent}
  on:input={handleInput}
  on:mouseup={handleSelection}
  on:keyup={handleSelection}
  cols="80"
  rows="4"
  bind:this={textbox}
  title="Select text to extract it to a new step"
></textarea>

<style>
  textarea {
    resize: none;
    overflow: hidden;
    min-height: 50px;
  }
</style>
