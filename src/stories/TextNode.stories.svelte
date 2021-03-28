<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";
  import TextNode from "../convert/TextNode.svelte";

  let content =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.";
</script>

<Meta title="Convert/Component" component={TextNode} />

<Story name="Text" args={{}}>
  <TextNode bind:content />
</Story>
