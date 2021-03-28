import TextNode from "../TextNode.svelte";
import BinaryNode from "../BinaryNode.svelte";

export default {
  utf8_encode: {
    name: "UTF-8",
    prev: BinaryNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = new TextDecoder('utf8', { fatal: true }).decode(data);
        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    }
  },
};
