// Detects if Firebase is configured (env vars present at build time)
export const FB_CONFIGURED = !!(
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "your_api_key_here"
);
