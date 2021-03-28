<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";
  import TreeNode from "../convert/TreeNode.svelte";

  let content = {
    glossary: {
      title: "example glossary",
      GlossDiv: {
        title: "S",
        GlossList: {
          GlossEntry: {
            ID: "SGML",
            SortAs: "SGML",
            GlossTerm: "Standard Generalized Markup Language",
            Acronym: "SGML",
            Abbrev: "ISO 8879:1986",
            GlossDef: {
              para:
                "A meta-markup language, used to create markup languages such as DocBook.",
              GlossSeeAlso: ["GML", "XML", "HTML"],
            },
            GlossSee: "markup",
          },
        },
      },
    },
  };
</script>

<Meta title="Convert/Component" component={TreeNode} />

<Story name="Tree" args={{}}>
  <TreeNode bind:content />
</Story>
