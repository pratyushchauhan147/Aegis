import { query } from '../db/client.js';

export default async function contactRoutes(fastify, options) {

  // 1. SEARCH CONTACTS (Already fixed)
  fastify.get('/search', {
    preValidation: [fastify.authenticate]
  }, async (req, reply) => {
    const { query: searchQuery } = req.query; 

    if (!searchQuery || searchQuery.length < 3) {
      return reply.code(400).send({ error: 'Query too short' });
    }

    try {
      // ✅ No 'email' column in this query
      const sql = `
        SELECT id, username, phone_number
        FROM profiles 
        WHERE phone_number ILIKE $1 OR username ILIKE $1
        LIMIT 5
      `;
      const { rows } = await query(sql, [`%${searchQuery}%`]);
      return { results: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Search failed' });
    }
  });
  
  // 2. ADD A CONTACT (🔴 FIX APPLIED HERE)
  fastify.post('/', {
    preValidation: [fastify.authenticate]
  }, async (req, reply) => {
    const { name, phone, email } = req.body; // 'email' here is what you typed in the form (User Input)
    const userId = req.user.id;

    if (!name || !phone) {
      return reply.code(400).send({ error: 'Name and Phone number are required.' });
    }

    try {
      // A. Get My (Requester's) Profile Details
      // ❌ REMOVED 'email' from SELECT list because 'profiles' table doesn't have it
      const myProfileRes = await query('SELECT username, phone_number FROM profiles WHERE id = $1', [userId]);
      
      if (myProfileRes.rows.length === 0) return reply.code(404).send({ error: 'Your profile not found' });
      const myProfile = myProfileRes.rows[0];

      // Prevent adding yourself
      // ❌ REMOVED email check against profile since we can't query it
      if (phone === myProfile.phone_number) {
          return reply.code(400).send({ error: "You cannot add yourself as a contact." });
      }

      // B. Find if this person is a registered User (Target User)
      let targetUserId = null;
      
      // ❌ REMOVED check for (email = $2) because 'profiles' table has no email column
      // We can ONLY find registered users by phone number now.
      const targetUserRes = await query(`
        SELECT id FROM profiles 
        WHERE phone_number = $1
        LIMIT 1
      `, [phone]);

      if (targetUserRes.rows.length > 0) {
        targetUserId = targetUserRes.rows[0].id;
      }

      // C. Add them to YOUR contacts list
      // Note: We still save the 'email' input to the CONTACTS table if provided manually
      const insertSql = `
        INSERT INTO contacts (user_id, name, phone, email)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, phone) 
        DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email
        RETURNING id, name, phone, email, is_trusted_voter
      `;
      
      const { rows } = await query(insertSql, [userId, name, phone, email || null]);
      const newContact = rows[0];

      // D. RECIPROCAL: If they are a registered user, add YOU to THEIR list
      if (targetUserId) {
         // We pass 'null' for your email because we couldn't fetch it from your profile
         await query(`
           INSERT INTO contacts (user_id, name, phone, email)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, phone) DO NOTHING
         `, [targetUserId, myProfile.username, myProfile.phone_number, null]);
         
         fastify.log.info(`🔗 Reciprocal Link Created: ${userId} <-> ${targetUserId}`);
      }
      
      return { 
        success: true, 
        contact: newContact, 
        is_registered_user: !!targetUserId 
      };

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Failed to add contact' });
    }
  });

  // 3. LIST MY CONTACTS
  fastify.get('/', {
    preValidation: [fastify.authenticate]
  }, async (req, reply) => {
    const userId = req.user.id;
    try {
      const { rows } = await query('SELECT * FROM contacts WHERE user_id = $1 ORDER BY name ASC', [userId]);
      return { contacts: rows };
    } catch (err) {
      
      return reply.code(500).send({ error: `Database error ${err.message}` });
    }
  });

  // 4. DELETE CONTACT
  fastify.post('/:id/delete', { 
    preValidation: [fastify.authenticate]
  }, async (req, reply) => {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await query('DELETE FROM contacts WHERE id = $1 AND user_id = $2', [id, userId]);
    
    if (result.rowCount === 0) return reply.code(404).send({ error: 'Contact not found' });
    return { success: true };
  });
}