import cron from 'node-cron'; // 1. Import Cron
import { query } from '../db/client.js';
import { deleteIncidentFolder } from '../storage/s3.js';

export default async function cleanupRoutes(fastify, options) {

  // ♻️ SHARED CLEANUP LOGIC (Reusable)
  const performCleanup = async () => {
    console.log('⏰ Starting Automated Cleanup Task...');
    try {
      // 1. Find candidates (Soft Deleted > 10 days ago)
      // ⚠️ NOTE: Changed back to '10 days' for production safety. 
      // Change to '1 second' if you are still testing!
      const sql = `
        SELECT id 
        FROM incidents 
        WHERE status = 'SOFT_DELETED' 
        AND ended_at < NOW() - INTERVAL '10 days'
      `;
      
      const { rows } = await query(sql);
      
      if (rows.length === 0) {
        // Quietly return if nothing to do (keeps logs clean)
        return { count: 0 };
      }

      console.log(`Found ${rows.length} incidents ready for hard deletion.`);
      const processed = [];

      // 2. Process Deletions
      for (const incident of rows) {
        console.log(`🔥 Hard Deleting Incident: ${incident.id}`);

        // A. Wipe S3 Files
        await deleteIncidentFolder(incident.id);

        // B. Wipe Chunk Metadata (DB)
        // Clean up the chunks table since files are gone
        await query("DELETE FROM chunks WHERE incident_id = $1", [incident.id]);

        // C. Mark Hard Deleted (DB)
        await query("UPDATE incidents SET status = 'HARD_DELETED' WHERE id = $1", [incident.id]);
        
        processed.push(incident.id);
      }

      console.log(`🗑️ Successfully wiped ${processed.length} incidents.`);
      return { count: processed.length, ids: processed };

    } catch (err) {
      console.error('❌ Cleanup Error:', err);
      return { error: err.message };
    }
  };

  // ---------------------------------------------------------

  // 🕹️ OPTION A: MANUAL TRIGGER (Keep for testing/admin)
  // POST http://localhost:3000/cleanup/run
  fastify.post('/run', async (req, reply) => {
    const result = await performCleanup();
    return result;
  });

  // ⏰ OPTION B: AUTOMATIC TRIGGER (Runs every Midnight)
  // Cron Syntax: 'Minute Hour Day Month Weekday'
  // '0 0 * * *' = "At 00:00 (Midnight) every day"
  cron.schedule('0 0 * * *', () => {
    performCleanup();
  });
  
  console.log("📅 Cleanup Scheduler Active: Running at 00:00 Daily");
}