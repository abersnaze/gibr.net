<script>
  import { afterUpdate, createEventDispatcher } from 'svelte';

  export let content;

  import { onMount } from 'svelte';

  // Convert Uint8Array to empty string if accidentally passed to TextDisplay
  $: displayContent = content instanceof Uint8Array ? '' : content;
  let textbox;
  let previousContent = content;

  const dispatch = createEventDispatcher();

  // Threshold for showing truncated view
  const TRUNCATE_THRESHOLD = 600;
  const HEAD_CHARS = 300;
  const TAIL_CHARS = 300;

  let showMore = false;

  $: isLarge = typeof displayContent === 'string' && displayContent.length > TRUNCATE_THRESHOLD;
  $: truncatedHead = isLarge ? displayContent.substring(0, HEAD_CHARS) : '';
  $: truncatedTail = isLarge ? displayContent.substring(displayContent.length - TAIL_CHARS) : '';

  afterUpdate(() => {
    // Only auto-resize when showing full content or content is not large
    if (textbox && (!isLarge || showMore)) {
      textbox.style.height = "5px";
      textbox.style.height = `${textbox.scrollHeight}px`;
    }
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

  // Handle paste events specifically
  function handlePaste(event) {
    // Let the default paste happen, then trigger handleInput
    setTimeout(() => {
      if (textbox) {
        handleInput({ target: textbox });
      }
    }, 0);
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

{#if isLarge && !showMore}
  <div class="truncated-view">
    <pre>{truncatedHead}</pre>
    <div class="more-or-less">
      <label>
        <input type="checkbox" bind:checked={showMore} />
        show more
      </label>
    </div>
    <pre>{truncatedTail}</pre>
  </div>
{:else}
  {#if isLarge}
    <div class="more-or-less">
      <label>
        <input type="checkbox" bind:checked={showMore} />
        show less
      </label>
    </div>
  {/if}
  <textarea
    bind:value={displayContent}
    on:input={handleInput}
    on:paste={handlePaste}
    on:mouseup={handleSelection}
    on:keyup={handleSelection}
    cols="80"
    rows="4"
    bind:this={textbox}
    aria-label="Text content for transformation"
    title="Select text to extract it to a new step"
  ></textarea>
{/if}

<style>
  textarea {
    resize: none;
    overflow: hidden;
    min-height: 50px;
  }

  .truncated-view {
    display: flex;
    flex-direction: column;
    width: 80ch;
  }

  .truncated-view pre {
    font-family: inherit;
    margin: 0;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .more-or-less {
    user-select: none;
    text-align: center;
    margin: 0.5em 0;
  }
</style>
