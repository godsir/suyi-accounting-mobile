// 原有系统API配置 - 在生产环境中使用完整URL，在开发环境中使用代理
const API_BASE_URL = 'https://suyiapi.cpolar.cn/api'
//https://suyiapi.cpolar.cn/api
//http://127.0.0.1:3000/api

// API端点 - 与原有系统保持一致
export const API_ENDPOINTS = {
  base: API_BASE_URL,
  records: '/records',
  allRecords: '/records/all',
  recentRecords: '/records/recent',
  monthlyRecords: '/stats/monthly',
  REVENUE_RECORDS: '/records',
  EXPENSE_RECORDS: '/records',
  SHOPS: '/shops',
  accounting: '/accounting',
  shops: '/shops',
  stats: '/stats',
  weather: '/weather',
  weatherClear: '/weather/clear',
  futureWeather: '/weather/future',
  cityCodes: '/weather/city-codes',
  importIncome: '/import/income',
  importExpense: '/import/expense',
  importWeather: '/import/weather',
  expenseRecords: '/records/expense-records',
  forecast: '/stats/forecast',
  email: '/email',
  users: '/users',
}

// 原有系统数据结构定义
export interface Shop {
  id: number
  name: string
  city: string
}

export interface User {
  id: number
  username: string
  email?: string
  role: 'super_admin' | 'admin' | 'user' | 'observer'
  shops?: Shop[]
  lastLogin?: string
  licenseExpiry?: string
  isLicenseExpired?: boolean
  hasLicense?: boolean
  licenseType?: string
  daysUntilExpiry?: number
}

// 收入记录结构 - 与原有系统一致
export interface IncomeRecord {
  id?: string
  type: 'income'
  shopName: string
  date: string
  cashIncome: number
  wechatIncome: number
  meituanIncome: number
  jingdongIncome: number
  groupBuyIncome: number
  sujieIncome: number
  kuaipaoIncome: number
  maidanbaIncome: number
  elemeIncome: number
  luchengIncome: number
  totalIncome: number
  createdAt?: string
  updatedAt?: string
}

// 支出记录结构 - 与原有系统一致
export interface ExpenseRecord {
  id?: string
  type: 'expense'
  shopName: string
  date: string
  expenseItems: ExpenseItem[]
  totalExpense: number
  createdAt?: string
  updatedAt?: string
}

export interface ExpenseItem {
  description: string
  amount: number
}

// 账务记录 - 汇总数据
export interface AccountingRecord {
  id: string
  date: string
  shopName: string
  totalIncome: number
  totalExpense: number
  netProfit: number
  cashIncome?: number
  wechatIncome?: number
  meituanIncome?: number
  jingdongIncome?: number
  groupBuyIncome?: number
  sujieIncome?: number
  kuaipaoIncome?: number
  maidanbaIncome?: number
  elemeIncome?: number
  luchengIncome?: number
}

// 统计数据
export interface DashboardStats {
  totalIncome: number
  totalExpense: number
  netProfit: number
  recordCount: number
  monthlyIncome: number
  monthlyExpense: number
}

// 收入占比数据
export interface IncomePieData {
  value: number
  name: string
  color: string
}

// 支出占比数据
export interface ExpensePieData {
  value: number
  name: string
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message?: string
  error?: string
}

// 登录表单
export interface LoginForm {
  username?: string
  email?: string
  password: string
}

// 创建axios实例
import axios from 'axios'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        if (user.id) {
          config.headers['user-id'] = user.id.toString()
          config.headers['user-role'] = user.role || 'observer'
        }
      } catch (error) {
        console.error('解析用户信息失败:', error)
      }
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRequest = 
        error.config?.url?.includes('/auth/login') || 
        error.config?.url?.includes('/auth/register')
      
      if (!isAuthRequest) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        
        const message = error.response?.data?.message || '您的登录已过期，请重新登录'
        console.error(message)
        
        // 跳转到登录页
        window.location.href = '/login'
      }
    }
    
    return Promise.reject(error)
  }
)

// 解析API响应
const parseApiResponse = (response: any) => {
  
  if (!response) return null
  
  // 对于axios响应，数据在response.data中
  if (response.data !== undefined) {
    return response.data
  }
  
  return response
}

// API方法封装
export const api = {
  get: async (url: string, params?: any) => {
    try {
      const response = await apiClient.get(url, { params })
      const parsedData = parseApiResponse(response)
      
      if (url.includes('records') || url.includes('expense-records')) {
        return Array.isArray(parsedData) ? parsedData : (Array.isArray(parsedData?.data) ? parsedData.data : [])
      }
      
      return parsedData || {}
    } catch (error) {
      console.error(`API GET ${url} error:`, error)
      if (url.includes('records') || url.includes('all') || url.includes('recent')) {
        return []
      }
      throw error
    }
  },
  
  post: async (url: string, data?: unknown) => {
    try {
      const response = await apiClient.post(url, data)
      return parseApiResponse(response)
    } catch (error: unknown) {
      console.error(`API POST ${url} error:`, error)
      throw error
    }
  },
  
  put: async (url: string, data?: unknown) => {
    try {
      const response = await apiClient.put(url, data)
      return parseApiResponse(response)
    } catch (error: unknown) {
      console.error(`API PUT ${url} error:`, error)
      throw error
    }
  },
  
  delete: async (url: string, data?: unknown) => {
    try {
      const response = await apiClient.delete(url, data ? { data } : undefined)
      return parseApiResponse(response)
    } catch (error: unknown) {
      console.error(`API DELETE ${url} error:`, error)
      throw error
    }
  }
}

// 原有系统的收入平台映射
export const PLATFORM_MAP = {
  cash: { name: "现金" },
  wechat: { name: "微信" },
  meituan: { name: "美团" },
  jd: { name: "京东" },
  groupbuy: { name: "团购" },
  sujie: { name: "宿捷" },
  kuaipao: { name: "快跑者" },
  maidanba: { name: "买单吧" },
  eleme: { name: "饿了么" },
  lucheng: { name: "鹿城生" },
} as const

// 收入字段映射
export const INCOME_FIELDS = ["cash", "wechat", "meituan", "jd", "groupbuy", "sujie", "kuaipao", "maidanba", "eleme", "lucheng"] as const

// 注册表单
export interface RegisterForm {
  username: string
  email: string
  password: string
}

// 忘记密码表单
export interface ForgotPasswordForm {
  email: string
}

// 认证API
export const authAPI = {
  // 登录
  login: async (data: LoginForm): Promise<ApiResponse<{ token: string; user: User }>> => {
    try {
      const response = await api.post('/auth/login', data)
      return {
        success: true,
        data: response,
        message: '登录成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '登录失败'
      }
    }
  },
  
  // 注册
  register: async (data: RegisterForm): Promise<ApiResponse<User>> => {
    try {
      const response = await api.post('/auth/register', data)
      return {
        success: true,
        data: response,
        message: '注册成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '注册失败'
      }
    }
  },
  
  // 忘记密码
  forgotPassword: async (data: ForgotPasswordForm): Promise<ApiResponse> => {
    try {
      await api.post('/auth/forgot-password', data)
      return {
        success: true,
        message: '密码重置邮件发送成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '发送失败'
      }
    }
  },
  
  // 获取用户信息
  getUserInfo: async (): Promise<ApiResponse<User>> => {
    try {
      const response = await api.get('/auth/me')
      return {
        success: true,
        data: response,
        message: '获取用户信息成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '获取用户信息失败'
      }
    }
  },
  
  // 登出
  logout: async (): Promise<ApiResponse> => {
    try {
      await api.post('/auth/logout')
      return {
        success: true,
        message: '登出成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '登出失败'
      }
    }
  },
  
  // 更新用户信息 - 需要使用 /users/:id 端点
  updateProfile: async (userId: number, data: Partial<User>): Promise<ApiResponse<User>> => {
    try {
      const response = await api.put(`/users/${userId}`, data)
      return {
        success: true,
        data: response,
        message: '更新用户信息成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '更新用户信息失败'
      }
    }
  }
}

// 记录API
export const recordsAPI = {
  // 获取所有记录
  getAllRecords: async (params?: any): Promise<AccountingRecord[]> => {
    return await api.get(API_ENDPOINTS.allRecords, params)
  },
  
  // 获取最近记录
  getRecentRecords: async (): Promise<AccountingRecord[]> => {
    return await api.get(API_ENDPOINTS.recentRecords)
  },
  
  // 创建收入记录
  createIncomeRecord: async (data: Omit<IncomeRecord, 'id'>): Promise<ApiResponse> => {
    try {
      await api.post(API_ENDPOINTS.REVENUE_RECORDS, data)
      return {
        success: true,
        message: '收入记录保存成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '收入记录保存失败'
      }
    }
  },
  
  // 创建支出记录
  createExpenseRecord: async (data: Omit<ExpenseRecord, 'id'>): Promise<ApiResponse> => {
    try {
      await api.post(API_ENDPOINTS.EXPENSE_RECORDS, data)
      return {
        success: true,
        message: '支出记录保存成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '支出记录保存失败'
      }
    }
  },
  
  // 获取支出明细
  getExpenseRecords: async (): Promise<any[]> => {
    return await api.get(API_ENDPOINTS.expenseRecords)
  },
  
  // 删除记录
  deleteRecord: async (id: string): Promise<ApiResponse> => {
    try {
      await api.delete(`${API_ENDPOINTS.accounting}/${id}`)
      return {
        success: true,
        message: '删除成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '删除失败'
      }
    }
  }
}

// 统计API
export const statsAPI = {
  // 获取月度统计
  getMonthlyStats: async (shop?: string): Promise<any[]> => {
    return await api.get(API_ENDPOINTS.stats + '/monthly', shop ? { shop } : undefined)
  },

  // 获取统计数据
  getStats: async (statType: string, params: Record<string, any> = {}): Promise<any[]> => {
    return await api.get(`${API_ENDPOINTS.stats}/${statType}`, params)
  },

  // 获取未来预测
  getForecast: async (params: Record<string, any> = {}): Promise<any> => {
    return await api.get(`${API_ENDPOINTS.stats}/forecast`, params)
  },

  // 获取日收入预测
  getDailyRevenueForecast: async (params: Record<string, any> = {}): Promise<any> => {
    return await api.get(`${API_ENDPOINTS.stats}/forecast/daily-revenue`, params)
  }
}

// 店铺API
export const shopsAPI = {
  // 获取店铺列表
  getShops: async (): Promise<Shop[]> => {
    try {
      return await api.get(API_ENDPOINTS.SHOPS)
    } catch (error) {
      console.error('获取店铺列表失败:', error)
      return []
    }
  },
  
  // 获取我的店铺
  getMyShops: async (): Promise<Shop[]> => {
    try {
      return await api.get(API_ENDPOINTS.SHOPS + '/my')
    } catch (error) {
      console.error('获取我的店铺失败:', error)
      return []
    }
  },
  
  // 创建店铺
  createShop: async (data: Omit<Shop, 'id'>): Promise<ApiResponse<Shop>> => {
    try {
      const response = await api.post(API_ENDPOINTS.SHOPS, data)
      return {
        success: true,
        data: response,
        message: '店铺创建成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '店铺创建失败'
      }
    }
  },
  
  // 更新店铺
  updateShop: async (id: number, data: Partial<Shop>): Promise<ApiResponse<Shop>> => {
    try {
      const response = await api.put(`${API_ENDPOINTS.SHOPS}/${id}`, data)
      return {
        success: true,
        data: response,
        message: '店铺更新成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '店铺更新失败'
      }
    }
  },
  
  // 删除店铺
  deleteShop: async (id: number): Promise<ApiResponse> => {
    try {
      await api.delete(`${API_ENDPOINTS.SHOPS}/${id}`)
      return {
        success: true,
        message: '店铺删除成功'
      }
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || '店铺删除失败'
      }
    }
  }
}

// 工具函数
export const utils = {
  // 格式化金额（原有系统没有除以100，直接显示）
  formatAmount: (amount: number): string => {
    return amount.toFixed(2)
  },
  
  // 格式化日期
  formatDate: (date: string | Date): string => {
    return new Date(date).toLocaleDateString('zh-CN')
  },
  
  // 格式化日期时间
  formatDateTime: (date: string | Date): string => {
    return new Date(date).toLocaleString('zh-CN')
  },
  
  // 获取当前日期字符串
  getCurrentDate: (): string => {
    return new Date().toISOString().split('T')[0]
  }
}
