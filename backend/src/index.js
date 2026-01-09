import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import authMiddleware from './middleware/auth.js';
import cookie from '@fastify/cookie';

// Import Routes
import incidentRoutes from './services/incident.js';
import ingestRoutes from './services/ingest.js';
import playbackRoutes from './services/playback.js';
import authRoutes from './services/auth.js';
import contactRoutes from './services/contacts.js'; // <--- NEW
import votingRoutes from './services/voting.js';
import witnessRoutes from './services/witness.js';
import cleanupRoutes from './services/cleanup.js';
import testEmailRoute from './services/test-email.js';
dotenv.config();

const fastify = Fastify({ logger: true });

// Plugins
fastify.register(cors, { 
  origin: [true,'https://aegis-frontend.vercel.app'], // Allow all for dev, or specify ['http://localhost:5500']
  credentials: true // <--- 2. IMPORTANT: Allow cookies to be sent
});


fastify.register(cookie);
fastify.register(authMiddleware);
// Limit upload size to 6MB (Safety Buffer for 4MB chunks) [cite: 40]
fastify.register(multipart, {
  limits: { fileSize: 6 * 1024 * 1024 } 
});

// Register Services
fastify.register(authRoutes, { prefix: '/auth' });
fastify.register(testEmailRoute, { prefix: '/test-email' });
fastify.register(incidentRoutes, { prefix: '/incident' });
fastify.register(ingestRoutes, { prefix: '/ingest' });
fastify.register(playbackRoutes, { prefix: '/playback' });
fastify.register(contactRoutes, { prefix: '/api/contacts' });
fastify.register(votingRoutes, { prefix: '/voting' });
fastify.register(witnessRoutes, { prefix: '/witness' });
fastify.register(cleanupRoutes, { prefix: '/cleanup' });
// Health Check
fastify.get('/', async () => {
  return { status: 'Aegis System Online', mode: 'ES6 Modules' };
});

// Start
const start = async () => {
  try {
    const port = 3001;
    await fastify.ready();
console.log(fastify.printRoutes()); // 🖨️ Prints the route tree to your console
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🛡️ Aegis Server running on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();