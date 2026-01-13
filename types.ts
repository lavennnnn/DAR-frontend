export type Language = 'en' | 'zh';
export type Theme = 'default' | 'light' | 'ocean';

export interface Task {
  id: string;
  name: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Running' | 'Completed' | 'Failed';
  resourceType: 'CPU' | 'GPU' | 'FPGA';
  duration: number; // in seconds
  submittedAt: string;
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
  x: number;
  y: number;
  status: 'Active' | 'Idle' | 'Fault';
  signalStrength: number;
}
