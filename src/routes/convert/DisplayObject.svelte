<script lang="ts">
	export let value: any;
</script>

{#if typeof value === 'object'}
	{#if Array.isArray(value)}
		<ol start="0">
			{#each value as item, idx}
				<li>
					<svelte:self bind:value={item} />
				</li>
			{/each}
		</ol>
	{:else if value}
		<dl>
			{#each Object.keys(value) as key}
				{#if value[key]}
					<dt contenteditable>{key}</dt>
					<dd>
						<svelte:self bind:value={value[key]} />
					</dd>
				{/if}
			{/each}
		</dl>
	{:else}
		<em>null</em>
	{/if}
{:else}
	<span contenteditable>{value}</span>
{/if}

<style>
	dl {
		margin-block: 0;
		display: grid;
		grid-template-columns: min-content auto;
	}
	dt {
		justify-self: end;
		grid-column: 1;
	}
	dt:after {
		content: ':';
	}
	dd {
		margin-left: 0;
		grid-column: 2;
	}
	ol {
		margin-block: 0;
	}
</style>
