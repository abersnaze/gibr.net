import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit"
import * as Sentry from "@sentry/sveltekit"

// Detect if running in local development
const isLocalDev =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")

Sentry.init({
  dsn: "https://a178dece81deaea80da57e56453acf67@o4510688689520640.ingest.us.sentry.io/4510688705183744",

  // Set environment tag for filtering
  environment: isLocalDev ? "development" : "production",

  tracesSampleRate: 1.0,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: (defaults) => {
    return defaults
      .filter((integration) => {
        // Filter out BrowserTracing to avoid conflicts with SvelteKit router
        return integration.name !== "BrowserTracing"
      })
      .concat([replayIntegration()])
  },

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/sveltekit/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Add hook to tag all events with environment
  beforeSend(event) {
    event.tags = {
      ...event.tags,
      environment: isLocalDev ? "development" : "production",
      hostname: typeof window !== "undefined" ? window.location.hostname : "unknown",
    }
    return event
  },
})

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry()
