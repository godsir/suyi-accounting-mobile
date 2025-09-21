<template>
  <div id="app" :data-route="currentPath">
    <div class="page-container">
      <router-view />
    </div>
    
    <!-- 底部导航栏 - 只在需要的页面显示 -->
    <div v-if="showTabBar" class="tab-bar">
      <!-- 前两个Tab -->
      <div
        v-for="tab in tabs.slice(0, 2)"
        :key="tab.path"
        class="tab-item"
        :class="{ active: currentPath === tab.path }"
        @click="navigateTo(tab.path)"
      >
        <el-icon :size="20">
          <component :is="tab.icon" />
        </el-icon>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
      
      <!-- 中央加号按钮 -->
      <div class="tab-item">
        <div class="add-button" :class="{ disabled: !hasAddPermission }" @click="handleAddClick">
          <el-icon :size="20"><Plus /></el-icon>
        </div>
      </div>
      
      <!-- 后两个Tab -->
      <div
        v-for="tab in tabs.slice(2)"
        :key="tab.path"
        class="tab-item"
        :class="{ active: currentPath === tab.path }"
        @click="navigateTo(tab.path)"
      >
        <el-icon :size="20">
          <component :is="tab.icon" />
        </el-icon>
        <span class="tab-label">{{ tab.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { usePermissions, PERMISSIONS } from '@/hooks/usePermissions'

import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import {
  House,
  Plus,
  Minus,
  List,
  TrendCharts,
  User
} from '@element-plus/icons-vue'


const route = useRoute()
const router = useRouter()
const { hasPermission, isLicenseExpired } = usePermissions()

// 底部导航配置
const tabs = [
  { path: '/dashboard', label: '首页', icon: House },
  { path: '/records', label: '记录', icon: List },
  { path: '/stats', label: '统计', icon: TrendCharts },
  { path: '/profile', label: '我的', icon: User }
]

// 计算属性
const currentPath = computed(() => route.path)

// 需要显示底部导航的页面
const showTabBar = computed(() => {
  const tabBarRoutes = ['/dashboard', '/income', '/expense', '/records', '/stats', '/profile', '/add-record', '/forecast', '/weather', '/email-report']
  return tabBarRoutes.includes(currentPath.value)
})

// 检查添加记录权限
const hasAddPermission = computed(() => {
  return !isLicenseExpired.value && (hasPermission(PERMISSIONS.INCOME) || hasPermission(PERMISSIONS.EXPENSE))
})


// 导航方法
const navigateTo = (path: string) => {
  if (currentPath.value !== path) {
    router.push(path)
  }
}

// 处理加号按钮点击
const handleAddClick = () => {
  if (!hasAddPermission.value) {
    if (isLicenseExpired.value) {
      ElMessage.error('系统授权已过期，无法添加记录')
    } else {
      ElMessage.error('您没有添加记录的权限')
    }
    return
  }
  router.push('/add-record')
}

// 初始化状态栏
const initializeStatusBar = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      console.log('🎯 最新版本状态栏设置 - 2025-09-21 14:03 - Android 15')
      
      // 先隐藏再显示，强制重置状态栏
      await StatusBar.hide()
      await new Promise(resolve => setTimeout(resolve, 100))
      await StatusBar.show()
      console.log('🔄 状态栏重置完成')
      
      // 强制设置背景为白色
      await StatusBar.setBackgroundColor({ color: '#ffffff' })
      console.log('✅ 背景色：#ffffff (白色)')
      
      // 使用 Style.Light - 白色背景配深色文字
      await StatusBar.setStyle({ style: Style.Light })
      console.log('✅ 文字样式：Style.Light (深色文字适配白色背景)')
      
      // 多次重复设置，确保生效
      for (let i = 0; i < 3; i++) {
        setTimeout(async () => {
          try {
            await StatusBar.setStyle({ style: Style.Light })
            await StatusBar.setBackgroundColor({ color: '#ffffff' })
            console.log(`🔄 Style.Light 第${i + 1}次确认设置完成`)
          } catch (e) {
            console.error(`❌ Style.Light 第${i + 1}次设置失败:`, e)
          }
        }, (i + 1) * 300)
      }
      
      console.log('🎉 所有状态栏设置完成：白色背景 + Style.Light (深色文字)')
      
    } catch (error) {
      console.error('❌ 状态栏设置失败:', error)
    }
  }
}

onMounted(() => {
  initializeStatusBar()
})
</script>

<style>
#app {
  height: 100dvh;
  background: #f5f7fa;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

/* 顶部状态栏背景 - 覆盖整个顶部安全区域 */
#app::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: calc(env(safe-area-inset-top) + 24px);
  background: #ffffff;
  z-index: 9999;
  pointer-events: none;
}


/* 页面内容容器 */
.page-container {
  margin-top: calc(env(safe-area-inset-top) + 24px);
  height: calc(100dvh - (env(safe-area-inset-top) + 24px));
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  background: #ffffff;
  padding-bottom: env(safe-area-inset-bottom);
  box-sizing: border-box;
}

/* 为没有安全区域的设备提供状态栏背景 */
@supports not (height: env(safe-area-inset-top)) {
  #app::before { height: 32px; }
  .page-container {
    margin-top: 32px;
    height: calc(100dvh - 32px);
  }
}

:root { --tab-bar-height: 72px; --content-bottom-gap: 0px; }

.tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  display: flex;
  border-top: 1px solid #e4e7ed;
  z-index: 2000; /* 高于安全区伪元素 */
  height: var(--tab-bar-height);
  padding: 8px 0 0 0; /* 顶部8px内边距，让导航项不贴顶 */
  box-sizing: border-box;
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 0 12px; /* 去掉上下内边距，避免撑高导航栏 */
  cursor: pointer;
  transition: all 0.3s ease;
  
  .tab-label {
    font-size: 11px;
    color: #909399;
    font-weight: 500;
    transition: color 0.3s ease;
  }
  
  .el-icon {
    color: #909399;
    transition: color 0.3s ease;
  }
  
  &.active {
    .tab-label {
      color: #409EFF;
      font-weight: 600;
    }
    
    .el-icon {
      color: #409EFF;
    }
  }
  
  &:hover:not(.active) {
    .tab-label {
      color: #606266;
    }
    
    .el-icon {
      color: #606266;
    }
  }
}

.add-button {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #409eff;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
  
  .el-icon {
    color: white !important;
  }
  
  &.disabled {
    background: #c0c4cc;
    cursor: not-allowed;
    
    .el-icon {
      color: white !important;
    }
  }
}



/* 适配iPhone X等有安全区域的设备：无需给tab-bar额外padding，安全区在其下方 */
/* 移除导航栏内部对安全区的 padding，安全区展示在导航栏下方（#app::after） */

/* Element Plus Message 消息提示位置调整 */
.el-message {
  top: calc(env(safe-area-inset-top) + 32px) !important;
  z-index: 10000 !important;
}

/* 为没有安全区域的设备提供兼容性处理 */
@supports not (height: env(safe-area-inset-top)) {
  .el-message {
    top: 48px !important;
  }
}

/* 全局滚动条样式 */
* {
  /* WebKit浏览器滚动条样式 */
  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
    
    &:hover {
      background: rgba(0, 0, 0, 0.2);
    }
  }
  
  &::-webkit-scrollbar-corner {
    background: transparent;
  }
  
  /* Firefox滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

/* 移动端隐藏滚动条 */
@media (max-width: 768px) {
  * {
    &::-webkit-scrollbar {
      display: none;
    }
    
    scrollbar-width: none;
  }
}
</style>
