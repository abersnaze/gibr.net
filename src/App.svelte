<script>
  import router from "page";
  import Convert from "./convert/Convert.svelte";
  import Home from "./home/Home.svelte";
  import Uses from "./home/Uses.svelte";
  import Line from "./mc/Line.svelte";

  let page;
  router("/", () => (page = Home));
  router("/uses", () => (page = Uses));
  router("/convert", () => (page = Convert));
  router("/line", () => (page = Line));

  router.start();
</script>

<svelte:component this={page} />
