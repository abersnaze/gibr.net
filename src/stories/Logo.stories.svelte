<script>
  import { Meta, Story, Template } from "@storybook/addon-svelte-csf";

  import LogoComp from "../components/Logo.svelte";
</script>

<Meta title="General/Component" component={LogoComp} />

<Story name="Logo" args={{}}>
  <LogoComp />
</Story>
