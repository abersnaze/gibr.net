<script lang="ts">
	import Step from './Step.svelte';
	import TextNode from './TextNode.svelte';
	import type { Choices } from './model';

	let source = '"asf"';

	let choices = {
		selected: undefined,
		next_choices: new Map()
	} as Choices;
</script>

<main>
	<h1>Convert Things</h1>
	<section>
		<TextNode bind:content={source} />
		<Step bind:source depth={0} bind:choices />
	</section>
</main>
