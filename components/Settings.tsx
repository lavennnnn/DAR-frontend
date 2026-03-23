import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { api } from '../services/api';

interface SettingsProps {
  pushNotifications: boolean;
  setPushNotifications: (enabled: boolean) => void;
  t: any;
}

const Settings: React.FC<SettingsProps> = ({ pushNotifications, setPushNotifications, t }) => {
  const [strategy, setStrategy] = useState('DRF');
  const [supportedStrategies, setSupportedStrategies] = useState<string[]>(['DRF', 'PRIORITY', 'FCFS']);
  const [strategyStatus, setStrategyStatus] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      const config = await api.fetchSchedulerConfig();
      if (config?.strategy) {
        setStrategy(config.strategy);
      }
      if (config?.supported && config.supported.length > 0) {
        setSupportedStrategies(config.supported);
      }
    };
    loadConfig();
  }, []);

  const formatStrategyLabel = (code: string) => {
    if (code === 'DRF') return t.settings?.strategyDRF || 'DRF (Dominant Resource Fairness)';
    if (code === 'PRIORITY') return t.settings?.strategyPriority || 'Priority First';
    if (code === 'FCFS') return t.settings?.strategyFcfs || 'First Come First Serve';
    return code;
  };

  const handleStrategyChange = async (value: string) => {
    setStrategy(value);
    setStrategyStatus(t.settings?.strategySaving || 'Saving...');
    const updated = await api.updateSchedulerConfig(value);
    if (updated?.strategy) {
      setStrategy(updated.strategy);
      setStrategyStatus(t.settings?.strategySaved || 'Saved.');
    } else {
      setStrategyStatus(t.settings?.strategyFailed || 'Save failed.');
    }
    setTimeout(() => setStrategyStatus(null), 2000);
  };

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold theme-text-main mb-2">{t.settings.title}</h2>
      <p className="text-sm theme-text-muted">{t.settings.autoApply ?? 'Changes apply immediately.'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Notification Settings */}
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl md:col-span-2">
          <div className="flex items-center mb-4">
            <Bell className="text-amber-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold theme-text-main">{t.settings.notifications}</h3>
          </div>
          <p className="theme-text-muted text-sm mb-6">
            {t.settings.notificationsDesc}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Push Notifications Toggle */}
            <div className="flex items-center justify-between p-3 theme-bg-main rounded-lg border theme-border">
               <span className="theme-text-main font-medium">{t.settings.pushNotifications}</span>
               <button 
                 onClick={() => setPushNotifications(!pushNotifications)}
                 className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 ${pushNotifications ? 'bg-blue-600' : 'bg-slate-600'}`}
               >
                 <span 
                   className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow ${pushNotifications ? 'translate-x-6' : 'translate-x-0'}`} 
                 />
               </button>
            </div>
          </div>
        </div>

        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl md:col-span-2">
          <div className="flex items-center mb-4">
            <h3 className="text-lg font-semibold theme-text-main">{t.settings.strategyTitle || 'Scheduling Strategy'}</h3>
          </div>
          <p className="theme-text-muted text-sm mb-6">
            {t.settings.strategyDesc || 'Select the algorithm used for pending task scheduling.'}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <div className="min-w-[220px]">
              <label className="block text-sm theme-text-muted mb-2">
                {t.settings.strategyLabel || 'Strategy'}
              </label>
              <select
                value={strategy}
                onChange={(e) => handleStrategyChange(e.target.value)}
                className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {supportedStrategies.map(code => (
                  <option key={code} value={code}>
                    {formatStrategyLabel(code)}
                  </option>
                ))}
              </select>
            </div>
            {strategyStatus && (
              <div className="text-xs theme-text-muted mt-6">{strategyStatus}</div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Settings;
