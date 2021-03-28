<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";
  import BinaryNode from "../convert/BinaryNode.svelte";

  let content = new Uint8Array([]);
</script>

<Meta title="Convert/Component" component={BinaryNode} />

<Template let:args>
  <BinaryNode content={args.content} />
</Template>

<Story
  name="I heart NY"
  args={{
    content: "eyJhc2RmYXNkZiI6IknimaVOWSJ9Cg==",
  }}
/>

<Story
  name="Protobuf"
  args={{
    content:
      "CjNNb25ldFRleHRBc3NldF9kOGFlN2ZiNC1iMmM4LTQyYjItOTQ1NS1lZjk1YjgxMTdhZTkSEm1vbmV0YWRzcG90bWFuYWdlchoSbW9uZXRhZHNwb3RtYW5hZ2VyehhNaW1pIMWhw6lmOiBLZGUgamUgbWltaT+KASQzZjI2MDhmMC05MWFkLTMxNjQtOGM4OS03NzE3NDM4ODQ5M2M=",
  }}
/>
