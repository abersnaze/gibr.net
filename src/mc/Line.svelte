<script>
  import Logo from "../home/Logo.svelte";

  document.title = "GIBR.net: Minecraft Line Generator";

  let start = [-14, 0, -28];
  // let end = [193, 0, -82];
  let end = [835, 0, -772];

  $: runs = summarize(points(start, end));

  /**
   * generic function for apply a function to vectors
   * @param func
   * @param args
   */
  function vec(func, ...args) {
    console.assert(args.length > 0);
    var len = args[0].length;
    for (let a = 1; a < args.length; a++) {
      console.assert(
        args[a].length === len,
        "argument %d was %d long when expected %d",
        a,
        args[a].length,
        len
      );
    }
    var result = [];
    for (let i = 0; i < len; i++) {
      var slice = [];
      for (let a = 0; a < args.length; a++) {
        slice.push(args[a][i]);
      }
      result.push(func(...slice));
    }
    return result;
  }

  /**
   * generate all the voxels closet to the line.
   * @param start
   * @param end
   */
  function points(start, end) {
    var points = [start];

    // the direction change
    var delta = vec((s, e) => e - s, start, end);
    // the magnitude of the change. used to accrue error
    var mag = vec(Math.abs, delta);
    // +/-1 for each dimention for the direction of the steps
    var sign = vec(Math.sign, delta);
    // pull out the maximum change as a threshold
    var threshold = Math.max(...mag);
    // start the error at half the maximum (perfect line starts in the middle of the cube)
    var err = new Array(start.length).fill(threshold / 2);

    // start at the beginning
    var curr = start;
    // continue to the end
    for (var step = 0; step < threshold; step++) {
      // add the error incurred from moving
      err = vec((e, m) => e + m, err, mag);
      // if the error is higher than the threshold
      // move over one square
      curr = vec((c, s, e) => (e >= threshold ? c + s : c), curr, sign, err);
      // now that we moved over reduce the error by one threshold
      err = vec((e) => (e >= threshold ? e - threshold : e), err);

      // save the point
      points.push(curr);
    }

    return points;
  }

  function summarize(points) {
    var steps = [];
    let index_a = 0;
    while (index_a < points.length - 1) {
      const point_a = points[index_a];
      var index_b, point_b, delta;
      for (
        let index_b_candidate = index_a + 1;
        index_b_candidate < points.length;
        index_b_candidate++
      ) {
        const point_b_candidate = points[index_b_candidate];
        const delta_candidate = vec(
          (a, b) => b - a,
          point_a,
          point_b_candidate
        );
        // we've gone too far
        const x = delta_candidate.reduce(
          (s, d) => s + (Math.abs(d) > 1 ? 1 : 0),
          0
        );
        if (x > 1) {
          console.log("too much", delta_candidate);
          break;
        }

        index_b = index_b_candidate;
        point_b = point_b_candidate;
        delta = delta_candidate;
      }
      console.log(index_a, point_a, index_b, point_b);

      var move = delta[0] + "," + delta[1] + "," + delta[2];
      if (steps.length > 0) {
        var last_step = steps[steps.length - 1];
        if (last_step.move === move) {
          console.log("again", last_step);
          last_step.times++;
          last_step.end = point_b;
        } else {
          steps.push({ move: move, times: 1, start: point_a, end: point_b });
        }
      } else {
        steps.push({ move: move, times: 1, start: point_a, end: point_b });
      }

      index_a = index_b;
    }
    return steps;
  }

  let highlight = 0;
  function next(event) {
    jump(event, highlight < runs.length - 1 ? highlight + 1 : highlight);
  }
  function prev(event) {
    jump(event, highlight > 0 ? highlight - 1 : highlight);
  }
  function jump(event, i) {
    highlight = i;
    document.getElementById(i).scrollIntoView();
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
  <section>
    <h2>Instructions</h2>
    <table>
      <tbody>
        {#each runs as run, i}
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
</main>

<style>
  .coords {
    display: flex;
    align-items: baseline;
  }

  input {
    width: 5rem;
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
    background-color: yellow;
  }
</style>
