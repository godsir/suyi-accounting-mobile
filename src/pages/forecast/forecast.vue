<template>
  <div class="forecast-container">
    <div class="page-header">
      <div class="page-title">
        <h2>
          <el-icon><TrendCharts /></el-icon>
          预测分析
        </h2>
      </div>
      <div class="header-controls">
        <el-select
          v-model="selectedShop"
          placeholder="选择店铺"
          :disabled="!userStore.hasShopAccess"
          style="min-width: 140px"
          @change="loadData"
        >
          <el-option
            v-for="shop in userStore.userShops"
            :key="shop.id"
            :label="`${shop.name} (${shop.city})`"
            :value="shop.name"
          />
        </el-select>
      </div>
    </div>

    <el-alert
      v-if="!userStore.hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法查看预测分析。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 16px"
    />

    <div class="main-content" v-else>
      <!-- 总体预测卡片 -->
      <div class="cards">
        <div class="card">
          <div class="card-title">未来30天预测</div>
          <div class="card-body" v-loading="loading">
            <div class="prediction-summary">
              <div class="summary-item">
                <div class="item-label">预测收入</div>
                <div class="item-value income">¥{{ format2(prediction.totalIncome) }}</div>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <div class="item-label">预测支出</div>
                <div class="item-value expense">¥{{ format2(prediction.totalExpense) }}</div>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <div class="item-label">预测净利润</div>
                <div class="item-value profit" :class="{ negative: prediction.netProfit < 0 }">
                  {{ prediction.netProfit < 0 ? '-' : '' }}¥{{ format2(Math.abs(prediction.netProfit)) }}
                </div>
              </div>
            </div>
            <div class="prediction-info" v-if="prediction.description">
              <el-icon><InfoFilled /></el-icon>
              {{ prediction.description }}
            </div>
          </div>
        </div>

        <!-- 未来7日收入预测 -->
        <div class="card">
          <div class="card-title">未来7日收入预测</div>
          <div class="card-body" v-loading="loading">
            <div v-if="dailyForecast.length === 0" class="empty">
              <el-empty description="暂无预测数据" :image-size="60" />
            </div>
            <div v-else class="forecast-list">
              <div class="forecast-item" v-for="(d, i) in dailyForecast" :key="i">
                <div class="date-info">
                  <div class="date">{{ formatDate(d.date) }}</div>
                  <div class="weekday">{{ getWeekday(d.date) }}</div>
                </div>
                <div class="amount-info">
                  <div class="amount">¥{{ format2(d.predictedIncome || d.value || 0) }}</div>
                  <div class="confidence" v-if="d.confidence">
                    置信度 {{ (d.confidence * 100).toFixed(0) }}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { api, API_ENDPOINTS } from '@/api'
import { TrendCharts, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const userStore = useUserStore()
const selectedShop = ref<string>('all')
const loading = ref(false)

// 预测数据
const prediction = ref<{ 
  totalIncome: number; 
  totalExpense: number; 
  netProfit: number; 
  description?: string;
  confidence?: number;
  method?: string;
}>({
  totalIncome: 0,
  totalExpense: 0,
  netProfit: 0,
})

const dailyForecast = ref<Array<{ 
  date: string; 
  predictedIncome?: number; 
  predictedRevenue?: number;
  value?: number;
  confidence?: number;
  weather?: any;
}>>([])

const format2 = (n: number) => (Math.floor((n || 0) * 100) / 100).toFixed(2)


const loadData = async () => {
  if (!userStore.hasShopAccess) return
  loading.value = true
  try {
    // 使用与electron客户端相同的数据加载方式
    await loadForecastData()
  } catch (e) {
    console.error('加载预测数据失败:', e)
    ElMessage.error('加载预测数据失败')
    prediction.value = { totalIncome: 0, totalExpense: 0, netProfit: 0 }
    dailyForecast.value = []
  } finally {
    loading.value = false
  }
}

// 加载预测数据 - 参考electron客户端的实现
const loadForecastData = async () => {
  try {
    // 1. 先加载历史数据用于基础计算
    const [accountingRecords, expenseRecords, shopRecords] = await Promise.all([
      api.get(API_ENDPOINTS.allRecords),
      api.get(API_ENDPOINTS.expenseRecords),
      api.get(API_ENDPOINTS.shops),
    ])


    // 应用店铺过滤
    let filteredData = Array.isArray(accountingRecords) ? accountingRecords : []
    if (userStore.userShops && userStore.userShops.length > 0) {
      const allowedShopNames = userStore.userShops.map(shop => shop.name)
      filteredData = filteredData.filter(record => allowedShopNames.includes(record.shopName))
    }

    // 如果选择了特定店铺，进一步过滤
    if (selectedShop.value && selectedShop.value !== 'all') {
      filteredData = filteredData.filter(record => record.shopName === selectedShop.value)
    }


    if (filteredData.length === 0) {
      console.log('没有历史数据，无法生成预测')
      prediction.value = { 
        totalIncome: 0, 
        totalExpense: 0, 
        netProfit: 0, 
        description: '缺少历史数据，无法生成准确预测',
        confidence: 0,
        method: '无数据'
      }
      dailyForecast.value = []
      return
    }

    // 2. 计算基础统计数据
    const recentData = filteredData
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, Math.min(30, filteredData.length)) // 最近30条记录

    const baseMetrics = {
      avgIncome: recentData.reduce((sum, record) => sum + (record.totalIncome || 0), 0) / recentData.length,
      avgExpense: recentData.reduce((sum, record) => sum + (record.totalExpense || 0), 0) / recentData.length,
      avgProfit: recentData.reduce((sum, record) => sum + ((record.totalIncome || 0) - (record.totalExpense || 0)), 0) / recentData.length,
    }


    // 3. 生成总体预测（基于历史平均值和简单趋势）
    const confidence = Math.min(0.8, 0.4 + (recentData.length * 0.02))
    const seasonalFactor = getSeasonalFactor() // 季节性调整
    
    prediction.value = {
      totalIncome: Math.max(100, baseMetrics.avgIncome * seasonalFactor * 30), // 预测月收入
      totalExpense: Math.max(50, baseMetrics.avgExpense * 30), // 预测月支出
      netProfit: Math.max(-1000, (baseMetrics.avgIncome * seasonalFactor - baseMetrics.avgExpense) * 30), // 预测月净利润
      description: `基于最近${recentData.length}条记录生成的预测，置信度${(confidence * 100).toFixed(1)}%`,
      confidence: confidence,
      method: '简化预测模型'
    }

    // 4. 生成未来7天预测
    const dailyPredictions = []
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date()
      targetDate.setDate(targetDate.getDate() + i)
      
      const dayOfWeek = targetDate.getDay()
      const weekdayFactor = getWeekdayFactor(dayOfWeek, recentData)
      
      const predictedIncome = Math.max(50, baseMetrics.avgIncome * weekdayFactor * seasonalFactor)
      
      dailyPredictions.push({
        date: targetDate.toISOString().split('T')[0],
        predictedIncome: Math.round(predictedIncome * 100) / 100,
        predictedRevenue: Math.round(predictedIncome * 100) / 100,
        confidence: confidence,
        weather: getSimpleWeatherPrediction(targetDate)
      })
    }

    dailyForecast.value = dailyPredictions

  } catch (error) {
    console.error('预测数据生成失败:', error)
    throw error
  }
}

// 获取季节性调整因子
const getSeasonalFactor = (): number => {
  const month = new Date().getMonth() + 1
  
  // 简单的季节性调整
  if (month >= 11 || month <= 2) {
    return 1.05 // 冬季，节假日较多
  } else if (month >= 6 && month <= 8) {
    return 1.02 // 夏季，旅游旺季
  } else if (month >= 3 && month <= 5) {
    return 0.98 // 春季
  } else {
    return 0.96 // 秋季
  }
}

// 获取工作日调整因子
const getWeekdayFactor = (dayOfWeek: number, recentData: any[]): number => {
  // 分析历史数据中各工作日的表现
  const weekdayTotals = new Array(7).fill(0)
  const weekdayCounts = new Array(7).fill(0)

  recentData.forEach(record => {
    const recordDate = new Date(record.date)
    const day = recordDate.getDay()
    weekdayTotals[day] += record.totalIncome || 0
    weekdayCounts[day]++
  })

  // 计算总平均值
  const totalIncome = weekdayTotals.reduce((sum, val) => sum + val, 0)
  const totalCount = weekdayCounts.reduce((sum, val) => sum + val, 0)
  const overallAvg = totalCount > 0 ? totalIncome / totalCount : 1000

  // 计算特定工作日的因子
  if (weekdayCounts[dayOfWeek] > 0) {
    const dayAvg = weekdayTotals[dayOfWeek] / weekdayCounts[dayOfWeek]
    return Math.max(0.8, Math.min(1.2, dayAvg / overallAvg))
  }

  // 默认因子：周末略低，工作日正常
  return dayOfWeek === 0 || dayOfWeek === 6 ? 0.9 : 1.0
}

// 获取简单的天气预测
const getSimpleWeatherPrediction = (date: Date) => {
  const month = date.getMonth() + 1
  let baseTemp: number
  let condition: string

  // 根据季节生成合理的天气
  if (month >= 12 || month <= 2) {
    baseTemp = 2 // 冬季
    condition = '晴'
  } else if (month >= 3 && month <= 5) {
    baseTemp = 18 // 春季
    condition = '多云'
  } else if (month >= 6 && month <= 8) {
    baseTemp = 28 // 夏季
    condition = '晴'
  } else {
    baseTemp = 15 // 秋季
    condition = '阴'
  }

  return {
    temperature: baseTemp + (Math.random() - 0.5) * 4,
    condition: condition,
    impact: 1.0
  }
}

// 格式化日期显示
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

// 获取星期几
const getWeekday = (dateStr: string): string => {
  const date = new Date(dateStr)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[date.getDay()]
}

onMounted(() => {
  if (userStore.userShops.length > 0) {
    selectedShop.value = userStore.userShops[0].name
    loadData()
  }
})
</script>

<style lang="scss" scoped>
.forecast-container {
  min-height: 100vh;
  background: #f5f7fa;
}
.page-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  padding-top: max(env(safe-area-inset-top), 20px);
  padding-left: max(env(safe-area-inset-left), 16px);
  padding-right: max(env(safe-area-inset-right), 16px);
  padding-bottom: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  
  .page-title h2 { 
    margin: 0; 
    font-size: 20px; 
    font-weight: 600; 
    display: flex; 
    align-items: center; 
    gap: 8px; 
    padding-top: 16px;
  }
  .header-controls { 
    margin-top: 12px; 
    display: flex; 
    gap: 8px; 
    align-items: center; 
  }
}

.main-content { 
  padding: 16px;
  padding-top: max(calc(env(safe-area-inset-top) + 122px), 138px);
  padding-left: max(env(safe-area-inset-left), 16px);
  padding-right: max(env(safe-area-inset-right), 16px);
  padding-bottom: max(calc(env(safe-area-inset-bottom) + 100px), 116px);
  min-height: 100vh;
}

/* 为不支持env()的浏览器提供兼容性处理 */
@supports not (padding: max(env(safe-area-inset-top), 20px)) {
  .page-header {
    padding: 36px 16px 16px;
  }
  
  .main-content {
    padding-top: 154px;
    padding-bottom: 116px;
  }
}

/* 为iPhone X及以上设备优化 */
@media screen and (device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) {
  .page-header {
    padding-top: 64px;
  }
  
  .main-content {
    padding-top: 170px;
  }
}

/* 为iPhone 12/13/14系列优化 */
@media screen and (device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) {
  .page-header {
    padding-top: 64px;
  }
  
  .main-content {
    padding-top: 170px;
  }
}

/* 为iPhone 12/13/14 Pro Max优化 */
@media screen and (device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) {
  .page-header {
    padding-top: 64px;
  }
  
  .main-content {
    padding-top: 170px;
  }
}
.cards { display: grid; grid-template-columns: 1fr; gap: 12px; }
.card { background: white; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.card-title { font-size: 16px; font-weight: 600; color: #303133; margin-bottom: 12px; }
.metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.metric { background: #fafafa; border-radius: 8px; padding: 12px; }
.label { color: #909399; font-size: 12px; margin-bottom: 6px; }
.value { font-weight: 700; font-size: 16px; color: #303133; }
.value.income { color: #52c41a; }
.value.expense { color: #ff4d4f; }
.value.profit { color: #409EFF; }
.value.profit.neg { color: #ff4d4f; }
// 新的紧凑预测样式
.prediction-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  background: linear-gradient(135deg, #f8faff 0%, #f1f5f9 100%);
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  margin-bottom: 16px;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
  
  .item-label {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
    margin-bottom: 4px;
    text-align: center;
    white-space: nowrap;
  }
  
  .item-value {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.2;
    text-align: center;
    
    &.income {
      color: #10b981;
    }
    
    &.expense {
      color: #ef4444;
    }
    
    &.profit {
      color: #3b82f6;
      
      &.negative {
        color: #ef4444;
      }
    }
  }
}

.summary-divider {
  width: 1px;
  height: 40px;
  background: linear-gradient(180deg, transparent, #cbd5e1, transparent);
  flex-shrink: 0;
}

.prediction-info {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 12px;
  background: #f8fafc;
  border-radius: 8px;
  font-size: 12px;
  color: #64748b;
  border-left: 3px solid #94a3b8;
  
  .el-icon {
    color: #94a3b8;
    font-size: 14px;
    flex-shrink: 0;
  }
}

@media (max-width: 640px) {
  .prediction-summary {
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    
    .summary-item {
      flex-direction: row;
      justify-content: space-between;
      width: 100%;
      
      .item-label {
        text-align: left;
        margin-bottom: 0;
      }
      
      .item-value {
        text-align: right;
        font-size: 16px;
      }
    }
    
    .summary-divider {
      width: 100%;
      height: 1px;
      background: linear-gradient(90deg, transparent, #cbd5e1, transparent);
    }
  }
  
  .prediction-info {
    font-size: 11px;
    padding: 8px 10px;
  }
}
.forecast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.forecast-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: linear-gradient(135deg, #f8f9ff 0%, #f3f4f6 100%);
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  position: relative;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    border-color: #d1d5db;
  }
  
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: linear-gradient(180deg, #3b82f6, #1d4ed8);
    border-radius: 12px 0 0 12px;
  }
}

.date-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  
  .date {
    font-size: 15px;
    font-weight: 600;
    color: #1f2937;
    line-height: 1.2;
  }
  
  .weekday {
    font-size: 12px;
    color: #6b7280;
    font-weight: 500;
  }
}

.amount-info {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  
  .amount {
    font-size: 16px;
    font-weight: 700;
    color: #059669;
    line-height: 1.2;
  }
  
  .confidence {
    font-size: 11px;
    color: #9ca3af;
    padding: 2px 6px;
    background: rgba(107, 114, 128, 0.1);
    border-radius: 8px;
    font-weight: 500;
  }
}

.empty { 
  padding: 12px 0; 
}

@media (max-width: 480px) { 
  .metrics { 
    grid-template-columns: 1fr; 
  }
  
  .forecast-item {
    padding: 12px 14px;
    
    .date-info .date {
      font-size: 14px;
    }
    
    .amount-info .amount {
      font-size: 15px;
    }
  }
}
</style>
