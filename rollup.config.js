import svelte from 'rollup-plugin-svelte';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import nodePolyfills from '@rollup/plugin-inject';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import css from 'rollup-plugin-css-only';

const production = !process.env.ROLLUP_WATCH;

function serve() {
	let server;

	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: true,
		format: 'iife',
		name: 'app',
		file: 'public/build/bundle.js'
	},
	plugins: [
		// add poly fills for jq-web
		nodePolyfills({
			// // control which files this plugin applies to
			// // with include/exclude
			include: 'node_modules/jq-web/**',

			output: {
				globals: {
				}
			},
			// exclude: 'node_modules/**',

			// /* all other options are treated as modules...*/

			// // use the default – i.e. insert
			// // import $ from 'jquery'
			// $: 'jquery',

			// // use a named export – i.e. insert
			// // import { Promise } from 'es6-promise'
			// Promise: [ 'es6-promise', 'Promise' ],

			// // use a namespace import – i.e. insert
			// // import * as fs from 'fs'
			// fs: [ 'fs' ],
			path: ['path'],
			crypto: ['crypto'],
			buffer: ['buffer']

			// // use a local module instead of a third-party one
			// 'Object.assign': path.resolve( 'src/helpers/object-assign.js' ),

			// /* ...but if you want to be careful about separating modules
			//    from other options, supply `options.modules` instead */

			// modules: {
			//   $: 'jquery',
			//   Promise: [ 'es6-promise', 'Promise' ],
			//   'Object.assign': path.resolve( 'src/helpers/object-assign.js' )
			// }
		}),

		svelte({
			compilerOptions: {
				// enable run-time checks when not in production
				dev: !production
			}
		}),
		// we'll extract any component CSS out into
		// a separate file - better for performance
		css({ output: 'bundle.css' }),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!production && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!production && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		production && terser()
	],
	watch: {
		clearScreen: false
	}
};
