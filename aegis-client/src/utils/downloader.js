// utils/downloader.js

/**
 * Downloads and stitches an HLS stream into a single .ts file
 * @param {string} incidentId - The UUID of the incident
 * @param {string} apiUrl - Base API URL (e.g. http://localhost:3001)
 * @returns {Promise<void>}
 */
export async function downloadIncidentVideo(incidentId, apiUrl) {
  try {
    // 1. Fetch the Manifest
    // Note: We use the proxy path if on client, or direct if needed. 
    // Best to pass the full base URL from the component.
    const manifestUrl = `${apiUrl}/playback/${incidentId}/index.m3u8`;
    
    console.log(`📥 Fetching manifest: ${manifestUrl}`);
    const manifestRes = await fetch(manifestUrl);
    
    if (!manifestRes.ok) throw new Error(`Manifest fetch failed: ${manifestRes.status}`);
    
    const manifestText = await manifestRes.text();

    // 2. Parse Manifest for Chunk URLs
    // Lines not starting with '#' are usually file paths
    const lines = manifestText.split('\n');
    const chunkUrls = lines
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'))
      .map(line => {
        // If line is a full URL, use it. Otherwise, prepend API_URL.
        return line.startsWith('http') ? line : `${apiUrl}${line}`;
      });

    if (chunkUrls.length === 0) {
      throw new Error("No video segments found in manifest.");
    }

    console.log(`📦 Found ${chunkUrls.length} chunks. Starting download...`);

    // 3. Download All Chunks (Parallel)
    // We use Promise.all to maximize bandwidth usage
    const chunkPromises = chunkUrls.map(async (url, index) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Chunk ${index} failed`);
      return res.blob();
    });

    const blobs = await Promise.all(chunkPromises);

    // 4. Stitch Blobs (Merge)
    // MPEG-TS is designed to be concatenated directly
    const mergedBlob = new Blob(blobs, { type: 'video/mp2t' }); // 'video/mp2t' is correct for .ts

    // 5. Trigger Browser Download
    const downloadUrl = window.URL.createObjectURL(mergedBlob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `AEGIS_EVIDENCE_${incidentId.slice(0, 8)}_${new Date().toISOString().slice(0,10)}.ts`;
    
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
    
    console.log("✅ Download complete");
    return true;

  } catch (error) {
    console.error("❌ Download Error:", error);
    throw error; // Re-throw to let UI handle the alert
  }
}