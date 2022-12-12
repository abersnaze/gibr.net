<script lang="ts">
	import { preloadCode } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { Guesses, Value } from './common';

	const loadWorker = async () => {
		const Worker = await import('./analyze.worker?worker');
		return new Worker.default();
	};

	const TIMEOUT_MS = 1000;

	onMount(loadWorker);

	interface Incomplete {
		start: number;
		resolve: (value: Guesses | PromiseLike<Guesses>) => void;
		reject: (reason?: any) => void;
	}

	function analyzer(worker: Worker) {
		// to track the outstanding requests
		const incompleteResolvers: { [key: string | number]: Incomplete } = {};
		worker.onmessage = (event) => {
			event.data;
		};
		return (id: string | number, input: Value): Promise<Guesses> => {
			const output = new Promise<Guesses>((resolve, reject) => {
				let start = performance.now();
				if (incompleteResolvers.hasOwnProperty(id)) {
					const previous = incompleteResolvers[id];
					if (start > previous.start) {
						previous.reject(
							new Error(
								`superseded by newer request for ${id} started ${
									start - previous.start
								} milliseconds ago`
							)
						);
					} else {
						reject(
							new Error(
								`earlier request already exists for ${id} started ${
									previous.start - start
								} milliseconds ago`
							)
						);
						// skip sending to the worker.
						return;
					}
				}
				incompleteResolvers[id] = { start, resolve, reject };
			});
			// worker.postMessage();
			return Promise.race([
				output,
				new Promise<Guesses>((resolve, reject) => setTimeout(() => reject('timeout'), TIMEOUT_MS))
			]);
		};
	}
</script>

{#await loadWorker() then worker}
	<slot analyzer={analyzer(worker)} />
{/await}
