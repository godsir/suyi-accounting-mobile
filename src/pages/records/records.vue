<template>
  <div class="records-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title">
        <h2>
          <el-icon><Document /></el-icon>
          收支记录
        </h2>
      </div>
      <div class="header-controls">
        <el-select
          v-model="filterOptions.shop"
          placeholder="选择店铺"
          style="flex: 1"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="全部店铺" value="" />
          <el-option
            v-for="shop in userStore.userShops"
            :key="shop.id"
            :label="`${shop.name} (${shop.city})`"
            :value="shop.name"
          />
        </el-select>
        
        <el-select
          v-model="filterOptions.type"
          placeholder="记录类型"
          style="flex: 1"
          clearable
          @change="handleFilterChange"
        >
          <el-option label="全部" value="" />
          <el-option label="收入" value="income" />
          <el-option label="支出" value="expense" />
        </el-select>
      </div>
    </div>

    <!-- 日期筛选区域 -->
    <div class="filter-section">
      <el-date-picker
        v-model="filterOptions.dateRange"
        type="daterange"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        format="YYYY-MM-DD"
        value-format="YYYY-MM-DD"
        style="width: 100%"
        @change="handleFilterChange"
      />
    </div>

    <!-- 授权过期提醒 -->
    <el-alert
      v-if="userStore.isLicenseExpired"
      title="系统授权已过期"
      description="您的系统授权已过期，数据显示可能受限。请联系管理员进行授权续期。"
      type="warning"
      show-icon
      style="margin: 0 16px 16px 16px"
    />

    <!-- 店铺权限提示 -->
    <el-alert
      v-if="!userStore.isLicenseExpired && !userStore.hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法查看记录数据。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 0 16px 16px 16px"
    />

    <!-- 记录列表 -->
    <div class="records-content" ref="recordsContentRef">
      <!-- 下拉刷新指示器 -->
      <div 
        v-show="isPulling || isRefreshing" 
        class="refresh-container"
        :style="{ 
          transform: `translateY(${Math.max(0, pullDistance - 80)}px)`,
          opacity: Math.min(1, pullDistance / 60)
        }"
      >
        <div class="refresh-circle" :class="{ 'refresh-ready': pullDistance >= refreshThreshold, 'refreshing': isRefreshing }">
          <div class="refresh-arrow" v-if="!isRefreshing">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L8 14M8 14L4 10M8 14L12 10" 
                    stroke="currentColor" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"
                    :style="{ transform: pullDistance >= refreshThreshold ? 'rotate(180deg)' : 'rotate(0deg)' }"
              />
            </svg>
          </div>
          <div class="refresh-loading" v-else>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="loading-spinner">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="37.7" stroke-dashoffset="37.7">
                <animate attributeName="stroke-dashoffset" dur="1s" values="37.7;0" repeatCount="indefinite"/>
              </circle>
            </svg>
          </div>
        </div>
        <div class="refresh-text">{{ refreshText }}</div>
      </div>
      
      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-skeleton v-for="i in 8" :key="i" :rows="3" animated class="record-skeleton" />
      </div>
      
      <!-- 记录列表 -->
      <div v-else-if="filteredRecords.length > 0" class="records-list">
        <div 
          v-for="(record, index) in paginatedRecords" 
          :key="index"
          class="record-item"
        >
          <div class="record-main">
            <div class="record-left">
              <div class="record-date">{{ record.date }}</div>
              <div class="record-shop">{{ record.shopName }}</div>
            </div>
            <div class="record-right">
              <div class="amount-row">
                <span v-if="record.totalIncome > 0" class="income-amount">+¥{{ record.totalIncome.toFixed(2) }}</span>
                <span v-if="record.totalExpense > 0" class="expense-amount">-¥{{ record.totalExpense.toFixed(2) }}</span>
              </div>
              <!-- 操作按钮 -->
              <div v-if="userStore.isAdmin" class="record-actions">
                <el-button
                  type="danger"
                  text
                  size="small"
                  :icon="Delete"
                  @click.stop="handleDeleteRecord(record)"
                />
              </div>
            </div>
          </div>
          
          <!-- 收入详情 -->
          <div v-if="record.totalIncome > 0" class="income-detail">
            <span v-if="record.cashIncome > 0" class="detail-item">现金¥{{ record.cashIncome.toFixed(2) }}</span>
            <span v-if="record.wechatIncome > 0" class="detail-item">微信¥{{ record.wechatIncome.toFixed(2) }}</span>
            <span v-if="record.meituanIncome > 0" class="detail-item">美团¥{{ record.meituanIncome.toFixed(2) }}</span>
            <span v-if="record.jingdongIncome > 0" class="detail-item">京东¥{{ record.jingdongIncome.toFixed(2) }}</span>
            <span v-if="record.elemeIncome > 0" class="detail-item">饿了么¥{{ record.elemeIncome.toFixed(2) }}</span>
          </div>
          
          <!-- 支出详情 -->
          <div v-if="record.totalExpense > 0 && getExpenseDetail(record)" class="expense-detail">
            <span 
              v-for="(item, index) in getExpenseDetail(record).split(' ')" 
              :key="index" 
              class="detail-item"
            >
              {{ item }}
            </span>
          </div>
        </div>
      </div>
      
      <!-- 空状态 -->
      <div v-else class="empty-state">
        <el-empty description="暂无记录数据">
          <template #image>
            <el-icon :size="80" color="#dcdfe6">
              <DocumentRemove />
            </el-icon>
          </template>
          <div class="empty-actions">
            <el-button type="primary" @click="router.push('/income')">
              添加收入记录
            </el-button>
            <el-button @click="router.push('/expense')">
              添加支出记录
            </el-button>
          </div>
        </el-empty>
      </div>
      
      <!-- 分页 -->
      <div v-if="filteredRecords.length > pageSize" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="pageSize"
          :total="filteredRecords.length"
          layout="prev, pager, next"
          @current-change="handlePageChange"
          small
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { recordsAPI, type AccountingRecord } from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

// 支出项目类型
interface ExpenseItem {
  description: string
  amount: number
}

// 扩展账务记录类型，包含支出项目
interface ExtendedAccountingRecord extends AccountingRecord {
  expenseItems?: ExpenseItem[]
}

import { 
  ArrowLeft, 
  Document, 
  TrendCharts, 
  Minus, 
  Delete, 
  DocumentRemove,
  Refresh
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 数据
const records = ref<AccountingRecord[]>([])
const loading = ref(true)
const expenseDetails = ref<{[key: string]: string}>({})

// 分页
const currentPage = ref(1)
const pageSize = 10

// 筛选选项
const filterOptions = ref({
  shop: '',
  type: '',
  dateRange: null as [string, string] | null
})

// 下拉刷新相关
const recordsContentRef = ref<HTMLElement>()
const isRefreshing = ref(false)
const refreshText = ref('下拉刷新')
const startY = ref(0)
const currentY = ref(0)
const isPulling = ref(false)
const pullDistance = ref(0)
const refreshThreshold = 60 // 刷新阈值

// 计算属性
const filteredRecords = computed(() => {
  if (!records.value || records.value.length === 0) return []
  
  // 应用店铺权限过滤
  let filtered = userStore.filterDataByShopPermission(records.value)
  
  // 店铺筛选
  if (filterOptions.value.shop) {
    filtered = filtered.filter(record => record.shopName === filterOptions.value.shop)
  }
  
  // 类型筛选
  if (filterOptions.value.type) {
    if (filterOptions.value.type === 'income') {
      filtered = filtered.filter(record => record.totalIncome > record.totalExpense)
    } else if (filterOptions.value.type === 'expense') {
      filtered = filtered.filter(record => record.totalExpense > record.totalIncome)
    }
  }
  
  // 日期范围筛选
  if (filterOptions.value.dateRange && filterOptions.value.dateRange.length === 2) {
    const [startDate, endDate] = filterOptions.value.dateRange
    filtered = filtered.filter(record => {
      return record.date >= startDate && record.date <= endDate
    })
  }
  
  // 按日期排序，最新的在前面
  return filtered.sort((a, b) => b.date.localeCompare(a.date))
})

const paginatedRecords = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredRecords.value.slice(start, end)
})

// 加载记录数据
const loadRecords = async () => {
  if (!userStore.hasShopAccess) {
    loading.value = false
    return
  }
  
  try {
    loading.value = true
    
    // 并行获取账务记录和支出详情
    const [allRecords, expenseRecordsData] = await Promise.all([
      recordsAPI.getAllRecords(),
      recordsAPI.getExpenseRecords().catch(() => [])
    ])
    
    records.value = allRecords || []
    
    // 处理支出详情数据，按日期+店铺分组
    const expenseDetailsMap: {[key: string]: string} = {}
    
    if (Array.isArray(expenseRecordsData) && expenseRecordsData.length > 0) {
      // 按日期+店铺分组支出明细
      const expenseMap = new Map<string, Map<string, number>>()
      
      expenseRecordsData.forEach((item: any) => {
        const key = `${item.date}-${item.shopName}`
        
        if (!expenseMap.has(key)) {
          expenseMap.set(key, new Map<string, number>())
        }
        
        const categoryMap = expenseMap.get(key)!
        const amount = parseFloat(item.amount) || 0
        
        if (amount > 0) {
          const currentAmount = categoryMap.get(item.category) || 0
          categoryMap.set(item.category, currentAmount + amount)
        }
      })
      
      // 转换为字符串格式
      expenseMap.forEach((categoryMap, key) => {
        const detailStrings: string[] = []
        categoryMap.forEach((amount, category) => {
          detailStrings.push(`${category}¥${amount.toFixed(2)}`)
        })
        if (detailStrings.length > 0) {
          expenseDetailsMap[key] = detailStrings.join(' ')
        }
      })
    }
    
    expenseDetails.value = expenseDetailsMap
    
  } catch (error) {
    console.error('获取记录数据失败:', error)
    ElMessage.error('获取记录数据失败')
  } finally {
    loading.value = false
  }
}

// 处理筛选变化
const handleFilterChange = () => {
  currentPage.value = 1 // 重置到第一页
}

// 处理分页变化
const handlePageChange = (page: number) => {
  currentPage.value = page
}

// 处理记录点击
const handleRecordClick = (record: AccountingRecord) => {
  // 显示记录详情（可以实现一个详情弹窗或跳转到详情页）
  ElMessage.info('记录详情功能开发中...')
}

// 获取支出详情
const getExpenseDetail = (record: AccountingRecord): string => {
  const key = `${record.date}-${record.shopName}`
  return expenseDetails.value[key] || ''
}

// 处理删除记录
const handleDeleteRecord = async (record: AccountingRecord) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除 ${record.date} ${record.shopName} 的记录吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await recordsAPI.deleteRecord(record.id)
    
    if (response.success) {
      ElMessage.success('删除成功')
      await loadRecords() // 重新加载数据
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error(error.response?.data?.message || '删除失败')
    }
  }
}

// 监听店铺权限变化
watch(() => userStore.userShops, () => {
  if (userStore.hasShopAccess) {
    loadRecords()
  }
}, { immediate: true })

// 下拉刷新功能
const handleTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value || loading.value) return
  
  startY.value = e.touches[0].clientY
  isPulling.value = false
}

const handleTouchMove = (e: TouchEvent) => {
  if (isRefreshing.value || loading.value) return
  
  currentY.value = e.touches[0].clientY
  const deltaY = currentY.value - startY.value
  
  // 检查是否在容器顶部
  const container = recordsContentRef.value
  const isAtTop = !container || container.scrollTop === 0
  
  // 只有在顶部且向下滑动时才启用下拉刷新
  if (deltaY > 0 && isAtTop) {
    isPulling.value = true
    e.preventDefault()
    
    pullDistance.value = Math.min(deltaY * 0.6, 100)
    
    if (pullDistance.value >= refreshThreshold) {
      refreshText.value = '释放刷新'
    } else {
      refreshText.value = '下拉刷新'
    }
  }
}

const handleTouchEnd = () => {
  if (!isPulling.value) return
  
  if (pullDistance.value >= refreshThreshold && !isRefreshing.value) {
    // 触发刷新
    isRefreshing.value = true
    refreshText.value = '刷新中...'
    
    setTimeout(async () => {
      try {
        await loadRecords()
        ElMessage.success('刷新成功')
      } catch (error) {
        ElMessage.error('刷新失败')
      } finally {
        isRefreshing.value = false
        isPulling.value = false
        pullDistance.value = 0
        refreshText.value = '下拉刷新'
      }
    }, 1000)
  } else {
    // 回弹
    isPulling.value = false
    pullDistance.value = 0
    refreshText.value = '下拉刷新'
  }
}

onMounted(() => {
  if (userStore.hasShopAccess) {
    loadRecords()
  }
  
  // 添加触摸事件监听
  const container = recordsContentRef.value
  if (container) {
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
  }
})
</script>

<style lang="scss" scoped>
.records-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 100px;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  .page-title {
    margin-bottom: 12px;
    
    h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #303133;
      display: flex;
      align-items: center;
      gap: 8px;
      
      .el-icon {
        color: #409EFF;
        font-size: 20px;
      }
    }
  }
  
  .header-controls {
    display: flex;
    gap: 12px;
    align-items: center;
  }
}

.filter-section {
  background: white;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.records-content {
  padding: 16px;
  position: relative;
  overflow-y: auto;
  height: calc(100vh - 200px);
}

.refresh-container {
  position: fixed;
  top: 120px;
  left: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 1000;
  transition: all 0.3s ease;
}

.refresh-circle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  color: #999;
  transition: all 0.3s ease;
  
  &.refresh-ready {
    color: #409EFF;
    background: #f0f9ff;
    box-shadow: 0 4px 20px rgba(64, 158, 255, 0.2);
  }
  
  &.refreshing {
    color: #409EFF;
    background: #f0f9ff;
  }
  
  .refresh-arrow {
    transition: transform 0.3s ease;
    
    svg {
      transition: transform 0.3s ease;
    }
  }
  
  .refresh-loading {
    .loading-spinner {
      animation: spin 1s linear infinite;
    }
  }
}

.refresh-text {
  font-size: 12px;
  color: #666;
  background: rgba(255, 255, 255, 0.9);
  padding: 4px 8px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.loading-container {
  .record-skeleton {
    background: white;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  }
}

.records-list {
  .record-item {
    background: white;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    position: relative;
    
    .record-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .record-left {
        flex: 1;
        
        .record-date {
          font-size: 15px;
          font-weight: 600;
          color: #303133;
          margin-bottom: 2px;
        }
        
        .record-shop {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .record-right {
        text-align: right;
        
        .amount-row {
          margin-bottom: 2px;
          font-size: 14px;
          
          .income-amount {
            color: #67C23A;
            font-weight: 600;
            margin-right: 8px;
          }
          
          .expense-amount {
            color: #F56C6C;
            font-weight: 600;
          }
        }
        
      }
    }
    
    .income-detail,
    .expense-detail {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
      
      .detail-item {
        font-size: 11px;
        color: #666;
        background: #f5f7fa;
        padding: 2px 6px;
        border-radius: 4px;
        white-space: nowrap;
      }
    }
    
    .record-actions {
      font-size: 12px;
    }
  }
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
  
  .empty-actions {
    margin-top: 20px;
    display: flex;
    gap: 12px;
    justify-content: center;
  }
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  padding: 8px 16px;
}

// 自定义分页器样式
:deep(.el-pagination) {
  .btn-prev,
  .btn-next {
    width: 36px !important;
    height: 36px !important;
    min-width: 36px !important;
    font-size: 14px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
  
  .el-pager li {
    width: 32px !important;
    min-width: 32px !important;
    height: 32px !important;
    line-height: 32px !important;
    font-size: 13px !important;
    
    &.more {
      width: 24px !important;
      min-width: 24px !important;
    }
  }
}

// Element Plus 样式覆盖
:deep(.el-select) {
  .el-input__wrapper {
    border-radius: 8px;
  }
}

:deep(.el-date-editor) {
  border-radius: 8px;
}

// 自定义滚动条样式
.records-content {
  /* WebKit浏览器滚动条样式 */
  &::-webkit-scrollbar {
    width: 4px;
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
  
  /* Firefox滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.1) transparent;
}

// 移动端适配
@media (max-width: 480px) {
  .records-content {
    padding: 12px;
    
    /* 移动端隐藏滚动条 */
    &::-webkit-scrollbar {
      display: none;
    }
    
    scrollbar-width: none;
  }
  
  .page-header {
    padding: 12px;
    
    .header-controls {
      gap: 8px;
      
      .el-select {
        flex: 1;
        min-width: 0;
      }
      
      .el-date-editor {
        flex: 2;
        min-width: 0;
      }
    }
  }
  
  .record-card {
    .record-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
    }
    
    .record-amounts {
      flex-direction: column;
      gap: 8px;
    }
    
    .income-preview {
      .preview-items {
        .preview-item {
          font-size: 11px;
        }
      }
    }
  }
  
  .empty-state {
    .empty-actions {
      flex-direction: column;
      align-items: center;
    }
  }
}
</style>