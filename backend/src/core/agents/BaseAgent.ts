import { AgentChainOfThought } from './AgentTypes';
import { ProjectStateService } from '../../services/ProjectStateService';
import { WorkspaceSandbox } from '../../services/WorkspaceSandbox';
import { ApiKeyManager } from '../../services/ApiKeyManager';
import { GoogleGenerativeAI } from '@google/generative-ai';

export abstract class BaseAgent {
  protected name: string;
  protected roleDescription: string;

  constructor(
    name: string,
    roleDescription: string,
    protected model: string = 'gemini-1.5-flash-001',
    protected stateService: ProjectStateService,
    protected sandbox: WorkspaceSandbox,
    protected keyManager: ApiKeyManager
  ) {
    this.name = name;
    this.roleDescription = roleDescription;
  }

  public getName(): string {
    return this.name;
  }

  protected async callLLM(prompt: string, systemInstruction: string): Promise<string> {
    console.log("Appel du modèle :", this.model);

    if (this.model.startsWith('ollama:')) {
      const ollamaModel = this.model.replace('ollama:', '');
      const ollamaUrl = 'http://127.0.0.1:11434'; 
      try {
        const response = await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: prompt,
            system: systemInstruction,
            stream: false,
            format: "json"
          })
        });
        
        if (!response.ok) {
          if (response.status === 404) {
             throw new Error(`Le modèle Ollama "${ollamaModel}" n'est pas installé localement. Veuillez le télécharger dans les paramètres.`);
          }
          throw new Error(`Erreur de l'API Ollama: ${response.statusText}`);
        }
        
        const data = await response.json();
        return data.response || '{}';
      } catch (err: any) {
        throw new Error(`Impossible de contacter Ollama localement. Assurez-vous que l'application Ollama est bien lancée en arrière-plan. (Détail: ${err.message})`);
      }
    }

    const key = this.keyManager.getNextActiveKey();
    if (!key) {
      const keysStatus = this.keyManager.getPublicKeys();
      if (keysStatus.some(k => k.status === 'rate_limited')) {
        throw new Error(`Le quota d'utilisation a été dépassé (Rate Limit). Veuillez patienter une minute ou utiliser un modèle avec un quota plus large (les modèles 'Pro' gratuits ont une limite de 50 requêtes/jour).`);
      } else if (keysStatus.some(k => k.status === 'exhausted')) {
        throw new Error(`La clé API est invalide ou a été rejetée. Veuillez vérifier vos clés dans les réglages globaux.`);
      } else {
        throw new Error(`Aucune clé API configurée ou active. Veuillez ajouter une clé API dans les réglages globaux.`);
      }
    }

    try {
      const genAI = new GoogleGenerativeAI(key);
      const generativeModel = genAI.getGenerativeModel({ 
        model: this.model,
        systemInstruction: systemInstruction 
      });
      const response = await generativeModel.generateContent(prompt);
      return response.response.text() || '{}';
    } catch (error: any) {
      if (error.status === 429) {
        this.keyManager.reportError(key, 429);
        return this.callLLM(prompt, systemInstruction); // Retry with next key
      }
      this.keyManager.reportError(key, error.status || 500);
      
      if (error.status === 404) {
        throw new Error(`Le modèle "${this.model}" n'existe pas ou n'est plus supporté par l'API. Veuillez sélectionner un autre modèle dans l'Agent Studio.`);
      }
      
      throw error;
    }
  }

  public abstract processMessage(message: string, contextHistory?: any[]): Promise<AgentChainOfThought>;
}
