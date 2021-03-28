import TextNode from "../TextNode.svelte";
import BinaryNode from "../BinaryNode.svelte";
import base58 from "base-58";

export default {
  base58_decode: {
    name: "Base 58 decode",
    prev: TextNode,
    next: BinaryNode,
    likelyhood: (data) => {
      try {
        const content = base58.decode(data);
        return { score: 2.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  base58_bin_encode: {
    name: "Base 58 encode",
    prev: BinaryNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = base58.encode(data);
        return { score: 2.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  base58_txt_encode: {
    name: "Base 58 encode",
    prev: TextNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = base58.encode(data);
        return { score: 2.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};
