import { readFileSync } from 'node:fs';
import dotenvFlow from 'dotenv-flow';
import connectDB from './config/mongo.js';
dotenvFlow.config();
// Resolve mounted secrets at the startup boundary, never in domain logic.
for (const key of ['JWT_SECRET_PROD', 'MONGO_URI_PROD']) {
  if (process.env[`${key}_FILE`]) process.env[key] = readFileSync(process.env[`${key}_FILE`], 'utf8').trim();
}
const { createApp } = await import('./app.js');
const { readAppConfig } = await import('./config/appConfig.js');
const config = readAppConfig(process.env);
const app = createApp(config);
await connectDB();
app.listen(config.port);
