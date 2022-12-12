// import type { Result, Transform } from "./common";

// function fromHexString(hexString: string) {
//   return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
// }

// function toHexString(bytes: byte) {
//   return bytes.reduce((str, byte) => str + byte.toString(16).padStart(2, '0'), '');
// }

// export default {
//   base16_decode: {
//     name: "Base 16",
//     fromType: "string",
//     toType: "binary",
//       convert: (data): Result =>  {
//       try {
//         const content = fromHexString(data.replace(/[\s]*/g, ""));

//         return { score: 1.0, value: content };
//       } catch (error) {
//         return { score: 0.0, error: error };
//       }
//     },
//   } as Transform,
//   base16_encode: {
//     name: "Base 16",
//     prev: "binary",
//     next: "string",
//     likelyhood: (data) => {
//       try {
//         const content = toHexString(data);

//         return { score: 1.0, content };
//       } catch (error) {
//         return { score: 0.0, message: error };
//       }
//     },
//   },
// };

export {};
