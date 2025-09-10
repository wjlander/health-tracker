import { supabase } from './supabase';
import { format } from 'date-fns';

export interface BackupData {
  id: string;
  user_id: string;
  backup_name: string;
  backup_type: 'manual' | 'automatic';
  data: {
    health_entries: any[];
    food_entries: any[];
    activity_entries: any[];
    user_integrations: any[];
    fitbit_activities: any[];
    fitbit_weights: any[];
    fitbit_foods: any[];
    fitbit_sleep: any[];
    health_vitals: any[];
    water_intake: any[];
    food_nutrition: any[];
    daily_nutrition_summary: any[];
    menstrual_entries: any[];
    premenopausal_entries: any[];
    lab_results: any[];
  };
  created_at: string;
  file_size: number;
}

export interface BackupSummary {
  id: string;
  user_id: string;
  backup_name: string;
  backup_type: 'manual' | 'automatic';
  created_at: string;
  file_size: number;
  record_counts: {
    health_entries: number;
    food_entries: number;
    activity_entries: number;
    fitbit_data: number;
    womens_health: number;
    lab_results: number;
    total: number;
  };
}

class BackupManager {
  // Create a backup of all user data
  async createBackup(userId: string, backupName?: string, type: 'manual' | 'automatic' = 'manual'): Promise<{ data: BackupData | null; error: any }> {
    try {
      console.log('🔄 Creating backup for user:', userId);
      
      // Fetch all user data including new tables
      const [
        healthEntries,
        foodEntries,
        activityEntries,
        userIntegrations,
        fitbitActivities,
        fitbitWeights,
        fitbitFoods,
        fitbitSleep,
        healthVitals,
        waterIntake,
        foodNutrition,
        dailyNutritionSummary,
        menstrualEntries,
        premenopausalEntries,
        labResults
      ] = await Promise.allSettled([
        supabase.from('health_entries').select('*').eq('user_id', userId),
        supabase.from('food_entries').select('*').eq('user_id', userId),
        supabase.from('activity_entries').select('*').eq('user_id', userId),
        supabase.from('user_integrations').select('*').eq('user_id', userId),
        supabase.from('fitbit_activities').select('*').eq('user_id', userId),
        supabase.from('fitbit_weights').select('*').eq('user_id', userId),
        supabase.from('fitbit_foods').select('*').eq('user_id', userId),
        supabase.from('fitbit_sleep').select('*').eq('user_id', userId),
        supabase.from('health_vitals').select('*').eq('user_id', userId),
        supabase.from('water_intake').select('*').eq('user_id', userId),
        supabase.from('food_nutrition').select('*').eq('user_id', userId),
        supabase.from('daily_nutrition_summary').select('*').eq('user_id', userId),
        supabase.from('menstrual_entries').select('*').eq('user_id', userId),
        supabase.from('premenopausal_entries').select('*').eq('user_id', userId),
        supabase.from('lab_results').select('*').eq('user_id', userId)
      ]);

      // Helper function to extract data from settled promises
      const extractData = (result: any) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.warn('Table not available:', result.reason?.message || 'Unknown error');
          return { data: [], error: null };
        }
      };

      // Extract data from all results, handling missing tables gracefully
      const healthEntriesData = extractData(healthEntries);
      const foodEntriesData = extractData(foodEntries);
      const activityEntriesData = extractData(activityEntries);
      const userIntegrationsData = extractData(userIntegrations);
      const fitbitActivitiesData = extractData(fitbitActivities);
      const fitbitWeightsData = extractData(fitbitWeights);
      const fitbitFoodsData = extractData(fitbitFoods);
      const fitbitSleepData = extractData(fitbitSleep);
      const healthVitalsData = extractData(healthVitals);
      const waterIntakeData = extractData(waterIntake);
      const foodNutritionData = extractData(foodNutrition);
      const dailyNutritionSummaryData = extractData(dailyNutritionSummary);
      const menstrualEntriesData = extractData(menstrualEntries);
      const premenopausalEntriesData = extractData(premenopausalEntries);
      const labResultsData = extractData(labResults);

      // Compile backup data
      const backupData = {
        health_entries: healthEntriesData.data || [],
        food_entries: foodEntriesData.data || [],
        activity_entries: activityEntriesData.data || [],
        user_integrations: userIntegrationsData.data || [],
        fitbit_activities: fitbitActivitiesData.data || [],
        fitbit_weights: fitbitWeightsData.data || [],
        fitbit_foods: fitbitFoodsData.data || [],
        fitbit_sleep: fitbitSleepData.data || [],
        health_vitals: healthVitalsData.data || [],
        water_intake: waterIntakeData.data || [],
        food_nutrition: foodNutritionData.data || [],
        daily_nutrition_summary: dailyNutritionSummaryData.data || [],
        menstrual_entries: menstrualEntriesData.data || [],
        premenopausal_entries: premenopausalEntriesData.data || [],
        lab_results: labResultsData.data || []
      };

      // Calculate file size (approximate)
      const dataString = JSON.stringify(backupData);
      const fileSize = new Blob([dataString]).size;

      // Generate backup name if not provided
      const finalBackupName = backupName || `${type}-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}`;

      // Store backup metadata in database
      const backup: BackupData = {
        id: crypto.randomUUID(),
        user_id: userId,
        backup_name: finalBackupName,
        backup_type: type,
        data: backupData,
        created_at: new Date().toISOString(),
        file_size: fileSize
      };

      // Store in localStorage for now (could be extended to cloud storage)
      const backupKey = `health_backup_${userId}_${backup.id}`;
      localStorage.setItem(backupKey, JSON.stringify(backup));

      // Store backup summary in a separate key for listing
      const summaryKey = `health_backup_summary_${userId}`;
      const existingSummaries = JSON.parse(localStorage.getItem(summaryKey) || '[]');
      
      const summary: BackupSummary = {
        id: backup.id,
        user_id: userId,
        backup_name: finalBackupName,
        backup_type: type,
        created_at: backup.created_at,
        file_size: fileSize,
        record_counts: {
          health_entries: backupData.health_entries.length,
          food_entries: backupData.food_entries.length,
          activity_entries: backupData.activity_entries.length,
          fitbit_data: backupData.fitbit_activities.length + backupData.fitbit_weights.length + 
                      backupData.fitbit_foods.length + backupData.fitbit_sleep.length,
          womens_health: backupData.menstrual_entries.length + backupData.premenopausal_entries.length,
          lab_results: backupData.lab_results.length,
          total: Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0)
        }
      };

      existingSummaries.push(summary);
      
      // Keep only the last 10 backups per user
      const sortedSummaries = existingSummaries
        .sort((a: BackupSummary, b: BackupSummary) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      localStorage.setItem(summaryKey, JSON.stringify(sortedSummaries));

      // Clean up old backup data
      existingSummaries.forEach((oldSummary: BackupSummary) => {
        if (!sortedSummaries.find(s => s.id === oldSummary.id)) {
          localStorage.removeItem(`health_backup_${userId}_${oldSummary.id}`);
        }
      });

      console.log('✅ Backup created successfully:', {
        id: backup.id,
        name: finalBackupName,
        size: fileSize,
        records: summary.record_counts.total
      });

      return { data: backup, error: null };
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      return { data: null, error };
    }
  }

  // Get list of backups for a user
  async getBackups(userId: string): Promise<{ data: BackupSummary[]; error: any }> {
    try {
      const summaryKey = `health_backup_summary_${userId}`;
      const summaries = JSON.parse(localStorage.getItem(summaryKey) || '[]');
      
      return { data: summaries, error: null };
    } catch (error) {
      console.error('❌ Failed to get backups:', error);
      return { data: [], error };
    }
  }

  // Restore data from a backup
  async restoreBackup(userId: string, backupId: string): Promise<{ success: boolean; error: any }> {
    try {
      console.log('🔄 Restoring backup:', backupId, 'for user:', userId);
      
      // Get backup data
      const backupKey = `health_backup_${userId}_${backupId}`;
      const backupString = localStorage.getItem(backupKey);
      
      if (!backupString) {
        throw new Error('Backup not found');
      }

      const backup: BackupData = JSON.parse(backupString);
      const data = backup.data;

      // Clear existing data first (optional - could be made configurable)
      console.log('🗑️ Clearing existing data...');
      await Promise.all([
        supabase.from('lab_results').delete().eq('user_id', userId),
        supabase.from('premenopausal_entries').delete().eq('user_id', userId),
        supabase.from('menstrual_entries').delete().eq('user_id', userId),
        supabase.from('daily_nutrition_summary').delete().eq('user_id', userId),
        supabase.from('food_nutrition').delete().eq('user_id', userId),
        supabase.from('water_intake').delete().eq('user_id', userId),
        supabase.from('health_vitals').delete().eq('user_id', userId),
        supabase.from('fitbit_sleep').delete().eq('user_id', userId),
        supabase.from('fitbit_foods').delete().eq('user_id', userId),
        supabase.from('fitbit_weights').delete().eq('user_id', userId),
        supabase.from('fitbit_activities').delete().eq('user_id', userId),
        supabase.from('activity_entries').delete().eq('user_id', userId),
        supabase.from('food_entries').delete().eq('user_id', userId),
        supabase.from('health_entries').delete().eq('user_id', userId),
        supabase.from('user_integrations').delete().eq('user_id', userId)
      ]);

      // Restore data in correct order (respecting foreign key constraints)
      console.log('📥 Restoring data...');
      
      // First restore health entries
      if (data.health_entries.length > 0) {
        const { error } = await supabase.from('health_entries').insert(data.health_entries);
        if (error) throw error;
        console.log('✅ Restored health entries:', data.health_entries.length);
      }

      // Then restore related data
      if (data.food_entries.length > 0) {
        const { error } = await supabase.from('food_entries').insert(data.food_entries);
        if (error) throw error;
        console.log('✅ Restored food entries:', data.food_entries.length);
      }

      if (data.activity_entries.length > 0) {
        const { error } = await supabase.from('activity_entries').insert(data.activity_entries);
        if (error) throw error;
        console.log('✅ Restored activity entries:', data.activity_entries.length);
      }

      if (data.user_integrations.length > 0) {
        const { error } = await supabase.from('user_integrations').insert(data.user_integrations);
        if (error) throw error;
        console.log('✅ Restored user integrations:', data.user_integrations.length);
      }

      // Restore Fitbit data
      if (data.fitbit_activities.length > 0) {
        const { error } = await supabase.from('fitbit_activities').insert(data.fitbit_activities);
        if (error) throw error;
        console.log('✅ Restored Fitbit activities:', data.fitbit_activities.length);
      }

      if (data.fitbit_weights.length > 0) {
        const { error } = await supabase.from('fitbit_weights').insert(data.fitbit_weights);
        if (error) throw error;
        console.log('✅ Restored Fitbit weights:', data.fitbit_weights.length);
      }

      if (data.fitbit_foods.length > 0) {
        const { error } = await supabase.from('fitbit_foods').insert(data.fitbit_foods);
        if (error) throw error;
        console.log('✅ Restored Fitbit foods:', data.fitbit_foods.length);
      }

      if (data.fitbit_sleep.length > 0) {
        const { error } = await supabase.from('fitbit_sleep').insert(data.fitbit_sleep);
        if (error) throw error;
        console.log('✅ Restored Fitbit sleep:', data.fitbit_sleep.length);
      }

      // Restore additional data
      if (data.health_vitals.length > 0) {
        const { error } = await supabase.from('health_vitals').insert(data.health_vitals);
        if (error) throw error;
        console.log('✅ Restored health vitals:', data.health_vitals.length);
      }

      if (data.water_intake.length > 0) {
        const { error } = await supabase.from('water_intake').insert(data.water_intake);
        if (error) throw error;
        console.log('✅ Restored water intake:', data.water_intake.length);
      }

      if (data.food_nutrition.length > 0) {
        const { error } = await supabase.from('food_nutrition').insert(data.food_nutrition);
        if (error) throw error;
        console.log('✅ Restored food nutrition:', data.food_nutrition.length);
      }

      if (data.daily_nutrition_summary.length > 0) {
        const { error } = await supabase.from('daily_nutrition_summary').insert(data.daily_nutrition_summary);
        if (error) throw error;
        console.log('✅ Restored nutrition summaries:', data.daily_nutrition_summary.length);
      }

      // Restore women's health data
      if (data.menstrual_entries.length > 0) {
        const { error } = await supabase.from('menstrual_entries').insert(data.menstrual_entries);
        if (error) throw error;
        console.log('✅ Restored menstrual entries:', data.menstrual_entries.length);
      }

      if (data.premenopausal_entries.length > 0) {
        const { error } = await supabase.from('premenopausal_entries').insert(data.premenopausal_entries);
        if (error) throw error;
        console.log('✅ Restored premenopausal entries:', data.premenopausal_entries.length);
      }

      if (data.lab_results.length > 0) {
        const { error } = await supabase.from('lab_results').insert(data.lab_results);
        if (error) throw error;
        console.log('✅ Restored lab results:', data.lab_results.length);
      }

      console.log('🎉 Backup restored successfully!');
      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Backup restore failed:', error);
      return { success: false, error };
    }
  }

  // Delete a backup
  async deleteBackup(userId: string, backupId: string): Promise<{ success: boolean; error: any }> {
    try {
      // Remove backup data
      const backupKey = `health_backup_${userId}_${backupId}`;
      localStorage.removeItem(backupKey);

      // Update summary list
      const summaryKey = `health_backup_summary_${userId}`;
      const summaries = JSON.parse(localStorage.getItem(summaryKey) || '[]');
      const updatedSummaries = summaries.filter((s: BackupSummary) => s.id !== backupId);
      localStorage.setItem(summaryKey, JSON.stringify(updatedSummaries));

      return { success: true, error: null };
    } catch (error) {
      console.error('❌ Failed to delete backup:', error);
      return { success: false, error };
    }
  }

  // Download backup as file
  async downloadBackup(userId: string, backupId: string): Promise<void> {
    try {
      const backupKey = `health_backup_${userId}_${backupId}`;
      const backupString = localStorage.getItem(backupKey);
      
      if (!backupString) {
        throw new Error('Backup not found');
      }

      const backup: BackupData = JSON.parse(backupString);
      
      // Create downloadable file
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${backup.backup_name}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('❌ Failed to download backup:', error);
      throw error;
    }
  }

  // Create automatic daily backup
  async createAutomaticBackup(userId: string): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const backupName = `auto-backup-${today}`;
      
      // Check if we already have an automatic backup for today
      const { data: backups } = await this.getBackups(userId);
      const todayBackup = backups.find(b => 
        b.backup_type === 'automatic' && 
        b.backup_name.includes(today)
      );

      if (todayBackup) {
        console.log('📅 Automatic backup already exists for today');
        return;
      }

      await this.createBackup(userId, backupName, 'automatic');
      console.log('✅ Automatic daily backup created');
    } catch (error) {
      console.error('❌ Failed to create automatic backup:', error);
    }
  }
}

export const backupManager = new BackupManager();

// Auto-backup functionality
export const initializeAutoBackup = (userId: string) => {
  // Create automatic backup on app load (once per day)
  const lastBackupDate = localStorage.getItem(`last_auto_backup_${userId}`);
  const today = format(new Date(), 'yyyy-MM-dd');
  
  if (lastBackupDate !== today) {
    setTimeout(() => {
      backupManager.createAutomaticBackup(userId);
      localStorage.setItem(`last_auto_backup_${userId}`, today);
    }, 5000); // Wait 5 seconds after app load
  }
};