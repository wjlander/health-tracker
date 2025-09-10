import React, { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { Calendar, Download, Filter, Search, Activity, Scale, Utensils, Moon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getHealthEntries, getFitbitData } from '../lib/database';

export const History: React.FC = () => {
  const { currentUser } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [filterMetric, setFilterMetric] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [healthHistory, setHealthHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fitbitData, setFitbitData] = useState<any>(null);

  React.useEffect(() => {
    if (currentUser) {
      loadHealthHistory();
      loadFitbitHistory();
    }
  }, [currentUser]);

  const loadHealthHistory = async () => {
    try {
      setLoading(true);
      const { data, error } = await getHealthEntries(currentUser!.id, 100);
      if (error) throw error;
      
      // Transform data to match the expected format
      const transformedData = (data || []).map(entry => ({
        id: entry.id,
        date: entry.date,
        mood: entry.mood || 5,
        energy: entry.energy || 5,
        anxiety: entry.anxiety_level || 5,
        sleep_hours: entry.sleep_hours || 7,
        sleep_quality: entry.sleep_quality || 5,
        weight: entry.weight || 150,
        notes: entry.notes || ''
      }));
      
      setHealthHistory(transformedData);
    } catch (error) {
      console.error('Error loading health history:', error);
      setHealthHistory([]);
    } finally {
      setLoading(false);
    }
  };
  
  const loadFitbitHistory = async () => {
    try {
      console.log('Loading Fitbit history for user:', currentUser!.name);
      const fitbitHistory = await getFitbitData(currentUser!.id, 100);
      setFitbitData(fitbitHistory);
      console.log('Fitbit history loaded:', fitbitHistory);
    } catch (error) {
      console.error('Error loading Fitbit history:', error);
    }
  };

  const filteredHistory = healthHistory.filter(entry => {
    const matchesSearch = entry.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         entry.date.includes(searchTerm);
    return matchesSearch;
  });
  
  // Combine health entries with Fitbit data by date
  const combinedHistory = filteredHistory.map(entry => {
    const fitbitActivity = fitbitData?.activities?.find((a: any) => a.date === entry.date);
    const fitbitWeight = fitbitData?.weights?.find((w: any) => w.date === entry.date);
    const fitbitFood = fitbitData?.foods?.find((f: any) => f.date === entry.date);
    const fitbitSleep = fitbitData?.sleep?.find((s: any) => s.date === entry.date);
    
    return {
      ...entry,
      fitbit: {
        activity: fitbitActivity,
        weight: fitbitWeight,
        food: fitbitFood,
        sleep: fitbitSleep
      }
    };
  });

  const exportData = () => {
    const headers = [
      'Date', 'Mood', 'Energy', 'Anxiety', 'Sleep Hours', 'Sleep Quality', 'Weight', 'Notes',
      'Fitbit Steps', 'Fitbit Calories', 'Fitbit Weight', 'Fitbit Sleep Duration', 'Fitbit Food Calories'
    ];
    
    const csvContent = [
      headers,
      ...combinedHistory.map(entry => [
        entry.date,
        entry.mood,
        entry.energy,
        entry.anxiety,
        entry.sleep_hours.toFixed(1),
        entry.sleep_quality,
        entry.weight.toFixed(1),
        `"${entry.notes}"`,
        entry.fitbit.activity?.steps || '',
        entry.fitbit.activity?.calories || '',
        entry.fitbit.weight?.weight || '',
        entry.fitbit.sleep ? Math.round(entry.fitbit.sleep.duration / 60 * 10) / 10 : '',
        entry.fitbit.food?.calories || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `health-data-${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getScoreColor = (score: number, max: number = 10, reverse: boolean = false) => {
    const percentage = score / max;
    if (reverse) {
      // For anxiety - higher is worse
      if (percentage > 0.7) return 'bg-red-100 text-red-800';
      if (percentage > 0.4) return 'bg-yellow-100 text-yellow-800';
      return 'bg-green-100 text-green-800';
    } else {
      // For mood, energy, sleep quality - higher is better
      if (percentage > 0.7) return 'bg-green-100 text-green-800';
      if (percentage > 0.4) return 'bg-yellow-100 text-yellow-800';
      return 'bg-red-100 text-red-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search entries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterMetric}
              onChange={(e) => setFilterMetric(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Metrics</option>
              <option value="mood">Mood</option>
              <option value="energy">Energy</option>
              <option value="anxiety">Anxiety</option>
              <option value="sleep">Sleep</option>
            </select>
          </div>

          <div className="flex items-center space-x-4">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            <button
              onClick={exportData}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats for Selected Period */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Avg Mood', value: 6.8, color: 'text-pink-600' },
          { label: 'Avg Energy', value: 6.5, color: 'text-blue-600' },
          { label: 'Avg Anxiety', value: 5.2, color: 'text-orange-600' },
          { label: 'Avg Sleep', value: 7.3, color: 'text-purple-600' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
            <p className="text-sm font-medium text-gray-600">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>
              {stat.value}
              {stat.label.includes('Sleep') ? 'h' : '/10'}
            </p>
          </div>
        ))}
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-500" />
            Health History ({filteredHistory.length} entries)
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Date</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Mood</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Energy</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Anxiety</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Sleep</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Weight</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Fitbit Data</th>
                <th className="text-left py-3 px-6 font-medium text-gray-900">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {combinedHistory.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 font-medium text-gray-900">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(entry.mood)}`}>
                      {entry.mood}/10
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(entry.energy)}`}>
                      {entry.energy}/10
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getScoreColor(entry.anxiety, 10, true)}`}>
                      {entry.anxiety}/10
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-900">
                        {entry.sleep_hours.toFixed(1)}h
                      </span>
                      <span className={`text-xs ${getScoreColor(entry.sleep_quality).split(' ')[1]}`}>
                        Quality: {entry.sleep_quality}/10
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-sm text-gray-900">
                    {entry.weight.toFixed(1)} lbs
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-1">
                      {entry.fitbit.activity && (
                        <div className="flex items-center space-x-1 text-xs">
                          <Activity className="h-3 w-3 text-green-500" />
                          <span>{entry.fitbit.activity.steps?.toLocaleString()} steps</span>
                        </div>
                      )}
                      {entry.fitbit.weight && (
                        <div className="flex items-center space-x-1 text-xs">
                          <Scale className="h-3 w-3 text-blue-500" />
                          <span>{entry.fitbit.weight.weight} lbs</span>
                        </div>
                      )}
                      {entry.fitbit.food && (
                        <div className="flex items-center space-x-1 text-xs">
                          <Utensils className="h-3 w-3 text-orange-500" />
                          <span>{entry.fitbit.food.calories} cal</span>
                        </div>
                      )}
                      {entry.fitbit.sleep && (
                        <div className="flex items-center space-x-1 text-xs">
                          <Moon className="h-3 w-3 text-purple-500" />
                          <span>{Math.round(entry.fitbit.sleep.duration / 60 * 10) / 10}h</span>
                        </div>
                      )}
                      {!entry.fitbit.activity && !entry.fitbit.weight && !entry.fitbit.food && !entry.fitbit.sleep && (
                        <span className="text-xs text-gray-400">No Fitbit data</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="max-w-xs">
                      <p className="text-sm text-gray-600 truncate">
                        {entry.notes || '—'}
                      </p>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {combinedHistory.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No entries found</h3>
            <p className="text-gray-600">Try adjusting your search or date range.</p>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Period Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Best Days</h4>
            <div className="space-y-2">
              {combinedHistory
                .sort((a, b) => (b.mood + b.energy) - (a.mood + a.energy))
                .slice(0, 3)
                .map((entry) => (
                  <div key={entry.id} className="text-sm">
                    <span className="font-medium text-green-600">
                      {format(new Date(entry.date), 'MMM d')}
                    </span>
                    <span className="text-gray-500 ml-2">
                      Mood: {entry.mood}, Energy: {entry.energy}
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Sleep Patterns</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Manual: {combinedHistory.length > 0 ? (combinedHistory.reduce((sum, entry) => sum + entry.sleep_hours, 0) / combinedHistory.length).toFixed(1) : 0} hours avg</div>
              {fitbitData?.sleep?.length > 0 && (
                <div>Fitbit: {(fitbitData.sleep.reduce((sum: number, entry: any) => sum + entry.duration, 0) / fitbitData.sleep.length / 60).toFixed(1)} hours avg</div>
              )}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 mb-2">Weight Trend</h4>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Manual: {combinedHistory[combinedHistory.length - 1]?.weight.toFixed(1)} lbs</div>
              {fitbitData?.weights?.length > 0 && (
                <div>Fitbit: {fitbitData.weights[fitbitData.weights.length - 1]?.weight} lbs</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Fitbit Data Summary */}
      {fitbitData && (fitbitData.activities.length > 0 || fitbitData.weights.length > 0 || fitbitData.foods.length > 0 || fitbitData.sleep.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fitbit Data Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {fitbitData.activities.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-green-500" />
                  Activity
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Avg Steps: {Math.round(fitbitData.activities.reduce((sum: number, a: any) => sum + (a.steps || 0), 0) / fitbitData.activities.length).toLocaleString()}</div>
                  <div>Total Days: {fitbitData.activities.length}</div>
                </div>
              </div>
            )}
            
            {fitbitData.weights.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <Scale className="h-4 w-4 mr-2 text-blue-500" />
                  Weight
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Latest: {fitbitData.weights[fitbitData.weights.length - 1]?.weight} lbs</div>
                  <div>Records: {fitbitData.weights.length}</div>
                </div>
              </div>
            )}
            
            {fitbitData.foods.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <Utensils className="h-4 w-4 mr-2 text-orange-500" />
                  Nutrition
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Avg Calories: {Math.round(fitbitData.foods.reduce((sum: number, f: any) => sum + (f.calories || 0), 0) / fitbitData.foods.length)}</div>
                  <div>Days Logged: {fitbitData.foods.length}</div>
                </div>
              </div>
            )}
            
            {fitbitData.sleep.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center">
                  <Moon className="h-4 w-4 mr-2 text-purple-500" />
                  Sleep
                </h4>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Avg Duration: {(fitbitData.sleep.reduce((sum: number, s: any) => sum + (s.duration || 0), 0) / fitbitData.sleep.length / 60).toFixed(1)}h</div>
                  <div>Avg Efficiency: {Math.round(fitbitData.sleep.reduce((sum: number, s: any) => sum + (s.efficiency || 0), 0) / fitbitData.sleep.length)}%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* No Fitbit Data Message */}
      {fitbitData && fitbitData.activities.length === 0 && fitbitData.weights.length === 0 && fitbitData.foods.length === 0 && fitbitData.sleep.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Activity className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">No Fitbit Data Yet</h3>
          <p className="text-blue-700">Connect your Fitbit account and sync data to see it here alongside your manual entries!</p>
        </div>
      )}
    </div>
  );
};