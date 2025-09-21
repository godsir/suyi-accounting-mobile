<template>
  <div class="dashboard-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-title">
        <h2>
          <el-icon><House /></el-icon>
          首页
        </h2>
      </div>
      <div class="header-controls">
        <el-select
          v-model="selectedShop"
          :options="getShopSelectOptions()"
          @change="handleShopChange"
          placeholder="选择店铺"
          :loading="userStore.isLoading"
        />
      </div>
    </div>

    <!-- 授权过期提醒 -->
    <el-alert
      v-if="isLicenseExpired"
      title="系统授权已过期"
      description="您的系统授权已过期，数据显示可能受限。请联系管理员进行授权续期。"
      type="warning"
      show-icon
      style="margin: 0 16px 16px 16px"
    />

    <!-- 店铺权限提示 -->
    <el-alert
      v-if="!isLicenseExpired && !hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法查看经营数据。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 0 16px 16px 16px"
    />

    <!-- 内容区域 -->
    <div class="dashboard-content">
      <!-- 数据总览统计条 -->
      <div class="stats-overview">
        <div class="stat-card blue-gradient">
          <div class="main-stat">
            <div class="stat-title">利润 </div>
            <div v-if="loading.statistics" class="main-value">
              <el-skeleton-item variant="text" style="width: 150px; height: 48px" />
            </div>
            <div v-else class="main-value">
              {{ formatToTwoDecimalWithoutRounding(statistics.netProfit).toFixed(2) }}
            </div>
          </div>
          <div class="sub-stats">
            <div class="sub-stat">
              <span class="sub-label">收入</span>
              <span v-if="loading.statistics" class="sub-value">
                <el-skeleton-item variant="text" style="width: 80px; height: 20px" />
              </span>
              <span v-else class="sub-value">
                {{ formatToTwoDecimalWithoutRounding(statistics.totalIncome).toFixed(2) }}
              </span>
            </div>
            <div class="sub-stat">
              <span class="sub-label">支出</span>
              <span v-if="loading.statistics" class="sub-value">
                <el-skeleton-item variant="text" style="width: 80px; height: 20px" />
              </span>
              <span v-else class="sub-value">
                {{ formatToTwoDecimalWithoutRounding(statistics.totalExpense).toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 饼状图卡片 -->
      <div class="charts-section">
        <!-- 支出占比 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>支出占比</h3>
            <div class="chart-total">总支出 ¥{{ expenseTotalAmount.toFixed(2) }}</div>
          </div>
          <div v-if="loading.statistics" class="chart-loading">
            <el-skeleton :rows="4" animated />
          </div>
          <div v-else-if="expenseChartData.length > 0" class="chart-container">
            <v-chart 
              class="pie-chart" 
              :option="expenseChartOption" 
              autoresize
            />
          </div>
          <el-empty v-else description="暂无支出数据" :image-size="60" />
        </div>

        <!-- 收入占比 -->
        <div class="chart-card">
          <div class="chart-header">
            <h3>收入占比</h3>
            <div class="chart-total">总收入 ¥{{ incomeTotalAmount.toFixed(2) }}</div>
          </div>
          <div v-if="loading.statistics" class="chart-loading">
            <el-skeleton :rows="4" animated />
          </div>
          <div v-else-if="incomeChartData.length > 0" class="chart-container">
            <v-chart 
              class="pie-chart" 
              :option="incomeChartOption" 
              autoresize
            />
          </div>
          <el-empty v-else description="暂无收入数据" :image-size="60" />
        </div>
      </div>

      <!-- 最近收支记录 -->
      <div class="records-card">
        <h3>最近收支记录</h3>
        <div v-if="loading.records" class="records-loading">
          <el-skeleton :rows="8" animated />
        </div>
        <div v-else-if="filteredRecords.length > 0" class="records-table">
          <div 
            v-for="(record, index) in filteredRecords.slice(0, 10)" 
            :key="index"
            class="record-row"
          >
            <div class="record-date">{{ record.date }}</div>
            <div class="record-type">
              <el-tag 
                :type="isIncomeRecord(record) ? 'success' : 'danger'"
                size="small"
              >
                {{ isIncomeRecord(record) ? '收入' : '支出' }}
              </el-tag>
            </div>
            <div class="record-amount" :class="{ income: isIncomeRecord(record), expense: !isIncomeRecord(record) }">
              ¥{{ getRecordAmount(record).toFixed(2) }}
            </div>
            <div class="record-shop">{{ record.shopName }}</div>
          </div>
        </div>
        <el-empty v-else description="暂无记录数据" />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { recordsAPI, type AccountingRecord, type DashboardStats } from '@/api'
import { House, TrendCharts, Minus, Document, ArrowDown, Plus, Setting } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'

use([
  CanvasRenderer,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
])

const router = useRouter()
const userStore = useUserStore()

// 数据状态
const selectedShop = ref<string>()
const statistics = ref<DashboardStats>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
  recordCount: 0,
  monthlyIncome: 0,
  monthlyExpense: 0
})
const records = ref<AccountingRecord[]>([])
const expenseDetails = ref<{[key: string]: string}>({})
// 原始支出明细（与 electron 客户端一致，按原始记录聚合分类）
const expenseRawRecords = ref<any[]>([])
// 全部账务原始记录（用于收入占比聚合，和 electron 客户端一致）
const allRecordsRaw = ref<AccountingRecord[]>([])

// 图表refs
const expenseChart = ref()
const incomeChart = ref()

// 加载状态
const loading = ref({
  statistics: true,
  records: true
})

// 图表数据类型
interface ChartDataItem {
  name: string
  value: number
  percentage: string
  color: string
}

// 支出类别颜色映射
const expenseColors = {
  '餐饮': '#4DABF7',
  '服装': '#FF6B9D', 
  '住宿': '#69DB7C',
  '娱乐': '#9775FA',
  '交通': '#FFB366',
  '其他': '#F783AC'
}

// 收入来源颜色映射  
const incomeColors = {
  '工资': '#FF6B9D',
  '奖金': '#FFE066',
  '现金': '#69DB7C',
  '微信': '#4DABF7',
  '美团': '#FFB366',
  '京东': '#9775FA',
  '饿了么': '#F783AC'
}

// 计算属性
const isLicenseExpired = computed(() => userStore.isLicenseExpired)
const hasShopAccess = computed(() => userStore.hasShopAccess)

const filteredRecords = computed(() => {
  if (!records.value || records.value.length === 0) return []
  
  const filtered = userStore.filterDataByShopPermission(records.value)
  
  // 按日期排序，最新的在前面
  return [...filtered].sort((a, b) => b.date.localeCompare(a.date))
})

// 获取店铺选择选项
const getShopSelectOptions = () => userStore.getShopSelectOptions()

// 格式化金额（保留两位小数，不四舍五入）
const formatToTwoDecimalWithoutRounding = (value: number): number => {
  if (isNaN(value)) return 0
  const multiplier = 100
  return Math.floor(value * multiplier) / multiplier
}

// 判断是否为收入记录
const isIncomeRecord = (record: AccountingRecord): boolean => {
  return record.totalIncome > record.totalExpense
}

// 获取记录金额
const getRecordAmount = (record: AccountingRecord): number => {
  return isIncomeRecord(record) ? record.totalIncome : record.totalExpense
}

// 处理店铺选择变化
const handleShopChange = () => {
  loadDashboardData()
}

// 初始化店铺选择
const initializeShopSelection = () => {
  const options = getShopSelectOptions()
  if (options.length > 0 && !selectedShop.value) {
    selectedShop.value = options[0].value
  }
}

// 加载统计数据
const loadStatistics = async () => {
  try {
    loading.value.statistics = true
    
    // 获取所有记录
    const allRecords = await recordsAPI.getAllRecords()
    // 缓存全部记录供饼图聚合使用
    allRecordsRaw.value = Array.isArray(allRecords) ? allRecords : []
    
    // 应用店铺权限过滤
    let filteredData = userStore.filterDataByShopPermission(allRecords)
    
    // 如果选择了特定店铺，进一步过滤
    if (selectedShop.value && selectedShop.value !== '全部') {
      filteredData = filteredData.filter(record => record.shopName === selectedShop.value)
    }
    
    // 计算统计数据
    const totalIncome = filteredData.reduce((sum, record) => sum + (record.totalIncome || 0), 0)
    const totalExpense = filteredData.reduce((sum, record) => sum + (record.totalExpense || 0), 0)
    const netProfit = totalIncome - totalExpense
    
    // 计算记录条目数
    const recordCount = filteredData.reduce((sum, record) => {
      let count = 0
      if (record.totalIncome && record.totalIncome > 0) count += 1
      if (record.totalExpense && record.totalExpense > 0) count += 1
      return sum + count
    }, 0)
    
    statistics.value = {
      totalIncome,
      totalExpense,
      netProfit,
      recordCount,
      monthlyIncome: 0, // TODO: 实现月度统计
      monthlyExpense: 0  // TODO: 实现月度统计
    }
    
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
  } finally {
    loading.value.statistics = false
  }
}

// 加载最近记录
const loadRecentRecords = async () => {
  try {
    loading.value.records = true
    const recentRecords = await recordsAPI.getRecentRecords()
    records.value = recentRecords
  } catch (error) {
    console.error('获取最近记录失败:', error)
    ElMessage.error('获取最近记录失败')
  } finally {
    loading.value.records = false
  }
}

// 支出图表数据
const expenseChartData = computed((): ChartDataItem[] => {
  // 使用统计数据中的总支出金额作为基准，确保数据一致性
  const totalExpenseFromStats = statistics.value.totalExpense
  
  if (totalExpenseFromStats <= 0) return []
  
  // 使用原始支出明细（与 electron 客户端一致的机制）
  let data: any[] = userStore.filterDataByShopPermission(expenseRawRecords.value || [])
  if (selectedShop.value && selectedShop.value !== '全部') {
    data = data.filter(item => item.shopName === selectedShop.value)
  }
  
  // 类别归一映射
  const categoryMapping: Record<string, string> = {
    '房租': '租金',
    '房租费用': '租金',  
    '租金': '租金',
    '房租支出': '租金',
    '水费': '水电费',
    '电费': '水电费',
    '水电费': '水电费',
    '采购': '物料采购',
    '进货': '物料采购',
    '材料采购': '物料采购',
    '物料采购': '物料采购',
    '人工': '人工成本',
    '工资': '人工成本',
    '员工工资': '人工成本',
    '人工成本': '人工成本',
    '其他': '其他支出',
    '杂费': '其他支出',
    '杂项': '其他支出',
    '其他支出': '其他支出',
  }
  const categoryColors: Record<string, string> = {
    '租金': '#ff4d4f',
    '水电费': '#10b981',
    '物料采购': '#3b82f6',
    '人工成本': '#f59e42',
    '其他支出': '#8b5cf6'
  }
  
  if (!data || data.length === 0) {
    // 如果没有支出明细数据，但有总支出金额，显示为"其他支出"
    return [{
      name: '其他支出',
      value: formatToTwoDecimalWithoutRounding(totalExpenseFromStats),
      percentage: '100.00',
      color: categoryColors['其他支出']
    }]
  }
  
  const summary = data.reduce((acc: Record<string, number>, item: any) => {
    const cat = Object.entries(categoryMapping).find(([k]) => String(item.category || '').includes(k))?.[1] || '其他支出'
    const amount = parseFloat(item.amount) || 0
    acc[cat] = (acc[cat] || 0) + amount
    return acc
  }, {})
  
  const entries = Object.entries(summary).filter(([_, v]) => (v as number) > 0)
  const detailTotal = entries.reduce((s, [, v]) => s + (v as number), 0)
  
  // 如果明细总额与统计总额不一致，按比例调整
  const adjustmentRatio = detailTotal > 0 ? totalExpenseFromStats / detailTotal : 1
  
  return entries
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([name, value]) => {
      const adjustedValue = (value as number) * adjustmentRatio
      return {
        name,
        value: formatToTwoDecimalWithoutRounding(adjustedValue),
        percentage: (((value as number) / detailTotal) * 100).toFixed(2),
        color: categoryColors[name] || '#999999'
      }
    })
})

// 收入图表数据
const incomeChartData = computed((): ChartDataItem[] => {
  if (!allRecordsRaw.value || allRecordsRaw.value.length === 0) {
    // 如果没有数据，生成测试数据用于演示
    return [
      { name: '微信', value: 15000, percentage: '45.45', color: '#1AAD19' },
      { name: '现金', value: 8000, percentage: '24.24', color: '#1677FF' },
      { name: '美团', value: 6000, percentage: '18.18', color: '#FFC300' },
      { name: '京东', value: 4000, percentage: '12.12', color: '#E2231A' }
    ]
  }
  
  // 应用店铺权限过滤
  let filteredData = userStore.filterDataByShopPermission(allRecordsRaw.value)
  
  // 如果选择了特定店铺，进一步过滤
  if (selectedShop.value && selectedShop.value !== '全部') {
    filteredData = filteredData.filter(record => record.shopName === selectedShop.value)
  }
  
  // 统计收入来源（包含所有10个收入字段，和electron客户端保持一致）
  const paymentSummary = {
    cashIncome: 0,
    wechatIncome: 0,
    meituanIncome: 0,
    jingdongIncome: 0,
    groupBuyIncome: 0,
    sujieIncome: 0,
    kuaipaoIncome: 0,
    maidanbaIncome: 0,
    elemeIncome: 0,
    luchengIncome: 0,
  }
  
  filteredData.forEach(record => {
    paymentSummary.cashIncome += Number(record.cashIncome) || 0
    paymentSummary.wechatIncome += Number(record.wechatIncome) || 0
    paymentSummary.meituanIncome += Number(record.meituanIncome) || 0
    paymentSummary.jingdongIncome += Number(record.jingdongIncome) || 0
    paymentSummary.groupBuyIncome += Number(record.groupBuyIncome) || 0
    paymentSummary.sujieIncome += Number(record.sujieIncome) || 0
    paymentSummary.kuaipaoIncome += Number(record.kuaipaoIncome) || 0
    paymentSummary.maidanbaIncome += Number(record.maidanbaIncome) || 0
    paymentSummary.elemeIncome += Number(record.elemeIncome) || 0
    paymentSummary.luchengIncome += Number(record.luchengIncome) || 0
  })
  
  
  // 收入字段配置（和electron客户端保持一致的颜色和顺序）
  const incomeFields = [
    { value: paymentSummary.wechatIncome, name: '微信', color: '#1AAD19' },
    { value: paymentSummary.meituanIncome, name: '美团', color: '#FFC300' },
    { value: paymentSummary.cashIncome, name: '现金', color: '#1677FF' },
    { value: paymentSummary.groupBuyIncome, name: '团购', color: '#FF6A00' },
    { value: paymentSummary.jingdongIncome, name: '京东', color: '#E2231A' },
    { value: paymentSummary.sujieIncome, name: '宿捷', color: '#722ED1' },
    { value: paymentSummary.kuaipaoIncome, name: '快跑者', color: '#13C2C2' },
    { value: paymentSummary.maidanbaIncome, name: '买单吧', color: '#52C41A' },
    { value: paymentSummary.elemeIncome, name: '饿了么', color: '#FA541C' },
    { value: paymentSummary.luchengIncome, name: '鹿城生', color: '#EB2F96' },
  ]
  
  // 计算总收入（强制转数值，避免字符串拼接）
  const total = incomeFields.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
  
  if (total === 0) {
    // 如果实际数据总额为0，返回测试数据
    return [
      { name: '微信', value: 15000, percentage: '45.45', color: '#1AAD19' },
      { name: '现金', value: 8000, percentage: '24.24', color: '#1677FF' },
      { name: '美团', value: 6000, percentage: '18.18', color: '#FFC300' },
      { name: '京东', value: 4000, percentage: '12.12', color: '#E2231A' }
    ]
  }
  
  // 转换为图表数据，只显示有数据的字段
  const chartData: ChartDataItem[] = incomeFields
    .filter(item => (Number(item.value) || 0) > 0)
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
    .map(item => ({
      name: item.name,
      value: formatToTwoDecimalWithoutRounding(Number(item.value) || 0),
      percentage: ((((Number(item.value) || 0) / total) * 100)).toFixed(2),
      color: item.color
    }))
  
  return chartData
})

// ECharts 配置选项 - 使用统计数据确保一致性
const expenseTotalAmount = computed(() => {
  // 直接使用统计数据中的总支出，确保与统计卡片完全一致
  return formatToTwoDecimalWithoutRounding(statistics.value.totalExpense)
})
const incomeTotalAmount = computed(() => {
  // 直接使用统计数据中的总收入，确保与统计卡片完全一致
  return formatToTwoDecimalWithoutRounding(statistics.value.totalIncome)
})
// 
const expenseChartOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ￥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      icon: 'circle',
      itemGap: 10,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 11,
        color: '#666'
      },
      formatter: function(name: string) {
        const item = expenseChartData.value.find(d => d.name === name)
        return `${name} ${item?.percentage}%`
      }
    },
    series: [
      {
        name: '支出占比',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        data: expenseChartData.value.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color
          }
        }))
      }
    ]
  }
})

const incomeChartOption = computed(() => {
  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ￥{c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'middle',
      icon: 'circle',
      itemGap: 10,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 11,
        color: '#666'
      },
      formatter: function(name: string) {
        const item = incomeChartData.value.find(d => d.name === name)
        return `${name} ${item?.percentage}%`
      }
    },
    series: [
      {
        name: '收入占比',
        type: 'pie',
        radius: ['45%', '75%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        data: incomeChartData.value.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color
          }
        }))
      }
    ]
  }
})

// 加载支出详情数据
const loadExpenseDetails = async () => {
  try {
    const expenseRecordsData = await recordsAPI.getExpenseRecords()
    expenseRawRecords.value = Array.isArray(expenseRecordsData) ? expenseRecordsData : []
  } catch (error) {
    console.error('获取支出详情失败:', error)
    expenseRawRecords.value = []
  }
}

// 处理导航
const handleNavigate = (path: string) => {
  // 检查店铺权限（除了设置页面）
  if (path !== '/settings' && !userStore.hasShopAccess) {
    ElMessage.warning('您没有店铺访问权限，无法使用此功能')
    return
  }
  
  router.push(path)
}

// 加载所有仪表板数据
const loadDashboardData = async () => {
  await Promise.all([
    loadStatistics(),
    loadRecentRecords(),
    loadExpenseDetails()
  ])
}

// 监听店铺权限变化
watch(() => userStore.userShops, () => {
  initializeShopSelection()
  if (userStore.hasShopAccess) {
    loadDashboardData()
  }
}, { immediate: true })

onMounted(async () => {
  // 等待用户状态初始化完成
  if (userStore.hasShopAccess) {
    initializeShopSelection()
    await loadDashboardData()
  }
})
</script>

<style lang="scss" scoped>
.dashboard-container {
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

.dashboard-content {
  padding: 16px;
}

.stats-overview {
  margin-bottom: 16px;
  
  .stat-card {
    &.blue-gradient {
      background: linear-gradient(135deg, #4285F4 0%, #6366F1 100%);
      border-radius: 10px;
      padding: 12px 16px;
      color: white;
      box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
      
      .main-stat {
        margin-bottom: 8px;
        
        .stat-title {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 4px;
          
          .el-icon {
            font-size: 12px;
          }
        }
        
        .main-value {
          font-size: 22px;
          font-weight: 700;
          color: white;
          line-height: 1.1;
        }
      }
      
      .sub-stats {
        display: flex;
        justify-content: space-between;
        
        .sub-stat {
          display: flex;
          flex-direction: column;
          
          .sub-label {
            font-size: 10px;
            color: rgba(255, 255, 255, 0.7);
            margin-bottom: 2px;
          }
          
          .sub-value {
            font-size: 13px;
            font-weight: 600;
            color: white;
          }
        }
      }
    }
  }
}

.charts-section {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin-bottom: 16px;
}

.chart-card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  
  .chart-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 0 16px 0;
  }
  
  .chart-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0;
  }
  
  .chart-total {
    font-size: 14px;
    font-weight: 600;
    color: #606266;
  }
  
  .header-arrow { color: #C0C4CC; font-size: 16px; }
  
  .chart-loading {
    padding: 20px 0;
  }
  
  .chart-container {
    .pie-chart {
      width: 100%;
      height: 220px;
    }
  }
}

.records-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
  }
  
  .records-loading {
    padding: 20px 0;
  }
  
  .records-table {
    .record-row {
      display: grid;
      grid-template-columns: 80px 60px 1fr 80px;
      gap: 12px;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #f0f2f5;
      font-size: 14px;
      
      &:last-child {
        border-bottom: none;
      }
      
      .record-date {
        color: #909399;
        font-size: 12px;
      }
      
      .record-amount {
        font-weight: 600;
        text-align: right;
        
        &.income {
          color: #52c41a;
        }
        
        &.expense {
          color: #ff4d4f;
        }
      }
      
      .record-shop {
        color: #606266;
        font-size: 12px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  }
}

// 移动端适配
@media (max-width: 480px) {
  .dashboard-content {
    padding: 12px;
  }
  
  .page-header {
    padding: 12px;
  }
  
  .stats-overview {
    grid-template-columns: 1fr;
    gap: 8px;
    
    .stat-item {
      padding: 12px;
      
      .stat-icon {
        width: 32px;
        height: 32px;
      }
      
      .stat-content {
        .stat-value {
          font-size: 14px;
        }
        
        .stat-label {
          font-size: 11px;
        }
      }
    }
  }
  
  .charts-section {
    grid-template-columns: 1fr;
    gap: 8px;
  }
  
  .chart-card {
    padding: 12px;
    
    h3 {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .chart-total {
      font-size: 13px;
    }
    
    .chart-container {
      gap: 12px;
      
      .pie-chart {
        width: 100%;
        height: 180px;
      }
      
      .chart-legend {
        .legend-item {
          font-size: 11px;
          margin-bottom: 6px;
          
          .legend-color {
            width: 10px;
            height: 10px;
          }
        }
      }
    }
  }
  
  .records-card {
    .records-table {
      .record-row {
        grid-template-columns: 70px 50px 1fr 60px;
        gap: 8px;
        font-size: 12px;
        
        .record-date {
          font-size: 11px;
        }
        
        .record-shop {
          font-size: 11px;
        }
      }
    }
  }
}

// 底部按钮区域
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e4e7ed;
  padding: 12px 16px;
  z-index: 99;
  
  .action-buttons {
    display: flex;
    justify-content: space-around;
    align-items: center;
    max-width: 480px;
    margin: 0 auto;
    
    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-width: 60px;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s;
      
      &:hover {
        background: #f5f7fa;
      }
      
      &:active {
        transform: scale(0.95);
        background: #e4e7ed;
      }
      
      .btn-icon {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: #409EFF;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 4px;
        
        .el-icon {
          color: white;
          font-size: 14px;
        }
      }
      
      .btn-text {
        font-size: 12px;
        color: #606266;
        font-weight: 500;
        text-align: center;
        line-height: 1.2;
      }
    }
  }
}
</style>
