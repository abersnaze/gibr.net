<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";

  import HomePage from "../pages/Home.svelte";
</script>

<Meta title="General/Page" component={HomePage} />

<Story name="Home" args={{}}>
  <HomePage />
</Story>
