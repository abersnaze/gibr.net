<script lang="ts">
	import type { Ouput } from './common';
	import DisplayBinary from './DisplayBinary.svelte';
	import DisplayObject from './DisplayObject.svelte';
	import DisplayText from './DisplayText.svelte';

	export let output: Ouput;
</script>

{#if output.success}
	{#if typeof output.content === 'object'}
		{#if output.content instanceof Uint8Array}
			<DisplayBinary value={output.content} on:input />
		{:else}
			<DisplayObject value={output.content} on:input />
		{/if}
	{:else}
		<DisplayText value={(output.content || '').toString()} on:input on:select />
	{/if}
{:else}
	{output.message}
{/if}
