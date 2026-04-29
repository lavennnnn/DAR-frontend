import React from 'react';
import { Bell, Cpu, GitBranch, ListChecks, RadioTower, Timer } from 'lucide-react';

interface SettingsProps {
  pushNotifications: boolean;
  setPushNotifications: (enabled: boolean) => void;
  t: any;
}

const Settings: React.FC<SettingsProps> = ({ pushNotifications, setPushNotifications, t }) => {
  const pipeline = [
    {
      icon: ListChecks,
      title: t.settings?.pipelineQueueTitle || 'Task scenario recognition',
      desc: t.settings?.pipelineQueueDesc || 'The system reads priority, deadline, resource demand, dependency and conflict rules to classify the task scene.'
    },
    {
      icon: RadioTower,
      title: t.settings?.pipelineAntennaTitle || 'Antenna-unit decision',
      desc: t.settings?.pipelineAntennaDesc || 'The system checks frequency conflict, reuse pressure, surface preference and cross-surface feasibility before selecting antenna units.'
    },
    {
      icon: Cpu,
      title: t.settings?.pipelineComputeTitle || 'CPU/GPU decision',
      desc: t.settings?.pipelineComputeDesc || 'The system plans CPU nodes and optional single-card GPU allocation according to load, locality and feasibility.'
    },
    {
      icon: Timer,
      title: t.settings?.pipelineFeedbackTitle || 'Feedback and slicing',
      desc: t.settings?.pipelineFeedbackDesc || 'Running tasks update remaining time and fair share, while wait and preemption reasons are written into the timeline.'
    }
  ];

  const sceneCards = [
    {
      title: t.settings?.sceneLowLatencyTitle || 'Low-latency tasks',
      desc: t.settings?.sceneLowLatencyDesc || 'When the deadline is tight, the scheduler prioritizes a fast feasible placement and reduces search overhead.'
    },
    {
      title: t.settings?.sceneHighPriorityTitle || 'High-priority small tasks',
      desc: t.settings?.sceneHighPriorityDesc || 'For important small tasks, the scheduler prefers lower reuse pressure and better unit quality.'
    },
    {
      title: t.settings?.sceneLargeArrayTitle || 'Large antenna-unit requests',
      desc: t.settings?.sceneLargeArrayDesc || 'For larger requests, the scheduler expands the search scope and balances feasibility with surface constraints.'
    },
    {
      title: t.settings?.sceneGpuTitle || 'GPU-assisted tasks',
      desc: t.settings?.sceneGpuDesc || 'When GPU memory is required, the scheduler limits each task to one GPU card and chooses a suitable card by load and waste.'
    },
    {
      title: t.settings?.sceneDependencyTitle || 'Dependency and exclusion tasks',
      desc: t.settings?.sceneDependencyDesc || 'Tasks wait safely when dependencies are unfinished or mutually exclusive tasks are running.'
    },
    {
      title: t.settings?.sceneConcurrentTitle || 'Concurrent multi-resource tasks',
      desc: t.settings?.sceneConcurrentDesc || 'The system combines fair-share ordering, load balancing and time slicing to keep multi-task scheduling explainable.'
    }
  ];

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold theme-text-main mb-2">{t.settings.title}</h2>
      <p className="text-sm theme-text-muted">{t.settings.autoApply ?? 'Changes apply immediately.'}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl md:col-span-2">
          <div className="flex items-center mb-4">
            <Bell className="text-amber-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold theme-text-main">{t.settings.notifications}</h3>
          </div>
          <p className="theme-text-muted text-sm mb-6">
            {t.settings.notificationsDesc}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          <div className="flex items-center mb-2">
            <GitBranch className="text-blue-400 mr-3" size={24} />
            <h3 className="text-lg font-semibold theme-text-main">
              {t.settings?.intelligenceTitle || 'Intelligent scheduling orchestration'}
            </h3>
          </div>
          <p className="theme-text-muted text-sm mb-5">
            {t.settings?.intelligenceDesc || 'Users describe task constraints. The backend automatically recognizes the scene, chooses the internal scheduling path and records the reason.'}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            {pipeline.map((step, index) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="theme-bg-main rounded-lg border theme-border p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-300">
                      <Icon size={16} />
                    </div>
                    <span className="text-xs theme-text-muted">{t.settings?.stepLabel || 'Step'} {index + 1}</span>
                  </div>
                  <div className="font-semibold theme-text-main mb-2">{step.title}</div>
                  <div className="text-xs theme-text-muted leading-relaxed">{step.desc}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl md:col-span-2">
          <h3 className="text-lg font-semibold theme-text-main mb-2">
            {t.settings?.sceneTitle || 'Automatic scene-based decisions'}
          </h3>
          <p className="text-sm theme-text-muted mb-5">
            {t.settings?.sceneDesc || 'The system does not ask users to pick algorithm names. Different scenes trigger different internal scheduling paths.'}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {sceneCards.map(item => (
              <div key={item.title} className="theme-bg-main border theme-border rounded-lg p-4">
                <div className="font-semibold theme-text-main mb-2">{item.title}</div>
                <p className="text-xs theme-text-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
