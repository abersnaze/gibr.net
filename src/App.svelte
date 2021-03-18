<script>
  import router from "page";
  import Convert from "./convert/Convert.svelte";
  import Home from "./home/Home.svelte";
  import Uses from "./home/Uses.svelte";

  let page;
  router("/", () => (page = Home));
  router("/uses", () => (page = Uses));
  router("/convert", () => (page = Convert));

  router.start();
</script>

<svelte:component this={page} />
