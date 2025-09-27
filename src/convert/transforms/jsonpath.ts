import { type Transform, type Content } from "../model";
import TextDisplay from "../display/TextDisplay.svelte";
import TreeDisplay from "../display/TreeDisplay.svelte";

function getValueByPath(obj: any, path: string): any {
  if (!path || path === '.') return obj;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current == null || typeof current !== 'object') {
      throw new Error(`Cannot access property '${key}' on ${typeof current}`);
    }
    
    // Handle array indices
    if (Array.isArray(current)) {
      const index = parseInt(key);
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index '${key}' out of bounds`);
      }
      current = current[index];
    } else {
      if (!(key in current)) {
        throw new Error(`Property '${key}' not found`);
      }
      current = current[key];
    }
  }
  
  return current;
}

function setValueByPath(obj: any, path: string, value: any): any {
  if (!path || path === '.') return value;
  
  const keys = path.split('.');
  const result = JSON.parse(JSON.stringify(obj)); // Deep clone
  let current = result;
  
  // Navigate to the parent of the target
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    
    if (Array.isArray(current)) {
      const index = parseInt(key);
      if (isNaN(index) || index < 0 || index >= current.length) {
        throw new Error(`Array index '${key}' out of bounds`);
      }
      current = current[index];
    } else {
      if (!(key in current)) {
        throw new Error(`Property '${key}' not found`);
      }
      current = current[key];
    }
  }
  
  // Set the final value
  const finalKey = keys[keys.length - 1];
  if (Array.isArray(current)) {
    const index = parseInt(finalKey);
    if (isNaN(index) || index < 0 || index >= current.length) {
      throw new Error(`Array index '${finalKey}' out of bounds`);
    }
    current[index] = value;
  } else {
    current[finalKey] = value;
  }
  
  return result;
}

const transforms: Record<string, Transform> = {
  jsonpath_select: {
    name: "JSONPath",
    prev: TreeDisplay,
    optionsComponent: TextDisplay,
    defaults: ".",
    analyze: (data: any, path: string = ".") => {
      try {
        const content = getValueByPath(data, path);
        
        // Provide the inverse function: selected value -> original object with updated value
        const inverse = (content: Content, options?: string) => {
          return setValueByPath(data, path, content);
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