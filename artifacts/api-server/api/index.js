import app from '../dist/index.mjs';

// Vercel serverless functions need the Express app exported directly
// The app should NOT call listen() - Vercel handles that
export default app.default || app;