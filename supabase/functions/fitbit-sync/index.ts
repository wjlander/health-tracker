interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface FitbitSyncRequest {
  access_token: string;
  date: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { access_token, date }: FitbitSyncRequest = await req.json();

    if (!access_token || !date) {
      return new Response(
        JSON.stringify({ error: "Missing access_token or date" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch data from Fitbit API
    const [activityResponse, weightResponse, foodResponse, sleepResponse] = await Promise.allSettled([
      // Activity data
      fetch(`https://api.fitbit.com/1/user/-/activities/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      }),
      
      // Weight data
      fetch(`https://api.fitbit.com/1/user/-/body/log/weight/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      }),
      
      // Food data
      fetch(`https://api.fitbit.com/1/user/-/foods/log/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      }),
      
      // Sleep data
      fetch(`https://api.fitbit.com/1/user/-/sleep/date/${date}.json`, {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
        },
      }),
    ]);

    // Process responses
    const results: any = {
      activity: null,
      weight: null,
      food: null,
      sleep: null,
      syncedAt: new Date().toISOString(),
    };

    // Process activity data
    if (activityResponse.status === 'fulfilled' && activityResponse.value.ok) {
      const activityData = await activityResponse.value.json();
      const summary = activityData.summary;
      results.activity = {
        date,
        steps: summary.steps || 0,
        distance: summary.distances?.[0]?.distance || 0,
        calories: summary.caloriesOut || 0,
        activeMinutes: (summary.veryActiveMinutes || 0) + (summary.fairlyActiveMinutes || 0),
        activities: [] // We'll skip detailed activities for now
      };
    }

    // Process weight data
    if (weightResponse.status === 'fulfilled' && weightResponse.value.ok) {
      const weightData = await weightResponse.value.json();
      console.log('Raw Fitbit weight response for date', date, ':', JSON.stringify(weightData, null, 2));
      
      // Handle both weight log entries and body weight data
      let weightEntry = null;
      
      if (weightData.weight && weightData.weight.length > 0) {
        // Weight log entries (manual entries)
        weightEntry = weightData.weight[weightData.weight.length - 1];
        console.log('Using weight log entry:', weightEntry);
      } else if (weightData.body && weightData.body.weight) {
        // Body composition data
        weightEntry = weightData.body;
        console.log('Using body composition data:', weightEntry);
      } else if (weightData.summary && weightData.summary.weight) {
        // Summary weight data
        weightEntry = { weight: weightData.summary.weight };
        console.log('Using summary weight data:', weightEntry);
      }
      
      if (weightEntry) {
        console.log('Processing weight entry:', weightEntry, 'Raw weight value:', weightEntry.weight);
        
        // Fitbit weight might be in different units depending on user's Fitbit settings
        let weightInPounds = weightEntry.weight;
        
        // Check if weight might be in kilograms (typical range 50-200 kg)
        if (weightInPounds >= 50 && weightInPounds <= 200) {
          console.log('Weight appears to be in kilograms, converting to pounds');
          weightInPounds = weightInPounds * 2.20462; // Convert kg to pounds
        }
        // Check if weight might be in stones (typical range 8-25 stones)
        else if (weightInPounds >= 8 && weightInPounds <= 25) {
          console.log('Weight appears to be in stones, converting to pounds');
          weightInPounds = weightInPounds * 14; // Convert stones to pounds
        }
        // If weight is very low, it might be a decimal representation of stones
        else if (weightInPounds < 50) {
          console.log('Weight seems very low, might be decimal stones, converting to pounds');
          weightInPounds = weightInPounds * 14; // Convert stones to pounds
        }
        
        console.log('Final weight in pounds:', weightInPounds);
        
        results.weight = {
          date,
          weight: weightInPounds,
          bmi: weightEntry.bmi,
          fat: weightEntry.fat
        };
      } else {
        console.log('No weight entry found in response for date', date);
      }
    }

    // Process food data
    if (foodResponse.status === 'fulfilled' && foodResponse.value.ok) {
      const foodData = await foodResponse.value.json();
      console.log('Raw Fitbit food response for date', date, ':', JSON.stringify(foodData, null, 2));
      
      // Extract water intake from food data
      const waterIntake = foodData.summary?.water || 0;
      const totalCalories = foodData.summary?.calories || 0;
      
      console.log('Processing food data:', {
        date,
        totalCalories,
        waterIntake,
        foodsCount: foodData.foods?.length || 0,
        summaryExists: !!foodData.summary
      });
      
      results.food = {
        date,
        calories: totalCalories,
        foods: (foodData.foods || []).map((food: any) => ({
          name: food.loggedFood?.name || 'Unknown Food',
          calories: food.loggedFood?.calories || 0,
          mealType: getMealType(food.loggedFood?.mealTypeId),
          time: food.loggedFood?.logDate || date
        })),
        water: waterIntake
      };
      
      console.log('Final food result:', results.food);
    }

    // Process sleep data
    if (sleepResponse.status === 'fulfilled' && sleepResponse.value.ok) {
      const sleepData = await sleepResponse.value.json();
      const sleepLogs = sleepData.sleep;
      if (sleepLogs && sleepLogs.length > 0) {
        const mainSleep = sleepLogs.find((s: any) => s.isMainSleep) || sleepLogs[0];
        
        // Calculate sleep duration - use total time in bed minus wake time for actual sleep
        const totalMinutes = Math.round(mainSleep.duration / (1000 * 60));
        const wakeMinutes = mainSleep.levels?.summary?.wake?.minutes || 0;
        const actualSleepMinutes = Math.max(0, totalMinutes - wakeMinutes); // Exclude wake time
        
        results.sleep = {
          date,
          duration: actualSleepMinutes, // Actual sleep time excluding wake periods
          efficiency: mainSleep.efficiency || 0,
          startTime: mainSleep.startTime,
          endTime: mainSleep.endTime,
          stages: {
            deep: mainSleep.levels?.summary?.deep?.minutes || 0,
            light: mainSleep.levels?.summary?.light?.minutes || 0,
            rem: mainSleep.levels?.summary?.rem?.minutes || 0,
            wake: wakeMinutes // Include wake time in stages for analysis but not in total duration
          }
        };
      }
    }

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error('Fitbit sync error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to sync Fitbit data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getMealType(mealTypeId: number): string {
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