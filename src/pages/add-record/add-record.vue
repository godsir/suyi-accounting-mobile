<template>
  <div class="add-record-container">
    <!-- Tab切换 -->
    <div class="tab-header">
      <div 
        class="tab-item"
        :class="{ active: activeTab === 'income' }"
        @click="switchTab('income')"
      >
        收入
      </div>
      <div 
        class="tab-item"
        :class="{ active: activeTab === 'expense' }"
        @click="switchTab('expense')"
      >
        支出
      </div>
    </div>

    <!-- Tab内容 -->
    <div 
      class="tab-content" 
      ref="tabContentRef"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div 
        class="content-wrapper"
        :style="{ transform: `translateX(${translateX}px)` }"
      >
        <!-- 收入页面 -->
        <div class="content-panel income-content">
          <Income />
        </div>
        
        <!-- 支出页面 -->
        <div class="content-panel expense-content">
          <Expense />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import Income from '@/pages/income/income.vue'
import Expense from '@/pages/expense/expense.vue'

const route = useRoute()
const activeTab = ref('income')

// 滑动相关变量
const tabContentRef = ref<HTMLElement>()
const translateX = ref(0)
const startX = ref(0)
const startY = ref(0)
const currentX = ref(0)
const currentY = ref(0)
const isDragging = ref(false)
const isHorizontalDrag = ref(false)
const currentIndex = ref(0) // 0: 收入, 1: 支出

// 根据路由参数设置默认Tab
if (route.query.type === 'expense') {
  activeTab.value = 'expense'
  currentIndex.value = 1
  translateX.value = -window.innerWidth
}

const switchTab = (tab: string) => {
  activeTab.value = tab
  if (tab === 'income') {
    currentIndex.value = 0
    translateX.value = 0
  } else {
    currentIndex.value = 1
    translateX.value = -window.innerWidth
  }
}

// 触摸事件处理
const handleTouchStart = (e: TouchEvent) => {
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  currentX.value = startX.value
  currentY.value = startY.value
  isDragging.value = true
  isHorizontalDrag.value = false
}

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  
  currentX.value = e.touches[0].clientX
  currentY.value = e.touches[0].clientY
  
  const deltaX = currentX.value - startX.value
  const deltaY = currentY.value - startY.value
  
  // 判断滑动方向 - 只在首次移动时判断
  if (!isHorizontalDrag.value && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
    isHorizontalDrag.value = Math.abs(deltaX) > Math.abs(deltaY)
  }
  
  // 只有在水平滑动时才处理Tab切换和阻止默认行为
  if (isHorizontalDrag.value) {
    e.preventDefault()
    
    const baseTranslateX = -currentIndex.value * window.innerWidth
    
    // 添加阻尼效果，减少滑动敏感度
    const dampingFactor = 0.4
    const dampedDeltaX = deltaX * dampingFactor
    
    // 限制滑动范围
    const newTranslateX = baseTranslateX + dampedDeltaX
    const maxTranslateX = window.innerWidth * 0.1 // 允许轻微超出边界
    const minTranslateX = -window.innerWidth * 1.1
    
    translateX.value = Math.max(minTranslateX, Math.min(maxTranslateX, newTranslateX))
  }
}

const handleTouchEnd = () => {
  if (!isDragging.value) return
  
  // 只有在水平滑动时才处理Tab切换
  if (isHorizontalDrag.value) {
    const deltaX = currentX.value - startX.value
    const velocity = Math.abs(deltaX) // 简单的速度计算
    
    // 提高切换阈值，降低敏感度
    const distanceThreshold = window.innerWidth * 0.5 // 50% 屏幕宽度
    const velocityThreshold = 120 // 快速滑动的最小距离
    
    // 判断是否应该切换
    const shouldSwitch = Math.abs(deltaX) > distanceThreshold || 
                        (velocity > velocityThreshold && Math.abs(deltaX) > window.innerWidth * 0.25)
    
    if (shouldSwitch) {
      if (deltaX > 0 && currentIndex.value === 1) {
        // 向右滑动，从支出切换到收入
        switchTab('income')
      } else if (deltaX < 0 && currentIndex.value === 0) {
        // 向左滑动，从收入切换到支出
        switchTab('expense')
      } else {
        // 回弹到当前页面
        translateX.value = -currentIndex.value * window.innerWidth
      }
    } else {
      // 回弹到当前页面
      translateX.value = -currentIndex.value * window.innerWidth
    }
  }
  
  isDragging.value = false
  isHorizontalDrag.value = false
}
</script>

<style lang="scss" scoped>
.add-record-container {
  min-height: 100vh;
  background: #f5f5f5;
  display: flex;
  flex-direction: column;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.tab-header {
  position: fixed;
  top: calc(env(safe-area-inset-top) + 24px);
  left: 0;
  right: 0;
  z-index: 100;
  background: white;
  display: flex;
  padding: 6px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  
  .tab-item {
    flex: 1;
    margin: 0 6px;
    padding: 10px 16px;
    text-align: center;
    font-size: 15px;
    font-weight: 500;
    color: #606266;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;
    border-radius: 8px;
    background: transparent;
    
    &.active {
      color: #409eff;
      font-weight: 600;
      background: #f0f7ff;
    }
    
    &:hover:not(.active) {
      color: #409eff;
      background: #f8f9fa;
    }
  }
}

.tab-content {
  flex: 1;
  position: relative;
  margin-top: 46px; /* Tab头部高度 */
  overflow: hidden;
}

.content-wrapper {
  display: flex;
  width: 200vw; /* 两个页面的宽度 */
  height: 100%;
  transition: transform 0.3s ease;
}

.content-panel {
  width: 100vw;
  height: 100%;
  flex-shrink: 0;
}

.income-content,
.expense-content {
  height: 100%;
}

.page-iframe {
  width: 100%;
  height: calc(100vh - 104px); /* 减去Tab头部和底部导航 */
  border: none;
}

/* 为没有安全区域的设备提供兼容性处理 */
@supports not (height: env(safe-area-inset-top)) {
  .tab-header {
    top: 32px;
  }
}
</style>