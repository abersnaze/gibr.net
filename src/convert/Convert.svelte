<script>
  import Logo from "../home/Logo.svelte";
  import Step from "./Step.svelte";
  import TextNode from "./TextNode.svelte";

  document.title = "GIBR.net: Convert Things";

  let source = {
    content: "",
    curr: TextNode,
  };
</script>

<main>
  <h1><Logo /> Convert Things.</h1>
  <section>
    <Step bind:source depth={0}>
      <TextNode bind:content={source.content} />
    </Step>
  </section>
</main>
