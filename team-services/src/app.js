import express from 'express';
import dotenv from 'dotenv';
import agent from './routes/agent.js';
import department from './routes/department.js';

dotenv.config();


const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.use('/team-service/api/agent', agent);
app.use('/team-service/api/department', department);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});