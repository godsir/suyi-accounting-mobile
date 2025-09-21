<template>
  <div class="settings-container">
    <!-- 头部导航 -->
    <div class="settings-header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="header-title">设置</div>
      <div class="placeholder"></div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 基础设置 -->
      <div class="settings-section">
        <div class="section-title">基础设置</div>
        <div class="settings-list">
          <div class="setting-item" @click="handleUserSettings">
            <div class="item-info">
              <div class="item-icon user">
                <User />
              </div>
              <div class="item-text">
                <div class="item-title">用户设置</div>
                <div class="item-desc">修改个人信息和密码</div>
              </div>
            </div>
            <div class="item-arrow">›</div>
          </div>
          
          <div class="setting-item">
            <div class="item-info">
              <div class="item-icon notification">
                <Bell />
              </div>
              <div class="item-text">
                <div class="item-title">消息通知</div>
                <div class="item-desc">系统消息推送</div>
              </div>
            </div>
            <el-switch
              v-model="notifications"
              @change="handleNotificationChange"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- 应用设置 -->
      <div class="settings-section">
        <div class="section-title">应用设置</div>
        <div class="settings-list">
          <div class="setting-item" @click="handleClearCache">
            <div class="item-info">
              <div class="item-icon cache">
                <Delete />
              </div>
              <div class="item-text">
                <div class="item-title">清除缓存</div>
                <div class="item-desc">清理应用缓存数据</div>
              </div>
            </div>
            <div class="item-arrow">›</div>
          </div>
          
          <!-- 店铺管理 - 根据权限显示，授权过期时隐藏 -->
          <div v-if="hasPermission(PERMISSIONS.CONFIG_SHOP) && !isLicenseExpired" class="setting-item" @click="handleShopSettings">
            <div class="item-info">
              <div class="item-icon shop">
                <Shop />
              </div>
              <div class="item-text">
                <div class="item-title">店铺管理</div>
                <div class="item-desc">管理店铺信息和权限设置</div>
              </div>
            </div>
            <div class="item-arrow">›</div>
          </div>
          
          <!-- 邮件设置 - 根据权限显示，授权过期时隐藏 -->
          <div v-if="hasPermission(PERMISSIONS.CONFIG_EMAIL) && !isLicenseExpired" class="setting-item" @click="handleEmailSettings">
            <div class="item-info">
              <div class="item-icon email">
                <Message />
              </div>
              <div class="item-text">
                <div class="item-title">邮件设置</div>
                <div class="item-desc">配置邮件服务器参数</div>
              </div>
            </div>
            <div class="item-arrow">›</div>
          </div>
          
          <!-- 天气API设置 - 根据权限显示，授权过期时隐藏 -->
          <div v-if="hasPermission(PERMISSIONS.CONFIG_WEATHER_API) && !isLicenseExpired" class="setting-item" @click="handleWeatherSettings">
            <div class="item-info">
              <div class="item-icon weather">
                <Sunny />
              </div>
              <div class="item-text">
                <div class="item-title">天气API设置</div>
                <div class="item-desc">配置天气服务API密钥</div>
              </div>
            </div>
            <div class="item-arrow">›</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft,
  Bell,
  Delete,
  Message,
  Shop,
  Sunny,
  User
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()
const { hasPermission, isLicenseExpired } = usePermissions()

// 数据
const notifications = ref(true)

// 返回"我的"页面
const handleGoBack = () => {
  router.push('/profile')
}

// 消息通知切换
const handleNotificationChange = (value: boolean) => {
  console.log('消息通知:', value)
  ElMessage.info(value ? '已开启消息通知' : '已关闭消息通知')
  localStorage.setItem('notifications', String(value))
}

// 清除缓存
const handleClearCache = () => {
  ElMessage.success('缓存已清除')
}

// 用户设置
const handleUserSettings = () => {
  router.push('/settings/user')
}

// 店铺管理
const handleShopSettings = () => {
  router.push('/settings/shops')
}

// 邮件设置
const handleEmailSettings = () => {
  router.push('/settings/email')
}

// 天气API设置
const handleWeatherSettings = () => {
  router.push('/settings/weather')
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
.settings-container {
  min-height: 100vh;
  background: #f5f5f5;
}

// 头部导航
.settings-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 15px 20px;
  background: white;
  border-bottom: 1px solid #f0f0f0;
  
  .back-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    color: #666;
  }
  
  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .placeholder {
    width: 32px;
  }
}

// 设置内容
.settings-content {
  padding: 20px;
}

.settings-section {
  margin-bottom: 20px;
  
  .section-title {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    padding-left: 5px;
  }
  
  .settings-list {
    background: white;
    border-radius: 10px;
    overflow: hidden;
    
    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 15px 20px;
      border-bottom: 1px solid #f0f0f0;
      cursor: pointer;
      
      &:last-child {
        border-bottom: none;
      }
      
      &:hover {
        background: #f9f9f9;
      }
      
      .item-info {
        display: flex;
        align-items: center;
        flex: 1;
        
        .item-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 12px;
          font-size: 16px;
          color: #666;
          
          &.user {
            color: #34c759;
          }
          
          &.shop {
            color: #007AFF;
          }
          
          &.email {
            color: #ff6b6b;
          }
          
          &.weather {
            color: #ffa500;
          }
        }
        
        .item-text {
          .item-title {
            font-size: 16px;
            color: #333;
            margin-bottom: 2px;
          }
          
          .item-desc {
            font-size: 13px;
            color: #999;
          }
        }
      }
      
      .item-arrow {
        font-size: 16px;
        color: #ccc;
      }
    }
  }
}

// 移动端适配
@media (max-width: 480px) {
  .settings-header {
    padding: 12px 15px;
    
    .header-title {
      font-size: 16px;
    }
  }
  
  .settings-content {
    padding: 15px;
  }
  
  .setting-item {
    padding: 12px 15px;
    
    .item-info {
      .item-icon {
        width: 20px;
        height: 20px;
        margin-right: 10px;
        font-size: 14px;
      }
      
      .item-text {
        .item-title {
          font-size: 15px;
        }
        
        .item-desc {
          font-size: 12px;
        }
      }
    }
  }
}
</style>