<script>
  import Logo from "../home/Logo.svelte"
  import IsometricDiagram from "./IsometricDiagram.svelte"
  import { onMount } from "svelte"
  import { replaceState } from "$app/navigation"

  document.title = "GIBR.net: Minecraft Line Generator"

  // Initialize from URL params or defaults
  let start = [10, 72, -28]
  let end = [44, 80, -82]
  let highlight = 0
  let initialized = false

  onMount(() => {
    // Load from URL params first (highest priority)
    const params = new URLSearchParams(window.location.search)

    if (params.has("start")) {
      const startParam = params.get("start")
      // Parse format: x10y72z-28
      const match = startParam.match(/x(-?\d+)y(-?\d+)z(-?\d+)/)
      if (match) {
        start = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      }
    } else {
      // If no URL params, load from localStorage
      const savedStart = localStorage.getItem("minecraft-line-start")
      if (savedStart !== null) {
        try {
          const parsed = JSON.parse(savedStart)
          if (Array.isArray(parsed) && parsed.length === 3) {
            start = parsed
          }
        } catch {
          // Ignore parse errors, use defaults
        }
      }
    }

    if (params.has("end")) {
      const endParam = params.get("end")
      // Parse format: x44y80z-82
      const match = endParam.match(/x(-?\d+)y(-?\d+)z(-?\d+)/)
      if (match) {
        end = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])]
      }
    } else {
      // If no URL params, load from localStorage
      const savedEnd = localStorage.getItem("minecraft-line-end")
      if (savedEnd !== null) {
        try {
          const parsed = JSON.parse(savedEnd)
          if (Array.isArray(parsed) && parsed.length === 3) {
            end = parsed
          }
        } catch {
          // Ignore parse errors, use defaults
        }
      }
    }

    // Load highlight from localStorage
    const savedHighlight = localStorage.getItem("minecraft-line-step")
    if (savedHighlight !== null) {
      const parsed = parseInt(savedHighlight)
      if (!isNaN(parsed)) {
        highlight = parsed
      }
    }

    // Mark as initialized to allow reactive statements to run
    initialized = true
  })

  // Update URL and localStorage when start/end changes
  $: {
    if (initialized && typeof window !== "undefined") {
      const params = new URLSearchParams()
      params.set("start", `x${start[0]}y${start[1]}z${start[2]}`)
      params.set("end", `x${end[0]}y${end[1]}z${end[2]}`)

      const newUrl = `${window.location.pathname}?${params.toString()}`
      replaceState({}, "", newUrl)

      // Save to localStorage as well
      localStorage.setItem("minecraft-line-start", JSON.stringify(start))
      localStorage.setItem("minecraft-line-end", JSON.stringify(end))
    }
  }

  // Save highlight to localStorage when it changes
  $: {
    if (initialized && typeof window !== "undefined") {
      localStorage.setItem("minecraft-line-step", highlight.toString())
    }
  }

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

    // First, get basic moves
    var basicMoves = []
    for (let i = 0; i < points.length - 1; i++) {
      const point_a = points[i]
      const point_b = points[i + 1]
      const delta = vec((a, b) => b - a, point_a, point_b)
      basicMoves.push({
        move: delta[0] + "," + delta[1] + "," + delta[2],
        from: point_a,
        to: point_b,
      })
    }

    // Group consecutive identical moves
    var groupedMoves = []
    for (let i = 0; i < basicMoves.length; i++) {
      if (
        groupedMoves.length > 0 &&
        groupedMoves[groupedMoves.length - 1].move === basicMoves[i].move
      ) {
        groupedMoves[groupedMoves.length - 1].times++
        groupedMoves[groupedMoves.length - 1].to = basicMoves[i].to
      } else {
        groupedMoves.push({
          move: basicMoves[i].move,
          times: 1,
          from: basicMoves[i].from,
          to: basicMoves[i].to,
        })
      }
    }

    // Find repeating patterns
    var steps = []
    let i = 0
    while (i < groupedMoves.length) {
      // Try to find a pattern starting at position i
      let bestPattern = null
      let bestRepeat = 1

      // Try pattern lengths from 1 to half of remaining moves
      const maxPatternLen = Math.floor((groupedMoves.length - i) / 2)
      for (let patternLen = 1; patternLen <= Math.min(maxPatternLen, 10); patternLen++) {
        const pattern = groupedMoves.slice(i, i + patternLen)
        let repeatCount = 1

        // Count how many times this pattern repeats
        let pos = i + patternLen
        while (pos + patternLen <= groupedMoves.length) {
          const candidate = groupedMoves.slice(pos, pos + patternLen)
          if (
            candidate.length === pattern.length &&
            candidate.every(
              (m, idx) => m.move === pattern[idx].move && m.times === pattern[idx].times
            )
          ) {
            repeatCount++
            pos += patternLen
          } else {
            break
          }
        }

        // Keep this pattern if it repeats at least twice and is better than what we found
        if (
          repeatCount >= 2 &&
          repeatCount * patternLen > bestRepeat * (bestPattern?.length || 0)
        ) {
          bestPattern = pattern
          bestRepeat = repeatCount
        }
      }

      if (bestPattern && bestRepeat >= 2) {
        // Found a repeating pattern
        const patternEnd = groupedMoves[i + bestPattern.length * bestRepeat - 1].to

        // Calculate net movement for one iteration of the pattern
        let netX = 0,
          netY = 0,
          netZ = 0
        for (const m of bestPattern) {
          const [x, y, z] = m.move.split(",").map((n) => parseInt(n))
          netX += x * m.times
          netY += y * m.times
          netZ += z * m.times
        }
        const netMove = `${netX},${netY},${netZ}`

        // Calculate total number of blocks for visualization
        const totalBlocks = bestPattern.reduce((sum, m) => sum + m.times, 0) * bestRepeat

        steps.push({
          move: netMove,
          times: bestRepeat, // Show pattern repeat count in the table
          totalBlocks: totalBlocks, // Use this for visualization
          start: groupedMoves[i].from,
          end: patternEnd,
          isPattern: true,
        })
        i += bestPattern.length * bestRepeat
      } else {
        // No pattern, just add the single move
        steps.push({
          move: groupedMoves[i].move,
          times: groupedMoves[i].times,
          start: groupedMoves[i].from,
          end: groupedMoves[i].to,
          isPattern: false,
        })
        i++
      }
    }

    // Add a final step to visualize reaching the end
    if (points.length > 0) {
      const lastPoint = points[points.length - 1]
      steps.push({
        move: "END",
        times: 1,
        totalBlocks: 1,
        start: lastPoint,
        end: lastPoint,
        isPattern: false,
      })
    }

    return steps
  }

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
