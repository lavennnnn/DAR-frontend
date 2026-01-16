import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ArrayVisualizer from './components/ArrayVisualizer';
import AIImageEditor from './components/AIImageEditor';
import Settings from './components/Settings';
import TaskFormModal from './components/TaskFormModal';
import LoginPage from './components/LoginPage';
import { Task, ResourceNode, AntennaUnit, Language, Theme, TaskStatus, AntennaStatus } from './types';
import { translations } from './utils/translations';
import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './context/AuthContext';
import { Plus, Search, Filter, Check, Loader2 } from 'lucide-react';
import { Play, Pause } from 'lucide-react';

// Helper to format date strings
const formatTime = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleTimeString();
  } catch (e) {
    return isoString;
  }
};

function App() {
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>('en');
  const [theme, setTheme] = useState<Theme>('default');

  // State initialized as empty, waiting for API data
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [antennas, setAntennas] = useState<AntennaUnit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  // Modal and Toast State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [showTaskSuccessToast, setShowTaskSuccessToast] = useState(false);

  const t = translations[language];

  // WebSocket Connection
  // Only connect if authenticated to avoid errors or unauthorized socket attempts
  const { lastMessage, connectionStatus } = useWebSocket(isAuthenticated ? 'ws://localhost:8080/ws/monitor' : '');

  // Fetch initial data from backend
  const loadData = async () => {
    // Fetch Antennas (User Request)
    const antennaData = await api.fetchAntennas();
    setAntennas(antennaData);

    // Fetch Tasks (To support Task Tab)
    const taskData = await api.fetchTasks();
    setTasks(taskData);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  // Handle Real-time WebSocket Messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Received WebSocket Message:', lastMessage);

    if (lastMessage.type === 'TASK_START') {
      const { taskId, antennas: antennaIds } = lastMessage;

      // Update Task Status to Running
      setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: TaskStatus.Running } : t
      ));

      // Update Antenna Status to Active and set taskId
      if (Array.isArray(antennaIds)) {
        setAntennas(prev => prev.map(a =>
            antennaIds.includes(a.id)
                ? { ...a, status: AntennaStatus.Active, taskId: taskId }
                : a
        ));
      }
    } else if (lastMessage.type === 'TASK_END') {
      const { taskId } = lastMessage;

      // Update Task Status to Completed
      setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: TaskStatus.Completed } : t
      ));

      // Reset Antennas associated with this task to Idle
      setAntennas(prev => prev.map(a =>
          a.taskId === taskId
              ? { ...a, status: AntennaStatus.Idle, taskId: null }
              : a
      ));
    }
  }, [lastMessage]);

  const handleTaskSubmitSuccess = () => {
    setIsTaskModalOpen(false);
    setShowTaskSuccessToast(true);
    // Reload tasks to show the new one immediately
    loadData();

    // Hide toast after 3 seconds
    setTimeout(() => {
      setShowTaskSuccessToast(false);
    }, 3000);
  };

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
        return (
            <div className="flex flex-col h-full">
              {connectionStatus !== 'Open' && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
                    Real-time connection status: {connectionStatus}
                  </div>
              )}
              <Dashboard tasks={tasks} resources={resources} t={t} />
            </div>
        );
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
                <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md flex items-center font-medium transition-colors"
                >
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
                             task.priority >= 8 ? 'bg-red-500/20 text-red-400' :
                                 task.priority >= 4 ? 'bg-yellow-500/20 text-yellow-400' :
                                     'bg-blue-500/20 text-blue-400'
                         }`}>
                           Lv.{task.priority}
                         </span>
                        </td>
                        <td className="p-4 theme-text-muted">{task.resourceType || 'Antenna Array'}</td>
                        <td className="p-4">
                         <span className={`flex items-center ${
                             task.status === TaskStatus.Running ? 'text-blue-400' :
                                 task.status === TaskStatus.Completed ? 'text-emerald-400' :
                                     task.status === TaskStatus.Pending ? 'text-amber-400' :
                                         'text-slate-400'
                         }`}>
                           {task.status === TaskStatus.Running && <span className="animate-pulse w-2 h-2 bg-blue-400 rounded-full mr-2"></span>}
                           {TaskStatus[task.status]}
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

  if (isLoading) {
    return (
        <div className="flex items-center justify-center h-screen bg-[#0f172a] text-white">
          <style>
            {`
             body { background-color: #0f172a; margin: 0; }
           `}
          </style>
          <div className="flex flex-col items-center">
            <Loader2 className="animate-spin w-10 h-10 text-blue-500 mb-4" />
            <p className="text-slate-400 text-sm">Initializing System...</p>
          </div>
        </div>
    );
  }

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

        {!isAuthenticated ? (
            <LoginPage
                language={language}
                setLanguage={setLanguage}
                theme={theme}
                setTheme={setTheme}
                t={t}
            />
        ) : (
            <>
              <Layout
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  t={t}
                  language={language}
                  setLanguage={setLanguage}
                  theme={theme}
                  setTheme={setTheme}
              >
                {renderContent()}
              </Layout>

              {/* Task Form Modal */}
              <TaskFormModal
                  isOpen={isTaskModalOpen}
                  onClose={() => setIsTaskModalOpen(false)}
                  onSuccess={handleTaskSubmitSuccess}
                  t={t}
              />

              {/* Success Toast */}
              {showTaskSuccessToast && (
                  <div className="fixed top-6 right-6 bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg shadow-lg flex items-center animate-bounce-in z-50">
                    <Check size={18} className="mr-2" />
                    <span className="font-medium">Job submitted successfully!</span>
                  </div>
              )}
            </>
        )}
      </>
  );
}

export default App;