import { createApp } from './server';

const PORT = process.env.PORT ?? 4000;
const app = createApp();

app.listen(PORT, () => {
  console.log(`HearthOS API running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
