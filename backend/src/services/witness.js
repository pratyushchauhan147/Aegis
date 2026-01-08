import { query } from '../db/client.js';
import crypto from 'crypto';

export default async function witnessRoutes(fastify, options) {

  // 1. ADD WITNESS (Someone watching the stream)
  fastify.post('/:id', async (req, reply) => {
    const { id } = req.params; // incident_id
    
    // Attempt to get user_id if logged in, otherwise null
    let userId = null;
    try { await req.jwtVerify(); userId = req.user.sub; } catch (e) {}

    // Generate IP Hash for basic spam protection
    const rawIp = req.ip || '127.0.0.1'; 
    const ipHash = crypto.createHash('md5').update(rawIp).digest('hex');

    try {
      await query(
        `INSERT INTO witnesses (incident_id, user_id, ip_hash) VALUES ($1, $2, $3)
         ON CONFLICT (incident_id, ip_hash) DO NOTHING`,
        [id, userId, ipHash]
      );
      
      const countRes = await query('SELECT count(*) FROM witnesses WHERE incident_id = $1', [id]);
      return { success: true, total_witnesses: parseInt(countRes.rows[0].count) };

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to record witness' });
    }
  });

  // 2. GET WITNESS COUNT (The missing route causing your 404)
  fastify.get('/:id/count', async (req, reply) => {
    const { id } = req.params;
    try {
        const res = await query('SELECT count(*) FROM witnesses WHERE incident_id = $1', [id]);
        return { count: parseInt(res.rows[0].count) };
    } catch (err) {
        return { count: 0 };
    }
  });
}