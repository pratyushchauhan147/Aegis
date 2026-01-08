import fs from 'fs';
import path from 'path';
import os from 'os';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { query } from '../db/client.js';
import { uploadChunkWithHash } from '../storage/s3.js';
import { pipeline } from 'stream/promises'; // Standard Node.js stream handler

// Set binary path
ffmpeg.setFfmpegPath(ffmpegPath);

export default async function ingestRoutes(fastify, options) {

  fastify.post('/chunk', async (req, reply) => {
    let tempInput = null;
    let tempOutput = null;

    try {
      const data = await req.file();
      if (!data) return reply.code(400).send({ error: 'No file' });

      // 1. Extract Metadata
      const incident_id = data.fields.incident_id?.value;
      const sequence_no = parseInt(data.fields.sequence_no?.value);
      const duration = parseFloat(data.fields.duration?.value);

      if (!incident_id || isNaN(sequence_no)) {
        return reply.code(400).send({ error: 'Missing metadata' });
      }

      // 2. Setup Temp Paths (Windows/Linux compatible)
      tempInput = path.join(os.tmpdir(), `input_${incident_id}_${sequence_no}.webm`);
      tempOutput = path.join(os.tmpdir(), `output_${incident_id}_${sequence_no}.ts`);

      // 3. Save Stream to Disk Safely
      // We use pipeline to ensure the file is FULLY written before we check it
      await pipeline(data.file, fs.createWriteStream(tempInput));

      // 🛑 THE BOUNCER CHECK (Fixes your S3 issue)
      const stats = await fs.promises.stat(tempInput);
      
      // Log the size so you can see it in your terminal
      console.log(`📦 Chunk ${sequence_no} received. Size: ${stats.size} bytes`);

      if (stats.size < 1024) { 
         console.warn(`⚠️ Skipped empty/tiny chunk ${sequence_no} (${stats.size} bytes). Prevents FFmpeg crash.`);
         // We return SUCCESS so the phone keeps recording, but we don't process this junk file.
         return { success: true, status: 'skipped_tiny_chunk' };
      }
      // -------------------------------------------------------------

      // 4. Check Incident Status
      const statusRes = await query('SELECT status FROM incidents WHERE id = $1', [incident_id]);
      if (statusRes.rows.length === 0 || statusRes.rows[0].status !== 'ACTIVE') {
        return reply.code(403).send({ error: 'Incident not ACTIVE' });
      }

      // 5. Transcode (WebM -> H.264 TS)
      // Now safe because we know the file is not empty
      await new Promise((resolve, reject) => {
        ffmpeg(tempInput)
          .outputOptions([
            '-c:v libx264',
            '-preset ultrafast',
            '-c:a aac',
            '-f mpegts'
          ])
          .save(tempOutput)
          .on('end', resolve)
          .on('error', (err) => {
            console.error('FFmpeg Error:', err.message);
            reject(err);
          });
      });

      // 6. Upload to S3 (This will finally run!)
      const fileStream = fs.createReadStream(tempOutput);
      const storageKey = `incidents/${incident_id}/${sequence_no}.ts`;
      const { hash, url } = await uploadChunkWithHash(storageKey, fileStream);
      console.log(`✅ Uploaded Chunk ${sequence_no} to S3`);

      // 7. Save to DB
      const insertSql = `
        INSERT INTO chunks (incident_id, sequence_no, storage_path, hash, duration)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id;
      `;
      await query(insertSql, [incident_id, sequence_no, url, hash, duration]);

      return { success: true, hash, sequence_no };

    } catch (err) {
      if (err.code === '23505') return { success: true, status: 'duplicate' };
      
      console.error("❌ Ingest Failed:", err.message);
      // Return 500 but don't crash the server process
      return reply.code(500).send({ error: 'Ingest failed' });
    } finally {
      // 8. Cleanup Temp Files
      if (tempInput) await fs.promises.unlink(tempInput).catch(() => {});
      if (tempOutput) await fs.promises.unlink(tempOutput).catch(() => {});
    }
  });
}