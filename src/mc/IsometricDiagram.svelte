<script>
  import { onMount } from "svelte"

  export let currentStep = 0
  export let runs = []
  export let allPoints = []

  let canvas
  let ctx
  let isDarkMode = false
  let animationProgress = 0
  let animating = false
  let animationStartTime = 0
  let animationDuration = 300 // milliseconds
  let previousBlockIndex = 0
  let targetBlockIndex = 0

  onMount(() => {
    ctx = canvas.getContext("2d")

    // Detect dark mode
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    isDarkMode = mediaQuery.matches

    mediaQuery.addEventListener("change", (e) => {
      isDarkMode = e.matches
      draw()
    })

    draw()
  })

  $: if (ctx) {
    // Calculate new target block index when currentStep changes
    let newBlockIndex = 0
    if (runs.length > 0 && currentStep < runs.length) {
      for (let i = 0; i < currentStep; i++) {
        const run = runs[i]
        // Use totalBlocks for patterns, times for regular moves
        const blockCount = run.totalBlocks !== undefined ? run.totalBlocks : run.times
        newBlockIndex += blockCount
      }
    }

    // Start animation if block index changed
    if (newBlockIndex !== targetBlockIndex) {
      previousBlockIndex = targetBlockIndex
      targetBlockIndex = newBlockIndex
      animating = true
      animationStartTime = Date.now()
      animate()
    }

    // Trigger redraw when any of these change
    void runs
    void allPoints
    draw()
  }

  function animate() {
    if (!animating) return

    const elapsed = Date.now() - animationStartTime
    animationProgress = Math.min(elapsed / animationDuration, 1)

    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - animationProgress, 3)
    animationProgress = eased

    draw()

    if (animationProgress < 1) {
      requestAnimationFrame(animate)
    } else {
      animating = false
      animationProgress = 0
    }
  }

  function draw() {
    if (!ctx || !canvas) return
    if (!allPoints || allPoints.length === 0) return

    const width = canvas.width
    const height = canvas.height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Set colors based on dark mode
    const lineColor = isDarkMode ? "#ffffff" : "#000000"
    const highlightColor = "#ffeb3b"
    const characterColor = isDarkMode ? "#ffffff" : "#000000"

    // Calculate which blocks to show (context window around current position)
    // Show more steps to extend beyond viewport
    let startBlockIndex = 0
    let endBlockIndex = allPoints.length

    // Use target block index for determining visible range
    const currentBlockIndex = targetBlockIndex

    if (runs.length > 0) {
      // Find which step we're currently on
      let currentStepIndex = 0
      let blockCount = 0
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i]
        const runBlockCount = run.totalBlocks !== undefined ? run.totalBlocks : run.times
        if (blockCount + runBlockCount > currentBlockIndex) {
          currentStepIndex = i
          break
        }
        blockCount += runBlockCount
      }

      // Calculate start: go back 5 steps to show more context
      const startStep = Math.max(0, currentStepIndex - 5)
      startBlockIndex = 0
      for (let i = 0; i < startStep; i++) {
        const run = runs[i]
        startBlockIndex += run.totalBlocks !== undefined ? run.totalBlocks : run.times
      }

      // Calculate end: go forward 5 steps from current to extend past viewport
      const endStep = Math.min(runs.length, currentStepIndex + 6) // +6 because we want current + 5 more
      endBlockIndex = 0
      for (let i = 0; i < endStep; i++) {
        const run = runs[i]
        endBlockIndex += run.totalBlocks !== undefined ? run.totalBlocks : run.times
      }
      endBlockIndex = Math.min(allPoints.length, endBlockIndex)
    }

    // Find the center point to normalize coordinates
    const centerPoint = allPoints[currentBlockIndex]

    // Isometric projection parameters
    const scale = 20
    const offsetX = width / 2
    const offsetY = height / 2

    // Function to convert 3D coordinates to isometric 2D (normalized around center point)
    // Rotated 80 degrees horizontally to see more depth
    function toIso(x, y, z) {
      // Normalize relative to center point
      const nx = x - centerPoint[0]
      const ny = y - centerPoint[1]
      const nz = z - centerPoint[2]

      // Rotate the view 80 degrees from standard isometric (45 degrees)
      // This gives us 80 degrees horizontal rotation (more side view)
      const angle = (80 * Math.PI) / 180 // Convert to radians
      const cos = Math.cos(angle)
      const sin = Math.sin(angle)

      // Rotate around Y axis
      const rotatedX = nx * cos - nz * sin
      const rotatedZ = nx * sin + nz * cos

      const isoX = rotatedX * scale
      const isoY = rotatedZ * scale * 0.5 - ny * scale
      return [offsetX + isoX, offsetY + isoY]
    }

    // Calculate the range of blocks in the current run
    let currentRunEndIndex = currentBlockIndex
    if (runs.length > 0 && currentStep < runs.length) {
      const run = runs[currentStep]
      // Use totalBlocks for patterns, times for regular moves
      const blockCount = run.totalBlocks !== undefined ? run.totalBlocks : run.times
      currentRunEndIndex = currentBlockIndex + blockCount
    }

    // Sort blocks for proper z-ordering (back-to-front, bottom-to-top)
    const blocksToRender = []
    for (let i = startBlockIndex; i < endBlockIndex; i++) {
      const point = allPoints[i]
      const [x, y, z] = point

      const isInCurrentRun = i >= currentBlockIndex && i < currentRunEndIndex
      const isFutureBlock = i >= currentRunEndIndex

      blocksToRender.push({ i, x, y, z, isInCurrentRun, isFutureBlock })
    }

    // Sort by: Y (height) first (lower first), then by isometric depth
    blocksToRender.sort((a, b) => {
      // Lower Y values (lower height) should be drawn first
      if (a.y !== b.y) return a.y - b.y
      // Then sort by isometric depth (back to front)
      const depthA = a.x + a.z
      const depthB = b.x + b.z
      return depthA - depthB
    })

    // Draw blocks in sorted order
    for (const block of blocksToRender) {
      const { x, y, z, isInCurrentRun, isFutureBlock } = block

      // Set line style
      if (isFutureBlock) {
        ctx.setLineDash([3, 3]) // Dotted line for future blocks
        ctx.strokeStyle = lineColor
        ctx.globalAlpha = 0.4
      } else {
        ctx.setLineDash([]) // Solid line for past/current blocks
        ctx.strokeStyle = isInCurrentRun ? highlightColor : lineColor
        ctx.globalAlpha = 1.0
      }

      ctx.lineWidth = isInCurrentRun ? 2 : 1.5

      // Draw cube (block) - highlight if in current run
      drawCube(x, y, z, toIso, ctx, isInCurrentRun, highlightColor, lineColor)
    }

    // Reset line dash and alpha
    ctx.setLineDash([])
    ctx.globalAlpha = 1.0

    // Draw the character - interpolate position if animating
    if (targetBlockIndex < allPoints.length) {
      let charX, charY, charZ

      if (animating && previousBlockIndex < allPoints.length) {
        // Interpolate between previous and target positions
        const prevPoint = allPoints[previousBlockIndex]
        const targetPoint = allPoints[targetBlockIndex]

        charX = prevPoint[0] + (targetPoint[0] - prevPoint[0]) * animationProgress
        charY = prevPoint[1] + (targetPoint[1] - prevPoint[1]) * animationProgress
        charZ = prevPoint[2] + (targetPoint[2] - prevPoint[2]) * animationProgress
      } else {
        // No animation, use target position directly
        const targetPoint = allPoints[targetBlockIndex]
        charX = targetPoint[0]
        charY = targetPoint[1]
        charZ = targetPoint[2]
      }

      drawCharacter(charX, charY, charZ, toIso, ctx, characterColor)
    }
  }

  function drawCube(x, y, z, toIso, ctx, isHighlight, highlightColor, _lineColor) {
    const size = 1

    // Define cube vertices (0-3 bottom, 4-7 top)
    const vertices = [
      [x, y, z], // 0: bottom-back-left
      [x + size, y, z], // 1: bottom-back-right
      [x + size, y, z + size], // 2: bottom-front-right
      [x, y, z + size], // 3: bottom-front-left
      [x, y + size, z], // 4: top-back-left
      [x + size, y + size, z], // 5: top-back-right
      [x + size, y + size, z + size], // 6: top-front-right
      [x, y + size, z + size], // 7: top-front-left
    ]

    const isoVertices = vertices.map(([vx, vy, vz]) => toIso(vx, vy, vz))

    // Fill faces (only visible faces in isometric view) - all opaque
    const bgColor = isDarkMode ? "#000000" : "#ffffff"
    const fillColor = isHighlight ? highlightColor : bgColor

    // Fill all faces first (without stroke)
    // Use semi-transparent yellow for highlights to show individual blocks
    if (isHighlight) {
      ctx.globalAlpha = 0.3
      ctx.fillStyle = fillColor
    } else {
      ctx.fillStyle = fillColor
    }

    // Top face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[4])
    ctx.lineTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.closePath()
    ctx.fill()

    // Front-right face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[2])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.lineTo(...isoVertices[3])
    ctx.closePath()
    ctx.fill()

    // Front-left face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[2])
    ctx.lineTo(...isoVertices[1])
    ctx.closePath()
    ctx.fill()

    // Reset alpha if it was changed for highlight
    if (isHighlight) {
      ctx.globalAlpha = 1.0
    }

    // Now draw only the outer edges (silhouette) to avoid double lines
    ctx.beginPath()
    // Outer perimeter of visible faces
    ctx.moveTo(...isoVertices[4]) // top-back-left
    ctx.lineTo(...isoVertices[5]) // top-back-right
    ctx.lineTo(...isoVertices[1]) // bottom-back-right
    ctx.lineTo(...isoVertices[2]) // bottom-front-right
    ctx.lineTo(...isoVertices[3]) // bottom-front-left
    ctx.lineTo(...isoVertices[7]) // top-front-left
    ctx.closePath()
    ctx.stroke()

    // Interior edge (shared between top and right face)
    ctx.beginPath()
    ctx.moveTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.stroke()

    // Interior edge (shared between top and left face)
    ctx.beginPath()
    ctx.moveTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.stroke()
  }

  function drawCharacter(x, y, z, toIso, ctx, color) {
    // New model from Tremendous_Densor/tinker.obj
    // Scale: 16mm = 1 Minecraft block, so 16 units = 1 block
    const scale = 1 / 16 // Scale from model units to blocks

    // Center the character on the block
    // Looking at the model: Z goes from 0 (feet) to 32 (head), so Z is the vertical axis
    // Y goes from -42 to -34, which is depth (8 units = 0.5 blocks)
    // X goes from 6 to 22, which is horizontal (16 units = 1 block)
    // So: Model X -> Minecraft X, Model Y -> Minecraft Z (depth), Model Z -> Minecraft Y (height)
    const modelCenterX = 14 // Center of X range (6 to 22)
    const modelCenterY = -38 // Center of Y range (-42 to -34)

    const offsetX = x + 0.5 - modelCenterX * scale
    const offsetY = y + 1 // Standing on top of block
    const offsetZ = z + 0.5 - modelCenterY * scale

    ctx.strokeStyle = color
    ctx.lineWidth = 2

    const bgColor = isDarkMode ? "#000000" : "#ffffff"

    // From new OBJ model (6 parts):
    // obj_0 (right leg inner): X=10.0154 to 14.0154, Y=-40 to -36, Z=0 to 12 (feet)
    // obj_1 (right leg outer): X=14.0154 to 18.0154, Y=-40 to -36, Z=0 to 12 (feet)
    // obj_2 (body): X=10 to 18, Y=-40 to -36, Z=12 to 24 (torso)
    // obj_3 (right arm): X=18 to 22, Y=-40 to -36, Z=12 to 24 (shoulder level)
    // obj_4 (left arm): X=6 to 10, Y=-40 to -36, Z=12 to 24 (shoulder level)
    // obj_5 (head): X=10 to 18, Y=-42 to -34, Z=24 to 32 (top)

    // Draw in back-to-front order for proper isometric layering

    // Left arm (obj_4): X=6 to 10, Y=-40 to -36, Z=12 to 24
    drawFilledBox(
      offsetX + 6 * scale, // x position
      offsetY + 12 * scale, // y height (Z from model)
      offsetZ + -40 * scale, // z depth (Y from model)
      4 * scale, // width (X)
      12 * scale, // height (Z from model: 24-12)
      4 * scale, // depth (Y from model: -36-(-40))
      toIso,
      ctx,
      bgColor
    )

    // Right leg inner (obj_0): X=10.0154 to 14.0154, Y=-40 to -36, Z=0 to 12
    drawFilledBox(
      offsetX + 10.0154 * scale,
      offsetY + 0 * scale, // feet at bottom
      offsetZ + -40 * scale,
      4 * scale,
      12 * scale, // height
      4 * scale,
      toIso,
      ctx,
      bgColor
    )

    // Right leg outer (obj_1): X=14.0154 to 18.0154, Y=-40 to -36, Z=0 to 12
    drawFilledBox(
      offsetX + 14.0154 * scale,
      offsetY + 0 * scale,
      offsetZ + -40 * scale,
      4 * scale,
      12 * scale,
      4 * scale,
      toIso,
      ctx,
      bgColor
    )

    // Body (obj_2): X=10 to 18, Y=-40 to -36, Z=12 to 24
    drawFilledBox(
      offsetX + 10 * scale,
      offsetY + 12 * scale,
      offsetZ + -40 * scale,
      8 * scale,
      12 * scale, // height: 24-12
      4 * scale,
      toIso,
      ctx,
      bgColor
    )

    // Head (obj_5): X=10 to 18, Y=-42 to -34, Z=24 to 32
    drawFilledBox(
      offsetX + 10 * scale,
      offsetY + 24 * scale,
      offsetZ + -42 * scale,
      8 * scale,
      8 * scale, // height: 32-24
      8 * scale, // depth: -34-(-42)
      toIso,
      ctx,
      bgColor
    )

    // Right arm (obj_3): X=18 to 22, Y=-40 to -36, Z=12 to 24
    drawFilledBox(
      offsetX + 18 * scale,
      offsetY + 12 * scale,
      offsetZ + -40 * scale,
      4 * scale,
      12 * scale,
      4 * scale,
      toIso,
      ctx,
      bgColor
    )
  }

  function drawFilledBox(x, y, z, width, height, depth, toIso, ctx, fillColor) {
    const vertices = [
      [x, y, z], // 0: bottom-back-left
      [x + width, y, z], // 1: bottom-back-right
      [x + width, y, z + depth], // 2: bottom-front-right
      [x, y, z + depth], // 3: bottom-front-left
      [x, y + height, z], // 4: top-back-left
      [x + width, y + height, z], // 5: top-back-right
      [x + width, y + height, z + depth], // 6: top-front-right
      [x, y + height, z + depth], // 7: top-front-left
    ]

    const isoVertices = vertices.map(([vx, vy, vz]) => toIso(vx, vy, vz))

    // Fill all faces first (without stroke)
    ctx.fillStyle = fillColor

    // Top face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[4])
    ctx.lineTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.closePath()
    ctx.fill()

    // Front-right face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[2])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.lineTo(...isoVertices[3])
    ctx.closePath()
    ctx.fill()

    // Front-left face
    ctx.beginPath()
    ctx.moveTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[2])
    ctx.lineTo(...isoVertices[1])
    ctx.closePath()
    ctx.fill()

    // Now draw only the outer edges (silhouette) to avoid double lines
    ctx.beginPath()
    // Outer perimeter of visible faces
    ctx.moveTo(...isoVertices[4]) // top-back-left
    ctx.lineTo(...isoVertices[5]) // top-back-right
    ctx.lineTo(...isoVertices[1]) // bottom-back-right
    ctx.lineTo(...isoVertices[2]) // bottom-front-right
    ctx.lineTo(...isoVertices[3]) // bottom-front-left
    ctx.lineTo(...isoVertices[7]) // top-front-left
    ctx.closePath()
    ctx.stroke()

    // Interior edge (shared between top and right face)
    ctx.beginPath()
    ctx.moveTo(...isoVertices[5])
    ctx.lineTo(...isoVertices[6])
    ctx.stroke()

    // Interior edge (shared between top and left face)
    ctx.beginPath()
    ctx.moveTo(...isoVertices[6])
    ctx.lineTo(...isoVertices[7])
    ctx.stroke()
  }
</script>

<div class="diagram-container">
  <canvas bind:this={canvas} width="400" height="400"></canvas>
</div>

<style>
  .diagram-container {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 1rem;
  }

  canvas {
    border: 1px solid var(--border-color, #ccc);
    border-radius: 8px;
    background-color: var(--canvas-bg, transparent);
  }
</style>
