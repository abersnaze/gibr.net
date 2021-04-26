import TextNode from "../TextNode.svelte";
import BinaryNode from "../BinaryNode.svelte";

function fromHexString(hexString) {
  return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
}

function toHexString(bytes) {
  bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

export default {
  base16_decode: {
    name: "Base 16",
    prev: TextNode,
    next: BinaryNode,
    likelyhood: (data) => {
      try {
        const content = fromHexString(data.replace(/[\s]*/g, ""));

        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  base16_encode: {
    name: "Base 16",
    prev: BinaryNode,
    next: TextNode,
    likelyhood: (data) => {
      try {
        const content = toHexString(data);

        return { score: 1.0, content };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};