import React, { useState, useEffect } from 'react';
import { Pill, Plus, Edit, Trash2, AlertCircle, CheckCircle, Calendar, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getDiagnoses, 
  createDiagnosis, 
  updateDiagnosis, 
  deleteDiagnosis,
  getMedications,
  createMedication,
  updateMedication,
  deleteMedication
} from '../lib/database';
import { format } from 'date-fns';

export const MedicalManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'diagnoses' | 'medications'>('diagnoses');
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [diagnosisForm, setDiagnosisForm] = useState({
    diagnosis_name: '',
    diagnosis_code: '',
    diagnosed_date: '',
    diagnosed_by: '',
    severity: 'moderate' as const,
    is_active: true,
    notes: ''
  });

  const [medicationForm, setMedicationForm] = useState({
    medication_name: '',
    dosage: '',
    frequency: '',
    prescribed_by: '',
    prescribed_date: '',
    status: 'active' as const,
    start_date: '',
    end_date: '',
    side_effects: [] as string[],
    effectiveness_rating: 5,
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'diagnoses') {
        const { data, error } = await getDiagnoses(currentUser!.id);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setDiagnoses(data || []);
      } else {
        const { data, error } = await getMedications(currentUser!.id);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setMedications(data || []);
      }
    } catch (error) {
      console.error('Error loading medical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      if (activeTab === 'diagnoses') {
        const data = { ...diagnosisForm, user_id: currentUser.id };
        
        if (editingItem) {
          const { error } = await updateDiagnosis(editingItem.id, data);
          if (error) throw error;
        } else {
          const { error } = await createDiagnosis(data);
          if (error) throw error;
        }
      } else {
        const data = { ...medicationForm, user_id: currentUser.id };
        
        if (editingItem) {
          const { error } = await updateMedication(editingItem.id, data);
          if (error) throw error;
        } else {
          const { error } = await createMedication(data);
          if (error) throw error;
        }
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving medical data:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setDiagnosisForm({
      diagnosis_name: '',
      diagnosis_code: '',
      diagnosed_date: '',
      diagnosed_by: '',
      severity: 'moderate',
      is_active: true,
      notes: ''
    });
    setMedicationForm({
      medication_name: '',
      dosage: '',
      frequency: '',
      prescribed_by: '',
      prescribed_date: '',
      status: 'active',
      start_date: '',
      end_date: '',
      side_effects: [],
      effectiveness_rating: 5,
      notes: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    
    if (activeTab === 'diagnoses') {
      setDiagnosisForm({
        diagnosis_name: item.diagnosis_name,
        diagnosis_code: item.diagnosis_code || '',
        diagnosed_date: item.diagnosed_date || '',
        diagnosed_by: item.diagnosed_by || '',
        severity: item.severity,
        is_active: item.is_active,
        notes: item.notes || ''
      });
    } else {
      setMedicationForm({
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        prescribed_by: item.prescribed_by || '',
        prescribed_date: item.prescribed_date || '',
        status: item.status,
        start_date: item.start_date || '',
        end_date: item.end_date || '',
        side_effects: item.side_effects || [],
        effectiveness_rating: item.effectiveness_rating || 5,
        notes: item.notes || ''
      });
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      if (activeTab === 'diagnoses') {
        const { error } = await deleteDiagnosis(id);
        if (error) throw error;
      } else {
        const { error } = await deleteMedication(id);
        if (error) throw error;
      }
      
      await loadData();
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Failed to delete. Please try again.');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'discontinued': return 'bg-red-100 text-red-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'as_needed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Pill className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Medical Management</h3>
              <p className="text-sm text-gray-600">
                Track diagnoses and medications for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add {activeTab === 'diagnoses' ? 'Diagnosis' : 'Medication'}</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('diagnoses')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'diagnoses'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>Diagnoses ({diagnoses.filter(d => d.is_active).length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'medications'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Pill className="h-4 w-4" />
              <span>Medications ({medications.filter(m => m.status === 'active').length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingItem ? 'Edit' : 'Add'} {activeTab === 'diagnoses' ? 'Diagnosis' : 'Medication'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === 'diagnoses' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosis Name</label>
                    <input
                      type="text"
                      value={diagnosisForm.diagnosis_name}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosis_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Type 2 Diabetes"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">ICD-10 Code (Optional)</label>
                    <input
                      type="text"
                      value={diagnosisForm.diagnosis_code}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosis_code: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., E11.9"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosed Date</label>
                    <input
                      type="date"
                      value={diagnosisForm.diagnosed_date}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosed_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Diagnosed By</label>
                    <input
                      type="text"
                      value={diagnosisForm.diagnosed_by}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, diagnosed_by: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Dr. Smith"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                    <select
                      value={diagnosisForm.severity}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, severity: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mild">Mild</option>
                      <option value="moderate">Moderate</option>
                      <option value="severe">Severe</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={diagnosisForm.is_active}
                      onChange={(e) => setDiagnosisForm({...diagnosisForm, is_active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Currently active condition
                    </label>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={diagnosisForm.notes}
                    onChange={(e) => setDiagnosisForm({...diagnosisForm, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Additional notes about this diagnosis..."
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name</label>
                    <input
                      type="text"
                      value={medicationForm.medication_name}
                      onChange={(e) => setMedicationForm({...medicationForm, medication_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Metformin"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Dosage</label>
                    <input
                      type="text"
                      value={medicationForm.dosage}
                      onChange={(e) => setMedicationForm({...medicationForm, dosage: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., 500mg"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                    <input
                      type="text"
                      value={medicationForm.frequency}
                      onChange={(e) => setMedicationForm({...medicationForm, frequency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Twice daily with meals"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={medicationForm.status}
                      onChange={(e) => setMedicationForm({...medicationForm, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="discontinued">Discontinued</option>
                      <option value="paused">Paused</option>
                      <option value="as_needed">As Needed</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Prescribed By</label>
                    <input
                      type="text"
                      value={medicationForm.prescribed_by}
                      onChange={(e) => setMedicationForm({...medicationForm, prescribed_by: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Dr. Johnson"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={medicationForm.start_date}
                      onChange={(e) => setMedicationForm({...medicationForm, start_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Effectiveness Rating (1-10)</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={medicationForm.effectiveness_rating}
                      onChange={(e) => setMedicationForm({...medicationForm, effectiveness_rating: Number(e.target.value)})}
                      className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <span className="w-8 text-center font-medium text-blue-600">
                      {medicationForm.effectiveness_rating}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Not effective</span>
                    <span>Very effective</span>
                  </div>
                </div>
              </>
            )}
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingItem ? 'Update' : 'Add')}
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

      {/* Data Display */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'diagnoses' ? 'Current Diagnoses' : 'Current Medications'}
          </h3>
        </div>
        
        {(activeTab === 'diagnoses' ? diagnoses : medications).length === 0 ? (
          <div className="text-center py-12">
            {activeTab === 'diagnoses' ? (
              <AlertCircle className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            ) : (
              <Pill className="h-12 w-12 text-blue-400 mx-auto mb-4" />
            )}
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No {activeTab} yet
            </h3>
            <p className="text-gray-600">
              Add your first {activeTab === 'diagnoses' ? 'diagnosis' : 'medication'} to start tracking.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {(activeTab === 'diagnoses' ? diagnoses : medications).map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">
                        {activeTab === 'diagnoses' ? item.diagnosis_name : item.medication_name}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        activeTab === 'diagnoses' 
                          ? getSeverityColor(item.severity)
                          : getStatusColor(item.status)
                      }`}>
                        {activeTab === 'diagnoses' ? item.severity : item.status}
                      </span>
                      {activeTab === 'diagnoses' && !item.is_active && (
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    
                    {activeTab === 'diagnoses' ? (
                      <div className="text-sm text-gray-600 space-y-1">
                        {item.diagnosis_code && <div>Code: {item.diagnosis_code}</div>}
                        {item.diagnosed_date && <div>Diagnosed: {format(new Date(item.diagnosed_date), 'MMM d, yyyy')}</div>}
                        {item.diagnosed_by && <div>By: {item.diagnosed_by}</div>}
                        {item.notes && <div className="mt-2 text-gray-700">{item.notes}</div>}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>Dosage: {item.dosage}</div>
                        <div>Frequency: {item.frequency}</div>
                        {item.prescribed_by && <div>Prescribed by: {item.prescribed_by}</div>}
                        {item.start_date && <div>Started: {format(new Date(item.start_date), 'MMM d, yyyy')}</div>}
                        {item.effectiveness_rating && (
                          <div>Effectiveness: {item.effectiveness_rating}/10</div>
                        )}
                        {item.side_effects && item.side_effects.length > 0 && (
                          <div>Side effects: {item.side_effects.join(', ')}</div>
                        )}
                        {item.notes && <div className="mt-2 text-gray-700">{item.notes}</div>}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(item)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id, activeTab === 'diagnoses' ? item.diagnosis_name : item.medication_name)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};