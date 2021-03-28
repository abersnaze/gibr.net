import TextNode from "../TextNode.svelte";
import TreeNode from "../TreeNode.svelte";
import { jq } from "./jq.asm.bundle.min.js";

export default {
  jq_transform: {
    name: "JQ",
    prev: TreeNode,
    optionComp: TextNode,
    defaults: ".",
    likelyhood: (data, options) => {
      try {
        const content = jq.json(data, options);
        if (content === null || content === undefined) {
          return { score: 0.0, message: 'not found' };
        }
        const curr = typeof content === "object" ? TreeNode : TextNode;
        return { score: 1.0, content, curr };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
