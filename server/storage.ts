import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { db } from './db.js';
import { 
  users, 
  healthEntries, 
  foodEntries, 
  activityEntries, 
  userIntegrations,
  fitbitActivities,
  fitbitWeights,
  fitbitFoods,
  fitbitSleep
} from '../shared/schema.js';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<typeof users.$inferSelect | undefined>;
  getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined>;
  createUser(insertUser: typeof users.$inferInsert): Promise<typeof users.$inferSelect>;
  
  // Health entries
  createHealthEntry(entry: typeof healthEntries.$inferInsert): Promise<typeof healthEntries.$inferSelect>;
  getHealthEntries(userId: string, limit?: number): Promise<typeof healthEntries.$inferSelect[]>;
  getHealthEntry(id: string): Promise<typeof healthEntries.$inferSelect | undefined>;
  updateHealthEntry(id: string, entry: Partial<typeof healthEntries.$inferInsert>): Promise<typeof healthEntries.$inferSelect>;
  deleteHealthEntry(id: string): Promise<void>;
  
  // Food entries
  createFoodEntry(entry: typeof foodEntries.$inferInsert): Promise<typeof foodEntries.$inferSelect>;
  getFoodEntries(userId: string, limit?: number): Promise<typeof foodEntries.$inferSelect[]>;
  deleteFoodEntry(id: string): Promise<void>;
  
  // Activity entries
  createActivityEntry(entry: typeof activityEntries.$inferInsert): Promise<typeof activityEntries.$inferSelect>;
  getActivityEntries(userId: string, limit?: number): Promise<typeof activityEntries.$inferSelect[]>;
  deleteActivityEntry(id: string): Promise<void>;
  
  // Fitbit integration
  getUserIntegration(userId: string, provider: string): Promise<typeof userIntegrations.$inferSelect | undefined>;
  saveUserIntegration(integration: typeof userIntegrations.$inferInsert): Promise<typeof userIntegrations.$inferSelect>;
  updateUserIntegration(id: string, data: Partial<typeof userIntegrations.$inferInsert>): Promise<typeof userIntegrations.$inferSelect>;
  
  saveFitbitActivities(data: typeof fitbitActivities.$inferInsert): Promise<typeof fitbitActivities.$inferSelect>;
  saveFitbitWeights(data: typeof fitbitWeights.$inferInsert): Promise<typeof fitbitWeights.$inferSelect>;
  saveFitbitFoods(data: typeof fitbitFoods.$inferInsert): Promise<typeof fitbitFoods.$inferSelect>;
  saveFitbitSleep(data: typeof fitbitSleep.$inferInsert): Promise<typeof fitbitSleep.$inferSelect>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<typeof users.$inferSelect | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<typeof users.$inferSelect | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: typeof users.$inferInsert): Promise<typeof users.$inferSelect> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createHealthEntry(entry: typeof healthEntries.$inferInsert): Promise<typeof healthEntries.$inferSelect> {
    const [healthEntry] = await db.insert(healthEntries).values(entry).returning();
    return healthEntry;
  }

  async getHealthEntries(userId: string, limit: number = 30): Promise<typeof healthEntries.$inferSelect[]> {
    return await db
      .select()
      .from(healthEntries)
      .where(eq(healthEntries.userId, userId))
      .orderBy(desc(healthEntries.date))
      .limit(limit);
  }

  async getHealthEntry(id: string): Promise<typeof healthEntries.$inferSelect | undefined> {
    const [entry] = await db.select().from(healthEntries).where(eq(healthEntries.id, id));
    return entry || undefined;
  }

  async updateHealthEntry(id: string, entry: Partial<typeof healthEntries.$inferInsert>): Promise<typeof healthEntries.$inferSelect> {
    const [updated] = await db
      .update(healthEntries)
      .set({ ...entry, updatedAt: sql`now()` })
      .where(eq(healthEntries.id, id))
      .returning();
    return updated;
  }

  async deleteHealthEntry(id: string): Promise<void> {
    await db.delete(healthEntries).where(eq(healthEntries.id, id));
  }

  async createFoodEntry(entry: typeof foodEntries.$inferInsert): Promise<typeof foodEntries.$inferSelect> {
    const [foodEntry] = await db.insert(foodEntries).values(entry).returning();
    return foodEntry;
  }

  async getFoodEntries(userId: string, limit: number = 50): Promise<typeof foodEntries.$inferSelect[]> {
    return await db
      .select()
      .from(foodEntries)
      .where(eq(foodEntries.userId, userId))
      .orderBy(desc(foodEntries.createdAt))
      .limit(limit);
  }

  async deleteFoodEntry(id: string): Promise<void> {
    await db.delete(foodEntries).where(eq(foodEntries.id, id));
  }

  async createActivityEntry(entry: typeof activityEntries.$inferInsert): Promise<typeof activityEntries.$inferSelect> {
    const [activityEntry] = await db.insert(activityEntries).values(entry).returning();
    return activityEntry;
  }

  async getActivityEntries(userId: string, limit: number = 50): Promise<typeof activityEntries.$inferSelect[]> {
    return await db
      .select()
      .from(activityEntries)
      .where(eq(activityEntries.userId, userId))
      .orderBy(desc(activityEntries.createdAt))
      .limit(limit);
  }

  async deleteActivityEntry(id: string): Promise<void> {
    await db.delete(activityEntries).where(eq(activityEntries.id, id));
  }

  async getUserIntegration(userId: string, provider: string): Promise<typeof userIntegrations.$inferSelect | undefined> {
    const [integration] = await db
      .select()
      .from(userIntegrations)
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, provider)));
    return integration || undefined;
  }

  async saveUserIntegration(integration: typeof userIntegrations.$inferInsert): Promise<typeof userIntegrations.$inferSelect> {
    const [saved] = await db
      .insert(userIntegrations)
      .values(integration)
      .onConflictDoUpdate({
        target: [userIntegrations.userId, userIntegrations.provider],
        set: {
          accessToken: integration.accessToken,
          refreshToken: integration.refreshToken,
          expiresAt: integration.expiresAt,
          updatedAt: sql`now()`
        }
      })
      .returning();
    return saved;
  }

  async updateUserIntegration(id: string, data: Partial<typeof userIntegrations.$inferInsert>): Promise<typeof userIntegrations.$inferSelect> {
    const [updated] = await db
      .update(userIntegrations)
      .set({ ...data, updatedAt: sql`now()` })
      .where(eq(userIntegrations.id, id))
      .returning();
    return updated;
  }

  async saveFitbitActivities(data: typeof fitbitActivities.$inferInsert): Promise<typeof fitbitActivities.$inferSelect> {
    const [saved] = await db
      .insert(fitbitActivities)
      .values(data)
      .onConflictDoUpdate({
        target: [fitbitActivities.userId, fitbitActivities.date],
        set: {
          steps: data.steps,
          distance: data.distance,
          calories: data.calories,
          activeMinutes: data.activeMinutes,
          activities: data.activities,
          syncedAt: sql`now()`
        }
      })
      .returning();
    return saved;
  }

  async saveFitbitWeights(data: typeof fitbitWeights.$inferInsert): Promise<typeof fitbitWeights.$inferSelect> {
    const [saved] = await db
      .insert(fitbitWeights)
      .values(data)
      .onConflictDoUpdate({
        target: [fitbitWeights.userId, fitbitWeights.date],
        set: {
          weight: data.weight,
          bmi: data.bmi,
          fatPercentage: data.fatPercentage,
          syncedAt: sql`now()`
        }
      })
      .returning();
    return saved;
  }

  async saveFitbitFoods(data: typeof fitbitFoods.$inferInsert): Promise<typeof fitbitFoods.$inferSelect> {
    const [saved] = await db
      .insert(fitbitFoods)
      .values(data)
      .onConflictDoUpdate({
        target: [fitbitFoods.userId, fitbitFoods.date],
        set: {
          calories: data.calories,
          foods: data.foods,
          water: data.water,
          syncedAt: sql`now()`
        }
      })
      .returning();
    return saved;
  }

  async saveFitbitSleep(data: typeof fitbitSleep.$inferInsert): Promise<typeof fitbitSleep.$inferSelect> {
    const [saved] = await db
      .insert(fitbitSleep)
      .values(data)
      .onConflictDoUpdate({
        target: [fitbitSleep.userId, fitbitSleep.date],
        set: {
          duration: data.duration,
          efficiency: data.efficiency,
          startTime: data.startTime,
          endTime: data.endTime,
          stages: data.stages,
          syncedAt: sql`now()`
        }
      })
      .returning();
    return saved;
  }
}

export const storage = new DatabaseStorage();