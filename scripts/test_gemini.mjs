import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v) env[k.trim()] = v.join('=').trim();
});

const apiKey = env.GEMINI_API_KEY;
console.log('API Key present:', !!apiKey, 'prefix:', apiKey ? apiKey.slice(0, 10) : 'none');

const ai = new GoogleGenAI({ apiKey });

async function run() {
  const modelsToTest = [
    env.GEMINI_MODEL,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-3.8-flash'
  ].filter(Boolean);

  for (const m of modelsToTest) {
    try {
      console.log(`Testing model: ${m}...`);
      const response = await ai.models.generateContent({
        model: m,
        contents: 'Say hello in 3 words'
      });
      console.log(`SUCCESS [${m}]:`, response.text?.trim());
      break;
    } catch (e) {
      console.log(`FAILED [${m}]:`, e.message || e);
    }
  }
}

run();
