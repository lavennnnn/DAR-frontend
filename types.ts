export type Language = 'en' | 'zh';
export type Theme = 'default' | 'light' | 'ocean';

// Enums for easier mapping in UI
export enum TaskStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Canceled = 3,
  Failed = 4
}

export enum AntennaStatus {
  Idle = 0,
  Active = 1,
  Fault = 2
}

export interface Task {
  id: number; // Changed from string to number
  name: string;
  priority: number; // Changed from string to number (Higher = greater priority)
  status: number; // 0:Pending, 1:Running, 2:Completed, 3:Failed
  neededAntennas: number; // New field
  neededCpuCores?: number;
  neededGpuMem?: number;
  beamFrequency?: number;
  beamGroup?: string;
  preferredSurface?: string;
  antennaScheduleMode?: 'AUTO' | 'BFS' | 'DIJKSTRA' | 'GREEDY' | 'HEAP' | 'DP';
  deadlineMs?: number;
  allowCrossSurface?: boolean;
  targetReuseLimit?: number;
  computeScheduleMode?: 'BALANCE' | 'PACKED';
  dependsOnTaskIds?: string;
  repelTaskIds?: string;
  duration: number; // in seconds
  remainingSeconds?: number;
  virtualShare?: number;
  startTime?: string;
  endTime?: string;
  createTime: string; // New field, replaces submittedAt
  resourceType?: 'CPU' | 'GPU' | 'FPGA'; // Optional, kept for UI compatibility if needed
}

export interface ScheduleLog {
  id: number;
  taskId: number;
  action: string;
  detail?: string;
  createTime: string;
}

export interface ResourceNode {
  id: string;
  type: 'CPU' | 'GPU' | 'FPGA';
  load: number; // 0-100
  temperature: number;
  status: 'Online' | 'Offline' | 'Maintenance';
}

export interface CpuResource {
  id: number;
  hostname: string;
  ipAddress: string;
  totalCores: number;
  usedCores: number;
  status: number; // 0: idle, 1: busy, 2: offline
}

export interface GpuResource {
  id: number;
  model: string;
  totalMemory: number;
  usedMemory: number;
  status: number; // 0: idle, 1: busy, 2: fault
}

export interface PhysicalAntenna {
  id: number;
  code: string;
  name?: string;
  surfaceCode?: string;
  xPos?: number;
  yPos?: number;
  status: number;
}

export interface AntennaUnit {
  id: number;
  antennaId?: number;
  unitCode?: string;
  xPos: number;
  yPos: number;
  status: number;
  amplitude: number;
  phase: number;
  code?: string;
  taskId: number | null;
  surfaceCode?: string;
}

export interface User {
  userId: number;
  username: string;
  nickname: string;
  token: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  nickname: string;
}

