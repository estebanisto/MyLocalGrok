const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.argv[2];

if (!key) {
  console.error("Veuillez fournir votre clé API en argument : node test-api.js VOTRE_CLE");
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(key);

const modelsToTest = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-flash-001',
  'gemini-1.5-flash-002',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash-exp'
];

async function runTests() {
  console.log("Démarrage du diagnostic : Liste des modèles autorisés pour cette clé...");
  const https = require('https');
  https.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) {
          console.error("Erreur API :", parsed.error.message);
        } else if (parsed.models) {
          console.log("Modèles disponibles :");
          parsed.models.forEach(m => console.log(` - ${m.name} (generateContent: ${m.supportedGenerationMethods?.includes('generateContent')})`));
        } else {
          console.log("Réponse inattendue :", parsed);
        }
      } catch (e) {
        console.error("Erreur parsing :", e.message);
      }
    });
  }).on('error', (e) => {
    console.error("Erreur requête :", e.message);
  });
}

runTests();
