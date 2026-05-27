import React, { useState } from 'react';
import { RotateCcw, Database, AlertTriangle, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import { Task } from '../types';

interface SettingsProps {
  pushNotifications: boolean;
  setPushNotifications: (enabled: boolean) => void;
  onDataChange?: () => void;
  onNavigate?: (tab: string) => void;
  t: any;
}

// ===== 预设演示方案 =====

const PRESET_ALL_SCENARIOS: Partial<Task>[] = [
  {
    name: '低时延探测任务',
    priority: 60,
    neededAntennas: 4,
    neededCpuCores: 4,
    deadlineMs: 50,
    duration: 120,
  },
  {
    name: '高优先级精确任务',
    priority: 90,
    neededAntennas: 6,
    neededCpuCores: 8,
    duration: 120,
  },
  {
    name: 'GPU信号处理任务',
    priority: 50,
    neededAntennas: 10,
    neededCpuCores: 8,
    neededGpuMem: 16,
    duration: 180,
  },
  {
    name: 'GPU图像识别任务',
    priority: 50,
    neededAntennas: 4,
    neededCpuCores: 4,
    neededGpuMem: 20,
    duration: 180,
  },
  {
    name: '单阵面定向扫描',
    priority: 50,
    neededAntennas: 10,
    neededCpuCores: 8,
    preferredSurface: 'SURFACE-A',
    allowCrossSurface: false,
    duration: 180,
  },
  {
    name: 'CPU密集计算任务',
    priority: 50,
    neededAntennas: 8,
    neededCpuCores: 40,
    duration: 300,
  },
  {
    name: '大规模阵列扫描',
    priority: 50,
    neededAntennas: 28,
    neededCpuCores: 8,
    duration: 300,
  },
  {
    name: '依赖链末端任务',
    priority: 50,
    neededAntennas: 4,
    neededCpuCores: 4,
    dependsOnTaskIds: '#1',
    duration: 120,
  },
  {
    name: '均衡多资源任务',
    priority: 40,
    neededAntennas: 12,
    neededCpuCores: 16,
    duration: 180,
  },
];

const PRESET_GPU_COMPETITION: Partial<Task>[] = [
  { name: 'GPU推理任务-A', priority: 60, neededAntennas: 4, neededCpuCores: 4, neededGpuMem: 20, duration: 180 },
  { name: 'GPU推理任务-B', priority: 60, neededAntennas: 4, neededCpuCores: 4, neededGpuMem: 16, duration: 180 },
  { name: 'GPU训练任务-C', priority: 50, neededAntennas: 6, neededCpuCores: 8, neededGpuMem: 30, duration: 300 },
];

const PRESET_CPU_BALANCE: Partial<Task>[] = [
  { name: '计算节点压测-A', priority: 50, neededAntennas: 4, neededCpuCores: 32, duration: 180 },
  { name: '计算节点压测-B', priority: 50, neededAntennas: 4, neededCpuCores: 32, duration: 180 },
  { name: '计算节点压测-C', priority: 50, neededAntennas: 4, neededCpuCores: 48, duration: 300 },
  { name: '计算节点压测-D', priority: 50, neededAntennas: 4, neededCpuCores: 64, duration: 300 },
];

interface PresetScheme {
  id: string;
  name: string;
  desc: string;
  tasks: Partial<Task>[];
  scenarioTags: string[];
  algorithmTags: string[];
}

const PRESETS: PresetScheme[] = [
  {
    id: 'all',
    name: '全场景 + 全算法演示',
    desc: '9 个任务覆盖 6 种场景 × 5 种天线算法（BFS/Dijkstra/Greedy/Heap/DP）',
    tasks: PRESET_ALL_SCENARIOS,
    scenarioTags: ['LOW_LATENCY', 'HIGH_PRIORITY', 'GPU', 'CPU_INTENSIVE', 'LARGE_ARRAY', 'DEPENDENCY', 'BALANCED'],
    algorithmTags: ['BFS', 'DP', 'Greedy', 'Dijkstra', 'Heap'],
  },
  {
    id: 'gpu',
    name: 'GPU 竞争演示',
    desc: '3 个 GPU 任务争 2 张卡（A100 40GB + RTX4090 24GB），第 3 个任务将等待',
    tasks: PRESET_GPU_COMPETITION,
    scenarioTags: ['GPU_ACCELERATED'],
    algorithmTags: ['BFS', 'Greedy'],
  },
  {
    id: 'cpu',
    name: 'CPU 负载均衡演示',
    desc: '4 个 CPU 密集任务，展示 BALANCE 模式将负载分散到 5 个节点',
    tasks: PRESET_CPU_BALANCE,
    scenarioTags: ['CPU_INTENSIVE'],
    algorithmTags: ['Greedy'],
  },
];

const EDITABLE_FIELDS = [
  { key: 'name', label: '名称', type: 'text' },
  { key: 'priority', label: '优先级', type: 'number' },
  { key: 'neededAntennas', label: '阵元数', type: 'number' },
  { key: 'neededCpuCores', label: 'CPU核数', type: 'number' },
  { key: 'neededGpuMem', label: 'GPU(GB)', type: 'number' },
  { key: 'deadlineMs', label: '截止(ms)', type: 'number' },
  { key: 'duration', label: '时长(s)', type: 'number' },
] as const;

const Settings: React.FC<SettingsProps> = ({ t, onDataChange, onNavigate }) => {
  const [resetting, setResetting] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'reset' | 'init' | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedPreset, setExpandedPreset] = useState<string | null>(null);
  const [editableTasks, setEditableTasks] = useState<Record<string, Partial<Task>[]>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const getHeaders = () => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    let token = localStorage.getItem('token');
    if (!token) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.token) token = parsed.token;
        }
      } catch { /* ignore */ }
    }
    if (token) headers['Authorization'] = token;
    return headers;
  };

  const getEditableTasks = (preset: PresetScheme): Partial<Task>[] => {
    if (editableTasks[preset.id]) return editableTasks[preset.id];
    return preset.tasks.map(t => ({ ...t }));
  };

  const updateTask = (presetId: string, index: number, field: string, value: string) => {
    const current = getEditableTasks(PRESETS.find(p => p.id === presetId)!);
    const updated = [...current];
    if (field === 'name') {
      updated[index] = { ...updated[index], [field]: value };
    } else {
      const numVal = value === '' ? undefined : Number(value);
      updated[index] = { ...updated[index], [field]: numVal };
    }
    setEditableTasks(prev => ({ ...prev, [presetId]: updated }));
  };

  const handleSubmitPreset = async (preset: PresetScheme) => {
    setSubmitting(preset.id);
    setMessage(null);
    const tasks = getEditableTasks(preset);

    // 分离普通任务和依赖任务
    const normalTasks = tasks.filter(t => !t.dependsOnTaskIds?.startsWith('#'));
    const depTasks = tasks.filter(t => t.dependsOnTaskIds?.startsWith('#'));

    // 先提交普通任务
    const result = await api.batchSubmitTasks(normalTasks);

    // 提交依赖任务：查询任务列表获取实际 ID
    if (depTasks.length > 0) {
      const allTasks = await api.fetchTasks();
      // 找到本批次第一个任务的实际 ID（按名称匹配）
      const firstTaskName = normalTasks[0]?.name;
      const matchedTask = allTasks
        .filter(t => t.name === firstTaskName && t.status === 0)
        .sort((a, b) => b.id - a.id)[0]; // 取最新创建的

      const depTasksCleaned = depTasks.map(t => ({
        ...t,
        dependsOnTaskIds: matchedTask ? String(matchedTask.id) : '99999',
      }));
      const depResult = await api.batchSubmitTasks(depTasksCleaned);
      result.success += depResult.success;
      result.failed += depResult.failed;
    }

    if (result.success > 0) {
      setMessage({ type: 'success', text: `已提交 ${result.success} 个任务${result.failed > 0 ? `，${result.failed} 个失败` : ''}，正在跳转...` });
      if (onDataChange) onDataChange();
      setTimeout(() => { if (onNavigate) onNavigate('tasks'); }, 800);
    } else {
      setMessage({ type: 'error', text: '任务提交失败' });
    }
    setSubmitting(null);
  };

  const handleReset = async () => {
    setResetting(true);
    setMessage(null);
    try {
      const resp = await fetch('/api/resource/reset', { method: 'POST', headers: getHeaders() });
      if (resp.ok) {
        setMessage({ type: 'success', text: '资源状态已重置，正在跳转...' });
        if (onDataChange) onDataChange();
        setTimeout(() => { if (onNavigate) onNavigate('resources'); }, 600);
      } else {
        setMessage({ type: 'error', text: '重置失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '重置失败' });
    }
    setResetting(false);
    setConfirmAction(null);
  };

  const handleInit = async () => {
    setInitializing(true);
    setMessage(null);
    try {
      const resp = await fetch('/api/resource/init', { method: 'POST', headers: getHeaders() });
      if (resp.ok) {
        setMessage({ type: 'success', text: '测试数据已初始化，正在跳转...' });
        if (onDataChange) onDataChange();
        setTimeout(() => { if (onNavigate) onNavigate('resources'); }, 600);
      } else {
        setMessage({ type: 'error', text: '初始化失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '初始化失败' });
    }
    setInitializing(false);
    setConfirmAction(null);
  };

  const toggleExpand = (presetId: string) => {
    setExpandedPreset(prev => prev === presetId ? null : presetId);
  };

  return (
    <div className="space-y-6 relative">
      <h2 className="text-2xl font-bold theme-text-main mb-2">{t.settings?.title || '设置'}</h2>

      {message && (
        <div className={`p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-400' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
          {message.text}
        </div>
      )}

      {/* 演示任务区块 */}
      <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
        <div className="flex items-center mb-4">
          <Play className="text-blue-400 mr-3" size={24} />
          <h3 className="text-lg font-semibold theme-text-main">演示任务</h3>
        </div>
        <p className="theme-text-muted text-sm mb-5">
          一键批量创建预设任务，用于展示不同调度场景和算法。提交后自动跳转到任务页面观察调度效果。
        </p>

        <div className="space-y-3">
          {PRESETS.map(preset => (
            <div key={preset.id} className="theme-bg-main rounded-lg border theme-border overflow-hidden">
              {/* 方案头部 */}
              <div className="flex items-center justify-between p-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="theme-text-main font-medium">{preset.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded">
                      {preset.tasks.length} 任务
                    </span>
                  </div>
                  <p className="text-xs theme-text-muted">{preset.desc}</p>
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {preset.algorithmTags.map(tag => (
                      <span key={tag} className="text-xs px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => toggleExpand(preset.id)}
                    className="p-2 theme-text-muted hover:text-white transition-colors"
                    title="查看/编辑任务"
                  >
                    {expandedPreset === preset.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <button
                    onClick={() => handleSubmitPreset(preset)}
                    disabled={submitting !== null}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50"
                  >
                    {submitting === preset.id ? '提交中...' : '一键提交'}
                  </button>
                </div>
              </div>

              {/* 展开的任务编辑表格 */}
              {expandedPreset === preset.id && (
                <div className="border-t theme-border p-4 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="theme-text-muted">
                        {EDITABLE_FIELDS.map(f => (
                          <th key={f.key} className="px-2 py-1 text-left font-medium">{f.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getEditableTasks(preset).map((task, idx) => (
                        <tr key={idx} className="border-t border-slate-700/30">
                          {EDITABLE_FIELDS.map(f => (
                            <td key={f.key} className="px-1 py-1">
                              <input
                                type={f.type}
                                value={(task as any)[f.key] ?? ''}
                                onChange={e => updateTask(preset.id, idx, f.key, e.target.value)}
                                className="w-full px-2 py-1 bg-slate-800/50 border border-slate-600/50 rounded text-xs theme-text-main focus:outline-none focus:border-blue-500"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 数据管理区块 */}
      <div className="theme-bg-panel p-6 rounded-lg border theme-border shadow-xl">
        <div className="flex items-center mb-4">
          <AlertTriangle className="text-amber-400 mr-3" size={24} />
          <h3 className="text-lg font-semibold theme-text-main">{t.settings?.dangerZone || '数据管理'}</h3>
        </div>
        <p className="theme-text-muted text-sm mb-4">以下操作会修改系统数据，请谨慎执行。</p>

        <div className="space-y-4">
          {/* 资源重置 */}
          <div className="flex items-center justify-between p-4 theme-bg-main rounded-lg border theme-border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw size={18} className="text-amber-400" />
                <span className="theme-text-main font-medium">重置资源状态</span>
              </div>
              <p className="text-xs theme-text-muted">
                将所有阵元、CPU、GPU 的占用状态清零，清除分配记录。不删除资源本身。
              </p>
            </div>
            {confirmAction === 'reset' ? (
              <div className="flex gap-2 ml-4">
                <button onClick={handleReset} disabled={resetting}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded transition-colors disabled:opacity-50">
                  {resetting ? '...' : '确认'}
                </button>
                <button onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors">
                  取消
                </button>
              </div>
            ) : (
              <button onClick={() => { setConfirmAction('reset'); setMessage(null); }}
                className="ml-4 px-4 py-2 bg-amber-600/20 border border-amber-600/40 text-amber-400 text-sm rounded hover:bg-amber-600/30 transition-colors">
                重置
              </button>
            )}
          </div>

          {/* 数据初始化 */}
          <div className="flex items-center justify-between p-4 theme-bg-main rounded-lg border theme-border">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Database size={18} className="text-red-400" />
                <span className="theme-text-main font-medium">初始化测试数据</span>
              </div>
              <p className="text-xs theme-text-muted">
                删除所有现有资源，重新生成 64 阵元（4 阵面）+ 5 CPU 节点（各 64 核）+ 2 GPU（A100 40GB + RTX 4090 24GB）的标准测试环境。
              </p>
            </div>
            {confirmAction === 'init' ? (
              <div className="flex gap-2 ml-4">
                <button onClick={handleInit} disabled={initializing}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors disabled:opacity-50">
                  {initializing ? '...' : '确认'}
                </button>
                <button onClick={() => setConfirmAction(null)}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded transition-colors">
                  取消
                </button>
              </div>
            ) : (
              <button onClick={() => { setConfirmAction('init'); setMessage(null); }}
                className="ml-4 px-4 py-2 bg-red-600/20 border border-red-600/40 text-red-400 text-sm rounded hover:bg-red-600/30 transition-colors">
                初始化
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
