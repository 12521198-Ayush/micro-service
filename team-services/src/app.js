import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { createTrafficLogger } from '../../shared/trafficLogger.mjs';
import agent from './routes/agent.js';
import department from './routes/department.js';

dotenv.config();


const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Traffic logger - writes req/res to logs/team-service-YYYY-MM-DD.log
const [captureRes, logTraffic] = createTrafficLogger('team-service', morgan);
app.use(captureRes);
app.use(logTraffic);
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/team-service/api/agent', agent);
app.use('/team-service/api/department', department);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});