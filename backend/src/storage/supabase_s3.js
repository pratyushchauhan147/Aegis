import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { PassThrough, Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

// Supabase Configuration
// Note: Use SERVICE_ROLE_KEY if you need to bypass Row Level Security (RLS) for server-side deletes
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
const bucketName = process.env.SUPABASE_BUCKET_NAME || 'backup'; 

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ FATAL: Missing Supabase credentials in .env");
  process.exit(1);
}

// Initialize Supabase Client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false } // No session needed for backend scripts
});

/**
 * Uploads a stream to Supabase Storage while calculating its SHA256 hash.
 * @param {string} key - The file path (e.g., 'incidents/123/chunk_1.ts')
 * @param {Readable} inputStream - The input stream
 */
export async function uploadChunkWithHash(key, inputStream) {
  return new Promise(async (resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const pass = new PassThrough();

      // Fork the stream: One goes to Hash, one goes to Supabase
      inputStream.on('data', (chunk) => hash.update(chunk));
      inputStream.pipe(pass);

      // Upload to Supabase
      // duplex: 'half' is required for Node.js streams in fetch environments
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(key, pass, {
          contentType: 'video/mp2t',
          duplex: 'half', 
          upsert: true
        });

      if (error) throw error;

      // Finalize Hash
      const finalHash = hash.digest('hex');

      // Get Public URL
      const { data: publicData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(key);

      resolve({ hash: finalHash, url: publicData.publicUrl });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Downloads a file from Supabase and returns it as a Node.js Readable stream.
 * @param {string} key 
 */
export async function getChunkStream(key) {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .download(key);

  if (error) throw error;

  // Supabase returns a Blob. We convert the Blob's web stream to a Node stream.
  // Note: Requires Node.js 18+ for Readable.fromWeb
  if (data.stream) {
    return Readable.fromWeb(data.stream());
  } else {
    // Fallback for older Node versions or arrayBuffer response
    return Readable.from(Buffer.from(await data.arrayBuffer()));
  }
}

/**
 * Deletes all files inside a specific incident folder.
 * @param {string} incidentId 
 */
export async function deleteIncidentFolder(incidentId) {
  const folderPath = `incidents/${incidentId}`; // Adjust based on your folder structure

  try {
    // 1. List files in the folder
    const { data: list, error: listError } = await supabase.storage
      .from(bucketName)
      .list(folderPath);

    if (listError) throw listError;
    if (!list || list.length === 0) return;

    // 2. Map files to their full paths for deletion
    // Supabase list returns names relative to the folder, so we must prepend the folder path
    const filesToDelete = list.map((file) => `${folderPath}/${file.name}`);

    // 3. Delete files
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove(filesToDelete);

    if (deleteError) throw deleteError;

    console.log(`🗑️ Supabase Deleted folder: ${folderPath}`);

  } catch (err) {
    console.error("Supabase Delete Error:", err);
    throw err;
  }
}