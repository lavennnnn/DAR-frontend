import React, { useState } from 'react';
import { Globe, Bell, Palette, Save, Check, Loader2 } from 'lucide-react';
import { Language, Theme } from '../types';

interface SettingsProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  t: any;
}

const Settings: React.FC<SettingsProps> = ({ language, setLanguage, theme, setTheme, t }) => {
  // Local state for other settings
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  
  // Loading and Success states for Save action
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    
    // Simulate API call / Persistence
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold theme-text-main mb-6">{t.settings.title}</h2>
      
      {/* Toast Notification */}
      {showSuccess && (
        <div className="absolute top-0 right-0 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg shadow-lg flex items-center animate-fade-in-down z-20">
          <Check size={18} className="mr-2" />
          <span className="font-medium">{t.settings.saveSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Language Settings */}
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
          <div className="flex items-center mb-4">
            <Globe className="text-blue-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold theme-text-main">{t.settings.language}</h3>
          </div>
          <p className="theme-text-muted text-sm mb-6">
            {t.settings.languageDesc}
          </p>
          
          <div className="flex space-x-4">
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-all ${
                language === 'en'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'theme-bg-main theme-border theme-text-muted hover:opacity-80'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLanguage('zh')}
              className={`flex-1 py-3 px-4 rounded-md border text-sm font-medium transition-all ${
                language === 'zh'
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20'
                  : 'theme-bg-main theme-border theme-text-muted hover:opacity-80'
              }`}
            >
              中文 (Chinese)
            </button>
          </div>
        </div>

        {/* Theme Settings */}
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
          <div className="flex items-center mb-4">
            <Palette className="text-purple-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold theme-text-main">{t.settings.theme}</h3>
          </div>
          <p className="theme-text-muted text-sm mb-6">
            {t.settings.themeDesc}
          </p>
          <div className="flex space-x-4">
            {/* Dark/Default Theme */}
            <div 
              onClick={() => setTheme('default')}
              className={`cursor-pointer group relative flex flex-col items-center p-2 rounded-lg transition-all ${theme === 'default' ? 'bg-slate-700/50 ring-2 ring-blue-500' : 'hover:bg-slate-700/30'}`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-900 border-2 border-slate-600 mb-2 shadow-inner"></div>
              <span className={`text-xs ${theme === 'default' ? 'text-blue-400 font-medium' : 'theme-text-muted'}`}>
                {t.settings.themes.default}
              </span>
            </div>

            {/* Light Theme */}
            <div 
              onClick={() => setTheme('light')}
              className={`cursor-pointer group relative flex flex-col items-center p-2 rounded-lg transition-all ${theme === 'light' ? 'bg-slate-700/50 ring-2 ring-blue-500' : 'hover:bg-slate-700/30'}`}
            >
              <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-slate-400 mb-2 shadow-inner"></div>
              <span className={`text-xs ${theme === 'light' ? 'text-blue-400 font-medium' : 'theme-text-muted'}`}>
                {t.settings.themes.light}
              </span>
            </div>

            {/* Ocean Theme */}
            <div 
              onClick={() => setTheme('ocean')}
              className={`cursor-pointer group relative flex flex-col items-center p-2 rounded-lg transition-all ${theme === 'ocean' ? 'bg-slate-700/50 ring-2 ring-blue-500' : 'hover:bg-slate-700/30'}`}
            >
              <div className="w-10 h-10 rounded-full bg-blue-900 border-2 border-blue-400 mb-2 shadow-inner"></div>
              <span className={`text-xs ${theme === 'ocean' ? 'text-blue-400 font-medium' : 'theme-text-muted'}`}>
                 {t.settings.themes.ocean}
              </span>
            </div>
          </div>
        </div>

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
            {/* Email Alerts Toggle */}
            <div className="flex items-center justify-between p-3 theme-bg-main rounded-lg border theme-border">
               <span className="theme-text-main font-medium">{t.settings.emailAlerts}</span>
               <button 
                 onClick={() => setEmailAlerts(!emailAlerts)}
                 className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-slate-800 ${emailAlerts ? 'bg-blue-600' : 'bg-slate-600'}`}
               >
                 <span 
                   className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 shadow ${emailAlerts ? 'translate-x-6' : 'translate-x-0'}`} 
                 />
               </button>
            </div>

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
      </div>

      <div className="flex justify-end mt-8 border-t theme-border pt-6">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center px-6 py-3 rounded-md font-semibold transition-all shadow-lg min-w-[140px] justify-center ${
             isSaving 
               ? 'theme-bg-main theme-text-muted cursor-not-allowed border theme-border' 
               : 'bg-emerald-600 hover:bg-emerald-500 text-white'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 size={18} className="mr-2 animate-spin" />
              {t.settings.saving}
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              {t.settings.save}
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Settings;
