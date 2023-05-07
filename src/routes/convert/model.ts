/**
 * A transform is a function that converts an input to an output.
 */
export interface Transform {
  name: string;
  default_options: string;
  convert(input: unknown, options: string): IntermediateResult;
}

export type Entries<T> = { [K in keyof T]: [K, T[K]] }[keyof T][];

export type Transforms = { [key: string]: Transform };

export type TransformId = keyof Transforms & string;

export type Results = { [key: TransformId]: Result };

/**
 * The transform successfully converted the input to the output.
 */
interface Success {
  state: "success";
  score: number;
  output: unknown;
  /**
   * closes over the original options used to convert the input to the output.
   * @param value The output converted back to the original input type.
   */
  inverse(new_output: unknown): unknown;
}

/**
 * The transform failed to convert the input to the output.
 */
export interface Failure {
  state: "failure";
  message: string;
}

/**
 * The transform is not applicable to the input.
 */
interface Empty {
  state: "empty";
}

export type IntermediateResult = Success | Failure | Empty;
export type Result = (Success | Failure) & { transform_id: TransformId };

export interface Settings {
  transform_id: TransformId;
  options: string;
}

/**
 * The settings for a transform.
 */
export interface Choices {
  selected: Settings | undefined;
  next_choices: Map<Settings, Choices>;
}
