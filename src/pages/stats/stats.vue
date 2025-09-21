<template>
  <div class="stats-container">
    <!-- 页面头部控制区域 - 固定位置 -->
    <div class="page-header">
      <div class="page-title">
        <h2>
          <el-icon><TrendCharts /></el-icon>
          统计报表
        </h2>
      </div>
      <div class="header-controls">
        <el-select
          v-model="selectedShop"
          placeholder="选择店铺"
          style="flex: 1"
          :disabled="userStore.userShops.length === 0"
        >
          <el-option label="全部店铺" value="all" />
          <el-option
            v-for="shop in userStore.userShops"
            :key="shop.id"
            :label="`${shop.name} (${shop.city})`"
            :value="shop.name"
          />
        </el-select>
        
        <el-select
          v-model="statType"
          @change="handleStatTypeChange"
          style="flex: 1"
        >
          <el-option label="日统计" value="daily" />
          <el-option label="周统计" value="weekly" />
          <el-option label="月统计" value="monthly" />
          <el-option label="季度统计" value="quarterly" />
          <el-option label="年度统计" value="annual" />
        </el-select>
        
        <el-date-picker
          v-if="statType === 'daily' || statType === 'weekly'"
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateRangeChange"
          style="flex: 2"
        />
      </div>
    </div>

    <!-- 店铺权限提示 -->
    <el-alert
      v-if="!userStore.hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法查看统计报表。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 16px; margin-bottom: 24px"
    />

    <div class="main-content">

      <!-- 核心指标统计条 -->
      <div class="stats-overview">
        <div class="stat-item">
          <div class="stat-icon income">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value income">
              ¥{{ formatCurrency(metrics.totalIncome) }}
            </div>
            <div class="stat-label">总收入</div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon expense">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value expense">
              ¥{{ formatCurrency(metrics.totalExpense) }}
            </div>
            <div class="stat-label">总支出</div>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-icon profit">
            <el-icon v-if="metrics.netProfit >= 0"><TrendCharts /></el-icon>
            <el-icon v-else><Bottom /></el-icon>
          </div>
          <div class="stat-content">
            <div 
              class="stat-value"
              :style="{ color: metrics.netProfit >= 0 ? '#67C23A' : '#F56C6C' }"
            >
              ¥{{ formatCurrency(Math.abs(metrics.netProfit)) }}
            </div>
            <div class="stat-label">
              净利润 ({{ metrics.profitMargin.toFixed(1) }}%)
            </div>
          </div>
        </div>
      </div>

      <!-- 空数据提示 -->
      <div v-if="!loading && chartData.length === 0" class="no-data">
        <el-empty description="暂无数据">
          <p>当前筛选条件下没有找到数据，请尝试调整筛选条件或选择其他统计类型</p>
        </el-empty>
      </div>

      <!-- 图表区域 -->
      <div v-if="chartData.length > 0" class="chart-section">
        <div class="chart-card">
          <div class="chart-header">
            <h3 class="chart-title">
              <el-icon><TrendCharts /></el-icon>
              收支趋势分析
            </h3>
          </div>
          
          <div class="chart-container" v-loading="loading">
            <div ref="chartRef" class="echarts-container"></div>
          </div>

          <!-- 简要分析 -->
          <div v-if="chartData.length >= 1" class="analysis-summary">
            <div class="analysis-row">
              <div class="analysis-item">
                <span class="analysis-label">{{ getTimeUnitName(statType) }}平均收入:</span>
                <span class="analysis-value income">
                  ¥{{ formatCurrency(metrics.avgIncome) }}
                </span>
              </div>
              
              <div v-if="chartData.length >= 2" class="analysis-item">
                <span class="analysis-label">与上期对比:</span>
                <span 
                  class="analysis-value" 
                  :style="{ color: metrics.comparisonWithPrevious.isPositive ? '#67C23A' : '#F56C6C' }"
                >
                  {{ metrics.comparisonWithPrevious.isPositive ? '+' : '-' }}{{ metrics.comparisonWithPrevious.value.toFixed(1) }}%
                </span>
              </div>
              
              <div class="analysis-item">
                <span class="analysis-label">最佳表现:</span>
                <span class="analysis-value profit">
                  {{ metrics.bestPeriod.label }} (¥{{ formatCurrency(metrics.bestPeriod.profit) }})
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { statsAPI } from '@/api'
import { ElMessage } from 'element-plus'
import {
  Document,
  Money,
  ShoppingCart,
  TrendCharts,
  Bottom
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import dayjs from 'dayjs'

const userStore = useUserStore()

// 状态管理
const loading = ref(false)
const selectedShop = ref('all')
const statType = ref('monthly')
const dateRange = ref<[string, string] | null>(null)
const chartData = ref<any[]>([])
const chartRef = ref<HTMLDivElement>()
let chartInstance: echarts.ECharts | null = null

// 图表颜色配置
const CHART_COLORS = {
  income: '#67C23A',
  expense: '#F56C6C', 
  profit: '#409EFF'
}

// 格式化货币
const formatCurrency = (value: number): string => {
  return Math.floor(value * 100) / 100
}

// 获取时间单位名称
const getTimeUnitName = (statType: string) => {
  switch (statType) {
    case 'daily': return '日'
    case 'weekly': return '周'
    case 'monthly': return '月'
    case 'quarterly': return '季度'
    case 'annual': return '年'
    default: return '期'
  }
}

// 计算核心指标
const metrics = computed(() => {
  if (chartData.value.length === 0) {
    return {
      totalIncome: 0,
      totalExpense: 0,
      netProfit: 0,
      profitMargin: 0,
      avgIncome: 0,
      bestPeriod: { label: '无数据', profit: 0 },
      comparisonWithPrevious: { value: 0, isPositive: false, label: '无对比数据' }
    }
  }

  const totalIncome = chartData.value.reduce((sum, item) => sum + (item.totalIncome || 0), 0)
  const totalExpense = chartData.value.reduce((sum, item) => sum + (item.totalExpense || 0), 0)
  const netProfit = totalIncome - totalExpense
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0
  const avgIncome = totalIncome / chartData.value.length

  // 找出表现最好的周期
  let bestPeriod = chartData.value[0]
  for (const item of chartData.value) {
    const itemProfit = (item.totalIncome || 0) - (item.totalExpense || 0)
    const bestProfit = (bestPeriod.totalIncome || 0) - (bestPeriod.totalExpense || 0)
    if (itemProfit > bestProfit) {
      bestPeriod = item
    }
  }

  // 计算与上一期的对比
  let comparisonWithPrevious = { value: 0, isPositive: false, label: '无对比数据' }
  if (chartData.value.length >= 2) {
    const latest = chartData.value[chartData.value.length - 1]
    const previous = chartData.value[chartData.value.length - 2]
    const latestIncome = latest.totalIncome || 0
    const previousIncome = previous.totalIncome || 0
    
    if (previousIncome > 0) {
      const changePercent = ((latestIncome - previousIncome) / previousIncome) * 100
      comparisonWithPrevious = {
        value: Math.abs(changePercent),
        isPositive: changePercent >= 0,
        label: `较上${getTimeUnitName(statType.value)}${changePercent >= 0 ? '增长' : '下降'}`
      }
    }
  }

  return {
    totalIncome,
    totalExpense,
    netProfit,
    profitMargin,
    avgIncome,
    bestPeriod: {
      label: bestPeriod.label || bestPeriod.date || bestPeriod.month || '未知',
      profit: (bestPeriod.totalIncome || 0) - (bestPeriod.totalExpense || 0)
    },
    comparisonWithPrevious
  }
})

// 获取统计数据
const fetchStats = async () => {
  loading.value = true
  try {
    const params: any = {}
    
    if (selectedShop.value && selectedShop.value !== 'all') {
      params.shop = selectedShop.value
    }

    // 对于日统计和周统计，使用日期范围
    if (dateRange.value && (statType.value === 'daily' || statType.value === 'weekly')) {
      const [startDate, endDate] = dateRange.value
      params.startDate = startDate
      params.endDate = endDate
    }

    const response = await statsAPI.getStats(statType.value, params)
    chartData.value = response || []
    
    // 更新图表
    await nextTick()
    updateChart()
    
  } catch (error) {
    console.error('获取统计数据失败:', error)
    ElMessage.error('获取统计数据失败')
    chartData.value = []
  } finally {
    loading.value = false
  }
}

// 生成图表配置
const generateChartOptions = () => {
  const xData: string[] = []
  const incomeData: number[] = []
  const expenseData: number[] = []
  const profitData: number[] = []

  chartData.value.forEach((item) => {
    xData.push(
      item.label || item.date || item.month || item.quarter || item.year || ''
    )
    incomeData.push(formatCurrency(item.totalIncome || 0))
    expenseData.push(formatCurrency(item.totalExpense || 0))
    profitData.push(
      formatCurrency((item.totalIncome || 0) - (item.totalExpense || 0))
    )
  })

  return {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#e5e5e5',
      textStyle: { color: '#333' },
      formatter: (params: any) => {
        let result = `<div style="padding: 8px;"><div style="font-weight: bold; margin-bottom: 4px;">${params[0].axisValue}</div>`
        params.forEach((item: any) => {
          result += `<div style="margin: 2px 0;"><span style="color: ${item.color};">●</span> ${item.seriesName}: ¥${formatCurrency(item.value).toFixed(2)}</div>`
        })
        result += `</div>`
        return result
      }
    },
    legend: {
      data: ['收入', '支出', '净利润'],
      top: 10
    },
    grid: { left: 60, right: 20, top: 60, bottom: 40 },
    xAxis: {
      type: 'category',
      data: xData,
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: { color: '#666' }
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: '#e5e5e5' } },
      axisLabel: {
        color: '#666',
        formatter: (value: number) => `¥${formatCurrency(value).toFixed(0)}`
      },
      splitLine: { lineStyle: { type: 'dashed', color: '#f0f0f0' } }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomeData,
        itemStyle: { color: CHART_COLORS.income }
      },
      {
        name: '支出',
        type: 'bar',
        data: expenseData,
        itemStyle: { color: CHART_COLORS.expense }
      },
      {
        name: '净利润',
        type: 'line',
        data: profitData,
        smooth: true,
        itemStyle: { color: CHART_COLORS.profit },
        lineStyle: { width: 3 },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.01)' }
          ])
        }
      }
    ]
  }
}

// 更新图表
const updateChart = () => {
  if (!chartRef.value || chartData.value.length === 0) return

  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }

  const options = generateChartOptions()
  chartInstance.setOption(options, true)
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    chartInstance?.resize()
  })
}

// 处理统计类型变化
const handleStatTypeChange = (newStatType: string) => {
  statType.value = newStatType
  dateRange.value = null
  
  // 为日统计和周统计设置默认日期范围
  if (newStatType === 'daily') {
    const endDate = dayjs()
    const startDate = dayjs().subtract(6, 'days')
    dateRange.value = [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
  } else if (newStatType === 'weekly') {
    const endDate = dayjs().endOf('week')
    const startDate = dayjs().subtract(3, 'weeks').startOf('week')
    dateRange.value = [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
  }
  
  fetchStats()
}

// 处理日期范围变化
const handleDateRangeChange = () => {
  fetchStats()
}

// 初始化默认店铺选择
onMounted(async () => {
  if (userStore.userShops.length > 0) {
    selectedShop.value = userStore.userShops[0].name
  }
  
  await nextTick()
  initChart()
  fetchStats()
})

// 监听选中店铺变化
watch(selectedShop, () => {
  fetchStats()
})

// 监听图表数据变化
watch(chartData, () => {
  nextTick(() => {
    updateChart()
  })
})
</script>

<style lang="scss" scoped>
.stats-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: white;
  padding: 16px;
  
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
  
  .date-controls {
    margin-top: 12px;
  }
}

.main-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  
  .stat-item:last-child {
    grid-column: 1 / -1;
  }
  
  @media (min-width: 768px) {
    grid-template-columns: repeat(3, 1fr);
    
    .stat-item:last-child {
      grid-column: auto;
    }
  }
  
  .stat-item {
    background: white;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    
    .stat-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .el-icon {
        font-size: 20px;
        color: white;
      }
      
      &.count {
        background: #909399;
      }
      
      &.income {
        background: #67C23A;
      }
      
      &.expense {
        background: #F56C6C;
      }
      
      &.profit {
        background: #409EFF;
      }
    }
    
    .stat-content {
      flex: 1;
      min-width: 0;
      
      .stat-value {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 4px;
        
        &.income {
          color: #67C23A;
        }
        
        &.expense {
          color: #F56C6C;
        }
      }
      
      .stat-label {
        font-size: 12px;
        color: #909399;
        line-height: 1.2;
      }
    }
  }
}

.no-data {
  background: white;
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  p {
    color: #909399;
    margin: 16px 0 0 0;
    font-size: 14px;
  }
}

.chart-section {
  .chart-card {
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    
    .chart-header {
      margin-bottom: 20px;
      
      .chart-title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
        
        .el-icon {
          color: #409EFF;
          font-size: 18px;
        }
      }
    }
    
    .chart-container {
      margin-bottom: 20px;
      
      .echarts-container {
        height: 300px;
        width: 100%;
        
        @media (min-width: 768px) {
          height: 400px;
        }
      }
    }
    
    .analysis-summary {
      padding-top: 20px;
      border-top: 1px solid #f0f0f0;
      
      .analysis-row {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        @media (min-width: 768px) {
          flex-direction: row;
          gap: 24px;
        }
        
        .analysis-item {
          display: flex;
          align-items: center;
          gap: 8px;
          
          .analysis-label {
            font-size: 14px;
            color: #666;
            white-space: nowrap;
          }
          
          .analysis-value {
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            
            &.income {
              color: #67C23A;
            }
            
            &.expense {
              color: #F56C6C;
            }
            
            &.profit {
              color: #409EFF;
            }
          }
        }
      }
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

@media (max-width: 480px) {
  .main-content {
    padding: 12px;
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
  
  .stats-overview {
    .stat-item {
      padding: 12px;
      
      .stat-icon {
        width: 36px;
        height: 36px;
        
        .el-icon {
          font-size: 18px;
        }
      }
      
      .stat-content {
        .stat-value {
          font-size: 16px;
        }
        
        .stat-label {
          font-size: 11px;
        }
      }
    }
  }
  
  .chart-section {
    .chart-card {
      padding: 16px;
      
      .chart-header {
        .chart-title {
          font-size: 16px;
        }
      }
    }
  }
}
</style>