// Firebase Functions example for receipt OCR using Google Cloud Vision.
// Copy this file into your actual `functions/src/index.ts` (or import it there),
// then deploy with: firebase deploy --only functions:scanReceipt

import * as functions from 'firebase-functions';
import vision from '@google-cloud/vision';

const client = new vision.ImageAnnotatorClient();

export const scanReceipt = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    // CORS / preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type,x-api-key');
      return res.status(204).send('');
    }

    if (req.method !== 'POST') {
      return res.status(405).send('Only POST allowed');
    }

    // Optional simple API key check
    const expectedKey = process.env.SCAN_RECEIPT_API_KEY;
    if (expectedKey && req.headers['x-api-key'] !== expectedKey) {
      return res.status(401).send('Unauthorized');
    }

    const imageBase64 = (req.body && req.body.imageBase64) as string | undefined;
    if (!imageBase64) {
      return res.status(400).send('imageBase64 is required');
    }

    try {
      const [result] = await client.textDetection({
        image: { content: imageBase64 },
      });

      const fullText =
        result.fullTextAnnotation?.text ||
        result.textAnnotations?.[0]?.description ||
        '';

      return res.json({ text: fullText || '' });
    } catch (err) {
      console.error('scanReceipt Vision error', err);
      return res.status(500).send('OCR failed');
    }
  });

