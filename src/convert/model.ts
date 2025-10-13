import type { Component } from 'svelte';
import TextDisplay from './display/TextDisplay.svelte';
import BinaryDisplay from './display/BinaryDisplay.svelte';
import TreeDisplay from './display/TreeDisplay.svelte';

export type TextContent = string | number | boolean;
export type BinaryContent = Uint8Array;
export type TreeContent = object | null;
export type Content = TextContent | BinaryContent | TreeContent;
export type Display = typeof TextDisplay | typeof BinaryDisplay | typeof TreeDisplay;
export type OptionComponent = Component<{ content: string }>;
export interface Step {
  content: Content;
  transform_id: string | null;
  options?: string;
  inverse?: (content: Content, options?: string) => Content; // Store inverse function
}

interface Success {
  score: number;
  content: Content;
  inverse?: (content: Content, options?: string) => Content; // Function to reverse this transform
}

interface Failure {
  message: any;
}

export type Result = Success | Failure;

// Extended result type returned by the analyze function in index.ts
export interface AnalyzeResult {
  score: number;
  display?: Display;
  content?: Content;
  message?: any;
  inverse?: (content: Content, options?: string) => Content;
  from_name: string;
  from_id: string;
  optionComponent?: OptionComponent;
  defaults?: string;
  transform_id?: string;
}

export interface Transform {
  name: string;
  prev: Display;
  analyze: (input: any, options?: string) => Result;
  optionsComponent?: Component<{ props: string }>;
  defaults?: string;
}

// Helper function to infer display component from content type
export function getDisplayComponent(content: Content): Display {
  if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    return TextDisplay;
  } else if (content instanceof Uint8Array) {
    return BinaryDisplay;
  } else {
    return TreeDisplay;
  }
}
