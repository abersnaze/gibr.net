<script>
  import router from "page";
  import Home from "./pages/Home.svelte";

  let page;
  router("/", () => (page = Home));

  router.start();
</script>

<svelte:component this={page} />
