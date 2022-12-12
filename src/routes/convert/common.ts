import { default as json_transforms } from './transforms/json';
// import { default as yaml_transforms } from "./yaml.js";
// import { default as jq_transforms } from "./jq.js";

export const transforms = {
	//   b16_transforms,
	//   b64_transforms,
	//   b58_transforms,
	//   utf8_transforms,
	...json_transforms
	//   yaml_transforms,
	//   jq_transforms
};
export type TransformIds = keyof typeof transforms;

interface Score {
	score: number;
}

export interface Value {
	success: true;
	content: unknown;
}

export interface Failure {
	success: false;
	message: string;
}

export type Ouput = Value | Failure;
export type Guesses = ({ xid: TransformIds } & Guess)[];
export type Guess = Ouput & Score;

export interface Step {
	value: Ouput;
	timestamp: number;
	results: Guesses;
	selected?: string;
	options: { [T in TransformIds]?: unknown };
}

export interface Transform {
	name: string;
	convert(value: unknown, options: unknown): Guess | undefined;
	options_schema: object;
}

export interface AnalyzeEvent {
	step: number;
	time: number;
	value: unknown;
	options: { [T in TransformIds]?: unknown };
}

export interface ResultsEvent {
	step: number;
	timestamp: number;
	results: Guesses;
}

export interface SubSelectEvent {
	value: unknown;
	wrap(newValue: unknown): void;
}

export interface ChoiceEvent {
	value?: Ouput;
}

export interface InputEvent {
	content: unknown;
}

export type AnalyzeFunction = (id: string | number, input: Value) => Promise<Guesses>;
