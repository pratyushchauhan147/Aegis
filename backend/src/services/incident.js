import { query } from '../db/client.js';
import { notifyContacts } from './notify.js'; // Adjust path if needed

export default async function incidentRoutes(fastify, options) {
  
  // 1. START INCIDENT
  fastify.post('/start', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const userId = req.user.id;
    // Fallback: If email isn't in the token, you might need to query it. 
    // Assuming req.user contains { id, email } here.
    const userEmail = req.user.email || 'User'; 
    const { lat, lng, address } = req.body;

    try {
      // Create Incident
      const sql = `INSERT INTO incidents (status, user_id, latitude, longitude, address) VALUES ('ACTIVE', $1, $2, $3, $4) RETURNING id, status, created_at`;
      const { rows } = await query(sql, [userId, lat || null, lng || null, address || null]);
      const incident = rows[0];

      fastify.log.info(`🚨 Incident Started: ${incident.id}`);

      // 📧 TRIGGER EMAIL SERVICE
      // We don't await this so the UI response is instant (Fire & Forget)
      notifyContacts(userId, 'INCIDENT_STARTED', { 
        userName: userEmail, 
        incidentId: incident.id, 
        lat, 
        lng,
        address,
        time: new Date().toISOString()
      }).catch(err => fastify.log.error(`Email failed: ${err.message}`));

      return { success: true, incident_id: incident.id };

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: `${err.message}` });
    }
  });

  // 2. STOP INCIDENT
  fastify.post('/stop', async (req, reply) => {
    const { incident_id } = req.body;
    if (!incident_id) return reply.code(400).send({ error: 'Missing incident_id' });
    try {
      const sql = "UPDATE incidents SET status = 'ENDED' WHERE id = $1 RETURNING id, status";
      const { rows } = await query(sql, [incident_id]);
      if (rows.length === 0) return reply.code(404).send({ error: 'Incident not found' });
      return { success: true, status: 'ENDED' };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Database error' });
    }
  });

  // 3. GET "MY INCIDENTS" (Hides Deleted)
  fastify.get('/mine', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const userId = req.user.id;
    try {
      const sql = `
        SELECT id, status, created_at 
        FROM incidents 
        WHERE user_id = $1 
        AND status NOT IN ('SOFT_DELETED', 'HARD_DELETED') 
        ORDER BY created_at DESC
      `;
      const { rows } = await query(sql, [userId]);
      return { incidents: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Database error' });
    }
  });

  // 4. LIST ALL (Public Feed)
  fastify.get('/list', async (req, reply) => {
    try {
      const sql = `
        SELECT id, status, created_at 
        FROM incidents 
        WHERE status NOT IN ('SOFT_DELETED', 'HARD_DELETED')
        ORDER BY created_at DESC 
        LIMIT 20
      `;
      const { rows } = await query(sql);
      return { incidents: rows };
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Database error' });
    }
  });

  // 5. PING (Heartbeat)
  fastify.post('/ping', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const { incident_id, lat, lng, speed } = req.body;
    if (!incident_id || !lat || !lng) return reply.code(400).send({ error: 'Missing data' });

    try {
      const check = await query(
        "SELECT id FROM incidents WHERE id = $1 AND user_id = $2 AND status = 'ACTIVE'", 
        [incident_id, req.user.id]
      );
      if (check.rows.length === 0) return reply.code(403).send({ error: 'Invalid incident' });

      await query(
        "INSERT INTO incident_locations (incident_id, latitude, longitude, speed) VALUES ($1, $2, $3, $4)",
        [incident_id, lat, lng, speed || 0]
      );

      return { success: true };
    } catch (err) {
      fastify.log.error(err); 
      return { success: false };
    }
  });
  fastify.get('/feed', { preValidation: [fastify.authenticate] }, async (req, reply) => {
    const userId = req.user.id;
    const { 
      filter = 'mine', // 'mine', 'contacts', 'nearby', 'public'
      limit = 10, 
      offset = 0,
      userLat, 
      userLng, 
      radius = 50 // km
    } = req.query;

    try {
      let sql = '';
      let params = [];
      let paramIndex = 1;

      // Base Selection
      // We join with profiles to get the username/phone of the person who recorded it
      const baseSelect = `
        SELECT i.id, i.status, i.created_at, i.latitude, i.longitude, i.address,
               p.username, p.phone_number
        FROM incidents i
        LEFT JOIN profiles p ON i.user_id = p.id
        WHERE i.status NOT IN ('SOFT_DELETED', 'HARD_DELETED')
      `;

      // ---------------------------------------------------------
      // FILTER LOGIC
      // ---------------------------------------------------------
      if (filter === 'mine') {
        sql = `${baseSelect} AND i.user_id = $${paramIndex++}`;
        params.push(userId);

      } else if (filter === 'contacts') {
        // Find incidents where the creator's phone number is in YOUR contacts list
        sql = `${baseSelect} 
          AND p.phone_number IN (
            SELECT phone FROM contacts WHERE user_id = $${paramIndex++}
          )`;
        params.push(userId);

      } else if (filter === 'nearby') {
        if (!userLat || !userLng) {
          return reply.code(400).send({ error: "GPS required for nearby feed" });
        }
        // Haversine Formula for Distance (in Kilometers)
        // 6371 is Earth's radius in km
        sql = `
          SELECT i.id, i.status, i.created_at, i.latitude, i.longitude, i.address,
                 p.username,
                 (
                   6371 * acos(
                     cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) + 
                     sin(radians($1)) * sin(radians(i.latitude))
                   )
                 ) AS distance
          FROM incidents i
          LEFT JOIN profiles p ON i.user_id = p.id
          WHERE i.status NOT IN ('SOFT_DELETED', 'HARD_DELETED')
          AND i.latitude IS NOT NULL AND i.longitude IS NOT NULL
          AND (
            6371 * acos(
              cos(radians($1)) * cos(radians(i.latitude)) * cos(radians(i.longitude) - radians($2)) + 
              sin(radians($1)) * sin(radians(i.latitude))
            )
          ) < $3
        `;
        // Reset params for this complex query
        params = [userLat, userLng, radius]; 
        paramIndex = 4; // Next param starts at 4

      } else {
        // Default: Public Feed (All)
        sql = baseSelect;
      }

      // ---------------------------------------------------------
      // SORTING & PAGINATION
      // ---------------------------------------------------------
      // For nearby, we sort by distance. For others, by time.
      if (filter === 'nearby') {
        sql += ` ORDER BY distance ASC`;
      } else {
        sql += ` ORDER BY i.created_at DESC`;
      }

      sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const { rows } = await query(sql, params);
      return { incidents: rows, hasMore: rows.length === parseInt(limit) };

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: 'Feed fetch failed' });
    }
  });

  fastify.get('/:id/map-points', { preValidation: [fastify.authenticate] }, async (req, reply) => {
  const { id } = req.params;
  const { threshold = 0.00005 } = req.query; // ~5 meters in coordinate difference

  try {
    const sql = `
      WITH FilteredPoints AS (
        SELECT *,
          LAG(latitude) OVER (ORDER BY recorded_at) as prev_lat,
          LAG(longitude) OVER (ORDER BY recorded_at) as prev_lng
        FROM incident_locations
        WHERE incident_id = $1
      )
      SELECT id, latitude, longitude, speed, recorded_at
      FROM FilteredPoints
      WHERE prev_lat IS NULL -- Always include the first point
         OR ABS(latitude - prev_lat) > $2 
         OR ABS(longitude - prev_lng) > $2
      ORDER BY recorded_at ASC;
    `;
    
    const { rows } = await query(sql, [id, threshold]);
    return { points: rows };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Failed to fetch map data' });
  }

  
});
fastify.get('/:id/live-path', { preValidation: [fastify.authenticate] }, async (req, reply) => {
  const { id } = req.params;
  const { since } = req.query; // Client sends the timestamp of the last point they have

  try {
    let sql = `
      SELECT latitude, longitude, speed, recorded_at 
      FROM incident_locations 
      WHERE incident_id = $1
    `;
    const params = [id];

    // If client has data, only fetch NEW points
    if (since) {
      sql += ` AND recorded_at > $2`;
      params.push(since);
    }

    sql += ` ORDER BY recorded_at ASC`;

    const { rows } = await query(sql, params);
    return { points: rows };
  } catch (err) {
    fastify.log.error(err);
    return reply.code(500).send({ error: 'Path fetch failed' });
  }
});


}
