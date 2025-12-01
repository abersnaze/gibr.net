import { type Transform, type Content } from "../model.js"

/*
https://gist.github.com/enepomnyaschih/72c423f727d395eeaa09697058238727

MIT License
Copyright (c) 2020 Egor Nepomnyaschih
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

const base64abc = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
  "r",
  "s",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "+",
  "/",
]

const base64codes = [
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
  255, 255, 255, 255, 255, 62, 255, 255, 255, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 255, 255,
  255, 0, 255, 255, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 255, 255, 255, 255, 255, 255, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37,
  38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
]

function getBase64Code(charCode: number, i: number) {
  if (charCode >= base64codes.length) {
    throw new Error("Unable to parse base64 string. at " + i)
  }
  const code = base64codes[charCode]
  if (code === 255) {
    throw new Error("Unable to parse base64 string. at " + i)
  }
  return code
}

export function bytesToBase64(bytes: Uint8Array): string {
  let result = "",
    i,
    l = bytes.length
  for (i = 2; i < l; i += 3) {
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += base64abc[((bytes[i - 1] & 0x0f) << 2) | (bytes[i] >> 6)]
    result += base64abc[bytes[i] & 0x3f]
  }
  if (i === l + 1) {
    // 1 octet yet to write
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[(bytes[i - 2] & 0x03) << 4]
    result += "=="
  }
  if (i === l) {
    // 2 octets yet to write
    result += base64abc[bytes[i - 2] >> 2]
    result += base64abc[((bytes[i - 2] & 0x03) << 4) | (bytes[i - 1] >> 4)]
    result += base64abc[(bytes[i - 1] & 0x0f) << 2]
    result += "="
  }
  return result
}

export function base64ToBytes(str: string): Uint8Array {
  if (str.length % 4 !== 0) {
    throw new Error("Unable to parse base64 string. not divisable by 4")
  }
  const index = str.indexOf("=")
  if (index !== -1 && index < str.length - 2) {
    throw new Error("Unable to parse base64 string.")
  }
  let missingOctets = str.endsWith("==") ? 2 : str.endsWith("=") ? 1 : 0,
    n = str.length,
    result = new Uint8Array(3 * (n / 4)),
    buffer
  for (let i = 0, j = 0; i < n; j += 3) {
    buffer =
      (getBase64Code(str.charCodeAt(i++), i) << 18) |
      (getBase64Code(str.charCodeAt(i++), i) << 12) |
      (getBase64Code(str.charCodeAt(i++), i) << 6) |
      getBase64Code(str.charCodeAt(i++), i)
    result[j] = buffer >> 16
    result[j + 1] = (buffer >> 8) & 0xff
    result[j + 2] = buffer & 0xff
  }
  return result.subarray(0, result.length - missingOctets)
}

const transforms: Record<string, Transform> = {
  b64_decode: {
    name: "Base 64",
    prev: "TextDisplay",
    analyze: (data: string) => {
      try {
        // Type check - ensure data is a string
        if (typeof data !== "string") {
          return { score: 0.0, message: `Expected string, got ${typeof data}` }
        }

        const content = base64ToBytes(data.replace(/[\s]*/g, ""))

        // Provide the inverse function: binary -> base64 string
        const inverse = (content: Content, options?: string) => {
          if (content instanceof Uint8Array) {
            return bytesToBase64(content)
          }
          throw new Error("Expected Uint8Array for base64 encoding")
        }

        return {
          score: 1.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
  b64_encode: {
    name: "Base 64",
    prev: "BinaryDisplay",
    analyze: (data: Uint8Array) => {
      try {
        // Type check - ensure data is a Uint8Array
        if (!(data instanceof Uint8Array)) {
          return { score: 0.0, message: `Expected Uint8Array, got ${typeof data}` }
        }

        const content = bytesToBase64(data)

        // Provide the inverse function: base64 string -> binary
        const inverse = (content: Content, options?: string) => {
          if (typeof content === "string") {
            return base64ToBytes(content.replace(/[\s]*/g, ""))
          }
          throw new Error("Expected string for base64 decoding")
        }

        return {
          score: 1.0,
          content,
          inverse,
        }
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) }
      }
    },
  },
}

export default transforms
