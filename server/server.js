import dotenvFlow from 'dotenv-flow';
import connectDB from './config/mongo.js';
dotenvFlow.config();
const { createApp } = await import('./app.js');
const { readAppConfig } = await import('./config/appConfig.js');
const config = readAppConfig(process.env);
const app = createApp(config);
await connectDB();
app.listen(config.port);
