import TextNode from "../TextNode.svelte";
import TreeNode from "../TreeNode.svelte";

export default {
  json_print: {
    name: "JSON",
    prev: TreeNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const score = 1;
        const content = JSON.stringify(data, undefined, 2);
        return { score, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  json_parse: {
    name: "JSON",
    prev: TextNode,
    likelyhood: (data) => {
      try {
        const content = JSON.parse(data);
        const curr = typeof content === "object" ? TreeNode : TextNode;
        return { score: 2.0, content, curr };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
