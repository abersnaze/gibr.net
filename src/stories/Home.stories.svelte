<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";

  import HomePage from "../home/Home.svelte";
</script>

<Meta title="General/Page" component={HomePage} />

<Story name="Home" args={{}}>
  <HomePage />
</Story>
