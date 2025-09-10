import axios from 'axios';

export interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

export interface FitbitActivity {
  date: string;
  steps: number;
  distance: number;
  calories: number;
  activeMinutes: number;
  activities: Array<{
    name: string;
    duration: number;
    calories: number;
    startTime: string;
  }>;
}

export interface FitbitWeight {
  date: string;
  weight: number;
  bmi?: number;
  fat?: number;
}

export interface FitbitFood {
  date: string;
  calories: number;
  foods: Array<{
    name: string;
    calories: number;
    mealType: string;
    time: string;
  }>;
  water: number;
}

export interface FitbitSleep {
  date: string;
  duration: number; // in minutes
  efficiency: number;
  startTime: string;
  endTime: string;
  stages: {
    deep: number;
    light: number;
    rem: number;
    wake: number;
  };
}

class FitbitAPI {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private baseUrl = 'https://api.fitbit.com/1';

  constructor() {
    this.clientId = import.meta.env.VITE_FITBIT_CLIENT_ID || '';
    this.clientSecret = import.meta.env.VITE_FITBIT_CLIENT_SECRET || '';
    // Use j.ringing.org.uk for production
    this.redirectUri = import.meta.env.VITE_FITBIT_REDIRECT_URI || this.getDefaultRedirectUri();
  }
  
  getDefaultRedirectUri(): string {
    // Use j.ringing.org.uk for production or current origin for development
    const origin = window.location.origin;
    const redirectUri = origin.includes('localhost') || origin.includes('webcontainer') || origin.includes('stackblitz') || origin.includes('bolt.new')
      ? `${origin}/fitbit/callback`
      : 'https://j.ringing.org.uk/fitbit/callback';
    
    console.log('🔗 Generating redirect URI:', {
      origin,
      redirectUri,
      hostname: window.location.hostname,
      isProduction: !origin.includes('localhost') && !origin.includes('webcontainer') && !origin.includes('stackblitz') && !origin.includes('bolt.new')
    });
    
    return redirectUri;
  }

  // Generate authorization URL
  getAuthUrl(): string {
    const dynamicRedirectUri = this.getDefaultRedirectUri();
    
    console.log('Generating Fitbit auth URL with:', {
      clientId: this.clientId,
      redirectUri: dynamicRedirectUri,
      hasClientId: !!this.clientId,
      hasRedirectUri: !!dynamicRedirectUri
    });
    
    if (!this.clientId) {
      throw new Error('Fitbit Client ID is not configured');
    }
    
    if (!dynamicRedirectUri) {
      throw new Error('Fitbit Redirect URI is not configured');
    }
    
    const scopes = [
      'activity',
      'weight',
      'nutrition',
      'sleep',
      'profile'
    ].join(' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: dynamicRedirectUri,
      scope: scopes,
      expires_in: '31536000' // 1 year
    });

    const authUrl = `https://www.fitbit.com/oauth2/authorize?${params.toString()}`;
    console.log('Generated auth URL:', authUrl);
    return authUrl;
  }

  // Exchange authorization code for tokens
  async getTokens(code: string): Promise<FitbitTokens> {
    const dynamicRedirectUri = this.getDefaultRedirectUri();
    
    console.log('🔄 Exchanging code for tokens:', {
      codeLength: code.length,
      redirectUri: dynamicRedirectUri,
      clientId: this.clientId
    });
    
    const response = await axios.post('https://api.fitbit.com/oauth2/token', 
      new URLSearchParams({
        client_id: this.clientId,
        grant_type: 'authorization_code',
        redirect_uri: dynamicRedirectUri,
        code: code
      }), {
        headers: {
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('✅ Tokens received successfully');

    return response.data;
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<FitbitTokens> {
    const response = await axios.post('https://api.fitbit.com/oauth2/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken
      }), {
        headers: {
          'Authorization': `Basic ${btoa(`${this.clientId}:${this.clientSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    return response.data;
  }

  private getMealType(mealTypeId: number): string {
    const mealTypes: { [key: number]: string } = {
      1: 'breakfast',
      2: 'morning_snack',
      3: 'lunch',
      4: 'afternoon_snack',
      5: 'dinner',
      6: 'evening_snack'
    };
    return mealTypes[mealTypeId] || 'snack';
  }
}

export const fitbitAPI = new FitbitAPI();

// Helper function to sync Fitbit data
export const syncFitbitData = async (userId: string, days: number = 7) => {
  try {
    console.log('🔄 Starting Fitbit sync for user:', userId, 'for', days, 'days');
    
    // Get user's Fitbit integration
    const { getUserIntegration } = await import('./database');
    const { data: integration, error: integrationError } = await getUserIntegration(userId, 'fitbit');
    
    if (integrationError || !integration) {
      throw new Error('No Fitbit integration found for user');
    }
    
    const accessToken = integration.access_token;
    const results = { activities: 0, weights: 0, foods: 0, sleep: 0 };
    
    // Sync data for the last N days using Supabase Edge Function
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];
      
      try {
        console.log(`📅 Syncing data for ${dateString}`);
        
        // Use Supabase Edge Function to sync data (avoids CORS issues)
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fitbit-sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            access_token: accessToken,
            date: dateString
          })
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ Edge function failed for ${dateString}:`, {
            status: response.status,
            statusText: response.statusText,
            error: errorText,
            url: response.url
          });
          continue;
        }
        
        const syncData = await response.json();
        console.log(`📊 Synced data for ${dateString}:`, {
          hasActivity: !!syncData.activity,
          hasWeight: !!syncData.weight,
          hasFood: !!syncData.food,
          hasSleep: !!syncData.sleep,
          activitySteps: syncData.activity?.steps,
          weightValue: syncData.weight?.weight,
          foodCalories: syncData.food?.calories,
          sleepDuration: syncData.sleep?.duration,
          rawResponse: syncData
        });
        
        // Store the synced data in database
        const { storeFitbitActivity, storeFitbitWeight, storeFitbitFood, storeFitbitSleep } = await import('./database');
        
        if (syncData.activity) {
          const { error: activityError } = await storeFitbitActivity({
            user_id: userId,
            date: dateString,
            steps: syncData.activity.steps,
            distance: syncData.activity.distance,
            calories: syncData.activity.calories,
            active_minutes: syncData.activity.activeMinutes,
            activities: syncData.activity.activities
          });
          if (!activityError) {
            results.activities++;
            console.log(`✅ Stored activity for ${dateString}`);
          } else {
            console.warn(`⚠️ Failed to store activity for ${dateString}:`, activityError);
          }
        }
        
        if (syncData.weight) {
          const { error: weightError } = await storeFitbitWeight({
            user_id: userId,
            date: dateString,
            weight: syncData.weight.weight,
            bmi: syncData.weight.bmi,
            fat_percentage: syncData.weight.fat
          });
          if (!weightError) {
            results.weights++;
            console.log(`✅ Stored weight for ${dateString}`);
          } else {
            console.warn(`⚠️ Failed to store weight for ${dateString}:`, weightError);
          }
        }
        
        if (syncData.food) {
          const { error: foodError } = await storeFitbitFood({
            user_id: userId,
            date: dateString,
            calories: syncData.food.calories,
            foods: syncData.food.foods,
            water: syncData.food.water
          });
          if (!foodError) {
            results.foods++;
            console.log(`✅ Stored food for ${dateString}`);
          } else {
            console.warn(`⚠️ Failed to store food for ${dateString}:`, foodError);
          }
          
          // Create food entries and nutrition data for each Fitbit food item
          if (syncData.food.foods && syncData.food.foods.length > 0) {
            const { createFoodEntry, createFoodNutrition, calculateDailyNutrition } = await import('./database');
            
            for (const fitbitFood of syncData.food.foods) {
              try {
                // Create a food entry for this Fitbit food
                const { data: foodEntry, error: foodEntryError } = await createFoodEntry({
                  user_id: userId,
                  name: fitbitFood.name || 'Fitbit Food',
                  time: fitbitFood.time ? new Date(fitbitFood.time).toTimeString().slice(0, 5) : '12:00',
                  category: fitbitFood.mealType === 'breakfast' ? 'breakfast' :
                           fitbitFood.mealType === 'lunch' ? 'lunch' :
                           fitbitFood.mealType === 'dinner' ? 'dinner' : 'snack',
                  notes: 'Synced from Fitbit'
                });
                
                if (foodEntry && !foodEntryError) {
                  // Create nutrition data for this food entry
                  const { error: nutritionError } = await createFoodNutrition({
                    food_entry_id: foodEntry.id,
                    user_id: userId,
                    calories: fitbitFood.calories || 0,
                    carbs: fitbitFood.carbs || 0,
                    protein: fitbitFood.protein || 0,
                    fat: fitbitFood.fat || 0,
                    fiber: fitbitFood.fiber || 0,
                    sugar: fitbitFood.sugar || 0,
                    sodium: fitbitFood.sodium || 0,
                    serving_size: '1',
                    serving_unit: 'serving',
                    fitbit_food_id: fitbitFood.logId?.toString(),
                    data_source: 'fitbit'
                  });
                  
                  if (nutritionError) {
                    console.warn(`⚠️ Failed to create nutrition entry for ${fitbitFood.name}:`, nutritionError);
                  } else {
                    console.log(`✅ Created nutrition entry for ${fitbitFood.name} with ${fitbitFood.calories} calories`);
                  }
                }
              } catch (foodError) {
                console.warn(`⚠️ Failed to create food entry for ${fitbitFood.name}:`, foodError);
              }
            }
            
            // Calculate daily nutrition summary
            try {
              await calculateDailyNutrition(userId, dateString);
              console.log(`✅ Updated daily nutrition summary for ${dateString}`);
            } catch (summaryError) {
              console.warn(`⚠️ Failed to update nutrition summary for ${dateString}:`, summaryError);
            }
          }
          
          // Also store water intake separately if there's water data
          if (syncData.food && syncData.food.water > 0) {
            const { createWaterIntake } = await import('./database');
            const { error: waterError } = await createWaterIntake({
              user_id: userId,
              date: dateString,
              amount_ml: syncData.food.water,
              source: 'fitbit'
            });
            if (!waterError) {
              console.log(`✅ Stored water intake for ${dateString}: ${syncData.food.water}ml`);
            } else {
              console.warn(`⚠️ Failed to store water intake for ${dateString}:`, waterError);
            }
          }
        }
        
        if (syncData.sleep) {
          const { error: sleepError } = await storeFitbitSleep({
            user_id: userId,
            date: dateString,
            duration: syncData.sleep.duration,
            efficiency: syncData.sleep.efficiency,
            start_time: syncData.sleep.startTime,
            end_time: syncData.sleep.endTime,
            stages: syncData.sleep.stages
          });
          if (!sleepError) {
            results.sleep++;
            console.log(`✅ Stored sleep for ${dateString}`);
          } else {
            console.warn(`⚠️ Failed to store sleep for ${dateString}:`, sleepError);
          }
        }
        
      } catch (dayError) {
        console.warn(`⚠️ Failed to sync data for ${dateString}:`, dayError);
      }
    }
    
    console.log('✅ Fitbit sync completed:', results);
    return results;
  } catch (error) {
    console.error('Error syncing Fitbit data:', error);
    throw error;
  }
};