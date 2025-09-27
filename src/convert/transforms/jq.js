import TextDisplay from "../display/TextDisplay.svelte";
import TreeDisplay from "../display/TreeDisplay.svelte";
import { jq } from "./jq.asm.bundle.min.js";

const transforms = {
  jq_transform: {
    name: "JQ",
    prev: TreeDisplay,
    optionComp: TextDisplay,
    defaults: ".",
    analyze: (data, options) => {
      try {
        const content = jq.json(data, options);
        if (content === null || content === undefined) {
          return { score: 0.0, message: 'not found' };
        }
        
        // Note: JQ transforms are generally not reversible since they can be
        // complex queries that lose information. No inverse function provided.
        return { 
          score: 1.0, 
          content,
          inverse: null,
        };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};

export default transforms;
