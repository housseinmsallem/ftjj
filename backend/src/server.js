import http from 'http';
import { Server } from 'socket.io';
import app from './app.js';
import connectDB from './config/db.js';
import { registerLiveSocket } from './sockets/live.socket.js';
import './jobs/backup.job.js'
import FederationSettings from './models/FederationSettings.js';

const PORT = process.env.PORT || 5000;
connectDB();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true } });
app.set('io', io);
registerLiveSocket(io);
async function start() {
    await connectDB();
    // Seed default documents
    if (!await FederationSettings.findOne()) {
        await FederationSettings.create({});
        console.log('FederationSettings initialized with defaults');
    }

    server.listen(PORT, () => console.log(`FTJJ API running on port ${PORT}`));
}

start();
