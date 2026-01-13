import { Task, AntennaUnit } from '../types';

// Assuming proxy is configured in vite.config.ts or similar to forward /api to localhost:8080
// If not, change this to 'http://localhost:8080/api'
const BASE_URL = '/api';

export const api = {
  /**
   * Fetch all antenna resources
   * GET /api/resource/antenna/list
   */
  fetchAntennas: async (): Promise<AntennaUnit[]> => {
    try {
      const response = await fetch(`${BASE_URL}/resource/antenna/list`);
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
      const response = await fetch(`${BASE_URL}/task/list`);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(task),
      });
      return response.ok;
    } catch (error) {
      console.error('API Error:', error);
      return false;
    }
  }
};