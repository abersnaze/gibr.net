<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	function dirs(url: URL): [URL, string][] {
		// if (url.pathname === '/') return [];
		const chunks: [URL, string][] = [[new URL(url.origin), '~']];
		url.pathname.split('/').reduce((prev, curr) => {
			const next = prev + '/' + curr;
			chunks.push([new URL(url.origin + next), next]);
			return next;
		});
		return chunks;
	}
</script>

<svelte:head>
	<title>gibr.net</title>
</svelte:head>

<header>
	<a href="/"><span id="icon">&#xE000;</span></a>
	<span id="path">
		{#each dirs($page.url) as [url, dir], index}
			<a href={url.toString()}>{dir}</a>
		{/each}
	</span>
	$&nbsp;
	<!-- http://www.dynamicdrive.com/forums/showthread.php?17450-Emulating-a-terminal-like-caret-with-javascript-and-css -->
	<!-- http://shachi.prophp.org/demo.html?i=1 -->
	<input id="cli" type="search" />
</header>

<main>
	<slot />
</main>

<style>
	@font-face {
		font-family: 'gibr';
		src: url('gibr-Regular.woff2') format('woff2'), url('gibr-Regular.woff') format('woff');
	}
	header {
		padding-left: 0.8em;
		color: var(--background-color);
		background-color: var(--accent-color);
		font-size: 3em;
		font-weight: bold;
		margin-top: 0;
		display: flex;
		align-items: baseline;
	}
	a {
		color: var(--background-color);
		text-decoration: none;
	}
	a:hover {
		text-decoration: underline;
	}
	main {
		margin: 1em;
	}
	#icon {
		font-family: 'gibr';
		font-weight: normal;
	}
	#path {
		margin-inline-start: 0.2em;
		margin-inline-end: 0.2em;
	}
	#cli {
		flex-grow: 1;
		font-family: 'Inconsolata', monospace;
		font-size: 1em;
		font-weight: bold;
		border: 0;
		margin: 0;
		padding: 0;
		width: 100%;
		background: transparent;
		caret-color: black;
		outline: none;
		line-height: -2; /* Key property */
	}
</style>
