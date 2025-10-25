<script>
  // Get version info at build time
  const version = {
    hash: '__GIT_HASH__',
    date: '__BUILD_DATE__'
  };
</script>

<slot />

<div class="version-info">
  <a href="https://github.com/abersnaze/gibr.net/commit/{version.hash}" target="_blank" rel="noopener">
    {version.date} · {version.hash.substring(0, 7)}
  </a>
</div>

<style>
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
