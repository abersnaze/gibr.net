import TextNode from "../TextNode.svelte";
import BinaryNode from "../BinaryNode.svelte";

export default transforms = {
  url_decode: {
    name: "URI decode",
    prev: TextNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = decodeURIComponent(data);
        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
