import express from 'express';
import { fileURLToPath } from 'node:url';
import { buildApp } from './build.js';

const projectDirectory = fileURLToPath(new URL('.', import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

await buildApp();

app.use(express.static(projectDirectory));

app.listen(port, () => {
  console.log(`KMS frontend berjalan di http://localhost:${port}`);
});
