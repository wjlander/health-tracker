import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, BarChart, Bar } from 'recharts';
import { Brain, TrendingUp, TrendingDown, AlertCircle, Heart, Activity, Moon, Thermometer, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getHealthEntries, getMenstrualEntries, getPremenopausalEntries, getLabResults } from '../lib/database';
import { format, parseISO } from 'date-fns';

interface CorrelationInsight {
  title: string;
  correlation: number;
  strength: string;
  description: string;
  recommendation: string;
  category: 'positive' | 'negative' | 'neutral';
}

export const HealthCorrelations: React.FC = () => {
  const { currentUser } = useAuth();
  const [healthData, setHealthData] = useState<any[]>([]);
  const [menstrualData, setMenstrualData] = useState<any[]>([]);
  const [premenopausalData, setPremenopausalData] = useState<any[]>([]);
  const [labData, setLabData] = useState<any[]>([]);
  const [correlations, setCorrelations] = useState<CorrelationInsight[]>([]);
  const [combinedData, setCombinedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      const [healthResult, menstrualResult, premenopausalResult, labResult] = await Promise.all([
        getHealthEntries(currentUser!.id, 90),
        getMenstrualEntries(currentUser!.id, 90),
        getPremenopausalEntries(currentUser!.id, 90),
        getLabResults(currentUser!.id, 50)
      ]);

      const health = healthResult.data || [];
      const menstrual = menstrualResult.data || [];
      const premenopausal = premenopausalResult.data || [];
      const lab = labResult.data || [];

      setHealthData(health);
      setMenstrualData(menstrual);
      setPremenopausalData(premenopausal);
      setLabData(lab);

      // Combine all data by date for correlation analysis
      const combined = combineDataByDate(health, menstrual, premenopausal, lab);
      setCombinedData(combined);
      
      // Calculate correlations
      const insights = calculateHealthCorrelations(combined);
      setCorrelations(insights);

    } catch (error) {
      console.error('Error loading correlation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const combineDataByDate = (health: any[], menstrual: any[], premenopausal: any[], lab: any[]) => {
    const dataMap = new Map();

    // Add health data
    health.forEach(entry => {
      dataMap.set(entry.date, {
        date: entry.date,
        mood: entry.mood,
        energy: entry.energy,
        anxiety: entry.anxiety_level,
        sleep_hours: entry.sleep_hours,
        sleep_quality: entry.sleep_quality,
        weight: entry.weight
      });
    });

    // Add menstrual data
    menstrual.forEach(entry => {
      const existing = dataMap.get(entry.date) || { date: entry.date };
      dataMap.set(entry.date, {
        ...existing,
        cycle_day: entry.cycle_day,
        flow_intensity: entry.flow_intensity,
        cycle_phase: entry.cycle_phase,
        symptoms: entry.symptoms || []
      });
    });

    // Add premenopausal data
    premenopausal.forEach(entry => {
      const existing = dataMap.get(entry.date) || { date: entry.date };
      dataMap.set(entry.date, {
        ...existing,
        hot_flashes: entry.hot_flashes,
        night_sweats: entry.night_sweats,
        mood_swings: entry.mood_swings,
        brain_fog: entry.brain_fog,
        sleep_disturbances: entry.sleep_disturbances,
        joint_aches: entry.joint_aches
      });
    });

    return Array.from(dataMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const calculateHealthCorrelations = (data: any[]): CorrelationInsight[] => {
    if (data.length < 5) return [];

    const insights: CorrelationInsight[] = [];

    // Menstrual cycle correlations
    const cyclePhaseData = data.filter(d => d.cycle_phase);
    if (cyclePhaseData.length > 0) {
      // Mood vs Cycle Phase
      const lutealMood = cyclePhaseData.filter(d => d.cycle_phase === 'luteal').map(d => d.mood).filter(Boolean);
      const follicularMood = cyclePhaseData.filter(d => d.cycle_phase === 'follicular').map(d => d.mood).filter(Boolean);
      
      if (lutealMood.length > 0 && follicularMood.length > 0) {
        const lutealAvg = lutealMood.reduce((a, b) => a + b, 0) / lutealMood.length;
        const follicularAvg = follicularMood.reduce((a, b) => a + b, 0) / follicularMood.length;
        const moodDifference = follicularAvg - lutealAvg;
        
        insights.push({
          title: 'Menstrual Cycle Impact on Mood',
          correlation: moodDifference / 5, // Normalize to -1 to 1 scale
          strength: Math.abs(moodDifference) > 1.5 ? 'Strong' : Math.abs(moodDifference) > 0.8 ? 'Moderate' : 'Weak',
          description: `Your mood is ${moodDifference > 0 ? 'higher' : 'lower'} during follicular phase vs luteal phase`,
          recommendation: moodDifference < -1 ? 'Consider mood support during luteal phase (PMS time)' : 'Mood appears stable across cycle phases',
          category: Math.abs(moodDifference) > 1.5 ? 'negative' : 'neutral'
        });
      }

      // Energy vs Cycle Phase
      const lutealEnergy = cyclePhaseData.filter(d => d.cycle_phase === 'luteal').map(d => d.energy).filter(Boolean);
      const follicularEnergy = cyclePhaseData.filter(d => d.cycle_phase === 'follicular').map(d => d.energy).filter(Boolean);
      
      if (lutealEnergy.length > 0 && follicularEnergy.length > 0) {
        const lutealAvg = lutealEnergy.reduce((a, b) => a + b, 0) / lutealEnergy.length;
        const follicularAvg = follicularEnergy.reduce((a, b) => a + b, 0) / follicularEnergy.length;
        const energyDifference = follicularAvg - lutealAvg;
        
        insights.push({
          title: 'Menstrual Cycle Impact on Energy',
          correlation: energyDifference / 5,
          strength: Math.abs(energyDifference) > 1.5 ? 'Strong' : Math.abs(energyDifference) > 0.8 ? 'Moderate' : 'Weak',
          description: `Energy levels are ${energyDifference > 0 ? 'higher' : 'lower'} during follicular vs luteal phase`,
          recommendation: energyDifference < -1 ? 'Plan lighter activities during luteal phase' : 'Energy levels appear consistent',
          category: Math.abs(energyDifference) > 1.5 ? 'negative' : 'neutral'
        });
      }
    }

    // Pre-menopausal correlations
    const preData = data.filter(d => d.hot_flashes !== undefined);
    if (preData.length > 0) {
      // Hot flashes vs sleep
      const hotFlashSleepCorr = calculateCorrelation(
        preData.map(d => d.hot_flashes || 0),
        preData.map(d => d.sleep_quality || 5)
      );
      
      if (Math.abs(hotFlashSleepCorr) > 0.3) {
        insights.push({
          title: 'Hot Flashes Impact on Sleep',
          correlation: -Math.abs(hotFlashSleepCorr),
          strength: Math.abs(hotFlashSleepCorr) > 0.7 ? 'Strong' : Math.abs(hotFlashSleepCorr) > 0.4 ? 'Moderate' : 'Weak',
          description: 'Hot flashes appear to negatively impact sleep quality',
          recommendation: 'Consider cooling strategies before bed and discuss hormone therapy with your doctor',
          category: 'negative'
        });
      }

      // Brain fog vs mood
      const brainFogMoodCorr = calculateCorrelation(
        preData.map(d => d.brain_fog || 5),
        preData.map(d => d.mood || 5)
      );
      
      if (Math.abs(brainFogMoodCorr) > 0.3) {
        insights.push({
          title: 'Brain Fog Impact on Mood',
          correlation: -Math.abs(brainFogMoodCorr),
          strength: Math.abs(brainFogMoodCorr) > 0.7 ? 'Strong' : Math.abs(brainFogMoodCorr) > 0.4 ? 'Moderate' : 'Weak',
          description: 'Brain fog episodes correlate with lower mood',
          recommendation: 'Focus on cognitive support strategies and stress management',
          category: 'negative'
        });
      }
    }

    // Sleep vs overall health
    const sleepData = data.filter(d => d.sleep_hours && d.mood);
    if (sleepData.length > 0) {
      const sleepMoodCorr = calculateCorrelation(
        sleepData.map(d => d.sleep_hours),
        sleepData.map(d => d.mood)
      );
      
      if (Math.abs(sleepMoodCorr) > 0.3) {
        insights.push({
          title: 'Sleep Quality Foundation',
          correlation: sleepMoodCorr,
          strength: Math.abs(sleepMoodCorr) > 0.7 ? 'Strong' : Math.abs(sleepMoodCorr) > 0.4 ? 'Moderate' : 'Weak',
          description: 'Sleep hours strongly correlate with mood stability',
          recommendation: 'Prioritize consistent 7-9 hours of sleep for optimal wellbeing',
          category: 'positive'
        });
      }
    }

    return insights;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
        <span className="ml-3 text-gray-600">Analyzing health correlations...</span>
      </div>
    );
  }

  // Prepare chart data for cycle phase impact
  const cyclePhaseImpact = ['menstrual', 'follicular', 'ovulation', 'luteal'].map(phase => {
    const phaseData = combinedData.filter(d => d.cycle_phase === phase);
    if (phaseData.length === 0) return { phase, mood: 0, energy: 0, anxiety: 0, count: 0 };
    
    return {
      phase,
      mood: phaseData.reduce((sum, d) => sum + (d.mood || 0), 0) / phaseData.length,
      energy: phaseData.reduce((sum, d) => sum + (d.energy || 0), 0) / phaseData.length,
      anxiety: phaseData.reduce((sum, d) => sum + (d.anxiety || 0), 0) / phaseData.length,
      count: phaseData.length
    };
  }).filter(d => d.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-pink-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Health Impact Analysis</h3>
            <p className="text-sm text-gray-600">
              Understanding how women's health factors affect {currentUser?.name}'s overall wellbeing
            </p>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center space-x-3 mb-4">
            <Heart className="h-6 w-6 text-pink-600" />
            <h4 className="font-semibold text-gray-900">Cycle Insights</h4>
          </div>
          <p className="text-2xl font-bold text-pink-600 mb-2">
            {correlations.filter(c => c.title.includes('Cycle')).length}
          </p>
          <p className="text-sm text-gray-600">Menstrual cycle correlations found</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center space-x-3 mb-4">
            <Thermometer className="h-6 w-6 text-purple-600" />
            <h4 className="font-semibold text-gray-900">Symptom Impact</h4>
          </div>
          <p className="text-2xl font-bold text-purple-600 mb-2">
            {correlations.filter(c => c.category === 'negative').length}
          </p>
          <p className="text-sm text-gray-600">Areas needing attention</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <div className="flex items-center space-x-3 mb-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <h4 className="font-semibold text-gray-900">Positive Patterns</h4>
          </div>
          <p className="text-2xl font-bold text-green-600 mb-2">
            {correlations.filter(c => c.category === 'positive').length}
          </p>
          <p className="text-sm text-gray-600">Supportive health factors</p>
        </div>
      </div>

      {/* Cycle Phase Impact Chart */}
      {cyclePhaseImpact.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Menstrual Cycle Phase Impact</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cyclePhaseImpact}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="phase" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Bar dataKey="mood" fill="#ec4899" name="Mood" />
                <Bar dataKey="energy" fill="#3b82f6" name="Energy" />
                <Bar dataKey="anxiety" fill="#f97316" name="Anxiety" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Shows how different cycle phases affect mood, energy, and anxiety levels
          </p>
        </div>
      )}

      {/* Correlation Insights */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Health Correlation Insights</h3>
        
        {correlations.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Building Analysis</h4>
            <p className="text-gray-600">Continue tracking to build comprehensive health correlations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {correlations.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-2 ${
                insight.category === 'positive' ? 'border-green-200 bg-green-50' :
                insight.category === 'negative' ? 'border-red-200 bg-red-50' :
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start space-x-3">
                  <div className="mt-1">
                    {insight.category === 'positive' ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : insight.category === 'negative' ? (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-gray-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium mb-1 ${
                      insight.category === 'positive' ? 'text-green-800' :
                      insight.category === 'negative' ? 'text-red-800' :
                      'text-gray-800'
                    }`}>
                      {insight.title}
                    </h4>
                    <p className={`text-sm mb-2 ${
                      insight.category === 'positive' ? 'text-green-700' :
                      insight.category === 'negative' ? 'text-red-700' :
                      'text-gray-700'
                    }`}>
                      {insight.description}
                    </p>
                    <div className="flex items-center space-x-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        insight.category === 'positive' ? 'bg-green-100 text-green-800' :
                        insight.category === 'negative' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {insight.strength} Correlation
                      </span>
                      <span className="text-xs text-gray-600">
                        Recommendation: {insight.recommendation}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Personalized Recommendations */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Personalized Health Recommendations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cycle-Based Recommendations */}
          <div>
            <h4 className="font-medium text-pink-800 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Cycle-Based Strategies
            </h4>
            <div className="space-y-3">
              {correlations.filter(c => c.title.includes('Cycle')).map((insight, index) => (
                <div key={index} className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-pink-800">{insight.title}</p>
                  <p className="text-sm text-pink-700 mt-1">{insight.recommendation}</p>
                </div>
              ))}
              
              {cyclePhaseImpact.length > 0 && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-pink-800">Cycle Phase Planning</p>
                  <p className="text-sm text-pink-700 mt-1">
                    Schedule important activities during your follicular phase when energy tends to be higher
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Symptom Management */}
          <div>
            <h4 className="font-medium text-purple-800 mb-3 flex items-center">
              <Thermometer className="h-5 w-5 mr-2" />
              Symptom Management
            </h4>
            <div className="space-y-3">
              {correlations.filter(c => c.category === 'negative').map((insight, index) => (
                <div key={index} className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-800">{insight.title}</p>
                  <p className="text-sm text-purple-700 mt-1">{insight.recommendation}</p>
                </div>
              ))}
              
              {premenopausalData.length > 0 && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-purple-800">Holistic Approach</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Consider discussing hormone therapy, lifestyle modifications, and stress management with your healthcare provider
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Lab Results Integration */}
      {labData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Lab Results & Women's Health</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {labData.filter(lab => ['hormone', 'vitamin', 'thyroid'].includes(lab.test_category)).slice(0, 6).map((lab) => (
              <div key={lab.id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{lab.test_name}</h4>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    lab.status === 'normal' ? 'bg-green-100 text-green-800' :
                    lab.status === 'low' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {lab.status}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {lab.result_value} {lab.result_unit}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {format(new Date(lab.test_date), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Integration Tip:</strong> Hormone levels (estrogen, progesterone, thyroid) can significantly impact 
              menstrual cycles and pre-menopausal symptoms. Track these alongside your daily symptoms for comprehensive insights.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};