<script lang="ts">
  import { tickLevel } from "./model"
  import type { FractionEntry } from "./model"

  export let entry: FractionEntry

  const padLeft = 30
  const padRight = 30
  const svgWidth = 500
  const drawWidth = svgWidth - padLeft - padRight
  const svgHeight = 60
  const tapeTop = 10
  const tapeHeight = 36
  const maxTickH = 34
  const minTickH = 4
  const labelY = 58

  $: maxLevel = Math.log2(entry.maxDenominator)

  function getHeight(level: number): number {
    return minTickH + (maxTickH - minTickH) * (level / maxLevel)
  }

  function xPos(frac: number): number {
    return padLeft + frac * drawWidth
  }

  $: ticks = Array.from({ length: entry.maxDenominator + 1 }, (_, i) => {
    const level = tickLevel(i, entry.maxDenominator)
    return {
      x: xPos(i / entry.maxDenominator),
      h: getHeight(level),
      isNearest: i === entry.rawNumerator,
      isEnd: i === 0 || i === entry.maxDenominator,
    }
  })

  $: exactX = xPos(entry.fractional)
  $: showArrow = entry.fractional > 0
</script>

<svg
  viewBox="0 0 {svgWidth} {svgHeight}"
  class="tape"
  aria-label="Tape measure showing fraction position"
>
  <!-- Exact value arrow (above tape, pointing down) -->
  {#if showArrow}
    <polygon points="{exactX - 5},0 {exactX + 5},0 {exactX},8" class="arrow" />
    <line x1={exactX} y1={8} x2={exactX} y2={tapeTop} class="arrow-stem" />
  {/if}

  <!-- Tape body -->
  <rect x={padLeft} y={tapeTop} width={drawWidth} height={tapeHeight} class="tape-body" rx="1" />
  <line x1={padLeft} y1={tapeTop} x2={padLeft + drawWidth} y2={tapeTop} class="edge" />

  <!-- Tick marks (from top edge downward) -->
  {#each ticks as tick, i (i)}
    <line
      x1={tick.x}
      y1={tapeTop}
      x2={tick.x}
      y2={tapeTop + tick.h}
      class="tick"
      class:nearest={tick.isNearest}
      stroke-width={tick.isNearest ? 2.5 : tick.isEnd ? 1.5 : 0.75}
    />
  {/each}

  <!-- Whole number labels -->
  <text x={padLeft} y={labelY} text-anchor="middle" class="label">{entry.tapeWhole}</text>
  <text x={padLeft + drawWidth} y={labelY} text-anchor="middle" class="label">
    {entry.tapeWhole + 1}
  </text>
</svg>

<style>
  .tape {
    width: 100%;
    height: auto;
  }

  .tape-body {
    fill: var(--toggle-bg);
  }

  .edge {
    stroke: var(--text-color);
    stroke-width: 1.5;
  }

  .tick {
    stroke: var(--text-color);
  }

  .tick.nearest {
    stroke: var(--link-color);
  }

  .arrow {
    fill: var(--text-color);
  }

  .arrow-stem {
    stroke: var(--text-color);
    stroke-width: 1;
  }

  .label {
    font-size: 11px;
    fill: var(--text-secondary);
    font-family: inherit;
  }
</style>
