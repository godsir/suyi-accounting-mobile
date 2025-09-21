<template>
  <div class="profile-container">
    <!-- 顶部用户信息区域 -->
    <div class="user-header">
      <div class="user-info">
        <div class="avatar-section">
          <el-avatar :size="80" :src="userStore.user?.avatar || undefined">
            <UserFilled />
          </el-avatar>
          <div class="status-dot" :class="getStatusDotClass()"></div>
        </div>
        
        <div class="user-detail">
          <div class="username">{{ userStore.username || '未知用户' }}</div>
          <div class="role-badge">{{ getRoleDisplayName(userStore.role) }}</div>
        </div>
      </div>
      
      <!-- 授权状态卡片 -->
      <div class="license-card" :class="getAuthorizeStatus().type">
        <div class="license-status">
          <div class="status-left">
            <div class="status-text">{{ getAuthorizeStatus().text }}</div>
            <div v-if="shouldShowDaysTextUnderStatus()" class="days-text">
              剩余{{ getAuthorizeStatus().days }}天
            </div>
            <div v-else-if="shouldShowLicenseExpiry()" class="expiry-text">
              {{ formatLicenseExpiry() }}
            </div>
          </div>
          <div class="status-right">
            <div class="go-btn">
              {{ getRemainingTimeText() }}
            </div>
          </div>
        </div>
      </div>

      <!-- 功能入口卡片（根据用户身份显示） -->
      <div class="entry-card">
        <div class="entry-grid">
          <!-- 超级管理员：显示所有功能 -->
          <template v-if="userStore.role === 'super_admin'">
            <div class="entry-item" @click="handleNavigateToFeature('/stats')">
              <div class="entry-icon stats">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="entry-text">统计报表</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/forecast')">
              <div class="entry-icon forecast">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="entry-text">预测分析</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/weather')">
              <div class="entry-icon weather">
                <el-icon><Cloudy /></el-icon>
              </div>
              <div class="entry-text">天气信息</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/email-report')">
              <div class="entry-icon email-report">
                <el-icon><Message /></el-icon>
              </div>
              <div class="entry-text">邮件报表</div>
            </div>
          </template>

          <!-- 普通管理员：显示统计、预测、天气 -->
          <template v-else-if="userStore.role === 'admin'">
            <div class="entry-item" @click="handleNavigateToFeature('/stats')">
              <div class="entry-icon stats">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="entry-text">统计报表</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/forecast')">
              <div class="entry-icon forecast">
                <el-icon><DataAnalysis /></el-icon>
              </div>
              <div class="entry-text">预测分析</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/weather')">
              <div class="entry-icon weather">
                <el-icon><Cloudy /></el-icon>
              </div>
              <div class="entry-text">天气信息</div>
            </div>
          </template>

          <!-- 普通用户：只显示统计报表 -->
          <template v-else-if="userStore.role === 'user'">
            <div class="entry-item" @click="handleNavigateToFeature('/stats')">
              <div class="entry-icon stats">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="entry-text">统计报表</div>
            </div>
          </template>

          <!-- 观察者：显示统计和天气 -->
          <template v-else-if="userStore.role === 'observer'">
            <div class="entry-item" @click="handleNavigateToFeature('/stats')">
              <div class="entry-icon stats">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="entry-text">统计报表</div>
            </div>
            <div class="entry-item" @click="handleNavigateToFeature('/weather')">
              <div class="entry-icon weather">
                <el-icon><Cloudy /></el-icon>
              </div>
              <div class="entry-text">天气信息</div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- 菜单列表 -->
    <div class="menu-container">
      <!-- 主要功能 -->
      <div class="menu-section">
        <div class="menu-item" @click="showShopsModal = true">
          <div class="item-icon shops">
            <Shop />
          </div>
          <div class="item-text">店铺权限</div>
          <div class="item-right">
            <span class="item-desc">{{ userStore.userShops.length }}个店铺</span>
            <div class="arrow">›</div>
          </div>
        </div>
        
        <div class="menu-item" @click="handleGoToSettings">
          <div class="item-icon settings">
            <Setting />
          </div>
          <div class="item-text">设置</div>
          <div class="item-right">
            <div class="arrow">›</div>
          </div>
        </div>
        
        <div class="menu-item" @click="handleGoToAbout">
          <div class="item-icon about">
            <InfoFilled />
          </div>
          <div class="item-text">关于我们</div>
          <div class="item-right">
            <div class="arrow">›</div>
          </div>
        </div>
      </div>
      
      <!-- 退出登录 -->
      <div class="menu-section">
        <div class="menu-item logout-item" @click="handleLogout" :class="{ loading: logoutLoading }">
          <div class="item-icon logout">
            <SwitchButton />
          </div>
          <div class="item-text">退出登录</div>
          <div v-if="logoutLoading" class="loading-spinner">
            <div class="spinner"></div>
          </div>
        </div>
      </div>
    </div>


    <!-- 店铺权限弹窗 -->
    <el-dialog
      v-model="showShopsModal"
      title="店铺权限"
      width="85%"
      class="shops-modal"
    >
      <div v-if="userStore.userShops.length > 0" class="shops-list">
        <div 
          v-for="shop in userStore.userShops" 
          :key="shop.id"
          class="shop-item"
        >
          <div class="shop-info">
            <div class="shop-icon">
              <Shop />
            </div>
            <div class="shop-detail">
              <div class="shop-name">{{ shop.name }}</div>
              <div class="shop-city">{{ shop.city }}</div>
            </div>
          </div>
          <div class="shop-status">已授权</div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-text">暂无店铺权限</div>
        <div class="empty-desc">请联系管理员分配店铺访问权限</div>
      </div>
      
      <template #footer>
        <el-button @click="showShopsModal = false" type="primary" style="width: 100%;">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { API_ENDPOINTS, api } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft, 
  User, 
  UserFilled, 
  Lock, 
  Shop, 
  Setting, 
  InfoFilled, 
  SwitchButton,
  Bell,
  TrendCharts,
  DataAnalysis,
  Cloudy,
  Message
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const { hasPermission } = usePermissions()
// 直接从 hook 中导入的 PERMISSIONS 常量已经可以在模板中使用

// 数据
const notifications = ref(true)
const logoutLoading = ref(false)
const showShopsModal = ref(false)
const showSystemInfo = ref(false)
// API基地址
const API_BASE_URL = API_ENDPOINTS.base

// 计算属性
const isLicenseExpiringSoon = computed(() => {
  if (!userStore.user?.licenseExpiry || userStore.isLicenseExpired) return false
  
  const expiryDate = new Date(userStore.user.licenseExpiry)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays <= 30 && diffDays > 0
})

const daysUntilExpiry = computed(() => {
  if (!userStore.user?.licenseExpiry) return 0
  
  const expiryDate = new Date(userStore.user.licenseExpiry)
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
})

// 判断是否为管理员或超级管理员
const isAdminOrSuperAdmin = computed(() => {
  return userStore.role === 'admin' || userStore.role === 'super_admin'
})

// 方法
const getRoleTagType = (role: string) => {
  switch (role) {
    case 'super_admin': return 'danger'
    case 'admin': return 'warning'
    case 'user': return 'primary'
    case 'observer': return 'info'
    default: return 'info'
  }
}

const getRoleDisplayName = (role: string) => {
  switch (role) {
    case 'super_admin': return '超级管理员'
    case 'admin': return '管理员'
    case 'user': return '普通用户'
    case 'observer': return '观察者'
    default: return '未知角色'
  }
}

const formatDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 删除这些函数，因为现在由主题store处理

const handleEditProfile = () => {
  ElMessage.info('个人信息编辑功能开发中...')
  // 可以跳转到编辑页面或显示编辑弹窗
}

// 跳转到设置页面
const handleGoToSettings = () => {
  router.push('/settings')
}

// 跳转到关于我们页面
const handleGoToAbout = () => {
  router.push('/about')
}

// 授权状态判断函数 - 参考electron客户端的逻辑
const getAuthorizeStatus = () => {
  const userData = userStore.user
  
  
  // 参考electron客户端UserConfigTab的授权状态判断逻辑
  
  // 优先检查是否为永久授权
  if (userData?.licenseType === 'permanent' || 
      userData?.type === 'permanent' || 
      userData?.licenseType === 'unlimited' ||
      userData?.type === 'unlimited' ||
      userData?.isPermanent === true ||
      (userData?.daysUntilExpiry === null && userData?.hasLicense === true) ||
      (userData?.licenseExpiry === null && userData?.hasLicense !== false)) {

    return {
      type: 'permanent',
      text: '永久授权',
      days: null
    }
  }
  
  // 检查是否已过期
  if (userData?.isLicenseExpired === true) {

    return {
      type: 'expired',
      text: '已过期',
      days: null
    }
  }
  
  // 有效的天数信息
  if (userData?.daysUntilExpiry !== undefined && userData?.daysUntilExpiry !== null) {
    const days = userData.daysUntilExpiry
    
    if (days <= 0) {
      return {
        type: 'expired',
        text: '已过期',
        days: null
      }
    } else if (days <= 7) {
      return {
        type: 'warning',
        text: days <= 3 ? '紧急' : '即将过期',
        days: days
      }
    } else if (days <= 30) {
      return {
        type: 'warning',
        text: '即将过期',
        days: days
      }
    } else {
      return {
        type: 'success',
        text: '有效',
        days: days
      }
    }
  }
  
  // 检查是否有授权但没有天数信息
  if (userData?.hasLicense === true) {
    console.log('hasLicense为true，显示已授权')
    return {
      type: 'success',
      text: '已授权',
      days: null
    }
  }
  
  // 有有效的授权过期时间
  if (userData?.licenseExpiry && userData.licenseExpiry !== null && userData.licenseExpiry !== 'null') {
    const expiryDate = new Date(userData.licenseExpiry)
    // 检查日期是否有效
    if (!isNaN(expiryDate.getTime())) {
      return {
        type: userData.isLicenseExpired ? 'expired' : 'success',
        text: userData.isLicenseExpired ? '已过期' : '有效',
        days: userData.daysUntilExpiry
      }
    }
  }
  
  // 默认显示永久授权（参考electron客户端的处理）
  return {
    type: 'permanent',
    text: '永久授权',
    days: null
  }
}

// 是否显示授权有效期
const shouldShowLicenseExpiry = () => {
  const userData = userStore.user
  
  // 判断是否为永久授权（与授权状态判断逻辑一致）
  const isPermanentLicense = (
    userData?.licenseType === 'permanent' || 
    userData?.licenseType === 'unlimited' ||
    userData?.licenseExpiry === null || 
    userData?.licenseExpiry === undefined ||
    userData?.licenseExpiry === 'permanent'
  )
  
  // 永久授权不显示有效期
  if (isPermanentLicense) {
    return false
  }
  
  // 有具体的过期时间才显示
  return userData?.licenseExpiry && 
         userData.licenseExpiry !== 'null' && 
         userData.licenseExpiry !== 'permanent'
}

// 是否在状态文字下方显示剩余天数
const shouldShowDaysTextUnderStatus = () => {
  const status = getAuthorizeStatus()
  
  // 只有在状态不是"即将过期"或"紧急"时才显示
  // 因为这些状态右侧已经显示了剩余时间，避免重复
  if (status.type === 'warning') {
    return false
  }
  
  // 其他情况（成功状态且有剩余天数）才显示
  return status.days !== null && status.days !== undefined && status.days > 0
}

// 获取授权有效期文本
const getLicenseExpiryText = () => {
  const userData = userStore.user
  
  if (!userData?.licenseExpiry || userData.licenseExpiry === null) {
    return '永久有效'
  }
  
  if (userData.licenseExpiry === 'permanent') {
    return '永久有效'
  }
  
  // 格式化过期时间
  const expiryDate = new Date(userData.licenseExpiry)
  if (isNaN(expiryDate.getTime())) {
    return '格式错误'
  }
  
  const now = new Date()
  const diffTime = expiryDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) {
    return `${formatDate(userData.licenseExpiry)} (已过期)`
  } else if (diffDays === 0) {
    return `${formatDate(userData.licenseExpiry)} (今天到期)`
  } else {
    return formatDate(userData.licenseExpiry)
  }
}

// 获取状态点的样式类
const getStatusDotClass = () => {
  const status = getAuthorizeStatus()
  switch (status.type) {
    case 'permanent': return 'active'
    case 'success': return 'active'
    case 'warning': return 'warning'
    case 'expired': return 'expired'
    default: return 'active'
  }
}

// 获取角色徽章的样式类
const getRoleBadgeClass = () => {
  switch (userStore.role) {
    case 'super_admin': return 'super-admin'
    case 'admin': return 'admin'
    case 'user': return 'user'
    case 'observer': return 'observer'
    default: return 'observer'
  }
}

// 格式化授权过期时间
const formatLicenseExpiry = () => {
  const userData = userStore.user
  
  if (!userData?.licenseExpiry || userData.licenseExpiry === null) {
    return '永久有效'
  }
  
  if (userData.licenseExpiry === 'permanent') {
    return '永久有效'
  }
  
  const expiryDate = new Date(userData.licenseExpiry)
  if (isNaN(expiryDate.getTime())) {
    return '格式错误'
  }
  
  return formatDate(userData.licenseExpiry)
}

// 获取状态按钮文本
const getStatusButtonText = () => {
  const status = getAuthorizeStatus()
  switch (status.type) {
    case 'permanent': return '永久'
    case 'success': return '正常'
    case 'warning': return '续期'
    case 'expired': return '过期'
    default: return '查看'
  }
}

// 获取剩余时间文本（右侧按钮显示）
const getRemainingTimeText = () => {
  const status = getAuthorizeStatus()
  const userData = userStore.user
  
  // 永久授权
  if (status.type === 'permanent') {
    return '永久'
  }
  
  // 已过期
  if (status.type === 'expired') {
    return '已过期'
  }
  
  // 有剩余天数时显示具体天数
  if (status.days !== null && status.days !== undefined) {
    if (status.days <= 0) {
      return '已过期'
    } else if (status.days === 1) {
      return '1天'
    } else if (status.days <= 30) {
      return `${status.days}天`
    } else if (status.days <= 365) {
      const months = Math.floor(status.days / 30)
      const remainingDays = status.days % 30
      if (remainingDays === 0) {
        return `${months}个月`
      } else {
        return `${months}个月${remainingDays}天`
      }
    } else {
      const years = Math.floor(status.days / 365)
      const remainingDays = status.days % 365
      if (remainingDays === 0) {
        return `${years}年`
      } else {
        const months = Math.floor(remainingDays / 30)
        if (months === 0) {
          return `${years}年${remainingDays}天`
        } else {
          return `${years}年${months}个月`
        }
      }
    }
  }
  
  // 默认情况
  return '查看'
}

// 处理功能导航
const handleNavigateToFeature = (path: string) => {
  // 检查店铺权限（所有功能都需要店铺权限）  
  if (!userStore.hasShopAccess) {
    ElMessage.warning('您没有店铺访问权限，无法使用此功能')
    return
  }
  
  router.push(path)
}

const handleLogout = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    logoutLoading.value = true
    
    await userStore.logout()
    
    ElMessage.success('已退出登录')
    
    // 跳转到登录页
    router.replace('/login')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('退出登录失败:', error)
      ElMessage.error('退出登录失败')
    }
  } finally {
    logoutLoading.value = false
  }
}



// 初始化设置
onMounted(() => {
  // 从本地存储读取通知设置
  const savedNotifications = localStorage.getItem('notifications')
  if (savedNotifications !== null) {
    notifications.value = savedNotifications === 'true'
  }
})
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 100px;
}

// 用户头部区域
.user-header {
  background: #ffffff;
  padding: 24px 20px;
  margin-bottom: 20px;
  position: relative;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  .user-info {
    display: flex;
    align-items: center;
    margin-bottom: 24px;
    position: relative;
    z-index: 2;
    
    .avatar-section {
      position: relative;
      margin-right: 18px;
      cursor: pointer;
      
      .el-avatar {
        border: 3px solid #f0f0f0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        
        &:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
          border-color: #e0e0e0;
        }
      }
      
      .status-dot {
        position: absolute;
        bottom: 4px;
        right: 4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        z-index: 2;
        
        &.active {
          background: #52c41a;
          animation: pulse 2s infinite;
        }
        
        &.warning {
          background: #faad14;
          animation: pulse 2s infinite;
        }
        
        &.expired {
          background: #ff4d4f;
        }
      }
      
      .avatar-edit-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: all 0.3s ease;
        color: white;
        font-size: 18px;
        z-index: 1;
        
        .el-icon {
          color: white;
        }
      }
      
      &:hover {
        .avatar-edit-overlay {
          opacity: 1;
        }
      }
    }
    
    .user-detail {
      flex: 1;
      
      .username {
        font-size: 22px;
        font-weight: 700;
        color: #333;
        margin-bottom: 8px;
      }
      
      .role-badge {
        display: inline-flex;
        align-items: center;
        padding: 6px 12px;
        background: #f0f0f0;
        color: #666;
        font-size: 13px;
        font-weight: 500;
        border-radius: 20px;
        border: 1px solid #e0e0e0;
      }
    }
  }
  
  // 授权状态卡片
  .license-card {
    border-radius: 12px;
    padding: 16px;
    color: white;
    
    // 根据授权状态动态设置背景色
    &.permanent {
      background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
    }
    
    &.success {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }
    
    &.warning {
      background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
    }
    
    &.expired {
      background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
    }
    
    .license-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .status-left {
        .status-text {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .days-text, .expiry-text {
          font-size: 14px;
          opacity: 0.9;
        }
      }
      
      .status-right {
        .go-btn {
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 15px;
          font-size: 14px;
          font-weight: 500;
          backdrop-filter: blur(10px);
          min-width: 60px;
          text-align: center;
        }
      }
    }
  }
  
  // 功能入口卡片
  .entry-card {
    background: white;
    border-radius: 16px;
    padding: 24px 20px;
    margin-top: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    
    .entry-grid {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      
      .entry-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        padding: 16px 8px;
        border-radius: 16px;
        cursor: pointer;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        overflow: hidden;
        background: #fafafa;
        border: 1px solid transparent;
        
        // 背景渐变效果
        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 16px;
        }
        
        &:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          border-color: rgba(255, 255, 255, 0.2);
          
          &::before {
            opacity: 1;
          }
          
          .entry-icon {
            transform: scale(1.1) rotate(5deg);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
          }
          
          .entry-text {
            color: #1890ff;
            transform: translateY(-2px);
          }
        }
        
        &:active {
          transform: translateY(-2px) scale(0.98);
          transition-duration: 0.1s;
        }
        
        .entry-icon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 12px;
          font-size: 22px;
          color: white;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          
          &.stats {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            
            &:hover {
              background: linear-gradient(135deg, #7c8ff0 0%, #8a5eb8 100%);
            }
          }
          
          &.forecast {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            
            &:hover {
              background: linear-gradient(135deg, #f5a9ff 0%, #ff6b82 100%);
            }
          }
          
          &.weather {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            
            &:hover {
              background: linear-gradient(135deg, #65c2ff 0%, #1affff 100%);
            }
          }
          
          &.email-report {
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            
            &:hover {
              background: linear-gradient(135deg, #ff8181 0%, #ff7043 100%);
            }
          }
        }
        
        .entry-text {
          font-size: 14px;
          color: #333;
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
          letter-spacing: 0.5px;
        }
      }
    }
  }
}

// 菜单容器
.menu-container {
  padding: 0 20px;
  
  .menu-section {
    margin-bottom: 20px;
    
    .section-title {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
      padding-left: 5px;
    }
    
    .menu-item {
      display: flex;
      align-items: center;
      padding: 15px 20px;
      background: white;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      
      &:first-child {
        border-top-left-radius: 10px;
        border-top-right-radius: 10px;
      }
      
      &:last-child {
        border-bottom: none;
        border-bottom-left-radius: 10px;
        border-bottom-right-radius: 10px;
      }
      
      &:hover {
        background: #f9f9f9;
      }
      
      &.logout-item {
        color: #ff4d4f;
        border-radius: 10px;
        border-bottom: none;
        
        &:hover {
          background: #fff2f0;
        }
        
        &.loading {
          opacity: 0.7;
          pointer-events: none;
        }
      }
      
      .item-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        font-size: 16px;
        color: #666;
        
        &.logout {
          color: #ff4d4f;
        }
      }
      
      .item-text {
        flex: 1;
        font-size: 16px;
        color: #333;
      }
      
      .item-right {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .item-desc {
          font-size: 14px;
          color: #999;
        }
        
        .arrow {
          font-size: 16px;
          color: #ccc;
        }
      }
      
      .loading-spinner {
        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #ffccc7;
          border-top: 2px solid #ff4d4f;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
      }
    }
  }
}


// 店铺弹窗样式
:deep(.shops-modal) {
  .el-dialog {
    border-radius: 12px;
  }
  
  .el-dialog__header {
    padding: 20px 20px 0;
    
    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
    }
  }
  
  .el-dialog__body {
    padding: 20px;
  }
  
  .el-dialog__footer {
    padding: 0 20px 20px;
  }
}

.shops-list {
  .shop-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .shop-info {
      display: flex;
      align-items: center;
      flex: 1;
      
      .shop-icon {
        width: 36px;
        height: 36px;
        background: #4facfe;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 16px;
        margin-right: 12px;
      }
      
      .shop-detail {
        .shop-name {
          font-size: 16px;
          font-weight: 500;
          color: #333;
          margin-bottom: 4px;
        }
        
        .shop-city {
          font-size: 14px;
          color: #999;
        }
      }
    }
    
    .shop-status {
      padding: 4px 8px;
      background: #f6ffed;
      color: #52c41a;
      font-size: 12px;
      border-radius: 4px;
      border: 1px solid #d9f7be;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  
  .empty-text {
    font-size: 16px;
    color: #333;
    margin-bottom: 8px;
  }
  
  .empty-desc {
    font-size: 14px;
    color: #999;
  }
}

// 动画
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0.7);
  }
  70% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(82, 196, 26, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(82, 196, 26, 0);
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

// 移动端适配
@media (max-width: 480px) {
  .user-header {
    padding: 15px;
    margin-bottom: 15px;
    
    .entry-card {
      padding: 20px 16px;
      
      .entry-grid {
        gap: 6px;
        
        .entry-item {
          padding: 14px 6px;
          
          .entry-icon {
            width: 50px;
            height: 50px;
            font-size: 20px;
            margin-bottom: 10px;
            border-radius: 16px;
          }
          
          .entry-text {
            font-size: 13px;
            font-weight: 600;
          }
        }
      }
    }
  }
  
  .menu-container {
    padding: 0 15px;
  }
  
  .menu-item {
    padding: 12px 15px;
    
    .item-icon {
      width: 20px;
      height: 20px;
      margin-right: 10px;
      font-size: 12px;
    }
    
    .item-text {
      font-size: 15px;
    }
  }
}

// 更小屏幕适配（iPhone SE等）
@media (max-width: 375px) {
  .user-header {
    .entry-card {
      .entry-grid {
        gap: 4px;
        
        .entry-item {
          padding: 12px 4px;
          
          .entry-icon {
            width: 46px;
            height: 46px;
            font-size: 18px;
            margin-bottom: 8px;
            border-radius: 14px;
          }
          
          .entry-text {
            font-size: 12px;
            line-height: 1.2;
          }
        }
      }
    }
  }
}
</style>