import * as Sentry from "@sentry/sveltekit"

Sentry.init({
  dsn: "https://a178dece81deaea80da57e56453acf67@o4510688689520640.ingest.us.sentry.io/4510688705183744",

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: import.meta.env.DEV,
})
