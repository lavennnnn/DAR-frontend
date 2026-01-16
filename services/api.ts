import { Task, AntennaUnit, User, LoginRequest, RegisterRequest } from '../types';

// Assuming proxy is configured in vite.config.ts to forward /api to localhost:8080
const BASE_URL = '/api';

// Helper to construct headers with Auth token if available
const getHeaders = () => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  const token = localStorage.getItem('token');
  if (token) {
    // Inject token into Authorization header for backend JwtInterceptor
    (headers as any)['Authorization'] = token;
  }
  return headers;
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
      return await response.json();
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
      return await response.json();
    } catch (error) {
      console.error('Register API Error:', error);
      return null;
    }
  },

  /**
   * Get Nickname
   * Endpoint: /api/auth/getNickname?name={username}
   * Method: GET
   */
  getNickname: async (username: string): Promise<string> => {
    try {
      // Updated to use GET with query parameter 'name'
      const response = await fetch(`${BASE_URL}/auth/getNickname?name=${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: getHeaders(),
      });

      if (response.ok) {
        const res = await response.json();
        // Handle Result<String> wrapper: { code: 200, data: "..." }
        if (res && res.code === 200) {
          return res.data || "";
        }
      }
      return "";
    } catch (error) {
      console.error('Get Nickname API Error:', error);
      return "";
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
      if (!response.ok) {
        throw new Error('Failed to fetch antennas');
      }
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      return [];
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
      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }
      return await response.json();
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
      return response.ok;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  }
};