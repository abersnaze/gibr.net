<script lang="ts">
	import { afterUpdate } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import type { Ouput, SubSelectEvent, InputEvent } from './common';
	import { debounce } from 'ts-debounce';

	export let value: string;

	let textbox: HTMLTextAreaElement;
	afterUpdate(() => {
		textbox.style.height = '5px';
		textbox.style.height = `${textbox.scrollHeight}px`;
	});

	const dispatch = createEventDispatcher<{ input: InputEvent; select: SubSelectEvent }>();

	let prevStart = 0;
	let prevEnd = 0;
	/*
	 * function to make sure meaningful events are sent
	 * - ignore duplicate events
	 * - ignore non-events
	 */
	function sendSelectEvent() {
		let s = textbox.selectionStart;
		let e = textbox.selectionEnd;
		if (e - s === 0) {
			s = 0;
			e = 0;
		}
		if (prevStart === s && prevEnd === e) {
			return;
		}
		prevStart = s;
		prevEnd = e;
		let selection = textbox.value.substring(s, e);
		dispatch('select', {
			value: selection,
			wrap: (s) => {}
		});
	}

	// conditioning when to send the event.
	const fastSelectEvent = debounce(sendSelectEvent, 250);
	const slowSelectEvent = () => {
		// cancel any pending fast events
		fastSelectEvent.cancel();
		sendSelectEvent();
	};

	// wiring of raw events to logic event
	const onkeydown = slowSelectEvent;
	const onpointerdown = (event: PointerEvent) => {
		// capture pointer events so that if mouse up
		// event happens outside the textarea
		textbox.setPointerCapture(event.pointerId);
		slowSelectEvent();
	};
	const onpointermove = () => {
		fastSelectEvent().catch(() => {
			// to ignore cancelation
		});
	};
	const onpointerup = (event: PointerEvent) => {
		textbox.releasePointerCapture(event.pointerId);
		slowSelectEvent();
	};
</script>

<textarea
	{value}
	cols="80"
	rows="4"
	bind:this={textbox}
	on:input={(event) => dispatch('input', { value: event.currentTarget.value })}
	on:keydown={onkeydown}
	on:keyup={onkeydown}
	on:pointerdown={onpointerdown}
	on:pointermove={onpointermove}
	on:pointerup={onpointerup}
/>

<style>
	textarea {
		font-family: 'Inconsolata', monospace;
		resize: none;
		overflow: hidden;
		min-height: 50px;
		color: var(--color);
		background-color: var(--background-compl);
		border-color: var(--accent-color);
		outline-color: var(--accent-compl);
	}
</style>
