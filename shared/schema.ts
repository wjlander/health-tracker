import { pgTable, uuid, text, integer, numeric, boolean, timestamp, date, time, jsonb, pgEnum, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['patient', 'caregiver']);
export const mealCategoryEnum = pgEnum('meal_category', ['breakfast', 'lunch', 'dinner', 'snack']);
export const activityIntensityEnum = pgEnum('activity_intensity', ['low', 'moderate', 'high']);

// Core tables
export const users = pgTable('users', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  name: text('name').notNull(),
  email: text('email'),
  role: userRoleEnum('role').notNull().default('patient'),
  isActive: boolean('is_active').default(true),
  trackingPreferences: jsonb('tracking_preferences').default('{}'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const healthEntries = pgTable('health_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  mood: integer('mood'),
  energy: integer('energy'),
  anxietyLevel: integer('anxiety_level'),
  sleepHours: numeric('sleep_hours', { precision: 4, scale: 2 }),
  sleepQuality: integer('sleep_quality'),
  weight: numeric('weight', { precision: 6, scale: 2 }),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateIndex: index('idx_health_entries_user_date').on(table.userId, table.date),
  userDateUnique: uniqueIndex('health_entries_user_date_unique').on(table.userId, table.date),
}));

export const foodEntries = pgTable('food_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  healthEntryId: uuid('health_entry_id').references(() => healthEntries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  time: time('time'),
  category: mealCategoryEnum('category').notNull().default('snack'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userIndex: index('idx_food_entries_user_id').on(table.userId),
  healthEntryIndex: index('idx_food_entries_health_entry_id').on(table.healthEntryId),
}));

export const activityEntries = pgTable('activity_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  healthEntryId: uuid('health_entry_id').references(() => healthEntries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  duration: integer('duration').notNull(),
  intensity: activityIntensityEnum('intensity').notNull().default('moderate'),
  time: time('time'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userIndex: index('idx_activity_entries_user_id').on(table.userId),
  healthEntryIndex: index('idx_activity_entries_health_entry_id').on(table.healthEntryId),
}));

export const userIntegrations = pgTable('user_integrations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  provider: text('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  lastSync: timestamp('last_sync', { withTimezone: true }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userProviderUnique: uniqueIndex('user_integrations_user_provider_unique').on(table.userId, table.provider),
}));

// Fitbit integration tables
export const fitbitActivities = pgTable('fitbit_activities', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  steps: integer('steps').default(0),
  distance: numeric('distance', { precision: 8, scale: 2 }).default('0'),
  calories: integer('calories').default(0),
  activeMinutes: integer('active_minutes').default(0),
  activities: jsonb('activities').default('[]'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('fitbit_activities_user_date_unique').on(table.userId, table.date),
}));

export const fitbitWeights = pgTable('fitbit_weights', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  weight: numeric('weight', { precision: 6, scale: 2 }).notNull(),
  bmi: numeric('bmi', { precision: 5, scale: 2 }),
  fatPercentage: numeric('fat_percentage', { precision: 5, scale: 2 }),
  syncedAt: timestamp('synced_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('fitbit_weights_user_date_unique').on(table.userId, table.date),
}));

export const fitbitFoods = pgTable('fitbit_foods', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  calories: integer('calories').default(0),
  foods: jsonb('foods').default('[]'),
  water: numeric('water', { precision: 8, scale: 2 }).default('0'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('fitbit_foods_user_date_unique').on(table.userId, table.date),
}));

export const fitbitSleep = pgTable('fitbit_sleep', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  duration: integer('duration').notNull(),
  efficiency: integer('efficiency').default(0),
  startTime: timestamp('start_time', { withTimezone: true }),
  endTime: timestamp('end_time', { withTimezone: true }),
  stages: jsonb('stages').default('{}'),
  syncedAt: timestamp('synced_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('fitbit_sleep_user_date_unique').on(table.userId, table.date),
}));

// Additional health tracking tables
export const menstrualEntries = pgTable('menstrual_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  cycleDay: integer('cycle_day'),
  flowIntensity: text('flow_intensity'),
  symptoms: text('symptoms').array(),
  cyclePhase: text('cycle_phase'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('menstrual_entries_user_date_unique').on(table.userId, table.date),
}));

export const premenopausalEntries = pgTable('premenopausal_entries', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  hotFlashes: integer('hot_flashes').default(0),
  nightSweats: boolean('night_sweats').default(false),
  moodSwings: integer('mood_swings').default(5),
  irregularPeriods: boolean('irregular_periods').default(false),
  sleepDisturbances: boolean('sleep_disturbances').default(false),
  jointAches: boolean('joint_aches').default(false),
  brainFog: integer('brain_fog').default(5),
  weightChanges: boolean('weight_changes').default(false),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateUnique: uniqueIndex('premenopausal_entries_user_date_unique').on(table.userId, table.date),
}));

export const bowelMovements = pgTable('bowel_movements', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  date: date('date').notNull(),
  time: time('time').notNull(),
  bristolScale: integer('bristol_scale'),
  consistency: text('consistency'),
  color: text('color'),
  urgency: integer('urgency'),
  completeness: integer('completeness'),
  painLevel: integer('pain_level'),
  bloodPresent: boolean('blood_present').default(false),
  mucusPresent: boolean('mucus_present').default(false),
  symptoms: text('symptoms').array().default(sql`ARRAY[]::text[]`),
  medicationsTaken: text('medications_taken'),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userDateIndex: index('idx_bowel_movements_user_date').on(table.userId, table.date),
}));

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  notificationType: text('notification_type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false),
  scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => ({
  userScheduledIndex: index('idx_notifications_user_scheduled').on(table.userId, table.scheduledFor),
}));

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  reminderType: text('reminder_type').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  frequency: text('frequency').notNull(),
  timeOfDay: time('time_of_day'),
  daysOfWeek: integer('days_of_week').array().default(sql`ARRAY[]::integer[]`),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').default(true),
  lastTriggered: timestamp('last_triggered', { withTimezone: true }),
  nextTrigger: timestamp('next_trigger', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userActiveIndex: index('idx_reminders_user_active').on(table.userId, table.isActive, table.nextTrigger),
}));

// Weight goals and nutrition tracking
export const weightGoals = pgTable('weight_goals', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  goalType: text('goal_type').notNull(),
  startWeight: numeric('start_weight', { precision: 6, scale: 2 }).notNull(),
  targetWeight: numeric('target_weight', { precision: 6, scale: 2 }).notNull(),
  targetDate: date('target_date'),
  weeklyGoal: numeric('weekly_goal', { precision: 5, scale: 2 }),
  startDate: date('start_date').notNull(),
  isActive: boolean('is_active').default(true),
  notes: text('notes').default(''),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
});

export const reportTemplates = pgTable('report_templates', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  templateName: text('template_name').notNull(),
  reportType: text('report_type').notNull(),
  templateContent: jsonb('template_content').default('{}'),
  isDefault: boolean('is_default').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true }).default(sql`now()`),
}, (table) => ({
  userTypeIndex: index('idx_report_templates_user_type').on(table.userId, table.reportType),
}));