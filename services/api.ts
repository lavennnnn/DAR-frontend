import { Task, AntennaUnit, PhysicalAntenna, User, LoginRequest, RegisterRequest, CpuResource, GpuResource, ScheduleLog } from '../types';

// Assuming proxy is configured in vite.config.ts to forward /api to localhost:8080
const BASE_URL = '/api';

// Helper to construct headers with Auth token if available
const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  let token = localStorage.getItem('token');
  if (!token) {
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.token) {
          token = parsed.token;
        }
      }
    } catch {
      // ignore parse errors, fall back to unauthenticated request
    }
  }
  if (token) {
    // Inject token into Authorization header for backend JwtInterceptor
    (headers as any)['Authorization'] = token;
  }
  return headers;
};

const handleUnauthorized = (response: Response) => {
  if (response.status !== 401) return false;
  try {
    localStorage.setItem('auth_expired', '1');
  } catch {
    // ignore storage errors
  }
  try {
    window.dispatchEvent(new Event('auth:logout'));
  } catch {
    // ignore event errors
  }
  return true;
};

export const api = {
  /**
   * User Login
   * POST /api/auth/login
   */
  login: async (data: LoginRequest): Promise<User | null> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const res = await response.json();
      if (res.code === '0') { // 鍚庣 Result.SUCCESS_CODE 鏄?"0"
        return res.data;
      }
      return null;
    } catch (error) {
      console.error('Login API Error:', error);
      return null;
    }
  },

  /**
   * User Registration
   * POST /api/auth/register
   */
  register: async (data: RegisterRequest): Promise<User | null> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Registration failed');
      }
      //瑙ｆ瀽 JSON 骞舵彁鍙?.data
      const res = await response.json();
      if (res.code === '0') {
        return res.data;
      }
      return null;
    } catch (error) {
      console.error('Register API Error:', error);
      return null;
    }
  },

  /**
   * Fetch all antenna resources
   * GET /api/resource/antenna/list
   */
  fetchAntennas: async (): Promise<AntennaUnit[]> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/list`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch antennas');
      }
      const res = await response.json();
      if (res.code === '0') {
        return (res.data || []).map((item: any) => ({
          ...item,
          code: item.code ?? item.unitCode,
        }));
      }
      return [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  /**
   * Fetch all CPU resources
   * GET /api/resource/cpu/list
   */
  fetchPhysicalAntennas: async (): Promise<PhysicalAntenna[]> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical/list`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch physical antennas');
      }
      const res = await response.json();
      if (res.code === '0') {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  createPhysicalAntenna: async (antenna: Partial<PhysicalAntenna>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(antenna),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Create Physical Antenna API Error:', error);
      return false;
    }
  },

  updatePhysicalAntenna: async (id: number, antenna: Partial<PhysicalAntenna>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(antenna),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update Physical Antenna API Error:', error);
      return false;
    }
  },

  deletePhysicalAntenna: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Delete Physical Antenna API Error:', error);
      return false;
    }
  },

  updatePhysicalAntennaStatus: async (id: number, status: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update Physical Antenna Status API Error:', error);
      return false;
    }
  },

  batchCreatePhysicalAntennas: async (antennas: any[]): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/physical/batch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(antennas),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Batch Create Physical Antennas API Error:', error);
      return false;
    }
  },

  fetchCPUs: async (): Promise<CpuResource[]> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/cpu/list`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch CPUs');
      }
      const res = await response.json();
      if (res.code === '0') {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  /**
   * Fetch all GPU resources
   * GET /api/resource/gpu/list
   */
  fetchGPUs: async (): Promise<GpuResource[]> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/gpu/list`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch GPUs');
      }
      const res = await response.json();
      if (res.code === '0') {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  /**
   * Update antenna
   * PUT /api/resource/antenna/{id}
   */
  updateAntenna: async (id: number, antenna: Partial<AntennaUnit>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(antenna),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update Antenna API Error:', error);
      return false;
    }
  },

  /**
   * Delete antenna
   * DELETE /api/resource/antenna/{id}
   */
  deleteAntenna: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Delete Antenna API Error:', error);
      return false;
    }
  },

  /**
   * Update antenna status
   * PATCH /api/resource/antenna/{id}/status?status={status}
   */
  updateAntennaStatus: async (id: number, status: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update Antenna Status API Error:', error);
      return false;
    }
  },

  /**
   * Update CPU
   * PUT /api/resource/cpu/{id}
   */
  updateCpu: async (id: number, cpu: Partial<CpuResource>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/cpu/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(cpu),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update CPU API Error:', error);
      return false;
    }
  },

  /**
   * Delete CPU
   * DELETE /api/resource/cpu/{id}
   */
  deleteCpu: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/cpu/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Delete CPU API Error:', error);
      return false;
    }
  },

  /**
   * Update CPU status
   * PATCH /api/resource/cpu/{id}/status?status={status}
   */
  updateCpuStatus: async (id: number, status: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/cpu/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update CPU Status API Error:', error);
      return false;
    }
  },

  /**
   * Update GPU
   * PUT /api/resource/gpu/{id}
   */
  updateGpu: async (id: number, gpu: Partial<GpuResource>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/gpu/${id}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(gpu),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update GPU API Error:', error);
      return false;
    }
  },

  /**
   * Delete GPU
   * DELETE /api/resource/gpu/{id}
   */
  deleteGpu: async (id: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/gpu/${id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Delete GPU API Error:', error);
      return false;
    }
  },

  /**
   * Update GPU status
   * PATCH /api/resource/gpu/{id}/status?status={status}
   */
  updateGpuStatus: async (id: number, status: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/gpu/${id}/status?status=${status}`, {
        method: 'PATCH',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Update GPU Status API Error:', error);
      return false;
    }
  },

  /**
   * Fetch all tasks
   * GET /api/task/list
   */
  fetchTasks: async (): Promise<Task[]> => {
    try {
      const response = await fetch(`${BASE_URL}/task/list`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      const res = await response.json();
      if (res.code === '0') {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error('API Error:', error);
      return [];
    }
  },

  /**
   * Submit a new task
   * POST /api/task/submit
   */
  submitTask: async (task: Partial<Task>): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/task/submit`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(task),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  },

  /**
   * Cancel a task
   * POST /api/task/cancel?taskId={id}
   */
  cancelTask: async (taskId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/task/cancel?taskId=${taskId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      // 鎴愬姛杩斿洖 true锛屽け璐ヨ繑鍥?false
      return response.ok;
    } catch (error) {
      console.error('Cancel Task API Error:', error);
      return false;
    }
  },

  /**
   * Delete a past task
   * POST /api/task/delete?taskId={id}
   */
  deleteTask: async (taskId: number): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/task/delete?taskId=${taskId}`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Delete Task API Error:', error);
      return false;
    }
  },

  /**
   * Fetch schedule logs for a task
   * GET /api/schedule-log/list?taskId={id}
   */
  fetchScheduleLogs: async (taskId: number): Promise<ScheduleLog[]> => {
    try {
      const response = await fetch(`${BASE_URL}/schedule-log/list?taskId=${taskId}`, {
        headers: getHeaders()
      });
      if (handleUnauthorized(response)) return [];
      if (!response.ok) {
        throw new Error('Failed to fetch schedule logs');
      }
      const res = await response.json();
      if (res.code === '0') {
        return res.data || [];
      }
      return [];
    } catch (error) {
      console.error('Schedule Log API Error:', error);
      return [];
    }
  },
  /**
   * Batch create antennas
   * POST /api/resource/antenna/batch
   */
  batchCreateAntennas: async (antennas: any[]): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/batch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(antennas),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Batch Antenna API Error:', error);
      return false;
    }
  },

  /**
   * Batch create CPUs
   * POST /api/resource/cpu/batch
   */
  batchCreateCpus: async (cpus: any[]): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/cpu/batch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(cpus),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Batch CPU API Error:', error);
      return false;
    }
  },

  /**
   * Batch create GPUs
   * POST /api/resource/gpu/batch
   */
  batchCreateGpus: async (gpus: any[]): Promise<boolean> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/gpu/batch`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(gpus),
      });
      if (handleUnauthorized(response)) return false;
      return response.ok;
    } catch (error) {
      console.error('Batch GPU API Error:', error);
      return false;
    }
  }
};



