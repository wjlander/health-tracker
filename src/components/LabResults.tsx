import React, { useState, useEffect } from 'react';
import { TestTube, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Plus, Calendar, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getLabResults, createLabResult, updateLabResult, deleteLabResult } from '../lib/database';
import { format } from 'date-fns';

interface LabResultForm {
  test_name: string;
  test_category: 'blood' | 'hormone' | 'vitamin' | 'metabolic' | 'thyroid' | 'other';
  test_date: string;
  result_value: number;
  result_unit: string;
  reference_range_min?: number;
  reference_range_max?: number;
  doctor_notes?: string;
  lab_name?: string;
}

export const LabResults: React.FC = () => {
  const { currentUser } = useAuth();
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingResult, setEditingResult] = useState<any>(null);
  const [formData, setFormData] = useState<LabResultForm>({
    test_name: '',
    test_category: 'blood',
    test_date: format(new Date(), 'yyyy-MM-dd'),
    result_value: 0,
    result_unit: '',
    reference_range_min: undefined,
    reference_range_max: undefined,
    doctor_notes: '',
    lab_name: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadLabResults();
    }
  }, [currentUser]);

  const loadLabResults = async () => {
    try {
      setLoading(true);
      const { data, error } = await getLabResults(currentUser!.id, 50);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setLabResults(data || []);
    } catch (error) {
      console.error('Error loading lab results:', error);
      setLabResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const resultData = {
        ...formData,
        user_id: currentUser.id,
        status: determineStatus(formData.result_value, formData.reference_range_min, formData.reference_range_max)
      };

      if (editingResult) {
        const { error } = await updateLabResult(editingResult.id, resultData);
        if (error) throw error;
      } else {
        const { error } = await createLabResult(resultData);
        if (error) throw error;
      }

      resetForm();
      await loadLabResults();
    } catch (error) {
      console.error('Error saving lab result:', error);
      alert('Failed to save lab result. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (result: any) => {
    setEditingResult(result);
    setFormData({
      test_name: result.test_name,
      test_category: result.test_category,
      test_date: result.test_date,
      result_value: result.result_value,
      result_unit: result.result_unit,
      reference_range_min: result.reference_range_min,
      reference_range_max: result.reference_range_max,
      doctor_notes: result.doctor_notes || '',
      lab_name: result.lab_name || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, testName: string) => {
    if (!confirm(`Are you sure you want to delete the ${testName} result?`)) {
      return;
    }

    try {
      const { error } = await deleteLabResult(id);
      if (error) throw error;
      await loadLabResults();
    } catch (error) {
      console.error('Error deleting lab result:', error);
      alert('Failed to delete lab result. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      test_name: '',
      test_category: 'blood',
      test_date: format(new Date(), 'yyyy-MM-dd'),
      result_value: 0,
      result_unit: '',
      reference_range_min: undefined,
      reference_range_max: undefined,
      doctor_notes: '',
      lab_name: ''
    });
    setEditingResult(null);
    setShowAddForm(false);
  };

  const determineStatus = (value: number, min?: number, max?: number): 'low' | 'normal' | 'high' | 'critical' => {
    if (min !== undefined && value < min) return 'low';
    if (max !== undefined && value > max) return 'high';
    return 'normal';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-green-600 bg-green-50';
      case 'low': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'critical': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'normal': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'low': return <TrendingDown className="h-4 w-4 text-yellow-600" />;
      case 'high': return <TrendingUp className="h-4 w-4 text-orange-600" />;
      case 'critical': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <TestTube className="h-4 w-4 text-gray-600" />;
    }
  };

  const commonTests = [
    { name: 'Hemoglobin', unit: 'g/dL', category: 'blood', min: 12.0, max: 15.5 },
    { name: 'Vitamin B12', unit: 'pg/mL', category: 'vitamin', min: 300, max: 900 },
    { name: 'Vitamin D', unit: 'ng/mL', category: 'vitamin', min: 30, max: 100 },
    { name: 'Iron', unit: 'μg/dL', category: 'vitamin', min: 60, max: 170 },
    { name: 'TSH', unit: 'mIU/L', category: 'thyroid', min: 0.4, max: 4.0 },
    { name: 'HbA1c', unit: '%', category: 'metabolic', min: 4.0, max: 5.6 },
    { name: 'Cholesterol Total', unit: 'mg/dL', category: 'metabolic', min: 0, max: 200 },
    { name: 'Estrogen', unit: 'pg/mL', category: 'hormone', min: 30, max: 400 },
    { name: 'Progesterone', unit: 'ng/mL', category: 'hormone', min: 0.2, max: 25 }
  ];

  const fillCommonTest = (test: any) => {
    setFormData({
      ...formData,
      test_name: test.name,
      test_category: test.category,
      result_unit: test.unit,
      reference_range_min: test.min,
      reference_range_max: test.max
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500 p-2 rounded-lg">
              <TestTube className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Lab Results & Medical Tests</h3>
              <p className="text-sm text-gray-600">
                Track blood work, hormone levels, and other medical tests for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Result</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <TestTube className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{labResults.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Abnormal</p>
              <p className="text-2xl font-bold text-gray-900">
                {labResults.filter(r => r.status === 'high' || r.status === 'low').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Normal</p>
              <p className="text-2xl font-bold text-gray-900">
                {labResults.filter(r => r.status === 'normal').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Last Test</p>
              <p className="text-sm font-bold text-gray-900">
                {labResults.length > 0 ? format(new Date(labResults[0].test_date), 'MMM d') : 'None'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingResult ? 'Edit Lab Result' : 'Add Lab Result'}
          </h3>
          
          {/* Common Tests Quick Select */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Select Common Tests:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {commonTests.map((test, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => fillCommonTest(test)}
                  className="text-left p-2 text-xs bg-gray-50 hover:bg-blue-50 border border-gray-200 rounded transition-colors"
                >
                  <div className="font-medium">{test.name}</div>
                  <div className="text-gray-500">{test.unit}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Name</label>
                <input
                  type="text"
                  value={formData.test_name}
                  onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Hemoglobin, Vitamin B12"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={formData.test_category}
                  onChange={(e) => setFormData({ ...formData, test_category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blood">Blood Test</option>
                  <option value="hormone">Hormone</option>
                  <option value="vitamin">Vitamin/Mineral</option>
                  <option value="metabolic">Metabolic</option>
                  <option value="thyroid">Thyroid</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                <input
                  type="date"
                  value={formData.test_date}
                  onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Result Value</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.result_value}
                    onChange={(e) => setFormData({ ...formData, result_value: Number(e.target.value) })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    value={formData.result_unit}
                    onChange={(e) => setFormData({ ...formData, result_unit: e.target.value })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Unit"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reference Range (Optional)</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reference_range_min || ''}
                    onChange={(e) => setFormData({ ...formData, reference_range_min: e.target.value ? Number(e.target.value) : undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Min"
                  />
                  <span className="self-center text-gray-500">-</span>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.reference_range_max || ''}
                    onChange={(e) => setFormData({ ...formData, reference_range_max: e.target.value ? Number(e.target.value) : undefined })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Max"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lab Name (Optional)</label>
                <input
                  type="text"
                  value={formData.lab_name}
                  onChange={(e) => setFormData({ ...formData, lab_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Quest Diagnostics"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Notes (Optional)</label>
              <textarea
                value={formData.doctor_notes}
                onChange={(e) => setFormData({ ...formData, doctor_notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Any notes from your doctor about this test..."
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingResult ? 'Update Result' : 'Add Result')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lab Results List */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Lab Results</h3>
        </div>
        
        {labResults.length === 0 ? (
          <div className="text-center py-12">
            <TestTube className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Lab Results Yet</h3>
            <p className="text-gray-600">Add your first lab test results to start tracking trends and patterns.</p>
            <p className="text-sm text-blue-600 mt-4">Track B12, Iron, HbA1C, hormones, and more!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Test</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Date</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Result</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Reference Range</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {labResults.map((result) => (
                  <tr key={result.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div>
                        <div className="font-medium text-gray-900">{result.test_name}</div>
                        <div className="text-sm text-gray-500 capitalize">{result.test_category}</div>
                        {result.lab_name && (
                          <div className="text-xs text-gray-400">{result.lab_name}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {format(new Date(result.test_date), 'MMM d, yyyy')}
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-medium text-gray-900">
                        {result.result_value} {result.result_unit}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {result.reference_range_min !== null && result.reference_range_max !== null ? (
                        `${result.reference_range_min} - ${result.reference_range_max} ${result.result_unit}`
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(result.status)}
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(result.status)}`}>
                          {result.status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(result)}
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(result.id, result.test_name)}
                          className="text-red-600 hover:text-red-700 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};