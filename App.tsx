import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ArrayVisualizer from './components/ArrayVisualizer';
import AIImageEditor from './components/AIImageEditor';
import Settings from './components/Settings';
import { Task, ResourceNode, AntennaUnit, Language, Theme } from './types';
import { translations } from './utils/translations';
import { Play, Pause, Plus, Search, Filter } from 'lucide-react';

// Mock Data Generators
const generateResources = (): ResourceNode[] => {
  const types: ('CPU' | 'GPU' | 'FPGA')[] = ['CPU', 'GPU', 'FPGA'];
  return Array.from({ length: 12 }, (_, i) => ({
    id: `node-${i + 1}`,
    type: types[i % 3],
    load: Math.floor(Math.random() * 60) + 20,
    temperature: Math.floor(Math.random() * 30) + 40,
    status: Math.random() > 0.9 ? 'Maintenance' : 'Online'
  }));
};

const generateAntennas = (): AntennaUnit[] => {
  return Array.from({ length: 256 }, (_, i) => ({
    id: i,
    x: i % 16,
    y: Math.floor(i / 16),
    status: Math.random() > 0.95 ? 'Fault' : (Math.random() > 0.8 ? 'Idle' : 'Active'),
    signalStrength: Math.floor(Math.random() * 100)
  }));
};

const generateTasks = (): Task[] => [
  { id: 'T-101', name: 'Beamforming Calc - Sector A', priority: 'High', status: 'Running', resourceType: 'FPGA', duration: 120, submittedAt: '10:00:00' },
  { id: 'T-102', name: 'Signal Analysis - Trace 4', priority: 'Medium', status: 'Pending', resourceType: 'GPU', duration: 300, submittedAt: '10:05:00' },
  { id: 'T-103', name: 'System Diagnostics', priority: 'Low', status: 'Completed', resourceType: 'CPU', duration: 45, submittedAt: '09:55:00' },
  { id: 'T-104', name: 'Waveform Synthesis', priority: 'High', status: 'Running', resourceType: 'FPGA', duration: 600, submittedAt: '10:02:00' },
  { id: 'T-105', name: 'Interference Nulling', priority: 'High', status: 'Pending', resourceType: 'GPU', duration: 180, submittedAt: '10:10:00' },
];

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('default');
  const [resources, setResources] = useState<ResourceNode[]>(generateResources());
  const [antennas, setAntennas] = useState<AntennaUnit[]>(generateAntennas());
  const [tasks, setTasks] = useState<Task[]>(generateTasks());

  const t = translations[language];

  // Simulate live data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setResources(prev => prev.map(r => ({
        ...r,
        load: Math.min(100, Math.max(0, r.load + (Math.random() * 10 - 5))),
        temperature: Math.min(90, Math.max(30, r.temperature + (Math.random() * 4 - 2)))
      })));
      
      setAntennas(prev => prev.map(a => ({
        ...a,
        signalStrength: Math.min(100, Math.max(0, a.signalStrength + (Math.random() * 20 - 10)))
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Dynamic Theme Styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return `
          :root {
            --bg-main: #f1f5f9;
            --bg-panel: #ffffff;
            --border: #e2e8f0;
            --text-main: #0f172a;
            --text-muted: #64748b;
          }
        `;
      case 'ocean':
        return `
          :root {
            --bg-main: #020617;
            --bg-panel: #172554;
            --border: #1e40af;
            --text-main: #f0f9ff;
            --text-muted: #93c5fd;
          }
        `;
      default: // Dark
        return `
          :root {
            --bg-main: #0f172a;
            --bg-panel: #1e293b;
            --border: #334155;
            --text-main: #ffffff;
            --text-muted: #94a3b8;
          }
        `;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard tasks={tasks} resources={resources} t={t} />;
      case 'resources':
        return (
          <div className="space-y-6 h-full flex flex-col">
            <div className="flex justify-between items-center theme-bg-panel p-4 rounded-lg border theme-border">
               <div>
                 <h2 className="text-xl font-bold theme-text-main">{t.resources.title}</h2>
                 <p className="theme-text-muted text-sm">{t.resources.subtitle}</p>
               </div>
               <div className="flex space-x-2 text-sm theme-text-main">
                 <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded mr-2"></div>{t.resources.fault}</div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-slate-700 rounded mr-2"></div>{t.resources.idle}</div>
                 <div className="flex items-center"><div className="w-3 h-3 bg-orange-400 rounded mr-2"></div>{t.resources.active}</div>
               </div>
            </div>
            <div className="flex-1 theme-bg-panel rounded-lg border theme-border p-4 shadow-xl overflow-hidden">
               <ArrayVisualizer data={antennas} labels={t.resources.visualizer} />
            </div>
          </div>
        );
      case 'tasks':
        return (
          <div className="space-y-6">
             <div className="flex justify-between items-center mb-6">
               <h2 className="text-2xl font-bold theme-text-main">{t.tasks.title}</h2>
               <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center font-medium transition-colors">
                 <Plus size={18} className="mr-2" />
                 {t.tasks.newJob}
               </button>
             </div>

             {/* Filters */}
             <div className="flex gap-4 mb-6 theme-bg-panel p-4 rounded-lg border theme-border">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 theme-text-muted" size={18} />
                  <input 
                    type="text" 
                    placeholder={t.tasks.search}
                    className="w-full theme-bg-main theme-border border theme-text-main pl-10 pr-4 py-2 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button className="flex items-center px-4 py-2 theme-bg-main theme-text-muted rounded hover:opacity-80 transition-colors border theme-border">
                  <Filter size={18} className="mr-2" />
                  {t.tasks.filter}
                </button>
             </div>

             {/* Task List */}
             <div className="theme-bg-panel rounded-lg border theme-border overflow-hidden shadow-xl">
               <table className="w-full text-left">
                 <thead className="bg-slate-700/50">
                   <tr>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.id}</th>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.jobName}</th>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.priority}</th>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.resource}</th>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.status}</th>
                     <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.actions}</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y theme-border">
                   {tasks.map(task => (
                     <tr key={task.id} className="hover:bg-slate-700/30 transition-colors">
                       <td className="p-4 font-mono theme-text-muted">{task.id}</td>
                       <td className="p-4 font-medium theme-text-main">{task.name}</td>
                       <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs font-semibold ${
                           task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 
                           task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                           'bg-blue-500/20 text-blue-400'
                         }`}>
                           {task.priority}
                         </span>
                       </td>
                       <td className="p-4 theme-text-muted">{task.resourceType}</td>
                       <td className="p-4">
                         <span className={`flex items-center ${
                            task.status === 'Running' ? 'text-blue-400' :
                            task.status === 'Completed' ? 'text-emerald-400' :
                            task.status === 'Pending' ? 'text-amber-400' :
                            'text-slate-400'
                         }`}>
                           {task.status === 'Running' && <span className="animate-pulse w-2 h-2 bg-blue-400 rounded-full mr-2"></span>}
                           {task.status}
                         </span>
                       </td>
                       <td className="p-4">
                         <div className="flex space-x-2">
                           <button className="p-1 hover:text-white theme-text-muted"><Play size={16} /></button>
                           <button className="p-1 hover:text-white theme-text-muted"><Pause size={16} /></button>
                         </div>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>
        );
      case 'ai-lab':
        return <AIImageEditor t={t} />;
      case 'settings':
        return <Settings language={language} setLanguage={setLanguage} t={t} theme={theme} setTheme={setTheme} />;
      default:
        return <div className="p-10 text-center theme-text-muted">Feature under construction</div>;
    }
  };

  return (
    <>
      <style>
        {`
          ${getThemeStyles()}
          
          .theme-bg-main { background-color: var(--bg-main); transition: background-color 0.3s; }
          .theme-bg-panel { background-color: var(--bg-panel); transition: background-color 0.3s; }
          .theme-border { border-color: var(--border); transition: border-color 0.3s; }
          .theme-text-main { color: var(--text-main); transition: color 0.3s; }
          .theme-text-muted { color: var(--text-muted); transition: color 0.3s; }
          
          body { background-color: var(--bg-main); color: var(--text-main); }
        `}
      </style>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} t={t}>
        {renderContent()}
      </Layout>
    </>
  );
}

export default App;
