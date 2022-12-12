import {
	transforms,
	type AnalyzeEvent,
	type ResultsEvent,
	type Transform,
	type TransformIds
} from './common';

onmessage = (input: MessageEvent<AnalyzeEvent>): void => {
	const label = `analyze_${input.data.step}`;
	try {
		console.time(label);

		const value = input.data.value;
		const options = input.data.options;

		const xforms = Object.entries(transforms) as [TransformIds, Transform][];

		const reply: ResultsEvent = {
			step: input.data.step,
			timestamp: input.data.time,
			results: []
		};

		let total = 0;
		xforms.forEach(([xid, xform]) => {
			// compute the likelyhood and results of using this transform
			const guess = xform.convert(value, options[xid]);
			// filter out failed
			if (guess !== undefined) {
				total += guess.score;
				reply.results.push({ xid, ...guess });
			}
		});

		// reverse sort and round to a precentage.
		if (total > 0) {
			reply.results.sort((a, b) => b.score - a.score);
			reply.results.forEach((guess) => (guess.score = Math.round((guess.score * 100) / total)));
		}

		postMessage(reply);
	} finally {
		console.timeEnd(label);
	}
};

export {};
