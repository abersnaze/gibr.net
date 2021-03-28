import TextNode from "../TextNode.svelte";
import BinaryNode from "../BinaryNode.svelte";
import base58 from "base-58";

export default {
  base58_decode: {
    name: "Base 58",
    prev: TextNode,
    next: BinaryNode,
    likelyhood: (data) => {
      try {
        const content = base58.decode(data);
        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  base58_encode: {
    name: "Base 58",
    prev: BinaryNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = base58.encode(data);
        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
