import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, User, Printer, Send, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  getReportTemplates, 
  createReportTemplate,
  updateReportTemplate,
  deleteReportTemplate,
  generateReport,
  getHealthEntries,
  getMedications,
  getDiagnoses,
  getSeizureEntries,
  getMentalHealthEntries,
  getBloodPressureReadings
} from '../lib/database';
import { format, subDays } from 'date-fns';

export const ReportBuilder: React.FC = () => {
  const { currentUser } = useAuth();
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const [doctorInfo, setDoctorInfo] = useState({
    name: '',
    appointment_date: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadTemplates();
      createDefaultTemplatesIfNeeded();
    }
  }, [currentUser]);

  const createDefaultTemplatesIfNeeded = async () => {
    try {
      // Check if user has any templates
      const { data: existingTemplates } = await getReportTemplates(currentUser!.id);
      
      if (!existingTemplates || existingTemplates.length === 0) {
        // Create default templates
        const defaultTemplates = [
          {
            user_id: currentUser!.id,
            template_name: 'Standard Doctor Visit',
            report_type: 'doctor' as const,
            template_content: {
              sections: ['patient_info', 'health_summary', 'medications', 'diagnoses', 'seizures', 'mental_health', 'blood_pressure', 'weight_trends', 'questions'],
              include_charts: true,
              include_raw_data: false
            },
            is_default: true
          },
          {
            user_id: currentUser!.id,
            template_name: 'Mental Health Check-in',
            report_type: 'mental_health' as const,
            template_content: {
              sections: ['patient_info', 'mental_health', 'medications', 'mood_patterns', 'coping_strategies', 'crisis_episodes', 'support_systems'],
              include_charts: true,
              include_raw_data: false
            },
            is_default: false
          },
          {
            user_id: currentUser!.id,
            template_name: 'Neurologist Visit',
            report_type: 'specialist' as const,
            template_content: {
              sections: ['patient_info', 'seizures', 'medications', 'triggers', 'sleep_patterns', 'mood_correlation', 'emergency_episodes'],
              include_charts: true,
              include_raw_data: true
            },
            is_default: false
          }
        ];
        
        // Create each template
        for (const template of defaultTemplates) {
          await supabase.from('report_templates').insert(template);
        }
        
        // Reload templates
        await loadTemplates();
      }
    } catch (error) {
      console.error('Error creating default templates:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      console.log('Loading report templates for user:', currentUser?.id);
      const { data, error } = await getReportTemplates(currentUser!.id);
      
      if (error) {
        console.error('Error loading templates:', error);
        if (!error.message?.includes('does not exist')) {
          throw error;
        }
        // Table doesn't exist, create empty array
        setTemplates([]);
        return;
      }
      
      console.log('Templates loaded:', data?.length || 0);
      setTemplates(data || []);
      
      // Select default template if available
      const defaultTemplate = (data || []).find(t => t.is_default);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
        console.log('Selected default template:', defaultTemplate.template_name);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    }
  };

  const createNewTemplate = async () => {
    if (!currentUser) return;
    
    const templateName = prompt('Enter template name:');
    if (!templateName) return;
    
    const reportType = prompt('Enter report type (doctor, mental_health, specialist, emergency):') || 'doctor';
    
    try {
      const { error } = await createReportTemplate({
        user_id: currentUser.id,
        template_name: templateName,
        report_type: reportType as any,
        template_content: {
          sections: ['patient_info', 'health_summary', 'medications'],
          include_charts: true,
          include_raw_data: false
        },
        is_default: false
      });
      
      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      alert('Failed to create template. Please try again.');
    }
  };

  const editTemplate = async (template: any) => {
    const newName = prompt('Enter new template name:', template.template_name);
    if (!newName) return;
    
    try {
      const { error } = await updateReportTemplate(template.id, {
        template_name: newName
      });
      
      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      alert('Failed to update template. Please try again.');
    }
  };

  const deleteTemplate = async (template: any) => {
    if (!confirm(`Delete template "${template.template_name}"?`)) return;
    
    try {
      const { error } = await deleteReportTemplate(template.id);
      if (error) throw error;
      await loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template. Please try again.');
    }
  };

  const generateReportData = async () => {
    if (!currentUser || !selectedTemplate) return;

    try {
      setLoading(true);
      
      // Fetch all relevant data for the date range
      const [
        healthEntries,
        medications,
        diagnoses,
        seizures,
        mentalHealth,
        bloodPressure
      ] = await Promise.all([
        getHealthEntries(currentUser.id, 100),
        getMedications(currentUser.id),
        getDiagnoses(currentUser.id),
        getSeizureEntries(currentUser.id, 100),
        getMentalHealthEntries(currentUser.id, 100),
        getBloodPressureReadings(currentUser.id, 100)
      ]);

      // Filter data by date range
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      
      const filteredHealth = (healthEntries.data || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      const filteredSeizures = (seizures.data || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      const filteredMentalHealth = (mentalHealth.data || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });
      
      const filteredBP = (bloodPressure.data || []).filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= startDate && entryDate <= endDate;
      });

      // Calculate summaries and insights
      const report = {
        patient: currentUser,
        dateRange: dateRange,
        generatedAt: new Date().toISOString(),
        doctor: doctorInfo,
        
        // Health Summary
        healthSummary: {
          totalEntries: filteredHealth.length,
          avgMood: filteredHealth.length > 0 ? (filteredHealth.reduce((sum, h) => sum + (h.mood || 0), 0) / filteredHealth.length).toFixed(1) : 0,
          avgEnergy: filteredHealth.length > 0 ? (filteredHealth.reduce((sum, h) => sum + (h.energy || 0), 0) / filteredHealth.length).toFixed(1) : 0,
          avgAnxiety: filteredHealth.length > 0 ? (filteredHealth.reduce((sum, h) => sum + (h.anxiety_level || 0), 0) / filteredHealth.length).toFixed(1) : 0,
          avgSleep: filteredHealth.length > 0 ? (filteredHealth.reduce((sum, h) => sum + (h.sleep_hours || 0), 0) / filteredHealth.length).toFixed(1) : 0,
          weightChange: filteredHealth.length > 1 ? 
            ((filteredHealth[filteredHealth.length - 1].weight || 0) - (filteredHealth[0].weight || 0)).toFixed(1) : 0
        },
        
        // Current Medications
        medications: (medications.data || []).filter(m => m.status === 'active'),
        
        // Active Diagnoses
        diagnoses: (diagnoses.data || []).filter(d => d.is_active),
        
        // Seizure Activity
        seizureActivity: {
          totalSeizures: filteredSeizures.length,
          seizureTypes: filteredSeizures.reduce((acc: any, s) => {
            acc[s.seizure_type] = (acc[s.seizure_type] || 0) + 1;
            return acc;
          }, {}),
          commonTriggers: filteredSeizures.flatMap(s => s.triggers || []).reduce((acc: any, trigger) => {
            acc[trigger] = (acc[trigger] || 0) + 1;
            return acc;
          }, {}),
          avgDuration: filteredSeizures.length > 0 ? 
            (filteredSeizures.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / filteredSeizures.length) : 0
        },
        
        // Mental Health Summary
        mentalHealthSummary: {
          totalEntries: filteredMentalHealth.length,
          suicidalThoughtsCount: filteredMentalHealth.filter(m => m.suicidal_thoughts).length,
          crisisCount: filteredMentalHealth.filter(m => m.is_crisis).length,
          supportContactedCount: filteredMentalHealth.filter(m => m.support_contacted).length,
          commonCoping: filteredMentalHealth.flatMap(m => m.coping_mechanisms_used || []).reduce((acc: any, mechanism) => {
            acc[mechanism] = (acc[mechanism] || 0) + 1;
            return acc;
          }, {})
        },
        
        // Blood Pressure Summary
        bloodPressureSummary: {
          totalReadings: filteredBP.length,
          avgSystolic: filteredBP.length > 0 ? Math.round(filteredBP.reduce((sum, bp) => sum + bp.systolic, 0) / filteredBP.length) : 0,
          avgDiastolic: filteredBP.length > 0 ? Math.round(filteredBP.reduce((sum, bp) => sum + bp.diastolic, 0) / filteredBP.length) : 0,
          avgHeartRate: filteredBP.filter(bp => bp.heart_rate).length > 0 ? 
            Math.round(filteredBP.filter(bp => bp.heart_rate).reduce((sum, bp) => sum + (bp.heart_rate || 0), 0) / filteredBP.filter(bp => bp.heart_rate).length) : null
        },
        
        // Raw data for detailed analysis
        rawData: {
          healthEntries: filteredHealth,
          seizures: filteredSeizures,
          mentalHealth: filteredMentalHealth,
          bloodPressure: filteredBP
        }
      };

      setReportData(report);
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    if (!reportData) return;

    const reportContent = `
HEALTH REPORT FOR ${reportData.patient.name.toUpperCase()}
Generated: ${format(new Date(reportData.generatedAt), 'MMMM d, yyyy')}
Period: ${format(new Date(reportData.dateRange.start), 'MMM d')} - ${format(new Date(reportData.dateRange.end), 'MMM d, yyyy')}
${reportData.doctor.name ? `Doctor: ${reportData.doctor.name}` : ''}
${reportData.doctor.appointment_date ? `Appointment: ${format(new Date(reportData.doctor.appointment_date), 'MMM d, yyyy')}` : ''}

=== CURRENT MEDICATIONS ===
${reportData.medications.map((med: any) => 
  `• ${med.medication_name} ${med.dosage} - ${med.frequency}
    Effectiveness: ${med.effectiveness_rating || 'Not rated'}/10
    Prescribed by: ${med.prescribed_by || 'Unknown'}
    ${med.side_effects && med.side_effects.length > 0 ? `Side effects: ${med.side_effects.join(', ')}` : ''}`
).join('\n')}

=== ACTIVE DIAGNOSES ===
${reportData.diagnoses.map((diag: any) => 
  `• ${diag.diagnosis_name} (${diag.severity})
    ${diag.diagnosis_code ? `Code: ${diag.diagnosis_code}` : ''}
    ${diag.diagnosed_by ? `Diagnosed by: ${diag.diagnosed_by}` : ''}
    ${diag.diagnosed_date ? `Date: ${format(new Date(diag.diagnosed_date), 'MMM d, yyyy')}` : ''}`
).join('\n')}

=== HEALTH SUMMARY ===
• Total health entries: ${reportData.healthSummary.totalEntries}
• Average mood: ${reportData.healthSummary.avgMood}/10
• Average energy: ${reportData.healthSummary.avgEnergy}/10
• Average anxiety: ${reportData.healthSummary.avgAnxiety}/10
• Average sleep: ${reportData.healthSummary.avgSleep} hours
• Weight change: ${reportData.healthSummary.weightChange} lbs

=== SEIZURE ACTIVITY ===
• Total seizures: ${reportData.seizureActivity.totalSeizures}
• Average duration: ${Math.round(reportData.seizureActivity.avgDuration)} seconds
• Types: ${Object.entries(reportData.seizureActivity.seizureTypes).map(([type, count]) => `${type}: ${count}`).join(', ')}
• Common triggers: ${Object.entries(reportData.seizureActivity.commonTriggers).slice(0, 3).map(([trigger, count]) => `${trigger} (${count}x)`).join(', ')}

=== MENTAL HEALTH ===
• Total check-ins: ${reportData.mentalHealthSummary.totalEntries}
• Entries with suicidal thoughts: ${reportData.mentalHealthSummary.suicidalThoughtsCount}
• Crisis situations: ${reportData.mentalHealthSummary.crisisCount}
• Times support was contacted: ${reportData.mentalHealthSummary.supportContactedCount}
• Most effective coping strategies: ${Object.entries(reportData.mentalHealthSummary.commonCoping).slice(0, 3).map(([strategy, count]) => `${strategy} (${count}x)`).join(', ')}

=== BLOOD PRESSURE ===
• Total readings: ${reportData.bloodPressureSummary.totalReadings}
• Average: ${reportData.bloodPressureSummary.avgSystolic}/${reportData.bloodPressureSummary.avgDiastolic} mmHg
${reportData.bloodPressureSummary.avgHeartRate ? `• Average heart rate: ${reportData.bloodPressureSummary.avgHeartRate} bpm` : ''}

=== QUESTIONS FOR DOCTOR ===
${reportData.doctor.notes || '(Add your questions and concerns here)'}

=== NOTES ===
This report was generated automatically from health tracking data.
Please review with your healthcare provider and discuss any concerns.
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-report-${currentUser?.name.toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center space-x-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Medical Report Builder</h3>
            <p className="text-sm text-gray-600">
              Generate comprehensive reports for doctor visits for <strong>{currentUser?.name}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Report Configuration */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h4 className="font-semibold text-gray-900 mb-4">Report Configuration</h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Report Template</label>
            <select
              value={selectedTemplate?.id || ''}
              onChange={(e) => {
                const template = templates.find(t => t.id === e.target.value);
                setSelectedTemplate(template);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a template</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.template_name} ({template.report_type})
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Doctor Name (Optional)</label>
            <input
              type="text"
              value={doctorInfo.name}
              onChange={(e) => setDoctorInfo({...doctorInfo, name: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Dr. Smith"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Appointment Date (Optional)</label>
            <input
              type="date"
              value={doctorInfo.appointment_date}
              onChange={(e) => setDoctorInfo({...doctorInfo, appointment_date: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Questions/Notes for Doctor</label>
          <textarea
            value={doctorInfo.notes}
            onChange={(e) => setDoctorInfo({...doctorInfo, notes: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Questions you want to ask, concerns to discuss, symptoms to mention..."
          />
        </div>
        
        <div className="flex space-x-3 mt-6">
          <button
            onClick={generateReportData}
            disabled={loading || !selectedTemplate}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <FileText className="h-4 w-4" />
            <span>{loading ? 'Generating...' : 'Generate Report'}</span>
          </button>
          
          {reportData && (
            <button
              onClick={downloadReport}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Download className="h-4 w-4" />
              <span>Download Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Report Preview */}
      {reportData && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-4">Report Preview</h4>
          
          <div className="bg-gray-50 p-6 rounded-lg font-mono text-sm space-y-4 max-h-96 overflow-y-auto">
            <div className="text-center border-b border-gray-300 pb-4">
              <h2 className="text-lg font-bold">HEALTH REPORT FOR {reportData.patient.name.toUpperCase()}</h2>
              <p>Generated: {format(new Date(reportData.generatedAt), 'MMMM d, yyyy')}</p>
              <p>Period: {format(new Date(reportData.dateRange.start), 'MMM d')} - {format(new Date(reportData.dateRange.end), 'MMM d, yyyy')}</p>
              {reportData.doctor.name && <p>Doctor: {reportData.doctor.name}</p>}
            </div>
            
            <div>
              <h3 className="font-bold text-blue-800 mb-2">HEALTH SUMMARY</h3>
              <p>• Average mood: {reportData.healthSummary.avgMood}/10</p>
              <p>• Average energy: {reportData.healthSummary.avgEnergy}/10</p>
              <p>• Average anxiety: {reportData.healthSummary.avgAnxiety}/10</p>
              <p>• Average sleep: {reportData.healthSummary.avgSleep} hours</p>
              <p>• Weight change: {reportData.healthSummary.weightChange} lbs</p>
            </div>
            
            {reportData.medications.length > 0 && (
              <div>
                <h3 className="font-bold text-green-800 mb-2">CURRENT MEDICATIONS</h3>
                {reportData.medications.map((med: any, index: number) => (
                  <p key={index}>• {med.medication_name} {med.dosage} - {med.frequency}</p>
                ))}
              </div>
            )}
            
            {reportData.seizureActivity.totalSeizures > 0 && (
              <div>
                <h3 className="font-bold text-yellow-800 mb-2">SEIZURE ACTIVITY</h3>
                <p>• Total seizures: {reportData.seizureActivity.totalSeizures}</p>
                <p>• Average duration: {Math.round(reportData.seizureActivity.avgDuration)} seconds</p>
                {Object.keys(reportData.seizureActivity.commonTriggers).length > 0 && (
                  <p>• Common triggers: {Object.entries(reportData.seizureActivity.commonTriggers).slice(0, 3).map(([trigger, count]) => `${trigger} (${count}x)`).join(', ')}</p>
                )}
              </div>
            )}
            
            {reportData.mentalHealthSummary.totalEntries > 0 && (
              <div>
                <h3 className="font-bold text-pink-800 mb-2">MENTAL HEALTH</h3>
                <p>• Total check-ins: {reportData.mentalHealthSummary.totalEntries}</p>
                {reportData.mentalHealthSummary.suicidalThoughtsCount > 0 && (
                  <p className="text-red-600">• Entries with suicidal thoughts: {reportData.mentalHealthSummary.suicidalThoughtsCount}</p>
                )}
                <p>• Support contacted: {reportData.mentalHealthSummary.supportContactedCount} times</p>
              </div>
            )}
            
            {reportData.bloodPressureSummary.totalReadings > 0 && (
              <div>
                <h3 className="font-bold text-red-800 mb-2">BLOOD PRESSURE</h3>
                <p>• Average: {reportData.bloodPressureSummary.avgSystolic}/{reportData.bloodPressureSummary.avgDiastolic} mmHg</p>
                <p>• Total readings: {reportData.bloodPressureSummary.totalReadings}</p>
                {reportData.bloodPressureSummary.avgHeartRate && (
                  <p>• Average heart rate: {reportData.bloodPressureSummary.avgHeartRate} bpm</p>
                )}
              </div>
            )}
            
            {reportData.doctor.notes && (
              <div>
                <h3 className="font-bold text-purple-800 mb-2">QUESTIONS FOR DOCTOR</h3>
                <p>{reportData.doctor.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Available Templates */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Available Report Templates</h4>
          <button
            onClick={createNewTemplate}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Template</span>
          </button>
        </div>
        
        {templates.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Found</h3>
            <p className="text-gray-600 mb-4">Create your first report template to get started.</p>
            <button
              onClick={createNewTemplate}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Template
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map(template => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-900">{template.template_name}</h5>
                  <div className="flex items-center space-x-2">
                    {template.is_default && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">Default</span>
                    )}
                    <button
                      onClick={() => editTemplate(template)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Edit className="h-3 w-3" />
                    </button>
                    {!template.is_default && (
                      <button
                        onClick={() => deleteTemplate(template)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 capitalize mb-3">{template.report_type.replace('_', ' ')} visit</p>
                <button
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full py-2 px-4 rounded-lg transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {selectedTemplate?.id === template.id ? 'Selected' : 'Select Template'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};