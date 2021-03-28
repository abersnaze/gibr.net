import TextNode from "../TextNode.svelte";
import TreeNode from "../TreeNode.svelte";
import yaml from "yaml";

export default {
  yaml_print: {
    name: "YAML",
    prev: TreeNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const score = 1;
        const content = yaml.stringify(data);
        return { score, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  yaml_parse: {
    name: "YAML",
    prev: TextNode,
    likelyhood: (data) => {
      try {
        const score = data.includes("---\n") ? 2.0 : 0.75;
        let content = yaml.parseAllDocuments(data).map((doc) => doc.toJSON());
        if (content.length === 1) {
          content = content[0];
        }
        const curr = typeof content === "object" ? TreeNode : TextNode;
        return { score, content, curr };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
