import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;

// AES-128-CBC decryption logic used by mp3paw / savetube
function decryptSaveTube(base64Data: string): string {
  const keyHex = "C5D58EF67A7584E4A29F6C35BBC4EB12";
  const key = Buffer.from(keyHex, 'hex');
  const encryptedBuffer = Buffer.from(base64Data, 'base64');
  const iv = encryptedBuffer.subarray(0, 16);
  const ciphertext = encryptedBuffer.subarray(16);
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
  decipher.setAutoPadding(true);
  let decrypted = decipher.update(ciphertext, undefined, 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  // --- API ROUTES ---

  // Search memes from MP3Paw
  app.post('/api/search-paw', async (req, res) => {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    try {
      console.log(`[API] Searching MP3Paw for: "${query}"`);
      const response = await fetch('https://mp3paw.nu/api/yt-data', {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query })
      });

      if (!response.ok) {
        throw new Error(`Failed to search MP3Paw API: ${response.statusText}`);
      }

      const data: any = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error('[API] Error searching MP3Paw:', error);
      return res.status(500).json({ error: error.message || 'Failed to search MP3Paw' });
    }
  });

  // Download a specific YouTube video from MP3Paw results
  app.post('/api/download-paw', async (req, res) => {
    const { url, filename, title } = req.body;
    if (!url || !filename) {
      return res.status(400).json({ error: 'URL and filename are required' });
    }

    // Ensure safe filename
    const safeFilename = filename.toLowerCase().replace(/[^a-z0-9_-]/g, '-') + '.mp3';
    const targetPath = path.join(process.cwd(), 'public', 'sounds', safeFilename);

    try {
      console.log(`[API] Initiating download: URL="${url}" -> File="${safeFilename}"`);
      
      // A. Fetch random CDN
      const cdnResponse = await fetch('https://media.savetube.vip/api/random-cdn', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const cdnData: any = await cdnResponse.json();
      const cdn = cdnData.cdn;
      if (!cdn) {
        throw new Error('Could not retrieve random CDN from SaveTube');
      }
      console.log(`[API] Selected SaveTube CDN: ${cdn}`);

      // B. Call v2/info
      const infoResponse = await fetch(`https://${cdn}/v2/info`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ url })
      });
      const infoData: any = await infoResponse.json();
      const encryptedData = infoData.data;
      if (!encryptedData) {
        throw new Error(infoData.message || 'Failed to get encrypted info from SaveTube');
      }

      // C. Decrypt
      const decryptedStr = decryptSaveTube(encryptedData);
      const decryptedJson = JSON.parse(decryptedStr);
      const key = decryptedJson.key;
      if (!key) {
        throw new Error('Decrypted payload did not contain a valid download key');
      }

      // D. Request download url
      const dlResponse = await fetch(`https://${cdn}/download`, {
        method: 'POST',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          downloadType: 'audio',
          quality: 128,
          key: key
        })
      });
      const dlData: any = await dlResponse.json();
      const downloadUrl = dlData.data?.downloadUrl || dlData.downloadUrl;
      if (!downloadUrl) {
        throw new Error('Failed to retrieve file download URL from CDN');
      }

      // E. Download file and write to public/sounds
      const fileResponse = await fetch(downloadUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      if (!fileResponse.ok) {
        throw new Error(`Failed to download audio file: ${fileResponse.statusText}`);
      }

      const arrayBuffer = await fileResponse.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create public/sounds directory if it doesn't exist
      const soundsDir = path.dirname(targetPath);
      if (!fs.existsSync(soundsDir)) {
        fs.mkdirSync(soundsDir, { recursive: true });
      }

      fs.writeFileSync(targetPath, buffer);
      console.log(`[API] Successfully saved MP3 to ${targetPath}`);

      return res.json({
        success: true,
        filename: safeFilename,
        url: `/sounds/${safeFilename}`,
        title: title || filename
      });

    } catch (error: any) {
      console.error('[API] Error during MP3Paw download:', error);
      return res.status(500).json({ error: error.message || 'Failed to download meme' });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
