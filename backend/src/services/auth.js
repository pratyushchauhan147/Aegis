import { supabase } from '../db/supabase.js';
import { query } from '../db/client.js';

export default async function authRoutes(fastify, options) {

  // Helper to set cookie
  const setAuthCookie = (reply, token) => {
    reply.setCookie('token', token, {
      path: '/',
      httpOnly: true,  // Security: JS cannot read this cookie
      secure: false,   // Set to TRUE in production (HTTPS only)
      sameSite: 'lax', // CSRF protection
      maxAge: 60 * 60 * 24 * 7 // 1 Week
    });
  };

  // 1. SIGN UP
  fastify.post('/signup', async (req, reply) => {
    const { email, password, phone, name } = req.body;
    if (!email || !password  || !phone) return reply.code(400).send({ error: 'Missing data' });

    const { data, error } = await supabase.auth.signUp({ email, password,phone });
    if (error) return reply.code(400).send({ error: error.message });

    // Create Profile
    try {
      await query(
        `INSERT INTO profiles (id, username, phone_number) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`, 
        [data.user?.id, name, phone]
      );
    } catch (e) { fastify.log.error(e); }

    // ✅ SET COOKIE
    if (data.session) {
      setAuthCookie(reply, data.session.access_token);
    }

    return { success: true, user: data.user };
  });

  // 2. LOGIN
  fastify.post('/login', async (req, reply) => {
    const { email, password } = req.body;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) return reply.code(401).send({ error: error.message });

    // ✅ SET COOKIE
    setAuthCookie(reply, data.session.access_token);

    return { success: true, user: data.user };
  });

  // 3. LOGOUT (Clear Cookie)
  fastify.post('/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/' });
    return { success: true };
  });

  fastify.get('/me', async (req, reply) => {
    const token = req.cookies.token;

    if (!token) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    // Verify the token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      reply.clearCookie('token', { path: '/' });
      return reply.code(401).send({ error: 'Session expired' });
    }

    // Fetch extended profile data from your PostgreSQL 'profiles' table
    try {
      const profileResult = await query(
        'SELECT username, phone_number FROM profiles WHERE id = $1',
        [user.id]
      );
      
      const profile = profileResult.rows[0];

      return { 
        success: true, 
        user: { 
          ...user, 
          name: profile?.username, 
          phone: profile?.phone_number 
        } 
      };
    } catch (e) {
      fastify.log.error(e);
      // Return user even if profile fetch fails
      return { success: true, user };
    }
  });
}