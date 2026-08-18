import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/UserService';
import { JWT_SECRET, authMiddleware, requireAdmin, requireTeamLeadOrAdmin, AuthRequest } from '../middlewares/authMiddleware';
import { ProjectManagerService } from '../services/ProjectManagerService';

export function createAuthRoutes(projectManager: ProjectManagerService) {
  const router = Router();

  router.get('/check-setup', async (req, res) => {
    try {
      const isRequired = await UserService.isSetupRequired();
      res.json({ setupRequired: isRequired });
    } catch (e) {
      res.status(500).json({ error: 'Database error' });
    }
  });

  router.post('/setup', async (req, res) => {
    try {
      const isRequired = await UserService.isSetupRequired();
      if (!isRequired) {
        return res.status(400).json({ error: 'Setup already completed' });
      }

      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
      }

      const admin = await UserService.createUser(username, password, 'admin');
      
      // Migrate existing projects to this first admin
      projectManager.migrateOldProjectsToAdmin(admin.id);

      res.status(201).json({ message: 'Admin account created successfully' });
    } catch (e) {
      res.status(500).json({ error: 'Failed to setup admin account' });
    }
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    try {
      const user = await UserService.verifyUser(username, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, user });
    } catch (e) {
      res.status(500).json({ error: 'Login failed' });
    }
  });

  router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
    res.json({ user: req.user });
  });

  // Admin/Team Lead routes for managing employees
  router.get('/users', authMiddleware, requireTeamLeadOrAdmin, (req: AuthRequest, res: Response) => {
    try {
      const users = UserService.getAllUsers();
      res.json(users);
    } catch (e) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  router.post('/users', authMiddleware, requireTeamLeadOrAdmin, async (req: AuthRequest, res: Response) => {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'Missing fields' });
    }
    
    // Role validation based on caller's role
    const callerRole = req.user!.role;
    if (callerRole === 'team_lead') {
      if (role !== 'employee') {
        return res.status(403).json({ error: 'Team Leads can only create employees' });
      }
    } else if (callerRole === 'admin') {
      if (role !== 'admin' && role !== 'team_lead' && role !== 'employee') {
        return res.status(400).json({ error: 'Invalid role' });
      }
    }

    try {
      const user = await UserService.createUser(username, password, role);
      res.status(201).json(user);
    } catch (e) {
      res.status(500).json({ error: 'Failed to create user. Username might be taken.' });
    }
  });

  router.put('/users/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res: Response) => {
    // Only Admin can update users
    const { username, role, password } = req.body;
    try {
      const updatedUser = await UserService.updateUser(req.params.id as string, { 
        username, 
        role, 
        passwordPlain: password 
      });
      res.json(updatedUser);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  router.delete('/users/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
    // Only Admin can delete users
    // Prevent deleting oneself
    if (req.user!.id === req.params.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    try {
      UserService.deleteUser(req.params.id as string);
      res.json({ message: 'User deleted' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  return router;
}
