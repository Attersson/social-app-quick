import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Initialize dotenv
dotenv.config();

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const template = `// This file is auto-generated
const firebaseConfig = {
  apiKey: "${process.env.VITE_FIREBASE_API_KEY}",
  projectId: "${process.env.VITE_FIREBASE_PROJECT_ID}",
  messagingSenderId: "${process.env.VITE_FIREBASE_MESSAGING_SENDER_ID}",
  appId: "${process.env.VITE_FIREBASE_APP_ID}"
};`;

const outputPath = join(__dirname, '../public/firebase-messaging-sw-config.js');

writeFileSync(outputPath, template);
console.log('Generated service worker config file'); 