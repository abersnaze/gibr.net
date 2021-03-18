<script>
  import base58 from "base58";
  import { jq } from './jq.asm.bundle.min.js';
  import yaml from "yaml";
  import BinaryNode from "./BinaryNode.svelte";
  import TextNode from "./TextNode.svelte";
  import TreeNode from "./TreeNode.svelte";


  export let depth;
  export let source;
  // console.log("step source", source);

  function toBinary(string) {
    const codeUnits = new Uint16Array(string.length);
    for (let i = 0; i < codeUnits.length; i++) {
      codeUnits[i] = string.charCodeAt(i);
    }
    return new Uint8Array(codeUnits.buffer);
  }

  let transforms = {
    url_decode: {
      name: "URI decode",
      prev: TextNode,
      next: TextNode,
      likelyhood: (data) => {
        try {
          const content = decodeURIComponent(data);
          return { score: 1.0, content };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    json_print: {
      name: "JSON",
      prev: TreeNode,
      next: TextNode,
      likelyhood: (data) => {
        try {
          const score = 1;
          const content = JSON.stringify(data);
          return { score, content };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    json_parse: {
      name: "JSON",
      prev: TextNode,
      likelyhood: (data) => {
        try {
          const content = JSON.parse(data);
          const curr = typeof content === "object" ? TreeNode : TextNode;
          return { score: 2.0, content, curr };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    yaml_print: {
      name: "YAML",
      prev: TreeNode,
      next: TextNode,
      likelyhood: (data) => {
        try {
          const score = 1;
          const content = yaml.stringify(data);
          return { score, content };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    yaml_parse: {
      name: "YAML",
      prev: TextNode,
      likelyhood: (data) => {
        try {
          const score = data.includes("---\n") ? 2.0 : 0.75;
          let content = yaml.parseAllDocuments(data).map((doc) => doc.toJSON());
          if (content.length === 1) {
            content = content[0];
          }
          const curr = typeof content === "object" ? TreeNode : TextNode;
          return { score, content, curr };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    base58_decode: {
      name: "Base 58",
      prev: TextNode,
      next: BinaryNode,
      likelyhood: (data) => {
        try {
          const content = toBinary(base58.decode(data));
          return { score: 2.0, content };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    base64_decode: {
      name: "Base 64",
      prev: TextNode,
      next: TextNode,
      likelyhood: (data) => {
        try {
          const content = atob(data);
          return { score: 1.0, content };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
    jq_transform: {
      name: "JQ",
      prev: TreeNode,
      optionComp: TextNode,
      defaults: ".",
      likelyhood: (data, options) => {
        try {
          const content = jq.json(data, options);
          if (content === null || content === undefined) {
            return { score: 0.0, message: 'not found' };
          }
          const curr = typeof content === "object" ? TreeNode : TextNode;
          return { score: 1.0, content, curr };
        } catch (error) {
          return { score: 0.0, message: error };
        }
      },
    },
  };

  function analyze(src, options) {
    let results = Object.entries(transforms)
      // only show test for compatable transformes
      .filter(([transform_id, transform]) => src.curr === transform.prev)
      .map(([transform_id, transform]) => {
        // compute the likelyhood and results of using this convertion
        let result = transform.likelyhood(src.content, options[transform_id]);
        result.from_name = transform.name;
        result.from_id = transform_id;
        result.curr ||= transform.next;
        result.optionComp ||= transform.optionComp;
        result.defaults ||= transform.defaults;
        result.transform_id = undefined;
        return result;
      });
    let total = results.reduce((sum, result) => sum + result.score, 0);
    results.forEach((result) => (result.score = result.score / total));
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  $: options = Object.fromEntries(Object.entries(transforms).map(([key, value]) => [key, value.defaults]));
  $: results = analyze(source, options);
  $: selected_result = results.find((r) => r.from_id === source.transform_id);
</script>

<div>
  <slot />
  <div class="transform-menu">
    {#each results as result, idx (idx)}
      <input
        type="radio"
        bind:group={source.transform_id}
        id={depth + "-" + idx + "-transform"}
        value={result.from_id}
        class="transform-radio"
      />
      <label
        type="radio"
        value={result.from_name}
        for={depth + "-" + idx + "-transform"}
        class="transform-label"
        >{Math.round(result.score * 100) + "% " + result.from_name}</label
      >
    {/each}
  </div>
  {#if selected_result}
    {#if selected_result.optionComp}
      <svelte:component
        this={selected_result.optionComp}
        bind:content={options[selected_result.from_id]}
      />
    {/if}
    {#if selected_result.message}
      <div>
        <small class="error">{selected_result.message}</small>
      </div>
    {/if}
    <hr />
    {#if selected_result.content !== undefined}
      <svelte:self source={selected_result} depth={depth + 1}>
        <svelte:component
          this={selected_result.curr}
          bind:content={selected_result.content}
        />
      </svelte:self>
    {/if}
  {/if}
</div>

<style>
  .transform-menu {
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
  }

  .transform-radio {
    display: none;
  }

  .transform-radio:checked + .transform-label {
    filter: invert(1);
  }

  .transform-label {
    background-color: white;
    border: solid thin;
    border-radius: 0.3em;
    padding: 0.1em;
    margin: 0.2em;
  }

  .error {
    color: red;
  }
</style>
