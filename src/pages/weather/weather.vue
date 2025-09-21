<template>
  <div class="weather-container">
    <div class="page-header">
      <div class="page-title">
        <h2>
          <el-icon><Cloudy /></el-icon>
          天气信息
        </h2>
      </div>
      <div class="header-controls">
        <el-select v-model="selectedCity" placeholder="请选择城市" style="width: 140px" @change="loadWeatherData">
          <el-option v-for="c in cityOptions" :key="c.value" :label="c.label" :value="c.value" />
        </el-select>
        <el-button type="primary" plain @click="refresh" :loading="loading" size="small">刷新数据</el-button>
      </div>
    </div>

    <div v-if="!userStore.hasShopAccess" class="no-access-container">
      <el-alert
        title="无店铺访问权限"
        description="您当前没有任何店铺的访问权限，无法查看天气信息。请联系管理员为您分配店铺权限。"
        type="error"
        show-icon
        style="margin: 16px"
      />
    </div>

    <div v-else class="main-content">
      <!-- 当前天气卡片 -->
      <div class="weather-card" v-if="selectedCity">
        <div class="card-title">当前天气</div>
        <div class="card-body" v-loading="loading">
          <div v-if="current" class="current-weather">
            <div class="weather-main">
              <div class="city-name">{{ current.city }}</div>
              <div class="weather-icon">
                <el-icon size="48"><Cloudy /></el-icon>
              </div>
              <div class="temperature">{{ current.temperature }}</div>
              <div class="condition">{{ current.weather }}</div>
              <div class="update-time">
                <el-icon><Refresh /></el-icon>
                最后更新: {{ formatDateTime(current.reporttime) }}
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无数据" :image-size="60" />
        </div>
      </div>

      <!-- 未来预报卡片 -->
      <div class="card" v-if="selectedCity">
        <div class="card-title">
          <el-icon><Clock /></el-icon>
          未来天气预报
          <span class="forecast-count">{{future.length}}天预报</span>
        </div>
        <div class="card-body" v-loading="loading">
          <div v-if="future.length > 0" class="forecast-grid">
            <div class="forecast-item" v-for="(f, index) in future.slice(0,4)" :key="f.date" :class="{ today: index === 0 }">
              <div class="forecast-date">
                {{ index === 0 ? '今天' : formatDate(f.date) }}
              </div>
              <div class="forecast-weekday">{{ getWeekday(f.date) }}</div>
              <div class="forecast-icon">
                <el-icon size="24"><Cloudy /></el-icon>
              </div>
              <div class="forecast-weather">{{ f.dayweather }}</div>
              <div class="forecast-temp">
                <span class="temp-high">{{ f.daytemp }}°</span>
                <span class="temp-low">{{ f.nighttemp }}°</span>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无预报数据" :image-size="60" />
        </div>
      </div>

      <!-- 天气数据管理 -->
      <div class="card" v-if="selectedCity">
        <div class="card-title">
          <el-icon><Calendar /></el-icon>
          历史天气数据
          <span class="data-count">{{weatherData.length}}条记录</span>
        </div>
        <div class="card-actions">
          <el-button @click="showAddDialog = true" type="primary" size="small">
            <el-icon><Plus /></el-icon>
            添加数据
          </el-button>
          <el-button @click="showBatchImport = true" size="small">
            <el-icon><Upload /></el-icon>
            批量导入
          </el-button>
        </div>
        <div class="card-body">
          <!-- 统计信息 -->
          <div class="stats-grid" v-if="weatherData.length > 0">
            <div class="stat-item">
              <div class="stat-label">总记录数</div>
              <div class="stat-value">{{weatherData.length}}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">平均温度</div>
              <div class="stat-value">{{avgTemp}}°C</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最高温度</div>
              <div class="stat-value max-temp">{{maxTemp}}°C</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">最低温度</div>
              <div class="stat-value min-temp">{{minTemp}}°C</div>
            </div>
          </div>

          <!-- 天气数据列表 -->
          <div class="weather-list" v-if="weatherData.length > 0">
            <div class="weather-item" v-for="item in displayWeatherData" :key="item.id">
              <div class="item-content">
                <div class="date-info">
                  <span class="date">{{ formatDate(item.date) }}</span>
                  <span class="weekday">{{ getWeekday(item.date) }}</span>
                </div>
                <div class="weather-info">
                  <span class="weather-type">{{ item.type || '未记录' }}</span>
                  <span class="temp-info">
                    <span v-if="item.tmin && item.tmax">{{ item.tmin }}° / {{ item.tmax }}°</span>
                    <span v-else>{{ item.tavg }}°</span>
                  </span>
                </div>
              </div>
              <div class="item-actions">
                <el-button @click="editWeatherData(item)" type="text" size="small">
                  <el-icon><Edit /></el-icon>
                </el-button>
                <el-popconfirm title="确定删除这条数据吗？" @confirm="deleteWeatherData(item.id)">
                  <template #reference>
                    <el-button type="text" size="small" style="color: #ff4d4f">
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </template>
                </el-popconfirm>
              </div>
            </div>
          </div>

          <!-- 分页 -->
          <el-pagination
            v-if="weatherData.length > pageSize"
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="weatherData.length"
            layout="prev, pager, next"
            small
            style="margin-top: 16px; text-align: center"
          />

          <el-empty v-if="weatherData.length === 0 && !loading" description="暂无历史数据" :image-size="60" />
        </div>
      </div>

      <!-- 未来天气预测数据 -->
      <div class="card" v-if="selectedCity">
        <div class="card-title">
          <el-icon><TrendCharts /></el-icon>
          未来天气预测数据
          <span class="data-count">{{futureWeatherData.length}}条记录</span>
        </div>
        <div class="card-actions">
          <el-button @click="refreshFutureWeatherData" :loading="loading" size="small">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
          <el-popconfirm title="确定清空所有未来天气数据吗？" @confirm="clearFutureWeatherData">
            <template #reference>
              <el-button size="small" type="danger" :disabled="futureWeatherData.length === 0">
                <el-icon><Delete /></el-icon>
                清空数据
              </el-button>
            </template>
          </el-popconfirm>
        </div>
        <div class="card-body">
          <div class="future-data-list" v-if="futureWeatherData.length > 0">
            <div class="future-data-item" v-for="item in futureWeatherData" :key="item.id">
              <div class="future-date-info">
                <span class="date">{{ formatDate(item.date) }}</span>
                <span class="weekday">{{ getWeekday(item.date) }}</span>
              </div>
              <div class="future-weather-content">
                <div class="weather-row">
                  <span class="weather-label">白天:</span>
                  <span class="weather-desc">{{ item.dayweather }}</span>
                  <span class="weather-temp">{{ item.daytemp }}°</span>
                  <span class="weather-wind">{{ item.daywind }} {{ item.daypower }}级</span>
                </div>
                <div class="weather-row">
                  <span class="weather-label">夜间:</span>
                  <span class="weather-desc">{{ item.nightweather }}</span>
                  <span class="weather-temp">{{ item.nighttemp }}°</span>
                  <span class="weather-wind">{{ item.nightwind }} {{ item.nightpower }}级</span>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else description="暂无预测数据" :image-size="60" />
        </div>
      </div>
    </div>

    <!-- 添加/编辑天气数据对话框 -->
    <el-dialog v-model="showAddDialog" :title="editingData ? '编辑天气数据' : '添加天气数据'" width="90%" style="max-width: 500px">
      <el-form :model="weatherForm" :rules="weatherRules" ref="weatherFormRef" label-width="100px">
        <el-form-item label="日期" prop="date">
          <el-date-picker v-model="weatherForm.date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="平均温度" prop="tavg">
          <el-input-number v-model="weatherForm.tavg" :precision="1" :min="-50" :max="60" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最低温度" prop="tmin">
          <el-input-number v-model="weatherForm.tmin" :precision="1" :min="-50" :max="60" style="width: 100%" />
        </el-form-item>
        <el-form-item label="最高温度" prop="tmax">
          <el-input-number v-model="weatherForm.tmax" :precision="1" :min="-50" :max="60" style="width: 100%" />
        </el-form-item>
        <el-form-item label="天气类型" prop="type">
          <el-input v-model="weatherForm.type" placeholder="如：晴、多云、雨等" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveWeatherData" :loading="saving">保存</el-button>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog v-model="showBatchImport" title="批量导入天气数据" width="90%" style="max-width: 600px">
      <el-alert message="支持Excel文件格式" description="请确保Excel文件包含：日期、平均温度（必需），最低温度、最高温度、天气类型（可选）" type="info" style="margin-bottom: 16px" />
      <el-upload
        drag
        :auto-upload="false"
        :on-change="handleFileChange"
        accept=".xlsx,.xls"
        :file-list="uploadFileList"
        :limit="1"
      >
        <el-icon style="font-size: 40px; color: #409EFF"><Upload /></el-icon>
        <div>点击或拖拽文件到此区域上传</div>
        <div style="color: #999; font-size: 14px">支持 .xlsx 和 .xls 格式</div>
      </el-upload>
      <template #footer>
        <el-button @click="showBatchImport = false">取消</el-button>
        <el-button type="primary" @click="importWeatherData" :loading="importing" :disabled="!uploadFile">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useUserStore } from '@/store/user'
import { api, API_ENDPOINTS } from '@/api'
import { 
  Cloudy, 
  Calendar, 
  Plus, 
  Upload, 
  Edit, 
  Delete, 
  Refresh, 
  TrendCharts,
  Clock
} from '@element-plus/icons-vue'
import { ElMessage, ElForm } from 'element-plus'

const userStore = useUserStore()
const loading = ref(false)
const saving = ref(false)
const importing = ref(false)
const selectedCity = ref('')
const cityOptions = computed(() => Array.from(new Set(userStore.userShops.map(s => s.city))).map(c => ({ label: c, value: c })))

// 基础数据
const current = ref<any>(null)
const future = ref<any[]>([])
const weatherData = ref<any[]>([])
const futureWeatherData = ref<any[]>([])

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const displayWeatherData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return weatherData.value.slice(start, end)
})

// 统计数据
const avgTemp = computed(() => {
  if (weatherData.value.length === 0) return 0
  const sum = weatherData.value.reduce((s, item) => s + item.tavg, 0)
  return Math.round(sum / weatherData.value.length * 10) / 10
})

const maxTemp = computed(() => {
  if (weatherData.value.length === 0) return 0
  return Math.max(...weatherData.value.map(item => item.tmax || item.tavg))
})

const minTemp = computed(() => {
  if (weatherData.value.length === 0) return 0
  return Math.min(...weatherData.value.map(item => item.tmin || item.tavg))
})

// 对话框状态
const showAddDialog = ref(false)
const showBatchImport = ref(false)
const editingData = ref<any>(null)

// 表单数据
const weatherForm = ref({
  date: '',
  tavg: null,
  tmin: null,
  tmax: null,
  type: ''
})

const weatherRules = {
  date: [{ required: true, message: '请选择日期', trigger: 'change' }],
  tavg: [{ required: true, message: '请输入平均温度', trigger: 'blur' }]
}

const weatherFormRef = ref<InstanceType<typeof ElForm>>()

// 上传相关
const uploadFile = ref<any>(null)
const uploadFileList = ref<any[]>([])

// 格式化日期
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

// 格式化日期时间
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 加载天气数据
const loadWeatherData = async () => {
  if (!selectedCity.value) return
  
  // 加载当前天气和未来预报
  await loadFromDB()
  
  // 加载历史数据
  await loadHistoryWeatherData()
  
  // 加载未来预测数据
  await loadFutureWeatherData()
}

// 从数据库获取未来天气数据（参考electron客户端实现）
const fetchFutureWeatherFromDatabase = async () => {
  if (!selectedCity.value) {
    future.value = []
    return
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    
    // 使用正确的API路径获取未来天气数据
    const data = await api.get('/weather/future', { city: selectedCity.value })
    
    let futureCasts: any[] = []
    
    if (data && data.length > 0) {
      // 转换数据库数据为WeatherCast格式
      const allFutureCasts = data.map((item: any) => ({
        date: item.date,
        dayweather: item.dayweather || '晴',
        nightweather: item.nightweather || '晴',
        daytemp: item.daytemp?.toString() || '20',
        nighttemp: item.nighttemp?.toString() || '15',
        daywind: item.daywind || '北风',
        nightwind: item.nightwind || '北风',
        daypower: item.daypower || '3',
        nightpower: item.nightpower || '3',
      }))
      
      // 获取今天及以后的天气数据，按日期排序
      futureCasts = allFutureCasts
        .filter((item: any) => item.date >= today)
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }
    
    // 检查是否有今天的数据
    const todayData = futureCasts.find(item => item.date === today)
    
    // 如果没有今天的数据，尝试从主表获取并添加
    if (!todayData) {
      try {
        const todayWeatherData = await api.get(API_ENDPOINTS.weather, {
          city: selectedCity.value, 
          date: today
        })
        
        if (todayWeatherData && todayWeatherData.length > 0) {
          const todayWeather = todayWeatherData[0]
          const todayForecast = {
            date: today,
            dayweather: todayWeather.type || '晴',
            nightweather: todayWeather.type || '晴',
            daytemp: todayWeather.tmax?.toString() || todayWeather.tavg?.toString() || '20',
            nighttemp: todayWeather.tmin?.toString() || todayWeather.tavg?.toString() || '15',
            daywind: '北风',
            nightwind: '北风',
            daypower: '3',
            nightpower: '3',
          }
          
          // 将今天的数据插入到开头
          futureCasts.unshift(todayForecast)
        }
      } catch (todayError) {
        console.warn("获取今天数据失败:", todayError)
      }
    }
    
    // 如果还是没有任何数据，创建默认的今天数据
    if (futureCasts.length === 0) {
      const defaultTodayForecast = {
        date: today,
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '25',
        nighttemp: '15',
        daywind: '北风',
        nightwind: '北风',
        daypower: '3',
        nightpower: '3',
      }
      futureCasts.push(defaultTodayForecast)
    }
    
    // 确保有4天数据，如果不足4天，添加后续几天的默认数据
    const targetDays = 4
    while (futureCasts.length < targetDays) {
      const lastDate = futureCasts[futureCasts.length - 1]?.date || today
      const nextDate = new Date(lastDate)
      nextDate.setDate(nextDate.getDate() + 1)
      const nextDateStr = nextDate.toISOString().split('T')[0]
      
      const defaultForecast = {
        date: nextDateStr,
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '25',
        nighttemp: '15',
        daywind: '北风',
        nightwind: '北风',
        daypower: '3',
        nightpower: '3',
      }
      futureCasts.push(defaultForecast)
    }
    
    // 最多显示4天
    future.value = futureCasts.slice(0, 4)
    
  } catch (error) {
    console.error("从数据库获取未来天气数据失败:", error)
    // 如果出错，至少显示今天的默认数据
    const today = new Date().toISOString().split('T')[0]
    const defaultForecasts = []
    
    for (let i = 0; i < 4; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() + i)
      const dateStr = date.toISOString().split('T')[0]
      
      defaultForecasts.push({
        date: dateStr,
        dayweather: '晴',
        nightweather: '晴',
        daytemp: '25',
        nighttemp: '15',
        daywind: '北风',
        nightwind: '北风',
        daypower: '3',
        nightpower: '3',
      })
    }
    
    future.value = defaultForecasts
  }
}

const loadFromDB = async () => {
  if (!selectedCity.value) return
  try {
    // 首先获取未来天气数据（包含今天）
    await fetchFutureWeatherFromDatabase()
    
    // 然后尝试从数据库获取今天的天气数据用于主显示区域
    const today = new Date().toISOString().split('T')[0]
    const todayData = await api.get(API_ENDPOINTS.weather, {
      city: selectedCity.value,
      date: today
    })
    
    if (todayData && todayData.length > 0) {
      const latest = todayData[0]
      current.value = {
        city: selectedCity.value,
        weather: latest.type || latest.condition || '晴',
        temperature: latest.tmin && latest.tmax ? 
          `${Math.round(latest.tmin)}°C / ${Math.round(latest.tmax)}°C` : 
          (latest.tavg ? `${Math.round(latest.tavg)}°C` : 'N/A'),
        reporttime: new Date(latest.date).toISOString() || new Date().toISOString()
      }
    } else {
      // 如果没有今天的数据，设置默认值
      current.value = {
        city: selectedCity.value,
        weather: '晴',
        temperature: '15°C / 25°C',
        reporttime: new Date().toISOString()
      }
    }
  } catch (e) {
    console.error('加载天气失败:', e)
    current.value = null
    future.value = []
  }
}

// 加载历史天气数据
const loadHistoryWeatherData = async () => {
  if (!selectedCity.value) return
  try {
    const data = await api.get(API_ENDPOINTS.weather, { city: selectedCity.value })
    weatherData.value = Array.isArray(data) ? data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []
  } catch (e) {
    console.error('加载历史天气数据失败:', e)
    weatherData.value = []
  }
}

// 加载未来天气预测数据
const loadFutureWeatherData = async () => {
  if (!selectedCity.value) return
  try {
    const data = await api.get('/weather/future', { city: selectedCity.value })
    // 按日期降序排列（最新的日期在前）
    const sortedData = Array.isArray(data) ? data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) : []
    futureWeatherData.value = sortedData
  } catch (e) {
    console.error('加载未来天气预测数据失败:', e)
    futureWeatherData.value = []
  }
}

// 刷新数据
const refresh = async () => {
  if (!selectedCity.value) { 
    ElMessage.error('请先选择城市')
    return 
  }
  
  loading.value = true
  try {
    // 参考 electron：调用 /weather/fetch-and-save 持久化后再读库
    await api.post(`${API_ENDPOINTS.weather}/fetch-and-save`, { city: selectedCity.value })
    await loadWeatherData()
    ElMessage.success('天气数据已刷新')
  } catch (e) {
    console.error('刷新失败:', e)
    ElMessage.error('刷新失败')
  } finally {
    loading.value = false
  }
}

// 刷新未来天气预测数据
const refreshFutureWeatherData = async () => {
  if (!selectedCity.value) { 
    ElMessage.error('请先选择城市')
    return 
  }
  
  loading.value = true
  try {
    // 首先调用后端API获取最新的未来天气数据
    await api.post(`/weather/future/fetch`, { city: selectedCity.value })
    
    // 然后重新加载数据
    await loadFutureWeatherData()
    
    // 同时更新未来预报卡片的数据
    await loadFromDB()
    
    ElMessage.success('未来天气预测数据已刷新')
  } catch (e) {
    console.error('刷新未来天气预测数据失败:', e)
    // 即使API调用失败，也尝试重新加载现有数据
    await loadFutureWeatherData()
    ElMessage.warning('刷新完成，但可能未获取到最新数据')
  } finally {
    loading.value = false
  }
}

// 清空未来天气数据
const clearFutureWeatherData = async () => {
  if (!selectedCity.value) return
  try {
    await api.delete('/weather/future/clear', { city: selectedCity.value })
    await loadFutureWeatherData()
    ElMessage.success('未来天气数据已清空')
  } catch (e) {
    console.error('清空未来天气数据失败:', e)
    ElMessage.error('清空失败')
  }
}

// 编辑天气数据
const editWeatherData = (item: any) => {
  editingData.value = item
  weatherForm.value = {
    date: item.date,
    tavg: item.tavg,
    tmin: item.tmin,
    tmax: item.tmax,
    type: item.type || ''
  }
  showAddDialog.value = true
}

// 保存天气数据
const saveWeatherData = async () => {
  if (!weatherFormRef.value) return
  
  await weatherFormRef.value.validate(async (valid) => {
    if (!valid) return
    
    saving.value = true
    try {
      const payload = {
        city: selectedCity.value,
        date: weatherForm.value.date,
        tavg: weatherForm.value.tavg,
        tmin: weatherForm.value.tmin || null,
        tmax: weatherForm.value.tmax || null,
        type: weatherForm.value.type || null
      }
      
      if (editingData.value) {
        // 更新
        await api.put(`${API_ENDPOINTS.weather}/${editingData.value.id}`, payload)
        ElMessage.success('更新成功')
      } else {
        // 新增
        await api.post(API_ENDPOINTS.weather, payload)
        ElMessage.success('添加成功')
      }
      
      showAddDialog.value = false
      editingData.value = null
      weatherForm.value = { date: '', tavg: null, tmin: null, tmax: null, type: '' }
      await loadWeatherData()
      
    } catch (e) {
      console.error('保存失败:', e)
      ElMessage.error('保存失败')
    } finally {
      saving.value = false
    }
  })
}

// 删除天气数据
const deleteWeatherData = async (id: number) => {
  try {
    await api.delete(`${API_ENDPOINTS.weather}/${id}`)
    ElMessage.success('删除成功')
    await loadWeatherData()
  } catch (e) {
    console.error('删除失败:', e)
    ElMessage.error('删除失败')
  }
}

// 处理文件变化
const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
  uploadFileList.value = [file]
}

// 导入天气数据
const importWeatherData = async () => {
  if (!uploadFile.value) {
    ElMessage.error('请先选择文件')
    return
  }
  
  importing.value = true
  try {
    // 这里需要实现Excel解析和批量导入逻辑
    // 由于移动端限制，先显示提示
    ElMessage.info('批量导入功能开发中，请使用桌面端应用')
    showBatchImport.value = false
  } catch (e) {
    console.error('导入失败:', e)
    ElMessage.error('导入失败')
  } finally {
    importing.value = false
  }
}

onMounted(async () => {
  if (cityOptions.value.length > 0) {
    selectedCity.value = cityOptions.value[0].value
    await loadWeatherData()
  }
})
</script>

<style lang="scss" scoped>
.weather-container { 
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
}

.main-content {
  padding: 0 16px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.card, .weather-card { 
  background: white; 
  border-radius: 12px; 
  padding: 16px; 
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  
  .card-title { 
    font-size: 16px; 
    font-weight: 600; 
    color: #303133; 
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    
    .forecast-count, .data-count {
      background: #f0f2f5;
      color: #666;
      font-size: 12px;
      font-weight: 500;
      padding: 2px 8px;
      border-radius: 12px;
      margin-left: auto;
    }
  }
  
  .card-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }
  
  .card-body { 
    font-size: 14px; 
    color: #303133; 
  }
}

// 当前天气样式
.current-weather {
  .weather-main {
    text-align: center;
    padding: 20px 0;
    
    .city-name {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }
    
    .weather-icon {
      margin: 16px 0;
      color: #409EFF;
    }
    
    .temperature {
      font-size: 24px;
      font-weight: 700;
      color: #409EFF;
      margin-bottom: 8px;
    }
    
    .condition {
      font-size: 16px;
      color: #666;
      margin-bottom: 16px;
    }
    
    .update-time {
      font-size: 12px;
      color: #999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
  }
}

// 未来预报网格
.forecast-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  
  .forecast-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    border: 1px solid #e9ecef;
    transition: all 0.2s ease;
    
    &.today {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      
      .forecast-date, .forecast-weekday, .forecast-weather {
        color: white;
      }
    }
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    
    .forecast-date {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    
    .forecast-weekday {
      font-size: 12px;
      color: #666;
      margin-bottom: 8px;
    }
    
    .forecast-icon {
      margin: 8px 0;
      color: #409EFF;
    }
    
    .forecast-weather {
      font-size: 13px;
      margin-bottom: 8px;
    }
    
    .forecast-temp {
      display: flex;
      justify-content: center;
      gap: 8px;
      
      .temp-high {
        font-weight: 600;
        color: #f56565;
      }
      
      .temp-low {
        color: #4299e1;
      }
    }
  }
}

// 统计信息网格
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  
  .stat-item {
    background: #f8f9fa;
    border-radius: 8px;
    padding: 12px;
    text-align: center;
    
    .stat-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .stat-value {
      font-size: 16px;
      font-weight: 600;
      
      &.max-temp {
        color: #f56565;
      }
      
      &.min-temp {
        color: #4299e1;
      }
    }
  }
}

// 天气数据列表 - 规整布局
.weather-list {
  .weather-item {
    display: grid;
    grid-template-columns: 70px 1fr 50px;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    margin-bottom: 6px;
    background: #fafbfc;
    min-height: 50px;
    gap: 12px;
    
    &:hover {
      background: #f0f2f5;
      border-color: #d0d7df;
    }
    
    .item-content {
      display: contents;
      
      .date-info {
        display: flex;
        flex-direction: column;
        justify-content: center;
        
        .date {
          font-size: 13px;
          font-weight: 600;
          color: #303133;
          line-height: 1.2;
        }
        
        .weekday {
          font-size: 11px;
          color: #999;
          line-height: 1.2;
          margin-top: 1px;
        }
      }
      
      .weather-info {
        display: flex;
        justify-content: space-between;
        align-items: center;
        min-height: 36px;
        
        .weather-type {
          font-size: 13px;
          color: #606266;
          font-weight: 500;
        }
        
        .temp-info {
          font-size: 13px;
          color: #409EFF;
          font-weight: 600;
          text-align: right;
        }
      }
    }
    
    .item-actions {
      display: flex;
      justify-content: flex-end;
      gap: 2px;
      
      .el-button {
        padding: 4px;
        min-height: auto;
        width: 24px;
        height: 24px;
        
        .el-icon {
          font-size: 14px;
        }
      }
    }
  }
}

// 未来天气预测数据列表 - 规整布局
.future-data-list {
  .future-data-item {
    display: grid;
    grid-template-columns: 70px 1fr;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    margin-bottom: 6px;
    background: #fafbfc;
    min-height: 56px;
    gap: 12px;
    
    &:hover {
      background: #f0f2f5;
      border-color: #d0d7df;
    }
    
    .future-date-info {
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .date {
        font-size: 13px;
        font-weight: 600;
        color: #303133;
        line-height: 1.2;
      }
      
      .weekday {
        font-size: 11px;
        color: #999;
        line-height: 1.2;
        margin-top: 1px;
      }
    }
    
    .future-weather-content {
      display: grid;
      grid-template-rows: 1fr 1fr;
      gap: 3px;
      
      .weather-row {
        display: grid;
        grid-template-columns: 36px 50px 40px 1fr;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        
        .weather-label {
          color: #909399;
          font-weight: 500;
          font-size: 11px;
        }
        
        .weather-desc {
          color: #606266;
          font-weight: 500;
          text-align: left;
        }
        
        .weather-temp {
          color: #409EFF;
          font-weight: 600;
          text-align: center;
        }
        
        .weather-wind {
          color: #909399;
          font-size: 11px;
          text-align: right;
        }
      }
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 12px 16px;
    
    .header-controls {
      margin-top: 8px;
      width: 100%;
      justify-content: space-between;
    }
  }
  
  .main-content {
    margin-top: 15px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .forecast-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .weather-item, .future-data-item {
    flex-direction: column;
    align-items: flex-start;
    
    .item-weather {
      margin: 8px 0;
    }
    
    .item-actions {
      align-self: flex-end;
    }
  }
}
</style>
