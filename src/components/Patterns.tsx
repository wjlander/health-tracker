import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Brain, Heart, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getHealthEntries, getFitbitData, getMenstrualEntries, getPremenopausalEntries } from '../lib/database';

export const Patterns: React.FC = () => {
  const { currentUser } = useAuth();
  const [healthData, setHealthData] = useState<any[]>([]);
  const [fitbitData, setFitbitData] = useState<any>(null);
  const [menstrualData, setMenstrualData] = useState<any[]>([]);
  const [premenopausalData, setPremenopausalData] = useState<any[]>([]);
  const [correlationData, setCorrelationData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);
  
  const loadData = async () => {
    try {
      setLoading(true);
      const [healthResult, fitbitResult, menstrualResult, premenopausalResult] = await Promise.all([
        getHealthEntries(currentUser!.id, 30),
        getFitbitData(currentUser!.id, 30),
        getMenstrualEntries(currentUser!.id, 90),
        getPremenopausalEntries(currentUser!.id, 90)
      ]);
      
      if (healthResult.data) {
        setHealthData(healthResult.data);
        calculateCorrelations(healthResult.data, fitbitResult, menstrualResult.data || [], premenopausalResult.data || []);
      }
      setFitbitData(fitbitResult);
      setMenstrualData(menstrualResult.data || []);
      setPremenopausalData(premenopausalResult.data || []);
    } catch (error) {
      console.error('Error loading pattern data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const calculateCorrelations = (health: any[], fitbit: any, menstrual: any[], premenopausal: any[]) => {
    if (health.length < 3) {
      setCorrelationData([]);
      return;
    }
    
    const correlations = [];
    
    // Sleep vs Mood correlation
    const sleepMoodCorr = calculateCorrelation(
      health.map(h => h.sleep_hours),
      health.map(h => h.mood)
    );
    correlations.push({
      factor1: 'Sleep Hours',
      factor2: 'Mood',
      correlation: sleepMoodCorr,
      strength: getCorrelationStrength(sleepMoodCorr)
    });
    
    // Sleep vs Energy correlation
    const sleepEnergyCorr = calculateCorrelation(
      health.map(h => h.sleep_hours),
      health.map(h => h.energy)
    );
    correlations.push({
      factor1: 'Sleep Hours',
      factor2: 'Energy',
      correlation: sleepEnergyCorr,
      strength: getCorrelationStrength(sleepEnergyCorr)
    });
    
    // Anxiety vs Sleep Quality correlation
    const anxietySleepCorr = calculateCorrelation(
      health.map(h => h.anxiety_level),
      health.map(h => h.sleep_quality)
    );
    correlations.push({
      factor1: 'Anxiety',
      factor2: 'Sleep Quality',
      correlation: -anxietySleepCorr,
      strength: getCorrelationStrength(anxietySleepCorr)
    });
    
    // Women's health correlations
    if (menstrual.length > 0) {
      // Cycle phase vs mood
      const lutealEntries = menstrual.filter(m => m.cycle_phase === 'luteal');
      const follicularEntries = menstrual.filter(m => m.cycle_phase === 'follicular');
      
      if (lutealEntries.length > 0 && follicularEntries.length > 0) {
        // Find matching health entries
        const lutealMoods = lutealEntries.map(m => {
          const healthEntry = health.find(h => h.date === m.date);
          return healthEntry?.mood || 5;
        });
        const follicularMoods = follicularEntries.map(m => {
          const healthEntry = health.find(h => h.date === m.date);
          return healthEntry?.mood || 5;
        });
        
        const lutealAvg = lutealMoods.reduce((a, b) => a + b, 0) / lutealMoods.length;
        const follicularAvg = follicularMoods.reduce((a, b) => a + b, 0) / follicularMoods.length;
        const cycleMoodCorr = (follicularAvg - lutealAvg) / 5; // Normalize
        
        correlations.push({
          factor1: 'Menstrual Cycle Phase',
          factor2: 'Mood',
          correlation: cycleMoodCorr,
          strength: getCorrelationStrength(cycleMoodCorr)
        });
      }
    }
    
    if (premenopausal.length > 0) {
      // Hot flashes vs sleep
      const hotFlashDates = premenopausal.filter(p => p.hot_flashes > 0).map(p => p.date);
      const matchingSleepQuality = hotFlashDates.map(date => {
        const healthEntry = health.find(h => h.date === date);
        return healthEntry?.sleep_quality || 5;
      });
      
      if (matchingSleepQuality.length > 2) {
        const hotFlashSleepCorr = calculateCorrelation(
          premenopausal.filter(p => hotFlashDates.includes(p.date)).map(p => p.hot_flashes),
          matchingSleepQuality
        );
        
        correlations.push({
          factor1: 'Hot Flashes',
          factor2: 'Sleep Quality',
          correlation: -Math.abs(hotFlashSleepCorr),
          strength: getCorrelationStrength(hotFlashSleepCorr)
        });
      }
    }
    
    // Add Fitbit correlations if available
    if (fitbit?.activities?.length > 0) {
      const fitbitSteps = fitbit.activities.map((a: any) => a.steps || 0);
      const matchingMoods = health
        .filter(h => fitbit.activities.some((a: any) => a.date === h.date))
        .map(h => h.mood);
      
      if (matchingMoods.length > 2) {
        const stepsMoodCorr = calculateCorrelation(fitbitSteps.slice(0, matchingMoods.length), matchingMoods);
        correlations.push({
          factor1: 'Fitbit Steps',
          factor2: 'Mood',
          correlation: stepsMoodCorr,
          strength: getCorrelationStrength(stepsMoodCorr)
        });
      }
    }
    
    setCorrelationData(correlations);
  };
  
  const calculateCorrelation = (x: number[], y: number[]) => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((a, b) => a + b, 0);
    const sumY = y.slice(0, n).reduce((a, b) => a + b, 0);
    const sumXY = x.slice(0, n).reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, xi) => sum + xi * xi, 0);
    const sumY2 = y.slice(0, n).reduce((sum, yi) => sum + yi * yi, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };
  
  const getCorrelationStrength = (corr: number) => {
    const abs = Math.abs(corr);
    if (abs > 0.8) return 'Very Strong ' + (corr > 0 ? 'Positive' : 'Negative');
    if (abs > 0.6) return 'Strong ' + (corr > 0 ? 'Positive' : 'Negative');
    if (abs > 0.4) return 'Moderate ' + (corr > 0 ? 'Positive' : 'Negative');
    if (abs > 0.2) return 'Weak ' + (corr > 0 ? 'Positive' : 'Negative');
    return 'No Correlation';
  };
  
  // Create scatter plot data from real health data
  const sleepMoodData = healthData.map(entry => ({
    sleep: entry.sleep_hours,
    mood: entry.mood
  }));
  
  // Create weekly patterns from real data
  const weeklyPatterns = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => {
    const dayData = healthData.filter(entry => {
      const entryDay = new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short' });
      return entryDay === day;
    });
    
    if (dayData.length === 0) {
      return { day, mood: 0, energy: 0, anxiety: 0 };
    }
    
    return {
      day,
      mood: dayData.reduce((sum, entry) => sum + entry.mood, 0) / dayData.length,
      energy: dayData.reduce((sum, entry) => sum + entry.energy, 0) / dayData.length,
      anxiety: dayData.reduce((sum, entry) => sum + entry.anxiety_level, 0) / dayData.length
    };
  });
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Analyzing your health patterns...</span>
      </div>
    );
  }
  
  const getCorrelationColor = (correlation: number) => {
    const abs = Math.abs(correlation);
    if (abs > 0.7) return '#10b981';
    if (abs > 0.5) return '#f59e0b';
    return '#ef4444';
  };

  const getCorrelationIcon = (correlation: number) => {
    if (correlation > 0.6) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (correlation < -0.6) return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <AlertCircle className="h-5 w-5 text-amber-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <Brain className="h-6 w-6 text-purple-600" />
            <h3 className="text-lg font-semibold text-gray-900">Key Insights</h3>
          </div>
          <p className="text-3xl font-bold text-purple-600 mb-2">{correlationData.length}</p>
          <p className="text-sm text-gray-600">Strong patterns identified</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Positive Trends</h3>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">
            {correlationData.filter(c => c.correlation > 0.3).length}
          </p>
          <p className="text-sm text-gray-600">Health improvements found</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <Activity className="h-6 w-6 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Data Points</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">{healthData.length}</p>
          <p className="text-sm text-gray-600">Days of health data</p>
        </div>
      </div>

      {/* Correlations Table */}
      {correlationData.length > 0 ? (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Health Factor Correlations</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">Relationship</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Correlation</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Strength</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">Impact</th>
              </tr>
            </thead>
            <tbody>
              {correlationData.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      {getCorrelationIcon(item.correlation)}
                      <span className="font-medium text-gray-900">
                        {item.factor1} → {item.factor2}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${Math.abs(item.correlation) * 100}%`,
                            backgroundColor: getCorrelationColor(item.correlation)
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium" style={{ color: getCorrelationColor(item.correlation) }}>
                        {item.correlation.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                          style={{ 
                            backgroundColor: `${getCorrelationColor(item.correlation)}20`,
                            color: getCorrelationColor(item.correlation)
                          }}>
                      {item.strength}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {item.correlation > 0.7 ? 'Very Important' :
                     item.correlation > 0.5 ? 'Important' :
                     Math.abs(item.correlation) > 0.5 ? 'Monitor' : 'Low Impact'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100 text-center">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Not Enough Data</h3>
          <p className="text-gray-600">Add more health entries to see pattern analysis and correlations.</p>
        </div>
      )}

      {/* Visual Patterns */}
      {healthData.length > 0 && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sleep vs Mood Scatter Plot */}
        {sleepMoodData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sleep Hours vs Mood</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={sleepMoodData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="sleep" 
                  domain={[4, 10]}
                  label={{ value: 'Sleep Hours', position: 'insideBottom', offset: -5 }}
                />
                <YAxis 
                  domain={[0, 10]}
                  label={{ value: 'Mood Rating', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  formatter={(value, name) => [value, name === 'mood' ? 'Mood Rating' : 'Sleep Hours']}
                />
                <Scatter dataKey="mood" fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {correlationData.find(c => c.factor1 === 'Sleep Hours' && c.factor2 === 'Mood')?.strength || 'Analyzing correlation...'} - Based on your personal data.
          </p>
        </div>
        )}

        {/* Weekly Pattern */}
        {weeklyPatterns.some(p => p.mood > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Patterns</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyPatterns}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="mood" fill="#ec4899" name="Mood" />
                <Bar dataKey="energy" fill="#3b82f6" name="Energy" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Your personal weekly patterns based on recorded health data.
          </p>
        </div>
        )}
      </div>
      )}

      {/* Actionable Insights */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Actionable Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Positive Patterns */}
          <div>
            <h4 className="font-medium text-green-800 mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 mr-2" />
              What's Working Well
            </h4>
            <div className="space-y-3">
              {correlationData.filter(c => c.correlation > 0.4).map((corr, index) => (
                <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">{corr.factor1} → {corr.factor2}</p>
                  <p className="text-sm text-green-700">
                    {corr.strength} correlation ({corr.correlation.toFixed(2)}) - This is a positive pattern in your data.
                  </p>
                </div>
              ))}
              {correlationData.filter(c => c.correlation > 0.4).length === 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm font-medium text-green-800 mb-1">Keep Tracking</p>
                <p className="text-sm text-green-700">
                  Continue logging your health data to identify positive patterns and correlations.
                </p>
              </div>
              )}
            </div>
          </div>

          {/* Areas for Improvement */}
          <div>
            <h4 className="font-medium text-amber-800 mb-3 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              Areas to Focus On
            </h4>
            <div className="space-y-3">
              {correlationData.filter(c => c.correlation < -0.3).map((corr, index) => (
                <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-amber-800 mb-1">{corr.factor1} → {corr.factor2}</p>
                  <p className="text-sm text-amber-700">
                    {corr.strength} correlation ({corr.correlation.toFixed(2)}) - Consider managing this relationship.
                  </p>
                </div>
              ))}
              {correlationData.filter(c => c.correlation < -0.3).length === 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm font-medium text-amber-800 mb-1">Data Collection</p>
                <p className="text-sm text-amber-700">
                  No concerning negative patterns detected yet. Keep tracking to monitor your health trends.
                </p>
              </div>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2 flex items-center">
            <Heart className="h-5 w-5 mr-2" />
            Personalized Recommendations
          </h4>
          {healthData.length > 7 ? (
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              {correlationData.find(c => c.factor1 === 'Sleep Hours' && c.correlation > 0.3) && (
                <li>Your sleep hours positively impact your wellbeing - maintain consistent sleep schedule</li>
              )}
              {fitbitData?.activities?.length > 0 && (
                <li>Continue using Fitbit to track activity patterns and their impact on mood</li>
              )}
              {correlationData.find(c => c.factor1 === 'Anxiety' && c.correlation < -0.3) && (
                <li>Focus on anxiety management techniques as they appear to affect other health metrics</li>
              )}
              <li>Keep logging daily entries to strengthen pattern analysis</li>
              <li>Review your weekly patterns to optimize your routine</li>
            </ul>
          ) : (
            <p className="text-sm text-blue-700">
              Log more health entries to receive personalized recommendations based on your unique patterns.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};