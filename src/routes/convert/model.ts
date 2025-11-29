import type { Component } from 'svelte';

export type TextContent = string | number | boolean;
export type BinaryContent = Uint8Array;
export type TreeContent = object | null;
export type DateContent = Date;

export type Content = TextContent | BinaryContent | TreeContent | DateContent;

// Display types as string literals instead of component references
export type DisplayName = 'TextDisplay' | 'BinaryDisplay' | 'TreeDisplay' | 'DateDisplay';
export type OptionComponent = Component<{ content: string }>;

export interface Step {
  content: Content;
  curr: DisplayName; // Changed from component to string
  transform_id: string | null;
  options?: string;
  inverse?: (content: Content, options?: string) => Content; // Store inverse function
}

export interface Success {
  score: number;
  content: Content;
  inverse?: (content: Content, options?: string) => Content; // Function to reverse this transform
  options?: string; // Options that were actually used (e.g., after auto-detection)
}

export interface Failure {
  message: any;
}

export type Result = Success | Failure;

// Extended result type returned by the analyze function in index.ts
export interface AnalyzeResult {
  score: number;
  display?: DisplayName; // Changed from component to string
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
  prev: DisplayName; // Changed from component to string
  analyze: (input: any, options?: string) => Result;
  optionsComponent?: Component<{ props: string }>;
  defaults?: string;
}

// Helper function to infer display name from content type
export function getDisplayName(content: Content): DisplayName {
  if (content instanceof Date) {
    return 'DateDisplay';
  } else if (typeof content === 'string' || typeof content === 'number' || typeof content === 'boolean') {
    return 'TextDisplay';
  } else if (content instanceof Uint8Array) {
    return 'BinaryDisplay';
  } else {
    return 'TreeDisplay';
  }
}
