import { type Transform, type Content } from "../model";
import TextDisplay from "../display/TextDisplay.svelte";
import TreeDisplay from "../display/TreeDisplay.svelte";

const transforms: Record<string, Transform> = {
  json_stringify: {
    name: "JSON",
    prev: TreeDisplay,
    analyze: (data: any) => {
      try {
        const content = JSON.stringify(data, undefined, 2);
        
        // Provide the inverse function: JSON text -> object
        const inverse = (content: Content, options?: string) => {
          if (typeof content === 'string') {
            return JSON.parse(content);
          }
          throw new Error("Expected string for JSON parsing");
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
  json_parse: {
    name: "JSON",
    prev: TextDisplay,
    analyze: (data: string) => {
      try {
        const content = JSON.parse(data);
        
        // Provide the inverse function: object -> JSON text
        const inverse = (content: Content, options?: string) => {
          return JSON.stringify(content, undefined, 2);
        };
        
        return { 
          score: 2.0, 
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