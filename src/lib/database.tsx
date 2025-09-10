// Get today's Fitbit data for dashboard
export const getLatestFitbitData = async (userId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  console.log('🔍 Getting latest Fitbit data for user:', userId, 'date:', today);
  
  const [activity, weight, food, sleep] = await Promise.all([
    supabase.from('fitbit_activities').select('*').eq('user_id', userId).eq('date', today).limit(1),
    supabase.from('fitbit_weights').select('*').eq('user_id', userId).eq('date', today).limit(1),
    supabase.from('fitbit_foods').select('*').eq('user_id', userId).eq('date', today).limit(1),
    supabase.from('fitbit_sleep').select('*').eq('user_id', userId).eq('date', today).limit(1)
  ]);
  
  console.log('📊 Fitbit data query results:', {
    activity: activity.data?.length || 0,
    weight: weight.data?.length || 0,
    food: food.data?.length || 0,
    sleep: sleep.data?.length || 0
  });
  
  return {
    activity: activity.data?.[0] || null,
    weight: weight.data?.[0] || null,
    food: food.data?.[0] || null,
    sleep: sleep.data?.[0] || null
  };
};