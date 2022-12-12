<script lang="ts">
	import Choices from './Choices.svelte';
	import type {
		AnalyzeEvent,
		ChoiceEvent,
		InputEvent,
		ResultsEvent,
		Step,
	} from './common';
	import Display from './Display.svelte';

	export let worker: Worker;

	const db = window.indexedDB.open('convert');
	console.log(db);

	let steps: Step[] = [
		{
			timestamp: 0,
			value: {
				success: true,
				content: ``
			},
			results: [],
			options: {}
		}
	];

	worker.onmessage = (msg: MessageEvent<ResultsEvent>) => {
		console.log(msg.data);
		const step = msg.data.step;
		if (steps[step].timestamp < msg.data.timestamp) {
			steps[step].timestamp = msg.data.timestamp;
			steps[step].results = msg.data.results;
		}
	};

	function propagateOut(event: CustomEvent<InputEvent>, index: number) {
		propagateUp(event.detail.content, index);
		propagateDown(event.detail.content, index);
	}
	function propagateUp(content: unknown, index: number) {
		if (index < 0) return;
		const next_index = index - 1;
		const [changed, next_content] = wrap(content, next_index);
		if (changed) propagateUp(next_content, next_index);
	}
	function wrap(content: unknown, to: number): [boolean, unknown] {
		// incorperate downstream changes into the upsream input.
		// because the transform is in charge of applying the
		// change t
		return [false, content];
	}
	function propagateDown(content: unknown, index: number) {
		if (index > steps.length) return;
		const changed = analyze(content, index, index + 1);
		if (changed) propagateDown(event, index + 1);
	}
	function analyze(value: unknown, from: number, to: number): boolean {
		worker.postMessage({
			step: from,
			time: window.performance.now(),
			value: value,
			options: steps[from].options
		} as AnalyzeEvent);
		return false;
	}
	function onnext(event: CustomEvent<ChoiceEvent>, i: number) {
		if (i === steps.length - 1) {
			const value = event.detail.value;
			if (value !== undefined) {
				const nextStep: Step = {
					timestamp: 0,
					value,
					results: [],
					options: {}
				};
				steps = [...steps, nextStep];
				if (value.success) {
					analyze(value.content, i + 1, i + 2);
				}
			}
		} else {
			const value = event.detail.value;
			if (value == undefined) {
				steps = steps.slice(0, i+1)
			}
		}
	}
</script>

<!-- svelte-ignore a11y-invalid-attribute -->
<!-- <a href="javascript:(function()%7Bvar%20baseUrl%20%3D%20%22https%3A%2F%2Fwww.gibr.net%2Fconvert%3Finput%3D%22%3B%0Avar%20input%20%3D%20window.getSelection()%3B%0Avar%20encoded%20%3D%20encodeURIComponent(input)%0Awindow.open(baseUrl%20%2B%20encoded)%3B%7D)()%3B" >
	bookmarklet
</a> -->

{#each steps as step, i}
	<section>
		<Display output={step.value} on:input={(event) => propagateOut(event, i)} />
		<Choices {step} bind:selected={step.selected} on:next={(event) => onnext(event, i)} />
	</section>
{/each}
