import type { Result, Settings, Transforms, Failure, Entries, TransformId } from "../model";

export const transforms: Transforms = {
  string_to_json: {
    name: "String to JSON",
    default_options: "{}",
    convert: (input: unknown) => {
      if (typeof input !== "string") {
        console.log("string_to_json input", input, "empty");
        return { state: "empty" };
      }
      const output = JSON.parse(input);
      console.log("string_to_json input", input, "output", output);
      return {
        state: "success",
        score: 1,
        output,
        inverse: (new_output: unknown) => JSON.stringify(new_output),
      }
    },
  },
  json_to_string: {
    name: "String to JSON",
    default_options: "{}",
    convert: (input: unknown) => {
      const output = JSON.stringify(input);
      console.log("json_to_string input", input, "output", output);
      return {
        state: "success",
        score: 1,
        output,
        inverse: (new_output: string) => JSON.parse(new_output),
      }
    },
  },
};

export async function analyze(value: unknown, settings: Iterable<Settings>): Promise<Result[]> {
  const results: Result[] = [];
  // for each transform in transforms
  for (const [transform_id, transform] of Object.entries(transforms)) {
    try {
      const result = transform.convert(value, transform.default_options);
      if (result.state !== "empty") {
        results.push({
          ...result,
          transform_id
        });
      }
    } catch (e) {
      results.push({
        state: "failure",
        message: String(e),
        transform_id,
      });
    }
  }
  return results;
}
