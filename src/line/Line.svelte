<script>
import { init } from "svelte/internal";

  import Logo from "../home/Logo.svelte";

  document.title = "GIBR.net: Minecraft Line Generator";

  let coords = {
    start: [-14, 0, -28],
    end: [193, 0, -82],
  };

  const directions = new Map();
  var dx_dir = (dx) => dx > 0 ? 'East' : 'West';
  var dy_dir = (dy) => dy > 0 ? 'Up' : 'Down';
  var dz_dir = (dz) => dz > 0 ? 'South' : 'North';

  $: state = init_state(coords.start, coords.end);
  $: curr = state;

  function init_state(start, end) {
    var dx = end[0] - start[0];
    var dy = end[1] - start[1];
    var dz = end[2] - start[2];

    var mx = Math.abs(dx);
    var my = Math.abs(dy);
    var mz = Math.abs(dz);

    var max_dir = [
      [mx, dx_dir(dx), [my, mz], [dy_dir(dy), dz_dir(dz)], [[0, Math.sign(dy), 0], [0, 0, Math.sign(dz)]], [Math.sign(dx), 0, 0]],
      [my, dy_dir(dy), [mx, mz], [dx_dir(dx), dz_dir(dz)], [[Math.sign(dx), 0, 0], [0, 0, Math.sign(dz)]], [0, Math.sign(dy), 0]],
      [mz, dz_dir(dz), [mx, my], [dx_dir(dx), dy_dir(dy)], [[Math.sign(dx), 0, 0], [0, Math.sign(dy), 0]], [0, 0, Math.sign(dz)]],
    ].reduce((a, b) => (a[0] > b[0]) ? a : b);

    var state = {
      coords: start,
      face: max_dir[1],
      step: null,
      step_sign: max_dir[5],
      offset: [max_dir[0]/2, max_dir[0]/2],
      delta_mag: max_dir[2],
      delta_sign: max_dir[4],
      delta_dir: max_dir[3],
      correction: max_dir[0],
    }

    return state;
  }

  function vect_add(a, b) {
    var c = [];
    for (let i = 0; i < a.length; i++) {
      c.push(a[i] + b[i]);
    }
    return c;
  }

  function update() {
    curr = step(curr);
  }
  function reset() {
    curr = state;
  }

  function step(state) {
    var next_offset = [...state.offset];
    var next_coords = state.coords;
    var step_count = 0;
    while (next_offset[1] < state.correction && next_offset[0] < state.correction) {
      next_offset = [next_offset[0] + state.delta_mag[0], next_offset[1] + state.delta_mag[1]];
      next_coords = vect_add(next_coords, state.step_sign)
      step_count++;
    }
    var next_step = step_count +'*'+ state.face;
    if (next_offset[0] > state.correction) {
      next_offset[0] -= state.correction;
      next_step += ' and ' + state.delta_dir[0]
      next_coords = vect_add(next_coords, state.delta_sign[0]);
    }
    if (next_offset[1] > state.correction) {
      next_offset[1] -= state.correction;
      next_step += ' and ' + state.delta_dir[1]
      next_coords = vect_add(next_coords, state.delta_sign[1]);
    }
    var next_state = {
      ...state,
      coords: next_coords,
      step: next_step,
      offset: next_offset,
    };
    return next_state; 
  }
</script>

<main>
  <h1><Logo /> Minecraft Line Generator</h1>
  <section>
    <h2>Where are you?</h2>
    <label for="startx">X:</label>
    <input id="startx" bind:value={coords.start[0]} />
    <label for="startz">Z:</label>
    <input id="startz" bind:value={coords.start[2]} />
  </section>
  <section>
    <h2>Where do you want to go?</h2>
    <label for="endx">X:</label>
    <input id="endx" bind:value={coords.end[0]} />
    <label for="endz">Z:</label>
    <input id="endz" bind:value={coords.end[2]} />
  </section>
  <section>
    <h2>Instructions</h2>
    <p>Face: {curr.face}</p>
    <p>Coords: {curr.coords}</p>
    <p>Step: {step(curr).step}</p>
    <p>
      <button on:click={update}>Did It</button>
      <button on:click={reset}>Reset</button>
    </p>
  </section>
</main>
