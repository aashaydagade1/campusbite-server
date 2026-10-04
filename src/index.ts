import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server } from 'socket.io';
import 'dotenv/config';
import auth from './routes/auth';
import menu from './routes/menu';
import orders from './routes/orders';
import payments from './routes/payments';
import notifications from './routes/notifications';
import { configureSocket } from './socket';

const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*', methods: ['GET', 'POST', 'PATCH'] } });
configureSocket(io);
app.set('io', io);
app.use(cors());
app.use(express.json());

app.get('/health', async (_req, res) => {
  res.json({ ok: true, phase: 3 });
});

app.use('/auth', auth);
app.use('/menu', menu);
app.use('/orders', orders);
app.use('/payments', payments);
app.use('/notifications', notifications);

const port = Number(process.env.PORT || 4000);
server.listen(port, () => console.log(`CampusBite Phase 3 API running on port ${port}`));
