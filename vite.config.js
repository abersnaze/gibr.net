import { sentrySvelteKit } from "@sentry/sveltekit"
import { sveltekit } from "@sveltejs/kit/vite"
import { defineConfig } from "vite"
import { execSync } from "child_process"

// Function to get git hash - evaluated at config time
function getGitHash() {
  try {
    const hash = execSync("git rev-parse HEAD").toString().trim()
    console.log("[vite.config.js] Git hash from git command:", hash)
    return hash
  } catch (error) {
    console.log("[vite.config.js] Git command failed:", error.message)
    // Git not available, try environment variables (Docker/CI)
    const envHash = process.env.SOURCE_COMMIT || process.env.GIT_COMMIT || process.env.COMMIT_SHA
    if (envHash) {
      console.log("[vite.config.js] Using git hash from environment:", envHash)
      return envHash
    }
    console.log('[vite.config.js] No git hash available, using "unknown"')
    return "unknown"
  }
}

const gitHash = getGitHash()
const buildDate = new Date().toISOString().split("T")[0]

export default defineConfig({
  plugins: [
    sentrySvelteKit({
      org: "george-campbell",
      project: "gibrnet",
    }),
    sveltekit(),
  ],
  define: {
    global: "globalThis",
    __GIT_HASH__: JSON.stringify(gitHash),
    __BUILD_DATE__: JSON.stringify(buildDate),
  },
})
