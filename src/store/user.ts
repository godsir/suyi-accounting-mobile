import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI, shopsAPI, api, type User, type Shop } from '@/api'

export const useUserStore = defineStore('user', () => {
  // 状态
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))
  const isLoading = ref(false)
  const userShops = ref<Shop[]>([])

  // 计算属性
  const isLoggedIn = computed(() => !!token.value && !!user.value)
  const username = computed(() => user.value?.username || '')
  const email = computed(() => user.value?.email || '')
  const role = computed(() => user.value?.role || 'observer')
  const hasLicense = computed(() => user.value?.hasLicense || false)
  const isLicenseExpired = computed(() => user.value?.isLicenseExpired || false)
  
  // 权限相关计算属性
  const isAdmin = computed(() => role.value === 'admin' || role.value === 'super_admin')
  const isUser = computed(() => role.value === 'user')
  const isObserver = computed(() => role.value === 'observer')
  const isSuperAdmin = computed(() => role.value === 'super_admin')
  
  // 店铺权限
  const hasShopAccess = computed(() => userShops.value.length > 0)
  const canManageShops = computed(() => isAdmin.value)
  const canAddRecords = computed(() => (isAdmin.value || isUser.value) && hasShopAccess.value)
  const canViewStats = computed(() => hasShopAccess.value)

  // 初始化方法
  const init = () => {
    // 从localStorage恢复用户状态
    const savedToken = localStorage.getItem('token')
    const savedUserInfo = localStorage.getItem('user')
    
    if (savedToken && savedUserInfo) {
      try {
        token.value = savedToken
        user.value = JSON.parse(savedUserInfo)
        
        // 异步加载用户店铺权限
        loadUserShops().catch(error => {
          console.error('加载用户店铺权限失败:', error)
        })
      } catch (error) {
        console.error('恢复用户状态失败:', error)
        // 清除无效数据
        logout()
      }
    }
  }
  
  // 处理用户授权信息的通用函数 - 参考electron客户端的逻辑
  const processUserLicenseData = (userData: any) => {

 
    // 参考electron客户端的处理方式，直接使用后端返回的数据，不额外计算
    const result = {
      ...userData,
      // 确保关键字段存在
      isLicenseExpired: userData?.isLicenseExpired || false,
      daysUntilExpiry: userData?.daysUntilExpiry,
      hasLicense: userData?.hasLicense !== false,
      licenseType: userData?.licenseType || 'standard',
      isPermanent: userData?.licenseType === 'permanent' || userData?.isPermanent
    }
    

    return result
  }
  
  // 初始化用户状态
  const initializeUser = async () => {
    if (token.value) {
      try {
        isLoading.value = true
        const response = await authAPI.getUserInfo()
        if (response.success && response.data) {
          let userData = response.data.user || response.data
          
          // 如果从 /auth/me 获取的 licenseExpiry 是 null，尝试从 /users/:id 获取正确的数据
          if (userData.licenseExpiry === null && userData.id) {
            console.log('🔄 /auth/me 返回的 licenseExpiry 为 null，尝试从 /users/:id 获取正确数据')
            try {
              const userDetailResponse = await api.get(`/users/${userData.id}`)
              if (userDetailResponse.success && userDetailResponse.user) {
                console.log('✅ 从 /users/:id 获取到正确的用户数据:', userDetailResponse.user)
                userData = userDetailResponse.user
              }
            } catch (userError) {
              console.error('从 /users/:id 获取用户详情失败:', userError)
            }
          }
          
          const completeUserData = processUserLicenseData(userData)
          
          user.value = completeUserData
          
   
          
          // 更新本地存储
          localStorage.setItem('user', JSON.stringify(completeUserData))
          
          // 加载店铺权限
          await loadUserShops()
          
        } else {
          // Token无效，清除登录状态
          await logout()
        }
      } catch (error) {
        console.error('初始化用户状态失败:', error)
        await logout()
      } finally {
        isLoading.value = false
      }
    }
  }

  // 加载用户店铺权限
  const loadUserShops = async () => {
    try {
      const shopsResponse = await shopsAPI.getShops()
      
      // 解析店铺数据 - 后端返回的可能是 { success: true, data: [...] } 或直接是数组
      let shops = []
      if (Array.isArray(shopsResponse)) {
        shops = shopsResponse
      } else if (shopsResponse && Array.isArray(shopsResponse.data)) {
        shops = shopsResponse.data
      } else if (shopsResponse && shopsResponse.success && Array.isArray(shopsResponse.shops)) {
        shops = shopsResponse.shops
      }
    
      
      // 根据后端实际的权限逻辑处理
      // 只有超级管理员(super_admin)可以访问所有店铺，普通管理员(admin)也需要授权
      if (role.value === 'super_admin') {
        // 超级管理员可以访问所有店铺
        userShops.value = shops
        console.log('超级管理员权限：可访问所有店铺')
      } else {
        // 普通管理员(admin)、普通用户(user)、观察者(observer)都需要通过API获取具体的店铺权限
        try {
          // 尝试获取用户的具体店铺权限
          const userShopsResponse = await api.get(`/users/${user.value?.id}/shops`)
          
          if (userShopsResponse && userShopsResponse.success === true && Array.isArray(userShopsResponse.shops)) {
            userShops.value = userShopsResponse.shops
            console.log(`${role.value}权限：可访问${userShopsResponse.shops.length}个授权店铺`)
          } else {
            // 如果无法获取权限，默认无权限
            userShops.value = []
            console.log(`${role.value}权限：无授权店铺`)
          }
        } catch (error) {
          console.error('获取用户店铺权限失败:', error)
          // 如果无法获取权限，默认无权限
          userShops.value = []
        }
      }
      

    } catch (error) {
      console.error('加载店铺权限失败:', error)
      userShops.value = []
    }
  }

  // 获取店铺选择选项
  const getShopSelectOptions = () => {
    const options = []
    
    // 如果有多个店铺权限，添加"全部"选项
    if (userShops.value.length > 1) {
      options.push({ label: '全部店铺', value: '全部' })
    }
    
    // 添加具体店铺选项
    userShops.value.forEach(shop => {
      options.push({
        label: `${shop.name} (${shop.city})`,
        value: shop.name
      })
    })
    
    return options
  }

  // 根据店铺权限过滤数据
  const filterDataByShopPermission = (data: any[]) => {
    if (!data || data.length === 0) return []
    
    // 只有超级管理员可以看到所有数据
    if (isSuperAdmin.value) {
      return data
    }
    
    // 普通管理员、普通用户、观察者只能看到有权限的店铺数据
    if (userShops.value.length === 0) {
      return []
    }
    
    const allowedShopNames = userShops.value.map(shop => shop.name)
    return data.filter(record => 
      record.shopName && allowedShopNames.includes(record.shopName)
    )
  }

  // 登录 - 支持邮箱或用户名
  const login = async (emailOrUsername: string, password: string) => {
    try {
      isLoading.value = true
      
      // 判断是邮箱还是用户名
      const isEmail = emailOrUsername.includes('@')
      const loginData = isEmail 
        ? { email: emailOrUsername, password }
        : { username: emailOrUsername, password }
      
      const response = await authAPI.login(loginData)
      
      if (response.success && response.data) {
        token.value = response.data.token
        
        let userData = response.data.user
        
        // 如果登录返回的 licenseExpiry 是 null，尝试从 /users/:id 获取正确的数据
        if (userData.licenseExpiry === null && userData.id) {
          console.log('🔄 登录返回的 licenseExpiry 为 null，尝试从 /users/:id 获取正确数据')
          try {
            const userDetailResponse = await api.get(`/users/${userData.id}`)
            if (userDetailResponse.success && userDetailResponse.user) {
              console.log('✅ 从 /users/:id 获取到正确的用户数据:', userDetailResponse.user)
              userData = userDetailResponse.user
            }
          } catch (userError) {
            console.error('从 /users/:id 获取用户详情失败:', userError)
          }
        }
        
        // 使用统一的授权信息处理函数
        const completeUserData = processUserLicenseData(userData)
        user.value = completeUserData
        
        console.log('登录设置用户数据:', completeUserData)
        console.log('用户角色:', completeUserData.role)
        console.log('授权状态:', {
          hasLicense: completeUserData.hasLicense,
          isLicenseExpired: completeUserData.isLicenseExpired,
          daysUntilExpiry: completeUserData.daysUntilExpiry,
          licenseType: completeUserData.licenseType,
          licenseExpiry: completeUserData.licenseExpiry
        })
        
        // 存储到本地存储
        localStorage.setItem('token', response.data.token)
        localStorage.setItem('user', JSON.stringify(completeUserData))
        
        // 加载店铺权限
        await loadUserShops()
        
        return { success: true, message: '登录成功' }
      } else {
        return { success: false, message: response.message || '登录失败' }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '登录失败'
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }

  // 登出
  const logout = async () => {
    try {
      await authAPI.logout()
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 清除本地状态
      token.value = null
      user.value = null
      userShops.value = []
      localStorage.removeItem('token')
      localStorage.removeItem('user')
    }
  }

  // 更新用户信息
  const updateProfile = async (data: Partial<User>) => {
    try {
      isLoading.value = true
      
      if (!user.value?.id) {
        return { success: false, message: '用户ID不存在' }
      }
      
      const response = await authAPI.updateProfile(user.value.id, data)
      
      if (response.success && response.data) {
        // 更新本地用户数据
        const updatedUser = { ...user.value, ...response.data }
        user.value = updatedUser
        localStorage.setItem('user', JSON.stringify(updatedUser))
        
        return { success: true, message: '更新成功' }
      } else {
        return { success: false, message: response.message || '更新失败' }
      }
    } catch (error: any) {
      const message = error.response?.data?.message || '更新失败'
      return { success: false, message }
    } finally {
      isLoading.value = false
    }
  }

  // 更新用户数据（用于本地状态更新）
  const updateUser = (userData: any) => {
    user.value = userData
    localStorage.setItem('user', JSON.stringify(userData))
  }

  return {
    // 状态
    user,
    token,
    isLoading,
    userShops,
    
    // 计算属性
    isLoggedIn,
    username,
    email,
    role,
    hasLicense,
    isLicenseExpired,
    isAdmin,
    isUser,
    isObserver,
    hasShopAccess,
    canManageShops,
    canAddRecords,
    canViewStats,
    
    // 方法
    init,
    initializeUser,
    loadUserShops,
    getShopSelectOptions,
    filterDataByShopPermission,
    login,
    logout,
    updateProfile,
    updateUser
  }
})