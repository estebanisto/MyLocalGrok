import { Router } from 'express';
import { ApiKeyManager } from '../services/ApiKeyManager';
import { ProjectStateService } from '../services/ProjectStateService';
import { AgentOrchestrator } from '../services/AgentOrchestrator';

export function createApiRoutes(
  keyManager: ApiKeyManager, 
  stateService: ProjectStateService,
  orchestrator: AgentOrchestrator
) {
  const router = Router();

  router.get('/keys', (req, res) => {
    res.json(keyManager.getPublicKeys());
  });

  router.post('/keys', (req, res) => {
    const { key } = req.body;
    if (key) {
      keyManager.addKey(key);
      res.status(201).json({ message: 'Key added' });
    } else {
      res.status(400).json({ error: 'Key is required' });
    }
  });

  router.delete('/keys/:id', (req, res) => {
    keyManager.removeKey(req.params.id);
    res.json({ message: 'Key removed' });
  });

  router.get('/state', async (req, res) => {
    try {
      const state = await stateService.getState();
      res.json(state);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read state' });
    }
  });

  // Agents CRUD
  router.get('/agents', async (req, res) => {
    try {
      const config = await orchestrator.getAgentsConfig();
      res.json(config);
    } catch (err) {
      res.status(500).json({ error: 'Failed to read agents config' });
    }
  });

  router.post('/agents', async (req, res) => {
    try {
      const config = await orchestrator.getAgentsConfig();
      config.push(req.body);
      await orchestrator.updateAgentsConfig(config);
      res.status(201).json(req.body);
    } catch (err) {
      res.status(500).json({ error: 'Failed to add agent' });
    }
  });

  router.put('/agents/:id', async (req, res) => {
    try {
      let config = await orchestrator.getAgentsConfig();
      config = config.map(a => a.id === req.params.id ? { ...a, ...req.body } : a);
      await orchestrator.updateAgentsConfig(config);
      res.json({ message: 'Agent updated' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update agent' });
    }
  });

  router.delete('/agents/:id', async (req, res) => {
    try {
      let config = await orchestrator.getAgentsConfig();
      config = config.filter(a => a.id !== req.params.id);
      await orchestrator.updateAgentsConfig(config);
      res.json({ message: 'Agent deleted' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  });

  return router;
}
