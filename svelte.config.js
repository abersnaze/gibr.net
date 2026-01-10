import adapter from "@sveltejs/adapter-static"

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      pages: "public",
      assets: "public",
      fallback: "index.html",
      precompress: false,
    }),

    paths: {
      base: process.env.NODE_ENV === "production" ? "" : "",
    },

    experimental: {
      tracing: {
        server: true,
      },

      instrumentation: {
        server: true,
      },
    },
  },
}

export default config
