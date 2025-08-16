require('dotenv').config({ path: './server/.env' });

const key = process.env.OPENAI_API_KEY;
console.log('Current directory:', process.cwd());
console.log('Key exists:', Boolean(key));
console.log('Key value (first 20 chars):', key ? key.substring(0, 20) + '...' : 'NOT SET');
console.log('Key not TO_BE_SET:', key !== 'TO_BE_SET');
console.log('Key not YOUR_OPENAI_API_KEY_HERE:', key !== 'YOUR_OPENAI_API_KEY_HERE');
console.log('Key starts with sk:', key && key.startsWith('sk-'));
console.log('Key length:', key ? key.length : 0);
console.log('Should initialize OpenAI:', key && key !== 'TO_BE_SET');