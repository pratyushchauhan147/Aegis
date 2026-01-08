import fp from 'fastify-plugin';
import { supabase } from '../db/supabase.js'; // Import your existing client

export default fp(async (fastify, opts) => {
  
  fastify.decorate('authenticate', async function (req, reply) {
    // 1. Try to find the token in Cookies OR Headers
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return reply.code(401).send({ error: 'Unauthorized: No token provided' });
    }

    // 2. Ask Supabase to verify the user
    // This handles all the complex crypto (ES256 vs HS256) for us
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      console.log("❌ Auth Failed:", error?.message);
      return reply.code(401).send({ error: 'Unauthorized: Invalid Token' });
    }

    // 3. Attach user to request
    req.user = { 
      id: data.user.id, 
      email: data.user.email 
    };
    
    // console.log("✅ User Verified:", req.user.email);
  });
});