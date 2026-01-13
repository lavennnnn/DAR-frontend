import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { Activity, Cpu, Server, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { Task, ResourceNode } from '../types';

interface DashboardProps {
  tasks: Task[];
  resources: ResourceNode[];
  t: any;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, resources, t }) => {
  const activeTasks = tasks.filter(t => t.status === 'Running').length;
  const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
  const avgLoad = Math.round(resources.reduce((acc, curr) => acc + curr.load, 0) / resources.length);
  
  // Data for charts
  const resourceData = resources.map(r => ({
    name: `${r.type}-${r.id}`,
    load: r.load,
    temp: r.temperature
  }));

  const taskStatusData = [
    { name: 'Pending', count: tasks.filter(t => t.status === 'Pending').length },
    { name: 'Running', count: tasks.filter(t => t.status === 'Running').length },
    { name: 'Completed', count: tasks.filter(t => t.status === 'Completed').length },
    { name: 'Failed', count: tasks.filter(t => t.status === 'Failed').length },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="theme-bg-panel p-4 rounded-lg border theme-border flex items-center shadow-lg">
          <div className="p-3 rounded-full bg-blue-500/10 text-blue-400 mr-4">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-sm theme-text-muted">{t.dashboard.systemStatus}</p>
            <p className="text-xl font-bold theme-text-main">{t.dashboard.operational}</p>
          </div>
        </div>

        <div className="theme-bg-panel p-4 rounded-lg border theme-border flex items-center shadow-lg">
          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mr-4">
            <Zap size={24} />
          </div>
          <div>
            <p className="text-sm theme-text-muted">{t.dashboard.avgLoad}</p>
            <p className="text-xl font-bold theme-text-main">{avgLoad}%</p>
          </div>
        </div>

        <div className="theme-bg-panel p-4 rounded-lg border theme-border flex items-center shadow-lg">
          <div className="p-3 rounded-full bg-amber-500/10 text-amber-400 mr-4">
            <Server size={24} />
          </div>
          <div>
            <p className="text-sm theme-text-muted">{t.dashboard.activeTasks}</p>
            <p className="text-xl font-bold theme-text-main">{activeTasks}</p>
          </div>
        </div>

        <div className="theme-bg-panel p-4 rounded-lg border theme-border flex items-center shadow-lg">
          <div className="p-3 rounded-full bg-purple-500/10 text-purple-400 mr-4">
            <Cpu size={24} />
          </div>
          <div>
            <p className="text-sm theme-text-muted">{t.dashboard.totalResources}</p>
            <p className="text-xl font-bold theme-text-main">{resources.length}</p>
          </div>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Resource Load Chart */}
        <div className="lg:col-span-2 theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
          <h3 className="text-lg font-semibold theme-text-main mb-4 flex items-center">
            <Activity className="mr-2 h-5 w-5 text-blue-400" />
            {t.dashboard.resourceLoad}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-main)' }} 
                  itemStyle={{ color: 'var(--text-main)' }}
                />
                <Legend />
                <Bar dataKey="load" name={t.dashboard.loadLabel} fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="temp" name={t.dashboard.tempLabel} fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Task Status Chart */}
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
          <h3 className="text-lg font-semibold theme-text-main mb-4 flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-emerald-400" />
            {t.dashboard.taskDist}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskStatusData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" width={80} />
                <Tooltip 
                   contentStyle={{ backgroundColor: 'var(--bg-panel)', borderColor: 'var(--border)', color: 'var(--text-main)' }} 
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Alert Section */}
      <div className="theme-bg-panel rounded-lg border theme-border shadow-xl overflow-hidden">
        <div className="p-4 bg-slate-700/50 border-b theme-border flex justify-between items-center">
          <h3 className="text-lg font-semibold theme-text-main flex items-center">
             <AlertTriangle className="mr-2 h-5 w-5 text-amber-500" />
             {t.dashboard.systemAlerts}
          </h3>
          <span className="text-xs font-mono theme-text-muted">{t.dashboard.lastUpdated}</span>
        </div>
        <div className="p-4 space-y-3">
          {avgLoad > 80 && (
             <div className="flex items-center p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400">
               <AlertTriangle size={18} className="mr-3" />
               <span>{t.dashboard.alerts.highLoad}</span>
             </div>
          )}
          <div className="flex items-center p-3 bg-amber-500/10 border border-amber-500/20 rounded text-amber-400">
            <AlertTriangle size={18} className="mr-3" />
            <span>{t.dashboard.alerts.temp}</span>
          </div>
          <div className="flex items-center p-3 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400">
            <Activity size={18} className="mr-3" />
            <span>{t.dashboard.alerts.maintenance}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
