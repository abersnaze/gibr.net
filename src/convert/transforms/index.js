import { default as b16_transforms } from "./base16.js";
import { default as b64_transforms } from "./base64.js";
import { default as b58_transforms } from "./base58.js";
import { default as utf8_transforms } from "./utf8.js";
import { default as json_transforms } from "./json.js";
import { default as yaml_transforms } from "./yaml.js";
import { default as jq_transforms } from "./jq.js";

const transforms = Object.assign(
  b16_transforms,
  b64_transforms,
  b58_transforms,
  utf8_transforms,
  json_transforms,
  yaml_transforms,
  jq_transforms
);

export let defaultOpts = Object.fromEntries(
  Object.entries(transforms).map(([key, value]) => [key, value.defaults])
);

export function analyze(src, options) {
  let results = Object.entries(transforms)
    // only show test for compatable transformes
    .filter(([transform_id, transform]) => src.curr === transform.prev)
    .map(([transform_id, transform]) => {
      // compute the likelyhood and results of using this convertion
      let result = transform.likelyhood(src.content, options[transform_id]);
      result.from_name = transform.name;
      result.from_id = transform_id;
      result.curr ||= transform.next;
      result.optionComp ||= transform.optionComp;
      result.defaults ||= transform.defaults;
      result.transform_id = undefined;
      return result;
    });
  let total = results.reduce((sum, result) => sum + result.score, 0);
  if (total > 0) {
    results.forEach((result) => (result.score = result.score / total));
    results.sort((a, b) => b.score - a.score);
  }
  return results;
}
