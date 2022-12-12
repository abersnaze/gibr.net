<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ChoiceEvent, Step, TransformIds } from './common';
	import { transforms } from './common';

	export let step: Step;
	export let selected: string | undefined;

	const dispatch = createEventDispatcher<{ next: ChoiceEvent }>();

	function onchoice(xid?: TransformIds) {
		const guess = step.results.find((guess) => guess.xid === xid);
		console.log(guess);
		dispatch('next', {
			value: guess
		});
	}
</script>

{#if step.results}
	<form>
		<input
			type="radio"
			name="choice"
			bind:group={selected}
			selected
			id="none"
			value={undefined}
			on:change={(event) => onchoice(undefined)}
		/>
		<label for="none">None</label>
		{#each step.results as guess}
			<input
				type="radio"
				name="choice"
				bind:group={selected}
				id={guess.xid}
				value={guess.xid}
				on:change={(event) => onchoice(guess.xid)}
			/>
			<label for={guess.xid}>{guess.score}% {transforms[guess.xid].name}</label>
		{/each}
	</form>
{/if}

<style>
	form {
		display: flex;
		flex-direction: row;
		flex-wrap: nowrap;
	}

	input {
		display: none;
	}

	input:checked + label {
		filter: invert(1);
	}

	label {
		background-color: var(--background-color);
		border: solid thin var(--forground-color);
		border-radius: 0.3em;
		padding: 0.1em;
		margin: 0.2em;
	}
</style>
