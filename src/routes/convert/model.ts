import type { Component } from "svelte"

export type TextContent = string | number | boolean
export type BinaryContent = Uint8Array
export type TreeContent = object | null
export type DateContent = Date

export type Content = TextContent | BinaryContent | TreeContent | DateContent

// Display types as string literals instead of component references
export type DisplayName = "TextDisplay" | "BinaryDisplay" | "TreeDisplay" | "DateDisplay"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type OptionComponent = Component<any>

export interface Step {
  content: Content
  curr: DisplayName
  transform_id: string | null
  options?: string
}

export interface Success {
  score: number
  content: Content
  options?: string
}

export interface Failure {
  message: unknown
}

export type Result = Success | Failure

// Extended result type returned by the analyze function in index.ts
export interface AnalyzeResult {
  score: number
  display?: DisplayName
  content?: Content
  message?: unknown
  from_name: string
  from_id: string
  optionComponent?: OptionComponent
  defaults?: string
  transform_id?: string
}

export interface Transform {
  name: string
  prev: DisplayName
  analyze: (input: unknown, options?: string) => Result
  /**
   * Reverse the transform: given the (possibly edited) output content and the
   * original input that produced it, return the new input content. Must be
   * stateless — derive everything from the arguments, never from closures —
   * so analyze results stay serializable across the worker boundary.
   * Optional: without it, backward propagation stops at this step.
   */
  invert?: (output: Content, originalInput: Content, options?: string) => Content
  optionsComponent?: OptionComponent
  defaults?: string
}

// Helper function to infer display name from content type
export function getDisplayName(content: Content): DisplayName {
  if (content instanceof Date) {
    return "DateDisplay"
  } else if (
    typeof content === "string" ||
    typeof content === "number" ||
    typeof content === "boolean"
  ) {
    return "TextDisplay"
  } else if (content instanceof Uint8Array) {
    return "BinaryDisplay"
  } else {
    return "TreeDisplay"
  }
}
