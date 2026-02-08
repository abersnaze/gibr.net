<script>
  // Get version info at build time
  // These are replaced by Vite's define plugin at build time
  const version = {
    hash: __GIT_HASH__,
    date: __BUILD_DATE__,
  }
</script>

<slot />

<div class="version-info">
  <a
    href="https://github.com/abersnaze/gibr.net/commit/{version.hash}"
    target="_blank"
    rel="noopener"
  >
    {version.date} · {version.hash.substring(0, 7)}
  </a>
</div>

<style>
  :global(:root) {
    --bg-color: #ffffff;
    --card-bg: #f5f5f5;
    --text-color: #1a1a1a;
    --text-secondary: #666666;
    --border-color: #d0d0d0;
    --primary-color: #4287f5;
    --danger-color: #f54242;
    --success-color: #22aa22;
  }

  @media (prefers-color-scheme: dark) {
    :global(:root) {
      --bg-color: #1a1a1a;
      --card-bg: #2a2a2a;
      --text-color: #e0e0e0;
      --text-secondary: #a0a0a0;
      --border-color: #3a3a3a;
      --primary-color: #4287f5;
      --danger-color: #f54242;
      --success-color: #42f554;
    }
  }

  .version-info {
    position: fixed;
    bottom: 0.5rem;
    right: 0.5rem;
    font-size: 0.75rem;
    opacity: 0.5;
    z-index: 1000;
    pointer-events: auto;
  }

  .version-info:hover {
    opacity: 1;
  }

  .version-info a {
    color: var(--text-secondary);
    text-decoration: none;
  }

  .version-info a:hover {
    text-decoration: underline;
  }
</style>
