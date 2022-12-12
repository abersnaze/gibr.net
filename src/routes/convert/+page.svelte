<script lang="ts">
	import type { Value } from './common';
	import Display from './Display.svelte';
	import Step from './Step.svelte';
	import WithWorker from './WithAnalyzer.svelte';

	let value: Value = {
		success: true,
		content: ''
	};
</script>

<WithWorker let:analyzer>
	<Display bind:output={value} />
	<Step {analyzer} bind:input={value} />
</WithWorker>
