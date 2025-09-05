// Vercel serverless function that imports the full Express app
import getApp from '../server/app.js';

// Export as Vercel serverless function
export default async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}