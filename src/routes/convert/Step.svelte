<script lang="ts">
	import { onDestroy } from 'svelte';
	import type { Choices, Settings, TransformId, Success, Result } from './model';
	import { analyze, transforms } from './transforms/index';
	import { writable } from 'svelte/store';

	export let depth: number = 0;
	export let choices: Choices;
	export let source: unknown;

	let transform_id: TransformId | undefined = undefined;
	let options = {};

	$: results = analyze(source, choices.next_choices.keys());
	$: {
		if (transform_id !== undefined) {
			choices.selected = { transform_id, options: JSON.stringify(options) };
		} else {
			choices.seleced = undefined;
		}
	}
	function isSelected(result: Result): result is Success {
		return result.state == 'success';
	}
	$: upstream = writable(source);
	onDestroy(
		upstream.subscribe((value) => {
			source = value;
		})
	);
</script>

<div>
	{#await results}
		<div>analyzing...</div>
	{:then results}
		<div class="transform-menu">
			{#each results as result, idx (idx)}
				{@const transform = transforms[result.transform_id]}
				{#if result.state === 'success'}
					<input
						type="radio"
						bind:group={transform_id}
						id={depth + '-' + idx + '-transform'}
						value={result.transform_id}
						class="transform-radio"
					/>
					<label for={depth + '-' + idx + '-transform'} class="transform-label"
						>{Math.round(result.score * 100) + '% ' + transform.name}</label
					>
				{:else if result.state === 'failure'}
					<input
						type="radio"
						bind:group={transform_id}
						id={depth + '-' + idx + '-transform'}
						value={result.transform_id}
						class="transform-radio"
					/>
					<label for={depth + '-' + idx + '-transform'} class="transform-label"
						>err {transform.name}</label
					>
				{/if}
			{/each}
		</div>
		{#if choices.selected}
			{@const selected = choices.selected}
			{@const selected_result = results
				.filter(isSelected)
				.find((r) => r.transform_id === selected.transform_id)}
			{#if selected_result}
				<svelte:self bind:source={upstream} depth={depth + 1} bind:choices />
				<span>{transform_id} component here {selected_result.output}</span>
			{/if}
		{/if}
	{:catch error}
		<div>
			<small class="error">{error.message}</small>
		</div>
	{/await}
</div>

<style>
	/* .transform-menu {
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
		color: var();
		border: solid thin;
		border-radius: 0.3em;
		padding: 0.1em;
		margin: 0.2em;
	}

	.error {
		color: red;
	} */
</style>
