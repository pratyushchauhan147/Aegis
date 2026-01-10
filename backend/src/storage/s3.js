import { S3Client, GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import crypto from 'crypto';
import { PassThrough } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const region = process.env.S3_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
const bucketName = process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET;

if (!accessKeyId || !secretAccessKey || !bucketName) {
  console.error("❌ FATAL: Missing S3 credentials in .env");
  process.exit(1);
}

export const s3Client = new S3Client({
  region: region, // ap-south-1
  forcePathStyle: false,
  credentials: {
    accessKeyId,
    secretAccessKey
  }
});


// ... (uploadChunkWithHash and getChunkStream remain the same) ...

export async function uploadChunkWithHash(key, inputStream) {
  return new Promise(async (resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const pass = new PassThrough();
      inputStream.on('data', (chunk) => hash.update(chunk));
      inputStream.pipe(pass);
      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: bucketName,
          Key: key,
          Body: pass,
          ContentType: 'video/mp2t'
        }
      });
      await upload.done();
      const finalHash = hash.digest('hex');
   const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;


      resolve({ hash: finalHash, url: publicUrl });
    } catch (err) {
      reject(err);
    }
  });
}

export async function getChunkStream(key) {
  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key
  });
  const result = await s3Client.send(command);
  return result.Body;
}

// 🆕 NEW FUNCTION: Deletes all chunks for an incident
export async function deleteIncidentFolder(incidentId) {
  const prefix = `incidents/${incidentId}/`; 

  try {
    // 1. List files
    const listCmd = new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix
    });
    const listed = await s3Client.send(listCmd);

    if (!listed.Contents || listed.Contents.length === 0) return;

    // 2. Delete files
    const deleteCmd = new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: {
        Objects: listed.Contents.map(({ Key }) => ({ Key }))
      }
    });

    await s3Client.send(deleteCmd);
    console.log(`🗑️ S3 Deleted folder: ${prefix}`);
    
  } catch (err) {
    console.error("S3 Delete Error:", err);
    throw err;
  }
}