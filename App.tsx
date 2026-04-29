import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ArrayVisualizer from './components/ArrayVisualizer';
import Settings from './components/Settings';
import TaskFormModal from './components/TaskFormModal';
import LoginPage from './components/LoginPage';
import { Task, ResourceNode, AntennaUnit, PhysicalAntenna, Language, Theme, TaskStatus, AntennaStatus, CpuResource, GpuResource, ScheduleLog } from './types';
import { translations } from './utils/translations';
import { api } from './services/api';
import { useWebSocket } from './hooks/useWebSocket';
import { useAuth } from './context/AuthContext';
import { Plus, Search, Filter, Check, Loader2, Square, X, Trash2 } from 'lucide-react';


// Helper to format date strings
const formatTime = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleTimeString();
  } catch (e) {
    return isoString;
  }
};

const mapStatus = (status: number): 'Online' | 'Offline' | 'Maintenance' => {
  if (status === 2) return 'Offline';
  if (status === 1) return 'Maintenance';
  return 'Online';
};

const mapPhysicalAntennaStatus = (status: number): 'Online' | 'Busy' | 'Fault' => {
  if (status === 2) return 'Fault';
  if (status === 1) return 'Busy';
  return 'Online';
};

const buildResourceNodes = (cpus: CpuResource[], gpus: GpuResource[]): ResourceNode[] => {
  const cpuNodes: ResourceNode[] = cpus.map(cpu => {
    const load = cpu.totalCores > 0 ? Math.round((cpu.usedCores / cpu.totalCores) * 100) : 0;
    const temp = load > 0 ? 35 + Math.round(load * 0.6) : 0;
    return {
      id: `CPU-${cpu.id}`,
      type: 'CPU',
      load,
      temperature: temp,
      status: mapStatus(cpu.status)
    };
  });

  const gpuNodes: ResourceNode[] = gpus.map(gpu => {
    const load = gpu.totalMemory > 0 ? Math.round((gpu.usedMemory / gpu.totalMemory) * 100) : 0;
    const temp = load > 0 ? 40 + Math.round(load * 0.7) : 0;
    return {
      id: `GPU-${gpu.id}`,
      type: 'GPU',
      load,
      temperature: temp,
      status: mapStatus(gpu.status)
    };
  });

  return [...cpuNodes, ...gpuNodes];
};

type BatchType = 'physicalAntenna' | 'antenna' | 'cpu' | 'gpu';

const createBatchRow = (type: BatchType): Record<string, string> => {
  if (type === 'physicalAntenna') return { code: '', name: '', surfaceCode: '', xPos: '', yPos: '' };
  if (type === 'antenna') return { antennaId: '', unitCode: '', xPos: '', yPos: '', surfaceCode: '', phase: '0', amplitude: '1' };
  if (type === 'cpu') return { hostname: '', ipAddress: '', totalCores: '' };
  return { model: '', totalMemory: '' };
};

function App() {
  const LANGUAGE_STORAGE_KEY = 'ui_language';
  const THEME_STORAGE_KEY = 'ui_theme';
  const PUSH_NOTIFICATIONS_KEY = 'ui_push_notifications';
  const [selectedAntenna, setSelectedAntenna] = useState<AntennaUnit | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [scheduleLogs, setScheduleLogs] = useState<ScheduleLog[]>([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchType, setBatchType] = useState<BatchType>('physicalAntenna');
  const [batchRows, setBatchRows] = useState<Array<Record<string, string>>>(() => [
    createBatchRow('antenna')
  ]);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editType, setEditType] = useState<BatchType>('antenna');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const [editError, setEditError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Array<{ id: number; message: string; visible: boolean }>>([]);
  const [resourceTab, setResourceTab] = useState<'antenna' | 'compute'>('antenna');
  const [antennaResourceTab, setAntennaResourceTab] = useState<'physical' | 'unit'>('physical');
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === 'en' || stored === 'zh') return stored;
    } catch {
      // ignore storage errors
    }
    return 'en';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'default';
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === 'default' || stored === 'light' || stored === 'ocean') return stored;
    } catch {
      // ignore storage errors
    }
    return 'default';
  });
  const [pushNotifications, setPushNotifications] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = localStorage.getItem(PUSH_NOTIFICATIONS_KEY);
      if (stored === 'true') return true;
      if (stored === 'false') return false;
    } catch {
      // ignore storage errors
    }
    return false;
  });
  const [hasNotifications, setHasNotifications] = useState(false);

  // State initialized as empty, waiting for API data
  const [resources, setResources] = useState<ResourceNode[]>([]);
  const [cpus, setCpus] = useState<CpuResource[]>([]);
  const [gpus, setGpus] = useState<GpuResource[]>([]);
  const [physicalAntennas, setPhysicalAntennas] = useState<PhysicalAntenna[]>([]);
  const [antennas, setAntennas] = useState<AntennaUnit[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pastPage, setPastPage] = useState(1);
  const PAST_PAGE_SIZE = 5;
  const [cpuPage, setCpuPage] = useState(1);
  const [gpuPage, setGpuPage] = useState(1);
  const CPU_PAGE_SIZE = 5;
  const GPU_PAGE_SIZE = 5;

  // Modal and Toast State
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const t = translations[language];
  const getResourceStatusLabel = (status: 'Online' | 'Offline' | 'Maintenance' | 'Busy') => {
    if (status === 'Online') return t.resources?.statusOnline || 'Online';
    if (status === 'Offline') return t.resources?.statusOffline || 'Offline';
    if (status === 'Maintenance') return t.resources?.statusMaintenance || 'Maintenance';
    return t.resources?.physicalBusy || 'Busy';
  };
  const getAntennaStatusLabel = (status: number) => {
    if (status === AntennaStatus.Active) return t.resources?.statusActive || 'Active';
    if (status === AntennaStatus.Fault) return t.resources?.statusFault || 'Fault';
    return t.resources?.statusIdle || 'Idle';
  };
  const getTaskStatusLabel = (status: number) => {
    if (status === TaskStatus.Running) return t.tasks?.status?.running || 'Running';
    if (status === TaskStatus.Completed) return t.tasks?.status?.completed || 'Completed';
    if (status === TaskStatus.Canceled) return t.tasks?.status?.canceled || 'Canceled';
    if (status === TaskStatus.Failed) return t.tasks?.status?.failed || 'Failed';
    return t.tasks?.status?.pending || 'Pending';
  };
  const activeTasks = tasks.filter(t => t.status === TaskStatus.Pending || t.status === TaskStatus.Running);
  const pastTasks = tasks.filter(t => t.status === TaskStatus.Completed || t.status === TaskStatus.Canceled || t.status === TaskStatus.Failed);
  const pastTotalPages = Math.max(1, Math.ceil(pastTasks.length / PAST_PAGE_SIZE));
  const pastPageStart = (pastPage - 1) * PAST_PAGE_SIZE;
  const pagedPastTasks = pastTasks.slice(pastPageStart, pastPageStart + PAST_PAGE_SIZE);

  // WebSocket Connection
  // Only connect if authenticated to avoid errors or unauthorized socket attempts
  const { lastMessage, connectionStatus } = useWebSocket(isAuthenticated ? 'ws://localhost:8081/ws/monitor' : '');

  const loadResources = async () => {
    const [cpuData, gpuData] = await Promise.all([
      api.fetchCPUs(),
      api.fetchGPUs()
    ]);
    setCpus(cpuData);
    setGpus(gpuData);
    setResources(buildResourceNodes(cpuData, gpuData));
  };

  // Fetch initial data from backend
  const loadData = async () => {
    // Fetch Antennas (User Request)
    const [physicalAntennaData, antennaData, taskData] = await Promise.all([
      api.fetchPhysicalAntennas(),
      api.fetchAntennas(),
      api.fetchTasks()
    ]);
    setPhysicalAntennas(physicalAntennaData);
    setAntennas(antennaData);

    await loadResources();
    setTasks(taskData);
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(cpus.length / CPU_PAGE_SIZE));
    if (cpuPage > pages) setCpuPage(pages);
  }, [cpus.length, cpuPage]);

  useEffect(() => {
    const pages = Math.max(1, Math.ceil(gpus.length / GPU_PAGE_SIZE));
    if (gpuPage > pages) setGpuPage(pages);
  }, [gpus.length, gpuPage]);

  useEffect(() => {
    if (pastPage > pastTotalPages) {
      setPastPage(pastTotalPages);
    }
  }, [pastPage, pastTotalPages]);

  useEffect(() => {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      // ignore storage errors
    }
  }, [language]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // ignore storage errors
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(PUSH_NOTIFICATIONS_KEY, String(pushNotifications));
    } catch {
      // ignore storage errors
    }
  }, [pushNotifications]);

  useEffect(() => {
    if (!pushNotifications) {
      setHasNotifications(false);
    }
  }, [pushNotifications]);

  // Handle Real-time WebSocket Messages
  useEffect(() => {
    if (!lastMessage) return;

    console.log('Received WebSocket Message:', lastMessage);
    const messageType = lastMessage.type;
    if (messageType === 'TASK_END' || messageType === 'TASK_CANCEL' || messageType === 'ALERT') {
      setHasNotifications(true);
    }

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
      // Refresh CPU/GPU load when a task starts
      loadResources();
      if (selectedTask && selectedTask.id === taskId) {
        fetchScheduleLogs(taskId);
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
      // Refresh CPU/GPU load when a task ends
      loadResources();
      // Refresh tasks to get updated remainingSeconds/virtualShare
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        fetchScheduleLogs(taskId);
      }
    } else if (lastMessage.type === 'TASK_CANCEL') {
      const { taskId } = lastMessage;

      setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: TaskStatus.Canceled } : t
      ));

      setAntennas(prev => prev.map(a =>
          a.taskId === taskId
              ? { ...a, status: AntennaStatus.Idle, taskId: null }
              : a
      ));

      loadResources();
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        fetchScheduleLogs(taskId);
      }
    } else if (lastMessage.type === 'TASK_PREEMPT') {
      const { taskId } = lastMessage;
      setTasks(prev => prev.map(t =>
          t.id === taskId ? { ...t, status: TaskStatus.Pending } : t
      ));
      loadData();
      if (selectedTask && selectedTask.id === taskId) {
        fetchScheduleLogs(taskId);
      }
    }
  }, [lastMessage]);

  useEffect(() => {
    setBatchRows([createBatchRow(batchType)]);
  }, [batchType]);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selectedTask) return;
    const latest = tasks.find(t => t.id === selectedTask.id);
    if (!latest) return;
    if (
      latest.status !== selectedTask.status ||
      latest.remainingSeconds !== selectedTask.remainingSeconds ||
      latest.virtualShare !== selectedTask.virtualShare
    ) {
      setSelectedTask(latest);
    }
  }, [tasks, selectedTask]);

  const fetchScheduleLogs = async (taskId: number) => {
    setIsLogLoading(true);
    const logs = await api.fetchScheduleLogs(taskId);
    setScheduleLogs(logs);
    setIsLogLoading(false);
  };

  useEffect(() => {
    if (!selectedTask) {
      setScheduleLogs([]);
      return;
    }
    fetchScheduleLogs(selectedTask.id);
  }, [selectedTask]);

  useEffect(() => {
    if (!selectedTask) return;
    const id = setInterval(() => fetchScheduleLogs(selectedTask.id), 5000);
    return () => clearInterval(id);
  }, [selectedTask?.id]);

  const parseLogTime = (value: any) => {
    if (!value) return null;
    if (typeof value === 'number') {
      const num = value < 1e12 ? value * 1000 : value;
      return Number.isFinite(num) && num > 0 ? num : null;
    }
    if (typeof value === 'string') {
      if (/^\d+$/.test(value)) {
        const num = value.length === 10 ? Number(value) * 1000 : Number(value);
        return Number.isFinite(num) && num > 0 ? num : null;
      }
      const normalized = value.replace(/\//g, '-').replace(' ', 'T');
      const ts = Date.parse(normalized);
      return Number.isFinite(ts) && ts > 0 ? ts : null;
    }
    return null;
  };

  const formatLogTime = (value: any) => {
    const ts = parseLogTime(value);
    if (!ts) return '--';
    return new Date(ts).toLocaleString();
  };

  const logLabel = (action: string) => {
    switch (action) {
      case 'PREEMPT':
        return t.tasks?.detail?.preempted || 'Preempted';
      case 'COMPLETE':
        return t.tasks?.detail?.completed || 'Completed';
      case 'CANCEL':
        return t.tasks?.detail?.canceled || 'Canceled';
      case 'WAIT_RESOURCE':
        return t.tasks?.detail?.waitingResource || 'Waiting for Resource';
      case 'WAIT_COMPUTE':
        return t.tasks?.detail?.waitingCompute || 'Waiting for Compute';
      case 'WAIT_ANTENNA':
        return t.tasks?.detail?.waitingAntenna || 'Waiting for Antenna Units';
      case 'WAIT_ALLOCATE':
        return t.tasks?.detail?.allocationRetry || 'Allocation Retry';
      case 'SCHEDULE_START':
      default:
        return t.tasks?.detail?.scheduled || 'Scheduled';
    }
  };

  const logDotClass = (action: string) => {
    switch (action) {
      case 'PREEMPT':
        return 'bg-amber-400';
      case 'COMPLETE':
        return 'bg-emerald-400';
      case 'CANCEL':
        return 'bg-red-400';
      case 'WAIT_RESOURCE':
      case 'WAIT_COMPUTE':
      case 'WAIT_ANTENNA':
      case 'WAIT_ALLOCATE':
        return 'bg-yellow-400';
      case 'SCHEDULE_START':
      default:
        return 'bg-blue-400';
    }
  };

  const extractLogValue = (detail: string | undefined, key: string, nextKeys: string[]) => {
    if (!detail) return '';
    const startToken = `${key}=`;
    const start = detail.indexOf(startToken);
    if (start < 0) return '';
    const valueStart = start + startToken.length;
    const nextPositions = nextKeys
      .map(nextKey => detail.indexOf(`,${nextKey}=`, valueStart))
      .filter(pos => pos >= 0);
    const end = nextPositions.length > 0 ? Math.min(...nextPositions) : detail.length;
    return detail.slice(valueStart, end).trim();
  };

  const parseCpuPlan = (raw: string) => {
    if (!raw || raw === '-') return [];
    return raw
      .split(',')
      .map(item => {
        const [node, cores] = item.split(':');
        return { node: node?.trim(), cores: Number(cores) };
      })
      .filter(item => item.node && Number.isFinite(item.cores));
  };

  const scenarioLabel = (code: string) => {
    const labels: Record<string, string> = {
      DEPENDENCY_CONSTRAINED: t.tasks?.scenario?.dependencyConstrained || 'Dependency constrained',
      GPU_ACCELERATED: t.tasks?.scenario?.gpuAccelerated || 'GPU-assisted task',
      LOW_LATENCY: t.tasks?.scenario?.lowLatency || 'Low-latency task',
      HIGH_PRIORITY_SMALL: t.tasks?.scenario?.highPrioritySmall || 'High-priority small task',
      LARGE_ARRAY: t.tasks?.scenario?.largeArray || 'Large antenna-unit request',
      CPU_INTENSIVE: t.tasks?.scenario?.cpuIntensive || 'CPU-intensive task',
      BALANCED_MULTI_RESOURCE: t.tasks?.scenario?.balancedMultiResource || 'Balanced multi-resource task'
    };
    return labels[code] || code || '-';
  };

  const decisionLabel = (code: string) => {
    const labels: Record<string, string> = {
      DEPENDENCY_SAFE: t.tasks?.decision?.dependencySafe || 'Wait until dependency and exclusion rules are safe.',
      GPU_LOCALITY_SINGLE_CARD: t.tasks?.decision?.gpuLocalitySingleCard || 'Use single-card GPU placement and compact compute allocation.',
      FAST_FEASIBLE: t.tasks?.decision?.fastFeasible || 'Prioritize a fast feasible placement under the deadline.',
      QUALITY_LOW_REUSE: t.tasks?.decision?.qualityLowReuse || 'Prefer low-reuse antenna units and higher-quality placement.',
      LARGE_SINGLE_SURFACE: t.tasks?.decision?.largeSingleSurface || 'Keep allocation inside the requested surface and search for a feasible block.',
      SCALABLE_CROSS_SURFACE: t.tasks?.decision?.scalableCrossSurface || 'Expand the search across surfaces to improve feasibility.',
      COMPUTE_LOAD_BALANCE: t.tasks?.decision?.computeLoadBalance || 'Spread CPU load to avoid hot spots.',
      FAIR_BALANCED: t.tasks?.decision?.fairBalanced || 'Use fair-share ordering and balanced resource placement.'
    };
    return labels[code] || code || '-';
  };

  const getLatestScheduleSummary = () => {
    const latest = scheduleLogs
      .filter(log => log.action === 'SCHEDULE_START')
      .slice()
      .sort((a, b) => (parseLogTime(b.createTime) || 0) - (parseLogTime(a.createTime) || 0))[0];
    if (!latest) return null;
    const detail = latest.detail || '';
    const scenario = extractLogValue(detail, 'scenario', ['decision', 'antennas', 'cpu', 'gpu', 'computeMode', 'computeScore', 'computeDetail', 'algorithm', 'surface']);
    const decision = extractLogValue(detail, 'decision', ['antennas', 'cpu', 'gpu', 'computeMode', 'computeScore', 'computeDetail', 'algorithm', 'surface']);
    const cpu = extractLogValue(detail, 'cpu', ['gpu', 'computeMode', 'computeScore', 'computeDetail', 'algorithm', 'surface']);
    const gpu = extractLogValue(detail, 'gpu', ['computeMode', 'computeScore', 'computeDetail', 'algorithm', 'surface']);
    const mode = extractLogValue(detail, 'computeMode', ['computeScore', 'computeDetail', 'algorithm', 'surface']);
    const score = extractLogValue(detail, 'computeScore', ['computeDetail', 'algorithm', 'surface']);
    const computeDetail = extractLogValue(detail, 'computeDetail', ['algorithm', 'surface']);
    const algorithm = extractLogValue(detail, 'algorithm', ['surface']);
    const surface = extractLogValue(detail, 'surface', []);
    return {
      time: latest.createTime,
      scenario,
      decision,
      cpu,
      cpuPlan: parseCpuPlan(cpu),
      gpu,
      mode,
      score,
      computeDetail,
      algorithm,
      surface
    };
  };

  const getDisplayedRemaining = (task: Task) => {
    const base = task.remainingSeconds ?? task.duration;
    if (task.status !== TaskStatus.Running) return base;
    if (!task.startTime) return base;
    const ts = Date.parse(task.startTime);
    if (!Number.isFinite(ts)) return base;
    const elapsed = Math.floor((nowTick - ts) / 1000);
    return Math.max(0, base - elapsed);
  };

  // ✅ 新增：取消任务的处理函数
  const handleCancelTask = async (taskId: number) => {
    if (window.confirm('确定要取消/停止该任务吗？')) {
      const success = await api.cancelTask(taskId);
      if (success) {
        // 如果后端返回成功，重新加载数据刷新列表
        loadData();
      } else {
        alert('取消任务失败，请检查网络或任务状态');
      }
    }
  };

  const handleTaskSubmitSuccess = () => {
    setIsTaskModalOpen(false);
    // Reload tasks to show the new one immediately
    loadData();
    pushToast(t.tasks?.submitSuccess || 'Job submitted successfully!');
  };

  const handleDeletePastTask = async (taskId: number) => {
    if (!window.confirm('确认删除该过往任务？此操作不可恢复。')) return;
    const success = await api.deleteTask(taskId);
    if (success) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setSelectedTask(prev => (prev && prev.id === taskId ? null : prev));
    } else {
      alert('删除失败，请稍后重试。');
    }
  };

  const pushToast = (message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts(prev => [...prev, { id, message, visible: true }]);
    setTimeout(() => {
      setToasts(prev => prev.map(t => (t.id === id ? { ...t, visible: false } : t)));
    }, 2000);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2600);
  };

  const openEditModal = (type: BatchType, id: number, form: Record<string, string>) => {
    setEditType(type);
    setEditId(id);
    setEditForm(form);
    setEditError(null);
    setIsEditOpen(true);
  };

  const handleEditCpu = (cpu: CpuResource) => {
    openEditModal('cpu', cpu.id, {
      hostname: cpu.hostname ?? '',
      ipAddress: cpu.ipAddress ?? '',
      totalCores: String(cpu.totalCores ?? '')
    });
  };

  const handleDeleteCpu = async (cpuId: number) => {
    if (!window.confirm('确认删除该 CPU 资源吗？')) return;
    const ok = await api.deleteCpu(cpuId);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.deleteFailed || 'Delete failed.');
    }
  };

  const handleCpuStatusChange = async (cpuId: number, status: number) => {
    const ok = await api.updateCpuStatus(cpuId, status);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.statusUpdateFailed || 'Status update failed.');
    }
  };

  const handleEditGpu = (gpu: GpuResource) => {
    openEditModal('gpu', gpu.id, {
      model: gpu.model ?? '',
      totalMemory: String(gpu.totalMemory ?? '')
    });
  };

  const handleDeleteGpu = async (gpuId: number) => {
    if (!window.confirm('确认删除该 GPU 资源吗？')) return;
    const ok = await api.deleteGpu(gpuId);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.deleteFailed || 'Delete failed.');
    }
  };

  const handleGpuStatusChange = async (gpuId: number, status: number) => {
    const ok = await api.updateGpuStatus(gpuId, status);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.statusUpdateFailed || 'Status update failed.');
    }
  };

  const handleEditPhysicalAntenna = (antenna: PhysicalAntenna) => {
    openEditModal('physicalAntenna', antenna.id, {
      code: antenna.code ?? '',
      name: antenna.name ?? '',
      surfaceCode: antenna.surfaceCode ?? '',
      xPos: String(antenna.xPos ?? ''),
      yPos: String(antenna.yPos ?? '')
    });
  };

  const handleDeletePhysicalAntenna = async (antennaId: number) => {
    if (!window.confirm('???????????????????????')) return;
    const ok = await api.deletePhysicalAntenna(antennaId);
    if (ok) {
      loadData();
      pushToast(t.resources?.physicalAntennaDeleted || 'Physical antenna deleted.');
    } else {
      alert(t.resources?.deletePhysicalFailed || 'Delete failed. Remove the child units first.');
    }
  };

  const handlePhysicalAntennaStatusChange = async (antennaId: number, status: number) => {
    const ok = await api.updatePhysicalAntennaStatus(antennaId, status);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.statusUpdateFailed || 'Status update failed.');
    }
  };

  const handleEditAntenna = (antenna: AntennaUnit) => {
    openEditModal('antenna', antenna.id, {
      antennaId: String(antenna.antennaId ?? ''),
      unitCode: antenna.unitCode ?? antenna.code ?? '',
      xPos: String(antenna.xPos ?? ''),
      yPos: String(antenna.yPos ?? ''),
      surfaceCode: antenna.surfaceCode ?? '',
      phase: String(antenna.phase ?? 0),
      amplitude: String(antenna.amplitude ?? 1)
    });
  };

  const handleDeleteAntenna = async (antennaId: number) => {
    if (!window.confirm('确认删除该天线资源吗？')) return;
    const ok = await api.deleteAntenna(antennaId);
    if (ok) {
      setSelectedAntenna(null);
      loadData();
    } else {
      alert(t.common?.deleteFailed || 'Delete failed.');
    }
  };

  const handleAntennaStatusChange = async (antennaId: number, status: number) => {
    const ok = await api.updateAntennaStatus(antennaId, status);
    if (ok) {
      loadData();
    } else {
      alert(t.common?.statusUpdateFailed || 'Status update failed.');
    }
  };

  const updateEditForm = (key: string, value: string) => {
    setEditForm(prev => ({ ...prev, [key]: value }));
  };

  const handleEditSubmit = async () => {
    if (editId == null) return;
    setEditError(null);
    let ok = false;
    if (editType === 'physicalAntenna') {
      const xPos = Number(editForm.xPos);
      const yPos = Number(editForm.yPos);
      if (!editForm.code?.trim() || !Number.isFinite(xPos) || !Number.isFinite(yPos)) {
        setEditError(t.resources?.batchError || 'Please provide valid input.');
        return;
      }
      ok = await api.updatePhysicalAntenna(editId, {
        code: editForm.code.trim(),
        name: editForm.name?.trim() || undefined,
        xPos,
        yPos,
        surfaceCode: editForm.surfaceCode?.trim() || undefined
      });
    } else if (editType === 'cpu') {
      const totalCores = Number(editForm.totalCores);
      if (!editForm.hostname?.trim() || !editForm.ipAddress?.trim() || !Number.isFinite(totalCores)) {
        setEditError(t.resources?.batchError || 'Please provide valid input.');
        return;
      }
      ok = await api.updateCpu(editId, {
        hostname: editForm.hostname.trim(),
        ipAddress: editForm.ipAddress.trim(),
        totalCores
      });
    } else if (editType === 'gpu') {
      const totalMemory = Number(editForm.totalMemory);
      if (!editForm.model?.trim() || !Number.isFinite(totalMemory)) {
        setEditError(t.resources?.batchError || 'Please provide valid input.');
        return;
      }
      ok = await api.updateGpu(editId, {
        model: editForm.model.trim(),
        totalMemory
      });
    } else {
      const antennaId = Number(editForm.antennaId);
      const xPos = Number(editForm.xPos);
      const yPos = Number(editForm.yPos);
      const phase = Number(editForm.phase);
      const amplitude = Number(editForm.amplitude);
      if (
        !Number.isFinite(antennaId) ||
        !editForm.unitCode?.trim() ||
        !Number.isFinite(xPos) ||
        !Number.isFinite(yPos) ||
        !Number.isFinite(phase) ||
        !Number.isFinite(amplitude)
      ) {
        setEditError(t.resources?.batchError || 'Please provide valid input.');
        return;
      }
      ok = await api.updateAntenna(editId, {
        antennaId,
        unitCode: editForm.unitCode.trim(),
        xPos,
        yPos,
        phase,
        amplitude,
        surfaceCode: editForm.surfaceCode?.trim() || undefined
      });
    }

    if (ok) {
      setIsEditOpen(false);
      loadData();
      pushToast(t.resources?.editSuccess || 'Saved successfully!');
    } else {
      setEditError(t.resources?.batchError || 'Please provide valid input.');
    }
  };

  type BatchField = { key: string; label: string; placeholder?: string; numeric?: boolean };

  const getResourceFields = (type: BatchType): BatchField[] => {
    if (type === 'physicalAntenna') {
      return [
        { key: 'code', label: t.resources?.colAntennaCode || 'Physical Code', placeholder: 'ANT-01-01' },
        { key: 'name', label: t.resources?.colPhysicalAntennaName || 'Name', placeholder: 'Antenna-01-01' },
        { key: 'surfaceCode', label: t.resources?.colAntennaSurface || 'Surface', placeholder: 'SURFACE-A' },
        { key: 'xPos', label: t.resources?.colAntennaX || 'X', placeholder: '0', numeric: true },
        { key: 'yPos', label: t.resources?.colAntennaY || 'Y', placeholder: '0', numeric: true }
      ];
    }
    if (type === 'cpu') {
      return [
        { key: 'hostname', label: t.resources?.colCpuHost || 'Hostname', placeholder: 'Node-01' },
        { key: 'ipAddress', label: t.resources?.colCpuIp || 'IP Address', placeholder: '192.168.1.101' },
        { key: 'totalCores', label: t.resources?.colCpuCores || 'Total Cores', placeholder: '64', numeric: true }
      ];
    }
    if (type === 'gpu') {
      return [
        { key: 'model', label: t.resources?.colGpuModel || 'Model', placeholder: 'NVIDIA A100' },
        { key: 'totalMemory', label: t.resources?.colGpuMem || 'Total Memory (GB)', placeholder: '40', numeric: true }
      ];
    }
    return [
      { key: 'antennaId', label: t.resources?.colParentAntennaId || 'Physical Antenna ID', placeholder: '1', numeric: true },
      { key: 'unitCode', label: t.resources?.colUnitCode || 'Unit Code', placeholder: 'UNIT-1-1' },
      { key: 'xPos', label: t.resources?.colAntennaX || 'X', placeholder: '0', numeric: true },
      { key: 'yPos', label: t.resources?.colAntennaY || 'Y', placeholder: '0', numeric: true },
      { key: 'surfaceCode', label: t.resources?.colAntennaSurface || 'Surface', placeholder: 'SURFACE-A' },
      { key: 'phase', label: t.resources?.colPhase || 'Phase', placeholder: '0', numeric: true },
      { key: 'amplitude', label: t.resources?.colAmplitude || 'Amplitude', placeholder: '1', numeric: true }
    ];
  };

  const getBatchFields = (): BatchField[] => getResourceFields(batchType);

  const addBatchRow = () => {
    setBatchRows(prev => [...prev, createBatchRow(batchType)]);
  };

  const removeBatchRow = (index: number) => {
    setBatchRows(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const updateBatchRow = (index: number, key: string, value: string) => {
    setBatchRows(prev =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };

  const handleBatchSubmit = async () => {
    setBatchError(null);
    const fields = getBatchFields();
    const payload: any[] = [];

    for (const row of batchRows) {
      const values = fields.map(f => (row[f.key] ?? '').trim());
      const allEmpty = values.every(v => !v);
      if (allEmpty) continue;
      if (batchType === 'physicalAntenna') {
        const xPos = Number(row.xPos);
        const yPos = Number(row.yPos);
        if (!row.code?.trim() || !Number.isFinite(xPos) || !Number.isFinite(yPos)) {
          setBatchError(t.resources?.batchError || 'Please provide valid input.');
          return;
        }
        payload.push({
          code: row.code.trim(),
          name: row.name?.trim() || undefined,
          xPos,
          yPos,
          surfaceCode: row.surfaceCode?.trim() || undefined
        });
      } else if (batchType === 'antenna') {
        const antennaId = Number(row.antennaId);
        const xPos = Number(row.xPos);
        const yPos = Number(row.yPos);
        const phase = Number(row.phase ?? 0);
        const amplitude = Number(row.amplitude ?? 1);
        if (!row.unitCode?.trim() || !Number.isFinite(antennaId) || !Number.isFinite(xPos) || !Number.isFinite(yPos) || !Number.isFinite(phase) || !Number.isFinite(amplitude)) {
          setBatchError(t.resources?.batchError || 'Please provide valid input.');
          return;
        }
        payload.push({
          antennaId,
          unitCode: row.unitCode.trim(),
          xPos,
          yPos,
          phase,
          amplitude,
          surfaceCode: row.surfaceCode?.trim() || undefined
        });
      } else if (batchType === 'cpu') {
        const totalCores = Number(row.totalCores);
        if (!row.hostname?.trim() || !row.ipAddress?.trim() || !Number.isFinite(totalCores)) {
          setBatchError(t.resources?.batchError || 'Please provide valid input.');
          return;
        }
        payload.push({
          hostname: row.hostname.trim(),
          ipAddress: row.ipAddress.trim(),
          totalCores
        });
      } else {
        const totalMemory = Number(row.totalMemory);
        if (!row.model?.trim() || !Number.isFinite(totalMemory)) {
          setBatchError(t.resources?.batchError || 'Please provide valid input.');
          return;
        }
        payload.push({ model: row.model.trim(), totalMemory });
      }
    }

    if (payload.length === 0) {
      setBatchError(t.resources?.batchError || 'Please provide valid input.');
      return;
    }

    setBatchLoading(true);
    let ok = false;
    if (batchType === 'physicalAntenna') ok = await api.batchCreatePhysicalAntennas(payload);
    if (batchType === 'antenna') ok = await api.batchCreateAntennas(payload);
    if (batchType === 'cpu') ok = await api.batchCreateCpus(payload);
    if (batchType === 'gpu') ok = await api.batchCreateGpus(payload);
    setBatchLoading(false);
    if (ok) {
      setIsBatchOpen(false);
      setBatchRows([createBatchRow(batchType)]);
      loadData();
      pushToast(t.resources?.batchSuccess || 'Resources imported successfully!');
    } else {
      setBatchError(t.resources?.batchError || 'Please provide valid input.');
    }
  };

  // Dynamic Theme Styles
  const getThemeStyles = () => {
    switch (theme) {
      case 'light':
        return `
          :root {
            --bg-main: #f6f8fa;
            --bg-panel: #ffffff;
            --border: #d0d7de;
            --text-main: #24292f;
            --text-muted: #57606a;
            --tab-active-bg: #dbeafe;
            --tab-active-border: #60a5fa;
            --tab-active-text: #1d4ed8;
            --tab-hover-text: #111827;
            --tab-hover-border: #cbd5e1;
            --tab-hover-bg: #eef2f7;
            --progress-track: #e5edf5;
            --progress-empty-track: repeating-linear-gradient(
              135deg,
              #edf2f7 0px,
              #edf2f7 8px,
              #f8fafc 8px,
              #f8fafc 16px
            );
            --progress-empty-border: #cbd5e1;
            --surface-soft: #eef6ff;
            --surface-soft-alt: #f0fdfa;
            --surface-strong: #e0f2fe;
            --surface-hover: #e8f3ff;
            --surface-panel: #f8fbff;
            --surface-panel-alt: #f6fffb;
            --surface-line: #bfdbfe;
            --surface-line-alt: #99f6e4;
            --surface-muted-text: #1e3a8a;
            --surface-pill-bg: #e0f2fe;
            --surface-pill-text: #1d4ed8;
            --surface-pill-border: #93c5fd;
            --surface-button-bg: #eaf4ff;
            --surface-button-hover: #dbeafe;
            --surface-button-text: #1e40af;
            --surface-disabled: #f0f9ff;
            --placeholder-text: #4f6b95;
          }
        `;
      case 'ocean':
        return `
          :root {
            --bg-main: #0b1324;
            --bg-panel: #111a2e;
            --border: #223356;
            --text-main: #e6f0ff;
            --text-muted: #9fb4d1;
            --tab-active-bg: rgba(37, 99, 235, 0.22);
            --tab-active-border: #3b82f6;
            --tab-active-text: #dbeafe;
            --tab-hover-text: #ffffff;
            --tab-hover-border: #475569;
            --tab-hover-bg: rgba(15, 23, 42, 0.45);
            --progress-track: #334155;
            --progress-empty-track: repeating-linear-gradient(
              135deg,
              #1e293b 0px,
              #1e293b 8px,
              #334155 8px,
              #334155 16px
            );
            --progress-empty-border: #475569;
            --surface-soft: rgba(37, 99, 235, 0.08);
            --surface-soft-alt: rgba(20, 184, 166, 0.08);
            --surface-strong: rgba(37, 99, 235, 0.14);
            --surface-hover: rgba(37, 99, 235, 0.12);
            --surface-panel: rgba(15, 23, 42, 0.35);
            --surface-panel-alt: rgba(17, 94, 89, 0.14);
            --surface-line: #3b82f6;
            --surface-line-alt: #14b8a6;
            --surface-muted-text: #cbd5e1;
            --surface-pill-bg: rgba(37, 99, 235, 0.12);
            --surface-pill-text: #93c5fd;
            --surface-pill-border: rgba(59, 130, 246, 0.35);
            --surface-button-bg: rgba(30, 41, 59, 0.6);
            --surface-button-hover: rgba(51, 65, 85, 0.8);
            --surface-button-text: #e2e8f0;
            --surface-disabled: rgba(30, 41, 59, 0.4);
            --placeholder-text: #7dd3fc;
          }
        `;
      default: // Dark
        return `
          :root {
            --bg-main: #0d1117;
            --bg-panel: #161b22;
            --border: #30363d;
            --text-main: #e6edf3;
            --text-muted: #8b949e;
            --tab-active-bg: rgba(37, 99, 235, 0.22);
            --tab-active-border: #3b82f6;
            --tab-active-text: #dbeafe;
            --tab-hover-text: #ffffff;
            --tab-hover-border: #475569;
            --tab-hover-bg: rgba(30, 41, 59, 0.4);
            --progress-track: #334155;
            --progress-empty-track: repeating-linear-gradient(
              135deg,
              #1f2937 0px,
              #1f2937 8px,
              #334155 8px,
              #334155 16px
            );
            --progress-empty-border: #475569;
            --surface-soft: rgba(37, 99, 235, 0.08);
            --surface-soft-alt: rgba(20, 184, 166, 0.08);
            --surface-strong: rgba(37, 99, 235, 0.14);
            --surface-hover: rgba(37, 99, 235, 0.12);
            --surface-panel: rgba(30, 41, 59, 0.3);
            --surface-panel-alt: rgba(15, 23, 42, 0.35);
            --surface-line: #3b82f6;
            --surface-line-alt: #14b8a6;
            --surface-muted-text: #cbd5e1;
            --surface-pill-bg: rgba(37, 99, 235, 0.12);
            --surface-pill-text: #93c5fd;
            --surface-pill-border: rgba(59, 130, 246, 0.35);
            --surface-button-bg: rgba(51, 65, 85, 0.45);
            --surface-button-hover: rgba(51, 65, 85, 0.7);
            --surface-button-text: #e2e8f0;
            --surface-disabled: rgba(51, 65, 85, 0.3);
            --placeholder-text: #94a3b8;
          }
        `;
    }
  };

  const batchFields = getBatchFields();
  const editFields = getResourceFields(editType);

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
        const cpuResources = cpus;
        const gpuResources = gpus;
        const tabButtonBase = 'px-5 py-2.5 rounded-full border text-sm font-semibold tracking-wide transition-colors';
        const activeTabClass = 'shadow-sm';
        const inactiveTabClass = 'border-transparent theme-text-muted';
        const cpuTotalPages = Math.max(1, Math.ceil(cpuResources.length / CPU_PAGE_SIZE));
        const gpuTotalPages = Math.max(1, Math.ceil(gpuResources.length / GPU_PAGE_SIZE));
        const cpuPageStart = (cpuPage - 1) * CPU_PAGE_SIZE;
        const gpuPageStart = (gpuPage - 1) * GPU_PAGE_SIZE;
        const pagedCpus = cpuResources.slice(cpuPageStart, cpuPageStart + CPU_PAGE_SIZE);
        const pagedGpus = gpuResources.slice(gpuPageStart, gpuPageStart + GPU_PAGE_SIZE);
        return (
            <div className="flex h-full flex-col gap-4">
              <div className="flex flex-wrap items-center justify-between gap-3 theme-bg-panel p-4 rounded-lg border theme-border">
                <div>
                  <h2 className="text-xl font-bold theme-text-main">{t.resources.title}</h2>
                  <p className="theme-text-muted text-sm">
                    {resourceTab === 'antenna'
                      ? (antennaResourceTab === 'physical'
                        ? (t.resources?.physicalSubtitle || 'Manage physical antennas and parent topology.')
                        : t.resources.subtitle)
                      : (t.resources?.computeSubtitle || 'Compute Resource Management')}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm theme-text-main">
                  <div className="flex items-center gap-1">
                    <button
                        onClick={() => setResourceTab('antenna')}
                        className={`${tabButtonBase} ${resourceTab === 'antenna' ? `theme-tab-active ${activeTabClass}` : `theme-tab-inactive ${inactiveTabClass}`}`}
                    >
                      {t.resources?.tabAntenna || 'Antenna Management'}
                    </button>
                    <button
                        onClick={() => {
                          setResourceTab('compute');
                          setSelectedAntenna(null);
                        }}
                        className={`${tabButtonBase} ${resourceTab === 'compute' ? `theme-tab-active ${activeTabClass}` : `theme-tab-inactive ${inactiveTabClass}`}`}
                    >
                      {t.resources?.tabCompute || 'CPU/GPU Management'}
                    </button>
                  </div>
                  <button
                      onClick={() => {
                        const nextType: BatchType = resourceTab === 'antenna'
                          ? (antennaResourceTab === 'physical' ? 'physicalAntenna' : 'antenna')
                          : 'cpu';
                        setBatchType(nextType);
                        setIsBatchOpen(true);
                      }}
                      className="ml-1 px-3 py-1.5 rounded border theme-border text-xs transition-colors theme-surface-button"
                  >
                      {t.resources?.batchImport || 'Import Resources'}
                  </button>
                </div>
              </div>

              {resourceTab === 'antenna' ? (
                  <div className="flex h-full flex-col gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => {
                          setAntennaResourceTab('physical');
                          setSelectedAntenna(null);
                        }}
                        className={`${tabButtonBase} ${antennaResourceTab === 'physical' ? `theme-tab-active ${activeTabClass}` : `theme-tab-inactive ${inactiveTabClass}`}`}
                      >
                        {t.resources?.physicalTab || 'Physical Antenna'}
                      </button>
                      <button
                        onClick={() => setAntennaResourceTab('unit')}
                        className={`${tabButtonBase} ${antennaResourceTab === 'unit' ? `theme-tab-active ${activeTabClass}` : `theme-tab-inactive ${inactiveTabClass}`}`}
                      >
                        {t.resources?.unitTab || 'Antenna Unit'}
                      </button>
                    </div>

                    {antennaResourceTab === 'physical' ? (
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="theme-bg-panel rounded-lg border theme-border p-4 shadow-xl space-y-3">
                          <h3 className="text-lg font-semibold theme-text-main">{t.resources?.physicalOverview || 'Topology Overview'}</h3>
                          <div className="grid grid-cols-1 gap-3 text-sm">
                            <div className="rounded-lg border theme-border p-3 theme-surface-soft">
                              <div className="theme-text-muted">{t.resources?.physicalCount || 'Physical Antennas'}</div>
                              <div className="text-2xl font-semibold text-blue-300 mt-1">{physicalAntennas.length}</div>
                            </div>
                            <div className="rounded-lg border theme-border p-3 theme-surface-soft-alt">
                              <div className="theme-text-muted">{t.resources?.unitCount || 'Antenna Units'}</div>
                              <div className="text-2xl font-semibold text-cyan-300 mt-1">{antennas.length}</div>
                            </div>
                            <div className="rounded-lg border theme-border p-3 theme-surface-soft">
                              <div className="theme-text-muted">{t.resources?.activeUnitCount || 'Active Units'}</div>
                              <div className="text-2xl font-semibold text-emerald-300 mt-1">{antennas.filter(item => item.status === AntennaStatus.Active).length}</div>
                            </div>
                            <div className="rounded-lg border theme-border p-3 theme-surface-soft-alt">
                              <div className="theme-text-muted">{t.resources?.orphanUnitCount || 'Units Without Parent'}</div>
                              <div className="text-2xl font-semibold text-amber-300 mt-1">{antennas.filter(item => !item.antennaId).length}</div>
                            </div>
                          </div>
                        </div>

                        <div className="xl:col-span-2 theme-bg-panel rounded-lg border theme-border p-4 shadow-xl">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold theme-text-main">{t.resources?.physicalList || 'Physical Antenna List'}</h3>
                            <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs">
                              {physicalAntennas.length} {t.resources?.physicalTab || 'Physical Antenna'}
                            </span>
                          </div>
                          {physicalAntennas.length === 0 ? (
                            <div className="text-sm theme-text-muted py-12 text-center">
                              {t.resources?.emptyPhysical || 'No physical antennas yet.'}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto pr-1">
                              {physicalAntennas.map((antenna) => {
                                const childCount = antennas.filter(unit => unit.antennaId === antenna.id).length;
                                const statusLabel = mapPhysicalAntennaStatus(antenna.status);
                                return (
                                  <div key={antenna.id} className="p-4 rounded-lg border theme-border theme-surface-panel flex flex-col gap-3">
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <div className="text-sm font-semibold theme-text-main">{antenna.code}</div>
                                        <div className="text-xs theme-text-muted mt-1">{antenna.name || '-'} / {antenna.surfaceCode || t.resources?.unassigned || 'UNASSIGNED'}</div>
                                      </div>
                                      <span className={`${statusLabel === 'Online' ? 'text-emerald-400' : statusLabel === 'Busy' ? 'text-amber-400' : 'text-red-400'} text-xs font-medium`}>
                                        {getResourceStatusLabel(statusLabel)}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                      <div className="rounded border theme-border p-2 theme-surface-soft">
                                        <div className="theme-text-muted">ID</div>
                                        <div className="font-mono theme-text-main mt-1">#{antenna.id}</div>
                                      </div>
                                      <div className="rounded border theme-border p-2 theme-surface-soft-alt">
                                        <div className="theme-text-muted">{t.resources?.unitCount || 'Units'}</div>
                                        <div className="font-mono theme-text-main mt-1">{childCount}</div>
                                      </div>
                                      <div className="rounded border theme-border p-2 theme-surface-soft col-span-2">
                                        <div className="theme-text-muted">{t.resources?.coordinates || 'Coordinates'}</div>
                                        <div className="font-mono theme-text-main mt-1">({antenna.xPos ?? '-'}, {antenna.yPos ?? '-'})</div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                      <select
                                        value={antenna.status}
                                        onChange={(e) => handlePhysicalAntennaStatusChange(antenna.id, Number(e.target.value))}
                                        className="theme-bg-main theme-border border rounded-md px-2 py-1 text-xs theme-text-main"
                                      >
                                        <option value={0}>{t.resources?.statusOnline || 'Online'}</option>
                                        <option value={1}>{t.resources?.physicalBusy || 'Busy'}</option>
                                        <option value={2}>{t.resources?.statusFault || 'Fault'}</option>
                                      </select>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEditPhysicalAntenna(antenna)}
                                          className="px-2 py-1 text-xs rounded-md theme-border border theme-text-muted transition-colors theme-surface-hover"
                                        >
                                          {t.resources?.resourceEdit || 'Edit'}
                                        </button>
                                        <button
                                          onClick={() => handleDeletePhysicalAntenna(antenna.id)}
                                          className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors"
                                        >
                                          {t.resources?.resourceDelete || 'Delete'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex h-full gap-4">
                    <div className="flex-1 theme-bg-panel rounded-lg border theme-border p-4 shadow-xl overflow-hidden">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm theme-text-muted">{t.resources?.tabAntenna || 'Antenna Management'}</div>
                        <span className="px-2 py-1 rounded border text-xs theme-surface-pill">
                          {t.resources?.antennaCount || 'Antenna'}: {antennas.length}
                        </span>
                      </div>
                      <ArrayVisualizer
                          data={antennas}
                          labels={t.resources.visualizer}
                          onUnitClick={setSelectedAntenna}
                      />
                    </div>

                    {selectedAntenna && (
                        <div className="w-80 theme-bg-panel border theme-border p-6 shadow-2xl flex flex-col rounded-lg animate-fade-in-right">
                          <div className="flex justify-between items-center mb-6 border-b theme-border pb-4">
                            <h3 className="text-lg font-bold theme-text-main">单元详情</h3>
                            <button
                                onClick={() => setSelectedAntenna(null)}
                                className="theme-text-muted transition-colors hover:opacity-80"
                            >
                              <X size={20} />
                            </button>
                          </div>

                          <div className="space-y-6">
                            <div className="p-4 theme-surface-strong rounded-lg border theme-border text-center">
                              <span className="text-xs theme-text-muted uppercase">{t.resources?.visualizer?.unitId || 'Unit ID'}</span>
                              <div className="text-3xl font-mono text-blue-400 mt-2">#{selectedAntenna.id}</div>
                            </div>

                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center p-2 rounded theme-surface-hover">
                                <span className="theme-text-muted">状态</span>
                                <span className={`font-medium ${
                                    selectedAntenna.status === AntennaStatus.Active ? 'text-orange-400' :
                                        selectedAntenna.status === AntennaStatus.Fault ? 'text-red-400' : 'theme-text-main'
                                }`}>
                          {selectedAntenna.status === AntennaStatus.Active ? '工作中' :
                              selectedAntenna.status === AntennaStatus.Fault ? '故障' : '空闲'}
                        </span>
                              </div>

                              <div className="flex justify-between items-center p-2 rounded theme-surface-hover">
                                <span className="theme-text-muted">坐标 (X, Y)</span>
                                <span className="font-mono theme-text-main">
                          ({selectedAntenna.xPos}, {selectedAntenna.yPos})
                        </span>
                              </div>

                              <div className="flex justify-between items-center p-2 rounded theme-surface-hover">
                                <span className="theme-text-muted">当前相位</span>
                                <span className="font-mono text-emerald-400">
                          {selectedAntenna.phase?.toFixed(2)}°
                        </span>
                              </div>

                              <div className="flex justify-between items-center p-2 rounded theme-surface-hover">
                                <span className="theme-text-muted">信号幅度</span>
                                <div className="flex items-center">
                                  <div className="w-16 h-1.5 theme-progress-track rounded-full mr-2 overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500"
                                        style={{width: `${(selectedAntenna.amplitude || 0) * 100}%`}}
                                    ></div>
                                  </div>
                                  <span className="font-mono theme-text-main">{selectedAntenna.amplitude?.toFixed(1)}</span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 pt-4 border-t theme-border">
                              <span className="text-xs theme-text-muted uppercase block mb-2">
                                {t.resources?.resourceActions || 'Actions'}
                              </span>
                              <div className="flex items-center justify-between gap-2">
                                <select
                                    value={selectedAntenna.status}
                                    onChange={(e) => handleAntennaStatusChange(selectedAntenna.id, Number(e.target.value))}
                                    className="theme-bg-main theme-border border rounded-md px-2 py-1 text-xs theme-text-main"
                                    title={t.resources?.resourceStatus || 'Status'}
                                >
                                  <option value={0}>{t.resources?.statusIdle || 'Idle'}</option>
                                  <option value={1}>{t.resources?.statusActive || 'Active'}</option>
                                  <option value={2}>{t.resources?.statusFault || 'Fault'}</option>
                                </select>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleEditAntenna(selectedAntenna)}
                                    className="px-2 py-1 text-xs rounded-md theme-border border theme-text-muted transition-colors theme-surface-hover"
                                  >
                                    {t.resources?.resourceEdit || 'Edit'}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteAntenna(selectedAntenna.id)}
                                    className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors"
                                  >
                                    {t.resources?.resourceDelete || 'Delete'}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {selectedAntenna.taskId && (
                                <div className="mt-4 pt-4 border-t theme-border">
                                  <span className="text-xs theme-text-muted uppercase block mb-2">当前执行任务</span>
                                  <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-blue-300 text-sm">
                                    <div className="flex justify-between">
                                      <span>{t.resources?.taskId || 'Task ID'}:</span>
                                      <span className="font-mono">{selectedAntenna.taskId}</span>
                                    </div>
                                    <div className="text-xs opacity-70 mt-1">正在运行波束合成序列...</div>
                                  </div>
                                </div>
                            )}
                          </div>
                        </div>
                    )}
                  </div>
                    )}
                  </div>
              ) : (
                  <div className="theme-bg-panel rounded-lg border theme-border p-4 shadow-xl">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold theme-text-main">计算资源概览</h3>
                      <div className="flex items-center gap-2">
                        <div className="text-xs theme-text-muted">CPU/GPU 负载与状态</div>
                        <span className="px-2 py-1 rounded border text-xs theme-surface-pill">
                          CPU: {cpuResources.length}
                        </span>
                        <span className="px-2 py-1 rounded border text-xs theme-surface-pill">
                          GPU: {gpuResources.length}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="border theme-border rounded-lg p-4 theme-surface-soft flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-blue-400">CPU 节点</span>
                          <span className="text-xs theme-text-muted">{cpuResources.length} 台</span>
                        </div>
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="flex-1 min-h-[320px] max-h-[70vh] overflow-y-auto pr-1">
                            <div className="space-y-2">
                              {cpuResources.length === 0 && (
                                  <div className="text-xs theme-text-muted">暂无数据</div>
                              )}
                              {pagedCpus.map((cpu) => {
                                const load = cpu.totalCores > 0 ? Math.round((cpu.usedCores / cpu.totalCores) * 100) : 0;
                                const temp = load > 0 ? 35 + Math.round(load * 0.6) : 0;
                                const statusLabel = mapStatus(cpu.status);
                                return (
                                    <div key={cpu.id} className="p-2 rounded border theme-border theme-surface-panel flex flex-col">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono theme-text-main">{cpu.hostname || `CPU-${cpu.id}`}</span>
                                        <span className={`${
                                            statusLabel === 'Online' ? 'text-emerald-400' :
                                                statusLabel === 'Maintenance' ? 'text-amber-400' : 'text-red-400'
                                        }`}>{getResourceStatusLabel(statusLabel)}</span>
                                      </div>
                                      <div className="mt-1 text-xs theme-text-muted">
                                        {cpu.ipAddress} / {cpu.totalCores} {t.resources?.cores || 'cores'}
                                      </div>
                                      <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${load === 0 ? 'theme-progress-empty' : 'theme-progress-track'}`}>
                                        <div className="h-full bg-blue-500 transition-[width] duration-300" style={{ width: `${load}%` }}></div>
                                      </div>
                                      <div className="mt-1 text-xs theme-text-muted">负载 {load}% / 温度 {temp}°C</div>
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <select
                                            value={cpu.status}
                                            onChange={(e) => handleCpuStatusChange(cpu.id, Number(e.target.value))}
                                            className="theme-bg-main theme-border border rounded-md px-2 py-1 text-xs theme-text-main"
                                            title={t.resources?.resourceStatus || 'Status'}
                                        >
                                          <option value={0}>{t.resources?.statusOnline || 'Online'}</option>
                                          <option value={1}>{t.resources?.statusMaintenance || 'Maintenance'}</option>
                                          <option value={2}>{t.resources?.statusOffline || 'Offline'}</option>
                                        </select>
                                        <div className="flex items-center gap-2">
                                          <button
                                              onClick={() => handleEditCpu(cpu)}
                                              className="px-2 py-1 text-xs rounded-md theme-border border theme-text-muted transition-colors theme-surface-hover"
                                          >
                                            {t.resources?.resourceEdit || 'Edit'}
                                          </button>
                                          <button
                                              onClick={() => handleDeleteCpu(cpu.id)}
                                              className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors"
                                          >
                                            {t.resources?.resourceDelete || 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs theme-text-muted">
                          <button
                              onClick={() => setCpuPage(p => Math.max(1, p - 1))}
                              disabled={cpuPage <= 1}
                              className="px-2 py-1 rounded theme-border border disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface-hover"
                          >
                            {t.resources?.prevPage || 'Prev'}
                          </button>
                          <span>
                            {t.resources?.pageLabel || 'Page'} {cpuPage} / {cpuTotalPages}
                          </span>
                          <button
                              onClick={() => setCpuPage(p => Math.min(cpuTotalPages, p + 1))}
                              disabled={cpuPage >= cpuTotalPages}
                              className="px-2 py-1 rounded theme-border border disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface-hover"
                          >
                            {t.resources?.nextPage || 'Next'}
                          </button>
                        </div>
                        </div>
                      </div>

                      <div className="border theme-border rounded-lg p-4 theme-surface-soft-alt flex flex-col h-full">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-purple-400">GPU 节点</span>
                          <span className="text-xs theme-text-muted">{gpuResources.length} 张</span>
                        </div>
                        <div className="flex flex-col flex-1 min-h-0">
                          <div className="flex-1 min-h-[320px] max-h-[70vh] overflow-y-auto pr-1">
                            <div className="space-y-2">
                              {gpuResources.length === 0 && (
                                  <div className="text-xs theme-text-muted">暂无数据</div>
                              )}
                              {pagedGpus.map((gpu) => {
                                const load = gpu.totalMemory > 0 ? Math.round((gpu.usedMemory / gpu.totalMemory) * 100) : 0;
                                const temp = load > 0 ? 40 + Math.round(load * 0.7) : 0;
                                const statusLabel = mapStatus(gpu.status);
                                return (
                                    <div key={gpu.id} className="p-2 rounded border theme-border theme-surface-panel-alt flex flex-col">
                                      <div className="flex items-center justify-between text-xs">
                                        <span className="font-mono theme-text-main">{gpu.model || `GPU-${gpu.id}`}</span>
                                        <span className={`${
                                            statusLabel === 'Online' ? 'text-emerald-400' :
                                                statusLabel === 'Maintenance' ? 'text-amber-400' : 'text-red-400'
                                        }`}>{getResourceStatusLabel(statusLabel)}</span>
                                      </div>
                                      <div className="mt-1 text-xs theme-text-muted">
                                        {gpu.totalMemory} GB
                                      </div>
                                      <div className={`mt-2 h-1.5 w-full rounded-full overflow-hidden ${load === 0 ? 'theme-progress-empty' : 'theme-progress-track'}`}>
                                        <div className="h-full bg-purple-500 transition-[width] duration-300" style={{ width: `${load}%` }}></div>
                                      </div>
                                      <div className="mt-1 text-xs theme-text-muted">负载 {load}% / 温度 {temp}°C</div>
                                      <div className="mt-2 flex items-center justify-between gap-2">
                                        <select
                                            value={gpu.status}
                                            onChange={(e) => handleGpuStatusChange(gpu.id, Number(e.target.value))}
                                            className="theme-bg-main theme-border border rounded-md px-2 py-1 text-xs theme-text-main"
                                            title={t.resources?.resourceStatus || 'Status'}
                                        >
                                          <option value={0}>{t.resources?.statusOnline || 'Online'}</option>
                                          <option value={1}>{t.resources?.statusMaintenance || 'Maintenance'}</option>
                                          <option value={2}>{t.resources?.statusOffline || 'Offline'}</option>
                                        </select>
                                        <div className="flex items-center gap-2">
                                          <button
                                              onClick={() => handleEditGpu(gpu)}
                                              className="px-2 py-1 text-xs rounded-md theme-border border theme-text-muted transition-colors theme-surface-hover"
                                          >
                                            {t.resources?.resourceEdit || 'Edit'}
                                          </button>
                                          <button
                                              onClick={() => handleDeleteGpu(gpu.id)}
                                              className="px-2 py-1 text-xs rounded-md border border-red-500/50 text-red-300 hover:bg-red-500/10 transition-colors"
                                          >
                                            {t.resources?.resourceDelete || 'Delete'}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                );
                              })}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs theme-text-muted">
                          <button
                              onClick={() => setGpuPage(p => Math.max(1, p - 1))}
                              disabled={gpuPage <= 1}
                              className="px-2 py-1 rounded theme-border border disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface-hover"
                          >
                            {t.resources?.prevPage || 'Prev'}
                          </button>
                          <span>
                            {t.resources?.pageLabel || 'Page'} {gpuPage} / {gpuTotalPages}
                          </span>
                          <button
                              onClick={() => setGpuPage(p => Math.min(gpuTotalPages, p + 1))}
                              disabled={gpuPage >= gpuTotalPages}
                              className="px-2 py-1 rounded theme-border border disabled:opacity-40 disabled:cursor-not-allowed transition-colors theme-surface-hover"
                          >
                            {t.resources?.nextPage || 'Next'}
                          </button>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
              )}
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

              {selectedTask && (
                  <div className="theme-bg-panel rounded-lg border theme-border p-4 shadow-xl">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="text-lg font-semibold theme-text-main">{t.tasks?.detail?.title || 'Task Details'}</h3>
                      <button
                          onClick={() => setSelectedTask(null)}
                          className="text-slate-400 hover:text-white transition-colors"
                          title="Close"
                      >
                        <X size={18} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.id || 'ID'}</div>
                        <div className="theme-text-main font-mono">{selectedTask.id}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.name || 'Name'}</div>
                        <div className="theme-text-main">{selectedTask.name}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.priority || 'Priority'}</div>
                        <div className="theme-text-main">Lv.{selectedTask.priority}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.status || 'Status'}</div>
                        <div className="theme-text-main">{getTaskStatusLabel(selectedTask.status)}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.antennas || 'Antennas'}</div>
                        <div className="theme-text-main">{selectedTask.neededAntennas}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.cpu || 'CPU Cores'}</div>
                        <div className="theme-text-main">{selectedTask.neededCpuCores ?? 0}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.gpu || 'GPU Mem'}</div>
                        <div className="theme-text-main">{selectedTask.neededGpuMem ?? 0} GB</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.beamFrequency || 'Beam Frequency'}</div>
                        <div className="theme-text-main">{selectedTask.beamFrequency ?? '-'}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.beamGroup || 'Beam Group'}</div>
                        <div className="theme-text-main">{selectedTask.beamGroup || '-'}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.preferredSurface || 'Preferred Surface'}</div>
                        <div className="theme-text-main">{selectedTask.preferredSurface || '-'}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.duration || 'Duration'}</div>
                        <div className="theme-text-main">{selectedTask.duration}s</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.remaining || 'Remaining'}</div>
                        <div className="theme-text-main">{getDisplayedRemaining(selectedTask)}s</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.share || 'Virtual Share'}</div>
                        <div className="theme-text-main">{(selectedTask.virtualShare ?? 0).toFixed(3)}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.dependsOn || 'Depends On'}</div>
                        <div className="theme-text-main">{selectedTask.dependsOnTaskIds || '-'}</div>
                      </div>
                      <div>
                        <div className="theme-text-muted">{t.tasks?.detail?.repelTasks || 'Repel Tasks'}</div>
                        <div className="theme-text-main">{selectedTask.repelTaskIds || '-'}</div>
                      </div>
                    </div>

                    {(() => {
                      const summary = getLatestScheduleSummary();
                      if (!summary) return null;
                      return (
                        <div className="mt-4 rounded-lg border theme-border bg-slate-800/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <h4 className="text-sm font-semibold theme-text-main">{t.tasks?.detail?.schedulingDecision || 'Scheduling Decision'}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-xs">
                              <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20">
                                {scenarioLabel(summary.scenario)}
                              </span>
                              <span className="theme-text-muted">{formatLogTime(summary.time)}</span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="rounded border theme-border p-3 bg-slate-900/20">
                              <div className="theme-text-muted mb-2">{t.tasks?.detail?.cpuPlan || 'CPU Plan'}</div>
                              {summary.cpuPlan.length === 0 ? (
                                <div className="theme-text-main">-</div>
                              ) : (
                                <div className="space-y-2">
                                  {summary.cpuPlan.map(item => (
                                    <div key={item.node} className="flex items-center justify-between gap-2">
                                      <span className="font-mono theme-text-main">{item.node}</span>
                                      <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-300">{item.cores} cores</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="rounded border theme-border p-3 bg-slate-900/20">
                              <div className="theme-text-muted mb-2">{t.tasks?.detail?.gpuCard || 'GPU Card'}</div>
                              <div className="font-mono theme-text-main">{summary.gpu || '-'}</div>
                              <div className="theme-text-muted mt-2">{t.tasks?.detail?.surface || 'Surface'}</div>
                              <div className="font-mono theme-text-main">{summary.surface || '-'}</div>
                            </div>

                            <div className="rounded border theme-border p-3 bg-slate-900/20">
                              <div className="theme-text-muted mb-2">{t.tasks?.detail?.decisionReason || 'Decision Reason'}</div>
                              <div className="theme-text-main break-words">{decisionLabel(summary.decision)}</div>
                              <div className="theme-text-muted mt-2">{t.tasks?.detail?.placementQuality || 'Placement Quality'}</div>
                              <div className="font-mono theme-text-main">{summary.score || '-'}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-semibold theme-text-main">{t.tasks?.detail?.timeline || 'Schedule Timeline'}</h4>
                        {isLogLoading && (
                          <span className="text-xs theme-text-muted">{t.tasks?.loadingLogs || 'Loading...'}</span>
                        )}
                      </div>
                      <div className="space-y-3">
                        {scheduleLogs.length === 0 && !isLogLoading && (
                          <div className="text-xs theme-text-muted">{t.tasks?.noLogs || 'No logs yet'}</div>
                        )}
                        {scheduleLogs.length > 0 && (
                          <>
                            {(() => {
                              const logs = scheduleLogs
                                .map(l => ({ ...l, _ts: parseLogTime(l.createTime) }))
                                .filter(l => l._ts !== null)
                                .sort((a, b) => (a._ts as number) - (b._ts as number));
                              if (logs.length === 0) {
                                return <div className="text-xs theme-text-muted">{t.tasks?.noValidTimestamps || 'No valid timestamps'}</div>;
                              }
                              const first = logs[0]._ts as number;
                              const last = logs[logs.length - 1]._ts as number;
                              const tail = Math.max(1000, (last - first) * 0.1);
                              const totalSpan = (last - first) + tail;
                              const segments = logs.map((log, i) => {
                                const start = log._ts as number;
                                const end = i < logs.length - 1 ? (logs[i + 1]._ts as number) : start + tail;
                                const width = totalSpan > 0 ? ((end - start) / totalSpan) * 100 : (100 / logs.length);
                                return { id: log.id, action: log.action, width: Math.max(2, width) };
                              });

                              return (
                                <div>
                                  <div className="h-3 w-full rounded overflow-hidden border theme-border theme-surface-panel flex">
                                    {segments.map(seg => (
                                      <div
                                        key={seg.id}
                                        className={logDotClass(seg.action)}
                                        style={{ width: `${seg.width}%` }}
                                      ></div>
                                    ))}
                                  </div>
                                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                    {logs.map(log => (
                                      <div key={log.id} className="flex items-center min-w-0" title={log.detail || ''}>
                                        <span className={`h-2 w-2 rounded-full ${logDotClass(log.action)} mr-1`}></span>
                                        <span className="theme-text-main">{logLabel(log.action)}</span>
                                        <span className="theme-text-muted ml-1">{formatLogTime(log.createTime)}</span>
                                        {log.detail && (
                                          <span className="theme-text-muted ml-1 max-w-[340px] truncate">
                                            · {log.detail}
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold theme-text-main">{t.tasks?.activeTasks || 'Active Tasks'}</h3>
                <span className="text-xs theme-text-muted">{t.common?.total || 'Total'} {activeTasks.length}</span>
              </div>

              <div className="theme-bg-panel rounded-lg border theme-border overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="theme-surface-strong">
                  <tr>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.id}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.jobName}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.priority}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.cpu}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.gpu}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.resource}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.status}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.actions}</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                  {activeTasks.length === 0 && (
                    <tr>
                      <td className="p-4 text-xs theme-text-muted" colSpan={8}>{t.tasks?.noActiveTasks || 'No active tasks'}</td>
                    </tr>
                  )}
                  {activeTasks.map(task => (
                      <tr
                        key={task.id}
                        className="theme-surface-hover transition-colors cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="p-4 font-mono theme-text-muted">{task.id}</td>
                        <td className="p-4 font-medium theme-text-main">{task.name}</td>
                        <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs font-semibold ${
                             task.priority >= 80 ? 'bg-red-500/20 text-red-400' :
                                 task.priority >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                     'bg-blue-500/20 text-blue-400'
                         }`}>
                           {t.tasks?.level || 'Lv.'}{task.priority}
                         </span>
                        </td>
                        <td className="p-4 theme-text-muted">{task.neededCpuCores ?? 0}</td>
                        <td className="p-4 theme-text-muted">{task.neededGpuMem ?? 0}</td>
                        <td className="p-4 theme-text-muted">{task.resourceType || t.resources?.antennaArray || 'Antenna Array'}</td>
                        <td className="p-4">
                         <span className={`flex items-center ${
                             task.status === TaskStatus.Running ? 'text-blue-400' :
                                 task.status === TaskStatus.Completed ? 'text-emerald-400' :
                                     task.status === TaskStatus.Canceled ? 'text-slate-400' :
                                     task.status === TaskStatus.Pending ? 'text-amber-400' :
                                         'text-slate-400'
                         }`}>
                           {task.status === TaskStatus.Running && <span className="animate-pulse w-2 h-2 bg-blue-400 rounded-full mr-2"></span>}
                           {getTaskStatusLabel(task.status)}
                         </span>
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            {(task.status === TaskStatus.Running || task.status === TaskStatus.Pending) ? (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCancelTask(task.id); }}
                                    className="p-1 hover:text-red-400 theme-text-muted transition-colors"
                                    title={t.tasks?.cancelTask || 'Cancel task'}
                                >
                                  <Square size={16} fill="currentColor"/>
                                </button>
                            ) : (
                                <button className="p-1 text-slate-600 cursor-not-allowed" disabled>
                                  <Square size={16}/>
                                </button>
                            )}
                          </div>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between mt-2">
                <h3 className="text-lg font-semibold theme-text-main">{t.tasks?.pastTasks || 'Past Tasks'}</h3>
                <span className="text-xs theme-text-muted">{t.common?.total || 'Total'} {pastTasks.length}</span>
              </div>

              <div className="theme-bg-panel rounded-lg border theme-border overflow-hidden shadow-xl">
                <table className="w-full text-left">
                  <thead className="theme-surface-strong">
                  <tr>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.id}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.jobName}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.priority}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.cpu}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.gpu}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.status}</th>
                    <th className="p-4 text-xs font-semibold theme-text-muted uppercase tracking-wider">{t.tasks.columns.actions}</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y theme-border">
                  {pagedPastTasks.length === 0 && (
                    <tr>
                      <td className="p-4 text-xs theme-text-muted" colSpan={7}>{t.tasks?.noPastTasks || 'No past tasks'}</td>
                    </tr>
                  )}
                  {pagedPastTasks.map(task => (
                      <tr
                        key={task.id}
                        className="theme-surface-hover transition-colors cursor-pointer"
                        onClick={() => setSelectedTask(task)}
                      >
                        <td className="p-4 font-mono theme-text-muted">{task.id}</td>
                        <td className="p-4 font-medium theme-text-main">{task.name}</td>
                        <td className="p-4">
                         <span className={`px-2 py-1 rounded text-xs font-semibold ${
                             task.priority >= 80 ? 'bg-red-500/20 text-red-400' :
                                 task.priority >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                                     'bg-blue-500/20 text-blue-400'
                         }`}>
                           {t.tasks?.level || 'Lv.'}{task.priority}
                         </span>
                        </td>
                        <td className="p-4 theme-text-muted">{task.neededCpuCores ?? 0}</td>
                        <td className="p-4 theme-text-muted">{task.neededGpuMem ?? 0}</td>
                        <td className="p-4">
                         <span className={`flex items-center ${
                             task.status === TaskStatus.Completed ? 'text-emerald-400' :
                               task.status === TaskStatus.Canceled ? 'text-slate-400' :
                                 'text-red-400'
                         }`}>
                           {getTaskStatusLabel(task.status)}
                         </span>
                        </td>
                        <td className="p-4">
                          <button
                              onClick={(e) => { e.stopPropagation(); handleDeletePastTask(task.id); }}
                              className="p-1 hover:text-red-400 theme-text-muted transition-colors"
                              title={t.tasks?.deleteTask || 'Delete task'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between p-4 border-t theme-border text-xs">
                  <span className="theme-text-muted">{t.resources?.pageLabel || 'Page'} {pastPage} / {pastTotalPages}</span>
                  <div className="flex gap-2">
                    <button
                        className="px-3 py-1 rounded border theme-border theme-text-muted hover:opacity-80 disabled:opacity-40"
                        disabled={pastPage <= 1}
                        onClick={() => setPastPage(p => Math.max(1, p - 1))}
                    >
                      {t.resources?.prevPage || 'Previous'}
                    </button>
                    <button
                        className="px-3 py-1 rounded border theme-border theme-text-muted hover:opacity-80 disabled:opacity-40"
                        disabled={pastPage >= pastTotalPages}
                        onClick={() => setPastPage(p => Math.min(pastTotalPages, p + 1))}
                    >
                      {t.resources?.nextPage || 'Next'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
        );
      case 'settings':
        return (
          <Settings
            t={t}
            pushNotifications={pushNotifications}
            setPushNotifications={setPushNotifications}
          />
        );
      default:
        return <div className="p-10 text-center theme-text-muted">{t.common?.featureUnderConstruction || 'Feature under construction'}</div>;
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
            <p className="text-slate-400 text-sm">{t.common?.initializing || 'Initializing System...'}</p>
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
          .theme-tab-active {
            background-color: var(--tab-active-bg);
            border-color: var(--tab-active-border);
            color: var(--tab-active-text);
          }
          .theme-tab-inactive:hover {
            color: var(--tab-hover-text);
            border-color: var(--tab-hover-border);
            background-color: var(--tab-hover-bg);
          }
          .theme-progress-track {
            background: var(--progress-track);
          }
          .theme-progress-empty {
            background: var(--progress-empty-track);
            border: 1px dashed var(--progress-empty-border);
          }
          .theme-surface-soft { background: var(--surface-soft); }
          .theme-surface-soft-alt { background: var(--surface-soft-alt); }
          .theme-surface-strong { background: var(--surface-strong); }
          .theme-surface-panel { background: var(--surface-panel); }
          .theme-surface-panel-alt { background: var(--surface-panel-alt); }
          .theme-surface-hover:hover { background: var(--surface-hover); }
          .theme-surface-pill {
            background: var(--surface-pill-bg);
            color: var(--surface-pill-text);
            border-color: var(--surface-pill-border);
          }
          .theme-surface-button {
            background: var(--surface-button-bg);
            color: var(--surface-button-text);
          }
          .theme-surface-button:hover {
            background: var(--surface-button-hover);
          }
          .theme-surface-line {
            border-color: var(--surface-line);
          }
          .theme-surface-line-alt {
            border-color: var(--surface-line-alt);
          }
          .theme-surface-muted-text {
            color: var(--surface-muted-text);
          }
          .theme-surface-disabled {
            background: var(--surface-disabled);
          }
          .theme-placeholder::placeholder {
            color: var(--placeholder-text);
          }
          .theme-avatar-surface {
            background: var(--surface-pill-bg);
            color: var(--surface-pill-text);
          }
          .theme-divider-soft {
            background: var(--surface-pill-border);
          }
          
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
                  pushNotifications={pushNotifications}
                  hasNotifications={hasNotifications}
                  onClearNotifications={() => setHasNotifications(false)}
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

              {isBatchOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="theme-bg-panel w-full max-w-2xl rounded-lg border theme-border shadow-2xl overflow-hidden">
                      <div className="flex justify-between items-center p-4 border-b theme-border bg-slate-700/20">
                        <h3 className="text-lg font-bold theme-text-main">{t.resources?.batchImport || 'Batch Import'}</h3>
                        <button
                            onClick={() => setIsBatchOpen(false)}
                            className="theme-text-muted hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        {batchError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
                              {batchError}
                            </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium theme-text-muted mb-1">
                            {t.resources?.batchType || 'Resource Type'}
                          </label>
                          {resourceTab === 'antenna' ? (
                            <div className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main text-sm">
                              {antennaResourceTab === 'physical'
                                ? (t.resources?.physicalTab || 'Physical Antenna')
                                : (t.resources?.unitTab || t.resources?.batchTypeAntenna || 'Antenna Unit')}
                            </div>
                          ) : (
                            <select
                                value={batchType}
                                onChange={(e) => setBatchType(e.target.value as any)}
                                className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            >
                              <option value="cpu">{t.resources?.batchTypeCpu || 'CPU'}</option>
                              <option value="gpu">{t.resources?.batchTypeGpu || 'GPU'}</option>
                            </select>
                          )}
                        </div>
                        <div>
                          <label className="block text-sm font-medium theme-text-muted mb-1">
                            {t.resources?.batchInput || 'Batch Input'}
                          </label>
                          <div className="text-xs theme-text-muted mb-2">
                            {t.resources?.batchFormat || 'Fill the table, one record per row.'}
                          </div>
                          <div className="overflow-x-auto theme-border border rounded-md">
                            <table className="min-w-full text-sm">
                              <thead className="theme-bg-main">
                              <tr>
                                {batchFields.map(field => (
                                  <th key={field.key} className="p-2 text-left theme-text-muted font-medium">
                                    {field.label}
                                  </th>
                                ))}
                                <th className="p-2 text-right theme-text-muted font-medium" />
                              </tr>
                              </thead>
                              <tbody>
                              {batchRows.map((row, index) => (
                                <tr key={index} className="border-t theme-border">
                                  {batchFields.map(field => (
                                    <td key={field.key} className="p-2">
                                      <input
                                        type={field.numeric ? 'number' : 'text'}
                                        min={field.numeric ? 0 : undefined}
                                        step={field.numeric ? 1 : undefined}
                                        value={row[field.key] ?? ''}
                                        onChange={(e) => updateBatchRow(index, field.key, e.target.value)}
                                        placeholder={field.placeholder}
                                        className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
                                      />
                                    </td>
                                  ))}
                                  <td className="p-2 text-right">
                                    <button
                                      onClick={() => removeBatchRow(index)}
                                      disabled={batchRows.length === 1}
                                      className="inline-flex items-center justify-center p-1.5 rounded-md theme-border border theme-text-muted hover:text-white hover:border-slate-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                      title={t.resources?.batchRemoveRow || 'Remove'}
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={addBatchRow}
                              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md theme-bg-main theme-border border theme-text-muted hover:text-white hover:border-slate-500 transition-colors text-xs"
                            >
                              <Plus size={14} />
                              {t.resources?.batchAddRow || 'Add Row'}
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t theme-border flex justify-end space-x-3">
                        <button
                            onClick={() => setIsBatchOpen(false)}
                            className="px-4 py-2 rounded-md theme-bg-main theme-border border theme-text-muted hover:text-white hover:border-slate-500 transition-colors"
                        >
                          {t.resources?.batchCancel || 'Cancel'}
                        </button>
                        <button
                            onClick={handleBatchSubmit}
                            disabled={batchLoading}
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {t.resources?.batchSubmit || 'Import'}
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {isEditOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="theme-bg-panel w-full max-w-xl rounded-lg border theme-border shadow-2xl overflow-hidden">
                      <div className="flex justify-between items-center p-4 border-b theme-border bg-slate-700/20">
                        <h3 className="text-lg font-bold theme-text-main">
                          {t.resources?.resourceEdit || 'Edit'}{' '}
                          {editType === 'physicalAntenna'
                            ? (t.resources?.physicalTab || 'Physical Antenna')
                            : editType === 'antenna'
                              ? (t.resources?.unitTab || t.resources?.batchTypeAntenna || 'Antenna Unit')
                              : editType === 'cpu'
                                ? (t.resources?.batchTypeCpu || 'CPU')
                                : (t.resources?.batchTypeGpu || 'GPU')}
                        </h3>
                        <button
                            onClick={() => setIsEditOpen(false)}
                            className="theme-text-muted hover:text-white transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                      <div className="p-6 space-y-4">
                        {editError && (
                            <div className="p-3 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">
                              {editError}
                            </div>
                        )}
                        {editFields.map(field => (
                          <div key={field.key}>
                            <label className="block text-sm font-medium theme-text-muted mb-1">
                              {field.label}
                            </label>
                            <input
                                type={field.numeric ? 'number' : 'text'}
                                min={field.numeric ? 0 : undefined}
                                step={field.numeric ? 1 : undefined}
                                value={editForm[field.key] ?? ''}
                                onChange={(e) => updateEditForm(field.key, e.target.value)}
                                placeholder={field.placeholder}
                                className="w-full theme-bg-main theme-border border rounded-md p-2 theme-text-main focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="p-4 border-t theme-border flex justify-end space-x-3">
                        <button
                            onClick={() => setIsEditOpen(false)}
                            className="px-4 py-2 rounded-md theme-bg-main theme-border border theme-text-muted hover:text-white hover:border-slate-500 transition-colors"
                        >
                          {t.resources?.resourceCancel || 'Cancel'}
                        </button>
                        <button
                            onClick={handleEditSubmit}
                            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
                        >
                          {t.resources?.resourceSave || 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
              )}

              {toasts.length > 0 && (
                  <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2">
                    {toasts.map(toast => (
                      <div
                          key={toast.id}
                          className={`bg-emerald-500/10 border border-emerald-500/50 text-emerald-400 px-4 py-3 rounded-lg shadow-lg flex items-center transition-all duration-500 ${
                            toast.visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'
                          }`}
                      >
                        <Check size={18} className="mr-2" />
                        <span className="font-medium">{toast.message}</span>
                      </div>
                    ))}
                  </div>
              )}
            </>
        )}
      </>
  );
}

export default App;
