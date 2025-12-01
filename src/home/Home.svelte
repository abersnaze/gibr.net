<script>
  import Logo from "./Logo.svelte"

  document.title = "GIBR.net: Hello"
</script>

<main>
  <h1><Logo /> Hello, I'm George</h1>
  <p>
    I'm a software developer at Netflix. My most influential contribution to software is my work on
    RxJava and asynchronous APIs.
  </p>
  <ul>
    <li>
      <a class="external" href="https://www.linkedin.com/in/georgecampbell/">linkedin</a>
    </li>
    <li>
      <a class="external" href="https://github.com/abersnaze">github</a>
    </li>
    <li><a href="/uses">things I use</a></li>
  </ul>
  <h2>I'm making some tools</h2>
  <dl>
    <dt><a href="/convert">Convert</a></dt>
    <dd>Tools for convert things to other things</dd>
    <dt><a href="/line">Minecraft Line Generator</a></dt>
    <dd>Tool for drawing diagonal lines</dd>
  </dl>
</main>
