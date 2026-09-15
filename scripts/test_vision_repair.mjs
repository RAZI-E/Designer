import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import { repairJson } from '../src/lib/json-repair.ts';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const apiKey = env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function testVision() {
  const filePath = 'C:\\Users\\razim\\.gemini\\antigravity-ide\\brain\\5cf6236f-5251-4ed1-9b97-f6b786165ac4\\website_design.png';
  const buffer = fs.readFileSync(filePath);
  const base64Data = buffer.toString('base64');

  const models = [
    env.GEMINI_MODEL,
    'gemini-3.5-flash',
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean);

  for (const model of models) {
    try {
      console.log(`Testing vision model ${model}...`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: 'image/png'
                }
              },
              {
                text: 'Return a small JSON object with: { "theme": { "primary": "#hex" }, "detectedTitle": "string" }'
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
          temperature: 0.1
        }
      });

      console.log(`SUCCESS with ${model}:`);
      const parsed = repairJson(response.text);
      console.log('Parsed JSON:', parsed);
      return;
    } catch (err) {
      console.log(`FAILED with ${model}:`, err.message || err);
    }
  }
}

testVision();
