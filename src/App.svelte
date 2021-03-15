<script>
  import router from "page";
  import Home from "./pages/Home.svelte";
  import Uses from "./pages/Uses.svelte";

  let page;
  router("/", () => (page = Home));
  router("/uses", () => (page = Uses));

  router.start();
</script>

<svelte:component this={page} />
