import type { Guess, Transform } from '../common';

function parse_json(fromValue: unknown): Guess | undefined {
	try {
		if (!fromValue) return;
		const content = JSON.parse(fromValue.toString());
		return {
			success: true,
			score: 2.0,
			content
		};
	} catch (error) {
		return {
			success: false,
			score: 0,
			message: '' + error
		};
	}
}

function print_json(fromValue: unknown): Guess | undefined {
	try {
		if (typeof fromValue === 'string') return undefined;
		const content = JSON.stringify(fromValue, undefined, 2);
		return {
			success: true,
			score: 1,
			content
		};
	} catch (error) {
		return {
			success: false,
			message: error + '',
			score: 0
		};
	}
}

export default {
	json_print: {
		name: 'JSON',
		convert: print_json,
		options_schema: {}
	} as Transform,
	json_parse: {
		name: 'JSON',
		convert: parse_json,
		options_schema: {}
	} as Transform
};
