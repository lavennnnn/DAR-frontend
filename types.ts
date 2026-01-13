export type Language = 'en' | 'zh';
export type Theme = 'default' | 'light' | 'ocean';

// Enums for easier mapping in UI
export enum TaskStatus {
  Pending = 0,
  Running = 1,
  Completed = 2,
  Failed = 3
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
  duration: number; // in seconds
  createTime: string; // New field, replaces submittedAt
  resourceType?: 'CPU' | 'GPU' | 'FPGA'; // Optional, kept for UI compatibility if needed
}

export interface ResourceNode {
  id: string;
  type: 'CPU' | 'GPU' | 'FPGA';
  load: number; // 0-100
  temperature: number;
  status: 'Online' | 'Offline' | 'Maintenance';
}

export interface AntennaUnit {
  id: number;
  xPos: number; // Changed from x
  yPos: number; // Changed from y
  status: number; // 0:Idle, 1:Active, 2:Fault
  amplitude: number; // Changed from signalStrength
  phase: number; // New field
  code: string; // New field
  taskId: number | null; // New field
}