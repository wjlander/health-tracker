import express from 'express';
import { storage } from './storage.js';
import { healthEntries, foodEntries, activityEntries, users } from '../shared/schema.js';

const router = express.Router();

// Error handling middleware
const asyncHandler = (fn: Function) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// User routes
router.get('/api/users/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const user = await storage.getUser(id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
}));

router.post('/api/users', asyncHandler(async (req: express.Request, res: express.Response) => {
  const userData = req.body;
  const user = await storage.createUser(userData);
  res.status(201).json(user);
}));

// Health entries routes
router.get('/api/health-entries/:userId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { userId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 30;
  const entries = await storage.getHealthEntries(userId, limit);
  res.json(entries);
}));

router.post('/api/health-entries', asyncHandler(async (req: express.Request, res: express.Response) => {
  const entryData = req.body;
  const entry = await storage.createHealthEntry(entryData);
  res.status(201).json(entry);
}));

router.get('/api/health-entries/entry/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const entry = await storage.getHealthEntry(id);
  if (!entry) {
    return res.status(404).json({ error: 'Health entry not found' });
  }
  res.json(entry);
}));

router.put('/api/health-entries/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const entry = await storage.updateHealthEntry(id, updateData);
  res.json(entry);
}));

router.delete('/api/health-entries/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  await storage.deleteHealthEntry(id);
  res.status(204).send();
}));

// Food entries routes
router.get('/api/food-entries/:userId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { userId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const entries = await storage.getFoodEntries(userId, limit);
  res.json(entries);
}));

router.post('/api/food-entries', asyncHandler(async (req: express.Request, res: express.Response) => {
  const entryData = req.body;
  const entry = await storage.createFoodEntry(entryData);
  res.status(201).json(entry);
}));

router.delete('/api/food-entries/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  await storage.deleteFoodEntry(id);
  res.status(204).send();
}));

// Activity entries routes
router.get('/api/activity-entries/:userId', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { userId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  const entries = await storage.getActivityEntries(userId, limit);
  res.json(entries);
}));

router.post('/api/activity-entries', asyncHandler(async (req: express.Request, res: express.Response) => {
  const entryData = req.body;
  const entry = await storage.createActivityEntry(entryData);
  res.status(201).json(entry);
}));

router.delete('/api/activity-entries/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  await storage.deleteActivityEntry(id);
  res.status(204).send();
}));

// User integrations routes
router.get('/api/integrations/:userId/:provider', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { userId, provider } = req.params;
  const integration = await storage.getUserIntegration(userId, provider);
  if (!integration) {
    return res.status(404).json({ error: 'Integration not found' });
  }
  res.json(integration);
}));

router.post('/api/integrations', asyncHandler(async (req: express.Request, res: express.Response) => {
  const integrationData = req.body;
  const integration = await storage.saveUserIntegration(integrationData);
  res.status(201).json(integration);
}));

router.put('/api/integrations/:id', asyncHandler(async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const updateData = req.body;
  const integration = await storage.updateUserIntegration(id, updateData);
  res.json(integration);
}));

// Fitbit data routes
router.post('/api/fitbit/activities', asyncHandler(async (req: express.Request, res: express.Response) => {
  const activityData = req.body;
  const activity = await storage.saveFitbitActivities(activityData);
  res.status(201).json(activity);
}));

router.post('/api/fitbit/weights', asyncHandler(async (req: express.Request, res: express.Response) => {
  const weightData = req.body;
  const weight = await storage.saveFitbitWeights(weightData);
  res.status(201).json(weight);
}));

router.post('/api/fitbit/foods', asyncHandler(async (req: express.Request, res: express.Response) => {
  const foodData = req.body;
  const food = await storage.saveFitbitFoods(foodData);
  res.status(201).json(food);
}));

router.post('/api/fitbit/sleep', asyncHandler(async (req: express.Request, res: express.Response) => {
  const sleepData = req.body;
  const sleep = await storage.saveFitbitSleep(sleepData);
  res.status(201).json(sleep);
}));

// Error handling middleware
router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

export default router;