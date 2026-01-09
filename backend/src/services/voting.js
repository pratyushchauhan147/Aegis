import { query } from '../db/client.js';
import { notifyContacts } from './notify.js'; 

export default async function votingRoutes(fastify, options) {

  // 1. GET PENDING REQUESTS (Fixed Join Logic)
  fastify.get('/pending', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const myUserId = req.user.id;
    try {
      // We need to find incidents where:
      // A. The incident owner has ME in their contacts list.
      // B. A deletion request exists.
      
      const sql = `
        SELECT 
          dr.id AS request_id, dr.reason, dr.created_at,
          i.id AS incident_id, p.username AS owner_name
        FROM deletion_requests dr
        JOIN incidents i ON dr.incident_id = i.id
        JOIN profiles p ON p.id = i.user_id      -- The Owner
        JOIN contacts c ON c.user_id = i.user_id -- The Owner's Contacts
        JOIN profiles me ON me.id = $1           -- ME (The Voter)
        WHERE 
             -- MATCH PHONE NUMBERS ROBUSTLY (Remove formatting)
             regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(me.phone_number, '[^0-9]', '', 'g')
        AND dr.status = 'VOTING_IN_PROGRESS'
        AND NOT EXISTS (
          SELECT 1 FROM deletion_votes v 
          WHERE v.request_id = dr.id AND v.voter_id = $1
        )
      `;
      const { rows } = await query(sql, [myUserId]);
      return { requests: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: `${err.message}` });
    }
  });

  // ... (Rest of your code is fine) ...
  // 2. CAST VOTE
  fastify.post('/vote', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { request_id, choice } = req.body;
    const voterId = req.user.id;

    if (!['DELETE', 'KEEP'].includes(choice)) return reply.code(400).send({ error: 'Invalid choice' });

    try {
      const metaSql = `
        SELECT i.user_id as owner_id 
        FROM deletion_requests dr
        JOIN incidents i ON dr.incident_id = i.id
        WHERE dr.id = $1
      `;
      const metaRes = await query(metaSql, [request_id]);
      if (metaRes.rows.length === 0) return reply.code(404).send({ error: 'Request not found' });
      const ownerId = metaRes.rows[0].owner_id;

      await query(`
        INSERT INTO deletion_votes (request_id, voter_id, vote_choice)
        VALUES ($1, $2, $3)
        ON CONFLICT (request_id, voter_id) DO UPDATE SET vote_choice = EXCLUDED.vote_choice
      `, [request_id, voterId, choice]);

      // Immediate Keep
      if (choice === 'KEEP') {
          await query("UPDATE deletion_requests SET status = 'REJECTED' WHERE id = $1", [request_id]);
          const incRes = await query('SELECT incident_id FROM deletion_requests WHERE id = $1', [request_id]);
          await query("UPDATE incidents SET status = 'ACTIVE' WHERE id = $1", [incRes.rows[0].incident_id]);
          return { success: true, outcome: 'BLOCKED_SAFE' };
      }

      // Check Consensus ( > 60% )
      if (choice === 'DELETE') {
        const contactsRes = await query('SELECT count(*) FROM contacts WHERE user_id = $1', [ownerId]);
        const totalContacts = parseInt(contactsRes.rows[0].count);

        const votesRes = await query(`SELECT count(*) FROM deletion_votes WHERE request_id = $1 AND vote_choice = 'DELETE'`, [request_id]);
        const deleteVotes = parseInt(votesRes.rows[0].count);

        // Avoid division by zero
        if (totalContacts > 0 && (deleteVotes / totalContacts) > 0.6) {
            const incRes = await query('SELECT incident_id FROM deletion_requests WHERE id = $1', [request_id]);
            const incidentId = incRes.rows[0].incident_id;

            await query("UPDATE incidents SET status = 'SOFT_DELETED', ended_at = NOW() WHERE id = $1", [incidentId]);
            await query("UPDATE deletion_requests SET status = 'APPROVED' WHERE id = $1", [request_id]);

            return { success: true, outcome: 'SOFT_DELETED' };
        }
      }
      return { success: true, outcome: 'VOTE_CAST' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Voting failed' });
    }
  });

  // 3. REQUEST DELETION (Integrated Email)
  fastify.post('/request-deletion', { preValidation: [fastify.authenticate] }, async (req, reply) => {
      const { incident_id, reason } = req.body;
      const userId = req.user.id; 

      try {
        const sql = `INSERT INTO deletion_requests (incident_id, reason) VALUES ($1, $2) RETURNING id`;
        
        const { rows } = await query(sql, [incident_id, reason]);
        await query("UPDATE incidents SET status = 'PENDING_DELETION' WHERE id = $1", [incident_id]);
        
        // 📧 TRIGGER EMAIL SERVICE
        notifyContacts(userId, 'DELETION_REQUESTED', { 
           requestId: rows[0].id, 
           reason: reason,
           incidentId: incident_id,
           userName: req.user.email || 'The User'
        }).catch(err => fastify.log.error(`Email failed: ${err.message}`));

        return { success: true, request_id: rows[0].id };
      } catch (err) {
        fastify.log.error(err);
        return reply.code(500).send({ error: 'Deletion request failed' });
      }
  });
}