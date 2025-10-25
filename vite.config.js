import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { execSync } from 'child_process';

// Get git commit hash and build date
// Fallback to environment variables or defaults if git is not available (e.g., in Docker)
let gitHash = 'unknown';
let buildDate = new Date().toISOString().split('T')[0];

try {
	gitHash = execSync('git rev-parse HEAD').toString().trim();
} catch (error) {
	// Git not available, try environment variables
	gitHash = process.env.GIT_COMMIT || process.env.COMMIT_SHA || 'unknown';
}

export default defineConfig({
	plugins: [sveltekit()],
	define: {
		global: 'globalThis',
		'__GIT_HASH__': JSON.stringify(gitHash),
		'__BUILD_DATE__': JSON.stringify(buildDate)
	},
});