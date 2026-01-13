import React, { useState } from 'react';
import { X, Save, Loader2, Cpu } from 'lucide-react';
import { api } from '../services/api';
import { Task } from '../types';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: any; // Translations
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({ isOpen, onClose, onSuccess, t }) => {
  const [formData, setFormData] = useState({
    name: '',
    priority: 50,
    neededAntennas: 16,
    duration: 60,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate inputs
    if (!formData.name.trim()) {
      setError('Task name is required');
      setIsSubmitting(false);
      return;
    }

    const newTask: Partial<Task> = {
      name: formData.name,
      priority: Number(formData.priority),
      neededAntennas: Number(formData.neededAntennas),
      duration: Number(formData.duration),
      status: 0, // Pending
      createTime: new Date().toISOString(), // Client-side timestamp fallback
      resourceType: 'FPGA' // Default resource type
    };

    try {
      const success = await api.submitTask(newTask);
      if (success) {
        onSuccess();
        // Reset form
        setFormData({
            name: '',
            priority: 50,
            neededAntennas: 16,
            duration: 60,
        });
      } else {
        setError('Failed to submit task. Please check connection.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
      <div className="theme-bg-panel w-full max-w-md rounded-lg border theme-border shadow-2xl overflow-hidden transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b theme-border bg-slate-700/20">
          <h3 className="text-lg font-bold theme-text-main flex items-center">
            <Cpu className="mr-2 text-blue-400" size={20} />
            {t.tasks.newJob}
          </h3>
          <button 
            onClick={onClose}
            className="theme-text-muted hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">
              Job Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="e.g. Beamforming Calibration"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Priority */}
            <div>
              <label className="block text-sm font-medium theme-text-muted mb-1">
                Priority (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: parseInt(e.target.value) || 0})}
                className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium theme-text-muted mb-1">
                Duration (Sec)
              </label>
              <input
                type="number"
                min="1"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Needed Antennas */}
          <div>
            <label className="block text-sm font-medium theme-text-muted mb-1">
              Required Antennas
            </label>
            <input
              type="number"
              min="1"
              max="256"
              step="1"
              value={formData.neededAntennas}
              onChange={(e) => setFormData({...formData, neededAntennas: parseInt(e.target.value) || 0})}
              className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <p className="text-xs theme-text-muted mt-1">Available range: 1 - 256</p>
          </div>

          <div className="pt-4 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md theme-bg-main theme-border border theme-text-muted hover:text-white hover:border-slate-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Submit Job
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskFormModal;
