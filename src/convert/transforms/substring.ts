import { type Transform, type Content } from "../model";
import TextDisplay from "../display/TextDisplay.svelte";

const transforms: Record<string, Transform> = {
  substring_select: {
    name: "Substring",
    prev: TextDisplay,
    // No optionsComponent - substring is selected by highlighting text in TextDisplay
    defaults: JSON.stringify({ start: 0, end: 0 }),
    analyze: (data: string, options?: string) => {
      try {
        // Parse options to get start and end indices
        const { start, end } = options ? JSON.parse(options) : { start: 0, end: 0 };

        if (typeof data !== 'string') {
          return { score: 0.0, message: `Expected string, got ${typeof data}` };
        }

        // Extract substring
        const content = data.substring(start, end);

        // Provide the inverse function: substring -> full string with substring replaced
        const inverse = (newContent: Content, opts?: string) => {
          if (typeof newContent !== 'string') {
            throw new Error("Expected string for substring replacement");
          }

          // Replace the substring with the new content
          const { start, end } = opts ? JSON.parse(opts) : { start: 0, end: 0 };
          return data.substring(0, start) + newContent + data.substring(end);
        };

        return {
          score: 1.0,
          content,
          inverse
        };
      } catch (error) {
        return { score: 0.0, message: error instanceof Error ? error.message : String(error) };
      }
    },
  },
};

export default transforms;
