import { type Content, type Transform } from "../model";
import TextDisplay from "../display/TextDisplay.svelte";
import BinaryDisplay from "../display/BinaryDisplay.svelte";

function fromHexString(hexString: string): Uint8Array {
  return new Uint8Array(hexString.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

function toHexString(bytes: Uint8Array): string {
  return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
}

const transforms: Record<string, Transform> = {
  base16_decode: {
    name: "Base 16",
    prev: TextDisplay,
    analyze: (data: string) => {
      try {
        const content = fromHexString(data.replace(/[\s]*/g, ""));
        
        // Provide the inverse function: binary -> hex string
        const inverse = (content: Content, options?: string) => {
          if (content instanceof Uint8Array) {
            return toHexString(content);
          }
          throw new Error("Expected Uint8Array for base16 encoding");
        };

        return { 
          score: 1.0, 
          content,
          inverse
        };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
  base16_encode: {
    name: "Base 16", 
    prev: BinaryDisplay,
    analyze: (data: Uint8Array) => {
      try {
        const content = toHexString(data);
        
        // Provide the inverse function: hex string -> binary
        const inverse = (content: Content, options?: string) => {
          if (typeof content === "string") {
            return fromHexString(content.replace(/[\s]*/g, ""));
          }
          throw new Error("Expected string for base16 encoding");
        };

        return { 
          score: 1.0, 
          content,
          inverse
        };
      } catch (error) {
        return { score: 0.0, message: error };
      }
    },
  },
};

export default transforms;