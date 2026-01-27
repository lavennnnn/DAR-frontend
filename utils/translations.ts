
export const translations = {
  en: {
    appTitle: 'ArraySys',
    nav: {
      dashboard: 'Overview',
      resources: 'Resource Map',
      tasks: 'Task Schedule',
      aiLab: 'AI Visual Lab',
      settings: 'Settings'
    },
    login: {
      welcome: 'Welcome Back',
      subtitle: 'Sign in to access the system',
      createAccount: 'Create Account',
      joinSubtitle: 'Join the Digital Array Scheduler',
      username: 'Username',
      password: 'Password',
      nickname: 'Nickname',
      enterUser: 'Enter username',
      enterNick: 'Display name',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      haveAccount: 'Already have an account? Sign in',
      noAccount: "Don't have an account? Create one",
      regFailed: 'Registration failed. Username may be taken.',
      loginFailed: 'Invalid username or password.',
      errorGeneric: 'An unexpected error occurred.'
    },
    dashboard: {
      systemStatus: 'System Status',
      operational: 'Operational',
      avgLoad: 'Avg Resource Load',
      activeTasks: 'Active Tasks',
      totalResources: 'Total Resources',
      resourceLoad: 'Real-time Resource Load',
      taskDist: 'Task Distribution',
      systemAlerts: 'System Alerts',
      lastUpdated: 'Last updated: Just now',
      loadLabel: 'CPU/GPU Load %',
      tempLabel: 'Temperature (°C)',
      alerts: {
        highLoad: 'High system load detected across multiple FPGA nodes. Optimization recommended.',
        temp: 'Node GPU-04 temperature exceeding nominal range (85°C).',
        maintenance: 'Scheduled maintenance for Antenna Array Block B at 02:00 UTC.'
      }
    },
    resources: {
      title: 'Phased Array Matrix Visualization',
      subtitle: 'Real-time status of Digital Array Elements',
      fault: 'Fault',
      idle: 'Idle',
      active: 'Active',
      visualizer: {
        unitId: 'Unit ID',
        status: 'Status',
        signal: 'Signal'
      }
    },
    tasks: {
      title: 'Task Scheduling',
      newJob: 'New Job',
      search: 'Search tasks...',
      filter: 'Filter',
      columns: {
        id: 'ID',
        jobName: 'Job Name',
        priority: 'Priority',
        resource: 'Resource',
        status: 'Status',
        actions: 'Actions'
      }
    },
    aiLab: {
      title: 'AI Visual Editor',
      desc: 'Upload a system snapshot or simulation heatmap and use AI to enhance, annotate, or modify the visualization for reporting.',
      upload: 'Click to upload image',
      supported: 'PNG, JPG supported',
      instructionLabel: 'Edit Instruction',
      placeholder: "e.g., 'Add a heatmap overlay showing high interference areas' or 'Change the background to dark mode'",
      generate: 'Generate Edit',
      processing: 'Processing...',
      original: 'Original Input',
      result: 'AI Result',
      noImage: 'No image uploaded',
      waiting: 'Waiting for input',
      generating: 'Generating magic...',
      download: 'Download Result'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      languageDesc: 'Select your preferred interface language.',
      theme: 'Theme',
      themeDesc: 'Customize the application appearance.',
      notifications: 'Notifications',
      notificationsDesc: 'Manage system alert preferences.',
      emailAlerts: 'Email Alerts',
      pushNotifications: 'Push Notifications',
      save: 'Save Changes',
      saving: 'Saving...',
      saveSuccess: 'Settings saved successfully!',
      themes: {
        default: 'Dark (Default)',
        light: 'Light',
        ocean: 'Ocean Blue'
      }
    }
  },
  zh: {
    appTitle: '阵列系统',
    nav: {
      dashboard: '总览',
      resources: '资源映射',
      tasks: '任务调度',
      aiLab: 'AI 视觉实验室',
      settings: '设置'
    },
    login: {
      welcome: '欢迎回来',
      subtitle: '登录以访问系统',
      createAccount: '创建账户',
      joinSubtitle: '注册数字阵列调度系统',
      username: '用户名',
      password: '密码',
      nickname: '昵称',
      enterUser: '输入用户名',
      enterNick: '显示名称',
      signIn: '登录',
      signUp: '注册',
      haveAccount: '已有账号？去登录',
      noAccount: '没有账号？创建一个',
      regFailed: '注册失败，用户名可能已被占用。',
      loginFailed: '用户名或密码错误。',
      errorGeneric: '发生意外错误。'
    },
    dashboard: {
      systemStatus: '系统状态',
      operational: '运行中',
      avgLoad: '平均资源负载',
      activeTasks: '活跃任务',
      totalResources: '总资源数',
      resourceLoad: '实时资源负载',
      taskDist: '任务分布',
      systemAlerts: '系统警报',
      lastUpdated: '最后更新：刚刚',
      loadLabel: 'CPU/GPU 负载 %',
      tempLabel: '温度 (°C)',
      alerts: {
        highLoad: '检测到多个FPGA节点系统负载过高。建议优化。',
        temp: '节点 GPU-04 温度超出正常范围 (85°C)。',
        maintenance: '天线阵列 B 区块定于 UTC 02:00 进行维护。'
      }
    },
    resources: {
      title: '相控阵矩阵可视化',
      subtitle: '数字阵列单元实时状态',
      fault: '故障',
      idle: '空闲',
      active: '活跃',
      visualizer: {
        unitId: '单元 ID',
        status: '状态',
        signal: '信号强度'
      }
    },
    tasks: {
      title: '任务调度',
      newJob: '新建作业',
      search: '搜索任务...',
      filter: '筛选',
      columns: {
        id: 'ID',
        jobName: '作业名称',
        priority: '优先级',
        resource: '资源',
        status: '状态',
        actions: '操作'
      }
    },
    aiLab: {
      title: 'AI 视觉编辑器',
      desc: '上传系统快照或仿真热图，利用 AI 增强、标注或修改可视化效果以用于报告。',
      upload: '点击上传图片',
      supported: '支持 PNG, JPG',
      instructionLabel: '编辑指令',
      placeholder: "例如：'添加显示高干扰区域的热图覆盖层' 或 '将背景更改为暗模式'",
      generate: '生成编辑',
      processing: '处理中...',
      original: '原始输入',
      result: 'AI 结果',
      noImage: '未上传图片',
      waiting: '等待输入',
      generating: '正在生成奇迹...',
      download: '下载结果'
    },
    settings: {
      title: '设置',
      language: '语言',
      languageDesc: '选择您偏好的界面语言。',
      theme: '主题',
      themeDesc: '自定义应用程序外观。',
      notifications: '通知',
      notificationsDesc: '管理系统警报首选项。',
      emailAlerts: '邮件警报',
      pushNotifications: '推送通知',
      save: '保存更改',
      saving: '保存中...',
      saveSuccess: '设置已成功保存！',
      themes: {
        default: '深色 (默认)',
        light: '浅色',
        ocean: '海洋蓝'
      }
    }
  }
};
