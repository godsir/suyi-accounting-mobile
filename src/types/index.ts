// 用户相关类型
export interface User {
  id: number
  username: string
  email?: string
  role: 'admin' | 'user' | 'observer'
  avatar?: string
  lastLogin?: string
  licenseExpiry?: string
  isLicenseExpired?: boolean
  hasLicense?: boolean
  licenseType?: string
}

// 记录相关类型
export interface Record {
  id: number
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  date: string
  shop?: string
  createdAt: string
  updatedAt: string
}

// 统计数据类型
export interface Stats {
  totalIncome: number
  totalExpense: number
  balance: number
  monthlyIncome: number
  monthlyExpense: number
  categoryStats: {
    category: string
    amount: number
    percentage: number
  }[]
}

// API响应类型
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 登录表单类型
export interface LoginForm {
  username: string
  password: string
  remember?: boolean
}

// 记录表单类型
export interface RecordForm {
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  date: string
  shop?: string
}

// 分页参数类型
export interface PageParams {
  page: number
  pageSize: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: Record<string, any>
}

// 分页响应类型
export interface PageResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}