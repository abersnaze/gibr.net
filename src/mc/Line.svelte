<script>
  import Logo from "../home/Logo.svelte"
  import IsometricDiagram from "./IsometricDiagram.svelte"

  document.title = "GIBR.net: Minecraft Line Generator"

  let start = [10, 72, -28]
  let end = [44, 80, -82]

  $: allPoints = points(start, end)
  $: runs = summarize(allPoints)

  /**
   * generic function for apply a function to vectors
   * @param func
   * @param args
   */
  function vec(func, ...args) {
    console.assert(args.length > 0)
    var len = args[0].length
    for (let a = 1; a < args.length; a++) {
      console.assert(
        args[a].length === len,
        "argument %d was %d long when expected %d",
        a,
        args[a].length,
        len
      )
    }
    var result = []
    for (let i = 0; i < len; i++) {
      var slice = []
      for (let a = 0; a < args.length; a++) {
        slice.push(args[a][i])
      }
      result.push(func(...slice))
    }
    return result
  }

  /**
   * generate all the voxels closet to the line.
   * @param start
   * @param end
   */
  function points(start, end) {
    var points = [start]

    // the direction change
    var delta = vec((s, e) => e - s, start, end)
    // the magnitude of the change. used to accrue error
    var mag = vec(Math.abs, delta)
    // +/-1 for each dimention for the direction of the steps
    var sign = vec(Math.sign, delta)
    // pull out the maximum change as a threshold
    var threshold = Math.max(...mag)
    // start the error at half the maximum (perfect line starts in the middle of the cube)
    var err = new Array(start.length).fill(threshold / 2)

    // start at the beginning
    var curr = start
    // continue to the end
    for (var step = 0; step < threshold; step++) {
      // add the error incurred from moving
      err = vec((e, m) => e + m, err, mag)
      // if the error is higher than the threshold
      // move over one square
      curr = vec((c, s, e) => (e >= threshold ? c + s : c), curr, sign, err)
      // now that we moved over reduce the error by one threshold
      err = vec((e) => (e >= threshold ? e - threshold : e), err)

      // save the point
      points.push(curr)
    }

    return points
  }

  function summarize(points) {
    if (points.length === 0) return []

    var steps = []

    // Process each consecutive pair of points
    for (let i = 0; i < points.length - 1; i++) {
      const point_a = points[i]
      const point_b = points[i + 1]
      const delta = vec((a, b) => b - a, point_a, point_b)
      const move = delta[0] + "," + delta[1] + "," + delta[2]

      // Try to group with the previous step if it's the same move
      if (steps.length > 0) {
        const last_step = steps[steps.length - 1]
        if (last_step.move === move) {
          // Same move, extend the run
          last_step.times++
          last_step.end = point_b
        } else {
          // Different move, start a new run
          steps.push({ move: move, times: 1, start: point_a, end: point_b })
        }
      } else {
        // First step
        steps.push({ move: move, times: 1, start: point_a, end: point_b })
      }
    }

    return steps
  }

  let highlight = 0
  function next(event) {
    jump(event, highlight < runs.length - 1 ? highlight + 1 : highlight)
  }
  function prev(event) {
    jump(event, highlight > 0 ? highlight - 1 : highlight)
  }
  function jump(event, i) {
    highlight = i
    const element = document.getElementById(i)
    if (element) {
      // Scroll the element into view below the sticky diagram
      const diagram = document.querySelector(".diagram-section")
      const diagramHeight = diagram ? diagram.offsetHeight : 0
      const elementTop = element.getBoundingClientRect().top + window.scrollY
      const offset = diagramHeight + 32 // Add some padding (2rem)

      window.scrollTo({
        top: elementTop - offset,
        behavior: "smooth",
      })
    }
  }
</script>

<main>
  <h1><Logo /> Minecraft Line Generator</h1>
  <section>
    <h2>Where are you?</h2>
    <div class="coords">
      <label for="startx">X:</label>
      <input id="startx" bind:value={start[0]} type="number" />
      <label for="starty">Y:</label>
      <input id="starty" bind:value={start[1]} type="number" />
      <label for="startz">Z:</label>
      <input id="startz" bind:value={start[2]} type="number" />
    </div>
  </section>
  <section>
    <h2>Where do you want to go?</h2>
    <div class="coords">
      <label for="endx">X:</label>
      <input id="endx" bind:value={end[0]} type="number" />
      <label for="endy">Y:</label>
      <input id="endy" bind:value={end[1]} type="number" />
      <label for="endz">Z:</label>
      <input id="endz" bind:value={end[2]} type="number" />
    </div>
  </section>
  <div class="content-container">
    <section class="diagram-section">
      <h2>Visualization</h2>
      <IsometricDiagram currentStep={highlight} {runs} {allPoints} />
    </section>
    <section class="instructions-section">
      <h2>Instructions</h2>
      <table>
        <tbody>
          {#each runs as run, i (i)}
            {#if i === highlight}
              <tr>
                <th>from</th>
                <th>do</th>
                <th>times</th>
                <th>to</th>
              </tr>
            {/if}
            <tr id={i} class={i === highlight ? "highlight" : undefined}>
              <td>{run.start}</td>
              <td>{run.move}</td>
              <td>{run.times}</td>
              <td>{run.end}</td>
              {#if i === highlight}
                <td><button on:click={next}>⬇︎</button></td>
                <td><button on:click={prev}>⬆︎</button></td>
              {:else}
                <td><button on:click={(event) => jump(event, i)}>⬅︎</button></td>
              {/if}
            </tr>
          {/each}
        </tbody>
      </table>
    </section>
  </div>
</main>

<style>
  .coords {
    display: flex;
    align-items: baseline;
  }

  input {
    width: 5rem;
  }

  .content-container {
    display: flex;
    flex-direction: row;
    gap: 2rem;
    align-items: flex-start;
  }

  .diagram-section {
    flex: 0 0 auto;
    position: sticky;
    top: 1rem;
  }

  .instructions-section {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* Mobile layout: keep diagram sticky at top */
  @media (max-width: 768px) {
    .content-container {
      flex-direction: column;
    }

    .diagram-section {
      position: sticky;
      top: 1rem;
      width: 100%;
      order: -1;
      z-index: 10;
      background-color: var(--bg-color, white);
      padding-bottom: 1rem;
    }

    .instructions-section {
      width: 100%;
    }
  }

  td {
    padding-inline-start: 1rem;
    padding-inline-end: 1rem;
  }
  tr {
    padding-inline-start: -0.5rem;
    padding-inline-end: -0.5rem;
    align-items: baseline;
  }

  .highlight {
    background-color: var(--highlight-bg);
    color: var(--highlight-color);
  }
</style>
