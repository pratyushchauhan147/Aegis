import { query } from '../db/client.js';

export default async function playbackRoutes(fastify, options) {

  // GET /playback/:id/index.m3u8
  fastify.get('/:id/index.m3u8', async (req, reply) => {
    const { id } = req.params;

    try {
      // 1. Fetch Status
      const incidentRes = await query('SELECT status FROM incidents WHERE id = $1', [id]);
      if (incidentRes.rows.length === 0) return reply.code(404).send('Incident not found');
      
      const isLive = incidentRes.rows[0].status === 'ACTIVE';

      // 2. Fetch Chunks
      const chunksRes = await query(
        'SELECT duration, storage_path FROM chunks WHERE incident_id = $1 ORDER BY sequence_no ASC',
        [id]
      );
      const chunks = chunksRes.rows;

      // 3. Construct Manifest
      let m3u8 = '#EXTM3U\n';
      m3u8 += '#EXT-X-VERSION:3\n';
      m3u8 += '#EXT-X-TARGETDURATION:4\n'; 
      m3u8 += '#EXT-X-MEDIA-SEQUENCE:0\n'; 
      // TELLS PLAYER TO ACCEPT DISCONTINUOUS TIMESTAMPS
      m3u8 += '#EXT-X-PLAYLIST-TYPE:EVENT\n'; 

      chunks.forEach(chunk => {
        // ---------------------------------------------------------
        // ✅ THE FIX: Add Discontinuity Tag before every chunk
        // This tells the player "The timestamp resets to 0 here"
        // ---------------------------------------------------------
        m3u8 += '#EXT-X-DISCONTINUITY\n'; 
        
        m3u8 += `#EXTINF:${chunk.duration},\n`;
        m3u8 += `${chunk.storage_path}\n`; 
      });

      if (!isLive) {
        m3u8 += '#EXT-X-ENDLIST\n';
      }

      reply.header('Content-Type', 'application/vnd.apple.mpegurl');
      return m3u8;

    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send('Playback Error');
    }
  });
}