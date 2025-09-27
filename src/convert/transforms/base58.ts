import { type Transform, type Content } from "../model";
import TextDisplay from "../display/TextDisplay.svelte";
import BinaryDisplay from "../display/BinaryDisplay.svelte";

// Base58 implementation
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const ALPHABET_MAP: Record<string, number> = {};

for (let i = 0; i < ALPHABET.length; i++) {
  ALPHABET_MAP[ALPHABET.charAt(i)] = i;
}

const base58 = {
  encode: function(buffer: Uint8Array): string {
    if (buffer.length === 0) {
      return "";
    }
    
    let digits = [0];
    
    for (let i = 0; i < buffer.length; i++) {
      // Shift existing digits
      for (let j = 0; j < digits.length; j++) {
        digits[j] <<= 8;
      }
      
      // Add new digit
      digits[0] += buffer[i];
      
      // Carry
      let carry = 0;
      for (let j = 0; j < digits.length; j++) {
        digits[j] += carry;
        carry = (digits[j] / 58) | 0;
        digits[j] %= 58;
      }
      
      // Add carry digits
      while (carry) {
        digits.push(carry % 58);
        carry = (carry / 58) | 0;
      }
    }
    
    // Add leading zeros
    for (let i = 0; buffer[i] === 0 && i < buffer.length - 1; i++) {
      digits.push(0);
    }
    
    // Convert to Base58 alphabet
    return digits.reverse().map(digit => ALPHABET[digit]).join("");
  },
  
  decode: function(string: string): Uint8Array {
    if (string.length === 0) {
      return new Uint8Array(0);
    }
    
    let bytes = [0];
    
    for (let i = 0; i < string.length; i++) {
      const c = string[i];
      if (!(c in ALPHABET_MAP)) {
        throw new Error(`Base58.decode received unacceptable input. Character '${c}' is not in the Base58 alphabet.`);
      }
      
      // Shift existing bytes
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] *= 58;
      }
      
      // Add new byte
      bytes[0] += ALPHABET_MAP[c];
      
      // Carry
      let carry = 0;
      for (let j = 0; j < bytes.length; j++) {
        bytes[j] += carry;
        carry = bytes[j] >> 8;
        bytes[j] &= 0xff;
      }
      
      // Add carry bytes
      while (carry) {
        bytes.push(carry & 0xff);
        carry >>= 8;
      }
    }
    
    // Add leading zeros
    for (let i = 0; string[i] === "1" && i < string.length - 1; i++) {
      bytes.push(0);
    }
    
    return new Uint8Array(bytes.reverse());
  }
};

const transforms: Record<string, Transform> = {
  base58_decode: {
    name: "Base 58",
    prev: TextDisplay,
    analyze: (data: string) => {
      try {
        const content = base58.decode(data);
        
        // Provide the inverse function: binary -> base58 string
        const inverse = (content: Content, options?: string) => {
          if (content instanceof Uint8Array) {
            return base58.encode(content);
          }
          throw new Error("Expected Uint8Array for base58 encoding");
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
  base58_encode: {
    name: "Base 58",
    prev: BinaryDisplay,
    analyze: (data: Uint8Array) => {
      try {
        const content = base58.encode(data);
        
        // Provide the inverse function: base58 string -> binary
        const inverse = (content: Content, options?: string) => {
          if (typeof content === 'string') {
            return base58.decode(content);
          }
          throw new Error("Expected string for base58 decoding");
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
