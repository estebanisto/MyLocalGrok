const { GoogleGenerativeAI } = require('@google/generative-ai');

const key = process.argv[2];
const genAI = new GoogleGenerativeAI(key);

const modelsToTest = [
  'gemini-flash-latest',
  'gemini-pro-latest',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'antigravity-preview-05-2026'
];

async function runTests() {
  console.log("Démarrage du test de GENERATION réel...");
  for (const modelName of modelsToTest) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Test court. Réponds 'OK'.");
      console.log(`✅ SUCCÈS TOTAL : ${modelName} a répondu -> ${result.response.text().trim()}`);
    } catch (error) {
      console.log(`❌ ECHEC : ${modelName} -> ${error.message}`);
    }
  }
}

runTests();
