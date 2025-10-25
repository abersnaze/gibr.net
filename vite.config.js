import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git commit hash and build date
const gitHash = execSync('git rev-parse HEAD').toString().trim();
const buildDate = new Date().toISOString().split('T')[0];

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		global: 'globalThis',
		'__GIT_HASH__': JSON.stringify(gitHash),
		'__BUILD_DATE__': JSON.stringify(buildDate)
	},
});