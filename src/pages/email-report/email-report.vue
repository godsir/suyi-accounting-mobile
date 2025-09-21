<template>
  <div class="email-report-container">
    <!-- 头部导航 -->
    <div class="header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="title">邮件报表</div>
      <div class="placeholder"></div>
    </div>

    <!-- 邮件功能状态 -->
    <div class="status-card" :class="emailConfigStatus.type">
      <div class="status-content">
        <div class="status-info">
          <div class="status-icon">
            <Message />
          </div>
          <div class="status-text">
            <div class="status-title">{{ emailConfigStatus.title }}</div>
            <div class="status-desc">{{ emailConfigStatus.desc }}</div>
          </div>
        </div>
        <div class="status-action" v-if="!emailConfigStatus.configured">
          <el-button size="small" @click="handleGoToEmailSettings">
            去配置
          </el-button>
        </div>
      </div>
    </div>

    <!-- 发送周报区域 -->
    <div class="send-report-section" v-if="emailConfigStatus.configured">
      <div class="section-title">发送邮件</div>
      
      <!-- 基础设置 -->
      <div class="form-container">
        <div class="form-row">
          <div class="form-item">
            <div class="form-label">选择店铺</div>
            <el-select 
              v-model="selectedShop" 
              placeholder="请选择店铺"
              size="large"
              style="width: 100%"
            >
              <el-option 
                label="全部店铺" 
                value="全部"
              />
              <el-option 
                v-for="shop in availableShops" 
                :key="shop.value" 
                :label="shop.label" 
                :value="shop.value"
              />
            </el-select>
          </div>
        </div>
        
        <div class="form-row">
          <div class="form-item">
            <div class="form-label">开始日期</div>
            <el-date-picker
              v-model="startDate"
              type="date"
              placeholder="选择开始日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="large"
              style="width: 100%"
              popper-class="date-picker-popper"
              :teleported="false"
            />
          </div>
          
          <div class="form-item">
            <div class="form-label">结束日期</div>
            <el-date-picker
              v-model="endDate"
              type="date"
              placeholder="选择结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              size="large"
              style="width: 100%"
              popper-class="date-picker-popper"
              :teleported="false"
              :disabled-date="(time) => startDate && time < new Date(startDate)"
            />
          </div>
        </div>

        <!-- 快速选择按钮 -->
        <div class="quick-select-section">
          <div class="quick-select-label">快速选择</div>
          <div class="quick-select-buttons">
            <el-button size="small" @click="setQuickDateRange('thisWeek')">本周</el-button>
            <el-button size="small" @click="setQuickDateRange('lastWeek')">上周</el-button>
            <el-button size="small" @click="setQuickDateRange('thisMonth')">本月</el-button>
            <el-button size="small" @click="setQuickDateRange('lastMonth')">上月</el-button>
          </div>
        </div>

        <!-- 收件人设置 -->
        <div class="recipients-section">
          <div class="form-label">选择收件人</div>
          
          <!-- 默认收件人 -->
          <div v-if="emailConfig.default_recipients && emailConfig.default_recipients.length > 0" class="default-recipients">
            <div class="sub-label">默认收件人</div>
            <div class="recipients-checkboxes">
              <el-checkbox-group v-model="selectedDefaultRecipients">
                <el-checkbox
                  v-for="(recipient, index) in emailConfig.default_recipients"
                  :key="index"
                  :label="recipient.email"
                  class="recipient-checkbox"
                >
                  {{ recipient.email }}
                </el-checkbox>
              </el-checkbox-group>
            </div>
          </div>

          <!-- 自定义收件人 -->
          <div class="custom-recipients">
            <div class="sub-label">自定义收件人（可选）</div>
            <el-input
              v-model="customRecipients"
              type="textarea"
              :rows="3"
              placeholder="多个邮箱用英文逗号分隔，如：admin@example.com,user@example.com"
              size="large"
            />
            <div class="form-tip">
              可以在上面勾选默认收件人，也可以在此处填写其他收件人邮箱
            </div>
          </div>

          <!-- 收件人预览 -->
          <div v-if="finalRecipients.length > 0" class="recipients-preview">
            <div class="sub-label">将发送给以下收件人：</div>
            <div class="preview-tags">
              <el-tag 
                v-for="(email, index) in finalRecipients" 
                :key="index"
                :type="selectedDefaultRecipients.includes(email) ? 'primary' : 'success'"
                size="small"
                style="margin-right: 8px; margin-bottom: 4px;"
              >
                {{ email }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons" v-if="emailConfigStatus.configured">
      <el-button 
        size="large" 
        @click="handlePreviewReport"
        :loading="previewLoading"
        class="preview-btn"
      >
        <el-icon><View /></el-icon>
        {{ previewLoading ? '生成中...' : '预览邮件' }}
      </el-button>
      <el-button 
        type="primary" 
        size="large" 
        @click="handleSendReport"
        :loading="sendLoading"
        :disabled="!canSendReport"
        class="send-btn"
      >
        <el-icon><Promotion /></el-icon>
        {{ sendLoading ? '发送中...' : '发送邮件' }}
      </el-button>
    </div>

    <!-- 配置信息卡片 -->
    <div class="config-info-section" v-if="emailConfigStatus.configured">
      <div class="section-title">配置信息</div>
      <div class="config-info-container">
        <div class="config-item">
          <div class="config-label">邮件功能状态</div>
          <el-tag :type="emailConfig.enabled ? 'success' : 'danger'">
            {{ emailConfig.enabled ? '已启用' : '未启用' }}
          </el-tag>
        </div>
        
        <div v-if="emailConfig.enabled" class="config-item">
          <div class="config-label">发件人</div>
          <div class="config-value">{{ emailConfig.from_name || 'Suyi账务管理' }}</div>
        </div>
        
        <div v-if="emailConfig.enabled" class="config-item recipients-item">
          <div class="config-label">默认收件人</div>
          <div class="config-value recipients-value">
            <div v-if="emailConfig.default_recipients && emailConfig.default_recipients.length > 0" class="recipients-list">
              <div 
                v-for="(recipient, index) in emailConfig.default_recipients" 
                :key="index"
                class="recipient-item"
              >
                {{ recipient.email }}
              </div>
            </div>
            <div v-else class="no-recipients">
              {{ emailConfig.recipients || '未设置' }}
            </div>
          </div>
        </div>
        
        <div class="config-item">
          <div class="config-label">本月发送次数</div>
          <div class="config-value">{{ monthlyEmailCount }} 次</div>
        </div>
      </div>
    </div>

    <!-- 发送历史 -->
    <div class="history-section" v-if="emailConfigStatus.configured">
      <div class="section-header">
        <div class="section-title">发送历史</div>
        <el-button 
          size="small" 
          @click="fetchEmailHistory"
          :loading="historyLoading"
          class="refresh-btn"
          text
        >
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
      
      <div class="history-list" v-if="sendHistory.length > 0">
        <div 
          v-for="record in sendHistory" 
          :key="record.id"
          class="history-item"
        >
          <div class="history-info">
            <div class="history-title">
              <el-tag 
                :type="record.type === 'weekly_report' ? 'primary' : 'success'"
                size="small"
              >
                {{ record.type === 'weekly_report' ? '周报' : '测试' }}
              </el-tag>
              <span class="shop-name">{{ record.shop || '全部店铺' }}</span>
            </div>
            <div class="history-details">
              <div class="history-time">{{ formatDateTime(record.createdAt) }}</div>
              <div class="history-period" v-if="record.period_start && record.period_end">
                {{ record.period_start }} 至 {{ record.period_end }}
              </div>
              <div class="history-recipients">{{ record.recipients }}</div>
            </div>
          </div>
          <div class="history-status">
            <el-tag 
              :type="record.status === 'sent' ? 'success' : 'danger'"
              size="small"
            >
              {{ record.status === 'sent' ? '成功' : '失败' }}
            </el-tag>
            <el-button 
              type="text" 
              size="small" 
              @click="handleDeleteHistoryItem(record.id)"
              style="color: #ff4d4f; padding: 0; margin-left: 8px;"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
      
      <div class="empty-history" v-else>
        <div class="empty-text">暂无发送记录</div>
        <div class="empty-desc">发送第一份邮件报表吧</div>
      </div>
    </div>

    <!-- 邮件预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      title="邮件预览"
      width="90%"
      class="preview-dialog"
      :before-close="handleClosePreview"
    >
      <div v-if="previewData" class="preview-content">
        <!-- 邮件信息 -->
        <div class="preview-header">
          <el-descriptions :column="1" size="small" border>
            <el-descriptions-item label="主题">
              <strong style="color: #1890ff">{{ previewData.subject }}</strong>
            </el-descriptions-item>
            <el-descriptions-item label="发件人">
              {{ emailConfig.from_name || 'Suyi账务管理' }}
            </el-descriptions-item>
            <el-descriptions-item label="收件人">
              {{ previewData.customRecipients }}
            </el-descriptions-item>
            <el-descriptions-item label="店铺范围">
              <el-tag type="primary">{{ previewData.shop }}</el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="时间范围">
              <el-tag type="success">{{ previewData.period.start }} 至 {{ previewData.period.end }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 数据概览 -->
        <div class="preview-stats">
          <div class="stats-title">数据概览</div>
          <div class="stats-row">
            <div class="stat-item income">
              <div class="stat-label">总收入</div>
              <div class="stat-value">¥{{ formatMoney(previewData.reportData.current?.totalIncome || 0) }}</div>
            </div>
            <div class="stat-item expense">
              <div class="stat-label">总支出</div>
              <div class="stat-value">¥{{ formatMoney(previewData.reportData.current?.totalExpense || 0) }}</div>
            </div>
            <div class="stat-item profit">
              <div class="stat-label">净利润</div>
              <div class="stat-value" :class="{ negative: getNetProfit() < 0 }">
                ¥{{ formatMoney(getNetProfit()) }}
              </div>
            </div>
            <div class="stat-item transactions">
              <div class="stat-label">交易笔数</div>
              <div class="stat-value">{{ previewData.reportData.current?.totalTransactions || 0 }}笔</div>
            </div>
          </div>
        </div>

        <!-- 邮件内容预览 -->
        <div class="preview-html">
          <div class="html-title">邮件内容预览</div>
          <div class="html-container">
            <iframe
              :src="'data:text/html;charset=utf-8,' + encodeURIComponent(previewData.html)"
              style="width: 100%; height: 400px; border: none; border-radius: 6px;"
              sandbox="allow-same-origin"
            />
          </div>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleClosePreview">关闭预览</el-button>
          <el-button
            type="primary"
            :loading="sendLoading"
            :disabled="!emailConfig.enabled"
            @click="handleSendFromPreview"
          >
            <el-icon><Promotion /></el-icon>
            {{ sendLoading ? '发送中...' : '立即发送' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  ArrowLeft,
  Message,
  View,
  Promotion,
  Refresh,
  Delete
} from '@element-plus/icons-vue'
import { api } from '@/api'

const router = useRouter()
const userStore = useUserStore()

// 数据状态
const selectedShop = ref('全部')
const startDate = ref('')
const endDate = ref('')
const selectedDefaultRecipients = ref<string[]>([])
const customRecipients = ref('')
const previewLoading = ref(false)
const sendLoading = ref(false)
const historyLoading = ref(false)
const previewVisible = ref(false)
const previewData = ref<any>(null)

// 邮件配置
const emailConfig = ref({
  enabled: false,
  recipients: '',
  from_name: '',
  default_recipients: [] as Array<{ email: string; name: string }>
})

// 店铺选项
const availableShops = ref<Array<{ label: string; value: string }>>([])

// 发送历史
const sendHistory = ref<any[]>([])

// 邮件配置状态
const emailConfigStatus = ref({
  configured: false,
  type: 'warning',
  title: '邮件功能未配置',
  desc: '请先配置SMTP邮件服务器参数'
})

// 计算属性
const canSendReport = computed(() => {
  return startDate.value && endDate.value && finalRecipients.value.length > 0
})

const finalRecipients = computed(() => {
  const recipients: string[] = []
  
  // 添加选中的默认收件人
  recipients.push(...selectedDefaultRecipients.value)
  
  // 添加自定义收件人
  if (customRecipients.value.trim()) {
    const customEmails = customRecipients.value
      .split(',')
      .map(email => email.trim())
      .filter(email => email)
    recipients.push(...customEmails)
  }
  
  // 去重
  return [...new Set(recipients)]
})

const monthlyEmailCount = computed(() => {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  
  return sendHistory.value.filter(record => {
    const recordDate = new Date(record.createdAt)
    return recordDate.getMonth() === currentMonth && 
           recordDate.getFullYear() === currentYear &&
           record.type === 'weekly_report'
  }).length
})

// 返回上一页
const handleGoBack = () => {
  router.go(-1)
}

// 跳转到邮件设置
const handleGoToEmailSettings = () => {
  router.push('/settings/email')
}

// 格式化日期时间
const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('zh-CN')
}

// 格式化金额
const formatMoney = (amount: number) => {
  return amount.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

// 获取净利润
const getNetProfit = () => {
  if (!previewData.value?.reportData?.current) return 0
  const { totalIncome = 0, totalExpense = 0 } = previewData.value.reportData.current
  return totalIncome - totalExpense
}

// 快速设置时间范围
const setQuickDateRange = (type: 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth') => {
  const now = new Date()
  let startDateObj: Date, endDateObj: Date
  
  switch (type) {
    case 'thisWeek':
      startDateObj = new Date(now)
      startDateObj.setDate(now.getDate() - now.getDay()) // 本周开始
      endDateObj = new Date(now)
      endDateObj.setDate(startDateObj.getDate() + 6) // 本周结束
      break
    case 'lastWeek':
      endDateObj = new Date(now)
      endDateObj.setDate(now.getDate() - now.getDay() - 1) // 上周结束
      startDateObj = new Date(endDateObj)
      startDateObj.setDate(endDateObj.getDate() - 6) // 上周开始
      break
    case 'thisMonth':
      startDateObj = new Date(now.getFullYear(), now.getMonth(), 1)
      endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      break
    case 'lastMonth':
      startDateObj = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDateObj = new Date(now.getFullYear(), now.getMonth(), 0)
      break
  }
  
  startDate.value = startDateObj.toISOString().split('T')[0]
  endDate.value = endDateObj.toISOString().split('T')[0]
}

// 预览报表
const handlePreviewReport = async () => {
  if (!canSendReport.value) {
    ElMessage.warning('请完善报表参数')
    return
  }
  
  previewLoading.value = true
  
  try {
    const params = {
      shop: selectedShop.value === '全部' ? null : selectedShop.value,
      weekStart: startDate.value,
      weekEnd: endDate.value,
      previewRecipients: finalRecipients.value.join(', ')
    }
    
    const result = await api.post('/email/preview-weekly-report', params)
    
    if (result.success) {
      previewData.value = {
        ...result.data,
        customRecipients: finalRecipients.value.join(', ')
      }
      previewVisible.value = true
    } else {
      ElMessage.error('生成预览失败')
    }
  } catch (error: any) {
    console.error('预览报表失败:', error)
    const errorMessage = error.response?.data?.error || error.message || '预览失败'
    ElMessage.error('生成预览失败: ' + errorMessage)
  } finally {
    previewLoading.value = false
  }
}

// 发送报表
const handleSendReport = async () => {
  if (!canSendReport.value) {
    ElMessage.warning('请完善报表参数')
    return
  }
  
  if (!emailConfig.value.enabled) {
    ElMessage.error('邮件功能未启用，请先在配置页面启用邮件功能')
    return
  }
  
  sendLoading.value = true
  
  try {
    const params = {
      shop: selectedShop.value === '全部' ? null : selectedShop.value,
      weekStart: startDate.value,
      weekEnd: endDate.value,
      selectedDefaultRecipients: selectedDefaultRecipients.value,
      customRecipients: customRecipients.value || null
    }
    
    await api.post('/email/send-weekly-report', params)
    
    ElMessage.success('周报发送成功！')
    
    // 重置表单
    selectedDefaultRecipients.value = []
    customRecipients.value = ''
    
    // 重新设置默认值
    setQuickDateRange('thisWeek')
    selectedShop.value = '全部'
    
    // 刷新发送历史
    await fetchEmailHistory()
  } catch (error: any) {
    console.error('发送报表失败:', error)
    
    let errorMsg = '发送失败'
    if (error.response?.data?.error) {
      errorMsg = error.response.data.error
    } else if (error.message) {
      errorMsg = error.message
    }
    
    ElMessage.error('发送周报失败: ' + errorMsg)
  } finally {
    sendLoading.value = false
  }
}

// 从预览窗口发送
const handleSendFromPreview = async () => {
  if (!previewData.value) return
  
  sendLoading.value = true
  
  try {
    const params = {
      shop: selectedShop.value === '全部' ? null : selectedShop.value,
      weekStart: startDate.value,
      weekEnd: endDate.value,
      selectedDefaultRecipients: selectedDefaultRecipients.value,
      customRecipients: customRecipients.value || null
    }
    
    await api.post('/email/send-weekly-report', params)
    
    ElMessage.success('邮件发送成功！')
    previewVisible.value = false
    
    // 重置表单
    selectedDefaultRecipients.value = []
    customRecipients.value = ''
    setQuickDateRange('thisWeek')
    selectedShop.value = '全部'
    
    // 刷新发送历史
    await fetchEmailHistory()
  } catch (error: any) {
    console.error('发送邮件失败:', error)
    const errorMsg = error.response?.data?.error || error.message || '发送失败'
    ElMessage.error('发送邮件失败: ' + errorMsg)
  } finally {
    sendLoading.value = false
  }
}

// 关闭预览
const handleClosePreview = () => {
  previewVisible.value = false
}

// 删除历史记录
const handleDeleteHistoryItem = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这条历史记录吗？', '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await api.delete(`/email/history/${id}`)
    ElMessage.success('历史记录删除成功')
    await fetchEmailHistory()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除历史记录失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '删除失败'
      ElMessage.error('删除历史记录失败: ' + errorMsg)
    }
  }
}

// 获取邮件配置
const fetchEmailConfig = async () => {
  try {
    const result = await api.get('/email/config')
    emailConfig.value = result || { enabled: false, recipients: '', from_name: '', default_recipients: [] }
    
    // 更新状态
    if (result?.enabled) {
      emailConfigStatus.value = {
        configured: true,
        type: 'success',
        title: '邮件功能已配置',
        desc: '可以正常发送邮件报表'
      }
    } else {
      emailConfigStatus.value = {
        configured: false,
        type: 'warning',
        title: '邮件功能未启用',
        desc: '请先在邮件设置中启用邮件功能'
      }
    }
  } catch (error: any) {
    console.error('获取邮件配置失败:', error)
    emailConfigStatus.value = {
      configured: false,
      type: 'error',
      title: '邮件功能异常',
      desc: '无法获取邮件配置信息'
    }
  }
}

// 获取发送历史
const fetchEmailHistory = async () => {
  try {
    historyLoading.value = true
    const result = await api.get('/email/history')
    sendHistory.value = Array.isArray(result) ? result : []
  } catch (error: any) {
    console.error('获取邮件历史失败:', error)
    ElMessage.error('获取发送历史失败')
  } finally {
    historyLoading.value = false
  }
}

// 获取店铺选项
const loadShopOptions = async () => {
  try {
    const user = userStore.user
    if (!user) return

    // 获取用户有权限的店铺
    const response = await api.get(`/users/${user.id}/shops`)
    const shops = response.shops || []
    
    availableShops.value = shops.map((shop: any) => ({
      label: shop.name,
      value: shop.name
    }))
  } catch (error) {
    console.error('加载店铺列表失败:', error)
    // 降级到用户信息中的店铺数据
    if (userStore.user?.shops) {
      availableShops.value = userStore.user.shops.map((shop: any) => ({
        label: shop.name,
        value: shop.name
      }))
    }
  }
}

// 初始化
onMounted(async () => {
  await fetchEmailConfig()
  await loadShopOptions()
  await fetchEmailHistory()
  
  // 设置默认时间范围为本周
  setQuickDateRange('thisWeek')
})
</script>

<style lang="scss" scoped>
.email-report-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 20px;
}

// 头部导航
.header {
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
  
  .title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .placeholder {
    width: 32px;
  }
}

// 状态卡片
.status-card {
  margin: 20px;
  border-radius: 12px;
  padding: 16px;
  
  &.success {
    background: linear-gradient(135deg, #52c41a 0%, #389e0d 100%);
    color: white;
  }
  
  &.warning {
    background: linear-gradient(135deg, #faad14 0%, #d48806 100%);
    color: white;
  }
  
  &.error {
    background: linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%);
    color: white;
  }
  
  .status-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .status-info {
      display: flex;
      align-items: center;
      flex: 1;
      
      .status-icon {
        width: 24px;
        height: 24px;
        margin-right: 12px;
        font-size: 20px;
      }
      
      .status-text {
        .status-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }
        
        .status-desc {
          font-size: 14px;
          opacity: 0.9;
        }
      }
    }
    
    .status-action {
      .el-button {
        background: rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: white;
        
        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }
  }
}

// 发送周报区域
.send-report-section,
.config-info-section,
.history-section {
  margin: 20px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

// 区域头部样式
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
  
  .section-title {
    margin-bottom: 0;
  }
  
  .refresh-btn {
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    font-size: 14px;
    color: #666;
    border: 1px solid transparent;
    background: transparent;
    transition: all 0.3s ease;
    
    &:hover {
      color: #1890ff;
      background: #f0f9ff;
      border-color: #91d5ff;
    }
    
    &:active {
      transform: scale(0.98);
    }
    
    .el-icon {
      margin-right: 4px;
      font-size: 16px;
      transition: transform 0.3s ease;
    }
    
    &.is-loading .el-icon {
      animation: spin 1s linear infinite;
    }
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// 表单容器
.form-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  .form-row {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    
    .form-item {
      flex: 1;
      
      .form-label {
        font-size: 14px;
        color: #333;
        margin-bottom: 8px;
        font-weight: 500;
      }
    }
  }
  
  .quick-select-section {
    margin-bottom: 20px;
    
    .quick-select-label {
      font-size: 14px;
      color: #333;
      margin-bottom: 8px;
      font-weight: 500;
    }
    
    .quick-select-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      
      .el-button {
        height: 32px;
        padding: 0 12px;
        border-radius: 6px;
        font-size: 13px;
      }
    }
  }
  
  .recipients-section {
    .form-label {
      font-size: 14px;
      color: #333;
      margin-bottom: 12px;
      font-weight: 500;
    }
    
    .default-recipients {
      margin-bottom: 16px;
      
      .sub-label {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .recipients-checkboxes {
        .recipient-checkbox {
          display: block;
          margin-bottom: 8px;
          
          :deep(.el-checkbox__label) {
            font-size: 14px;
            color: #333;
          }
        }
      }
    }
    
    .custom-recipients {
      margin-bottom: 16px;
      
      .sub-label {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .form-tip {
        font-size: 12px;
        color: #999;
        margin-top: 8px;
        line-height: 1.4;
      }
    }
    
    .recipients-preview {
      .sub-label {
        font-size: 13px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .preview-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
    }
  }
}

// 配置信息
.config-info-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  .config-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .config-label {
      font-size: 14px;
      color: #666;
    }
    
    .config-value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }
  }
  
  // 优化默认收件人显示
  .recipients-item {
    flex-direction: column;
    align-items: flex-start;
    
    .config-label {
      margin-bottom: 8px;
    }
    
    .recipients-value {
      width: 100%;
      
      .recipients-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        
        .recipient-item {
          background: #f6f8fa;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 13px;
          color: #333;
          border-left: 3px solid #1890ff;
          word-break: break-all;
        }
      }
      
      .no-recipients {
        color: #999;
        font-style: italic;
      }
    }
  }
}

// 预览弹窗样式
:deep(.preview-dialog) {
  .el-dialog {
    border-radius: 12px;
    max-height: 90vh;
    overflow: hidden;
  }
  
  .el-dialog__body {
    padding: 20px;
    max-height: calc(90vh - 140px);
    overflow-y: auto;
  }
}

.preview-content {
  .preview-header {
    margin-bottom: 20px;
    
    :deep(.el-descriptions) {
      .el-descriptions__label {
        font-weight: 500;
        width: 80px;
      }
    }
  }
  
  .preview-stats {
    margin-bottom: 20px;
    
    .stats-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }
    
    .stats-row {
      display: flex;
      justify-content: space-around;
      gap: 16px;
      
      .stat-item {
        text-align: center;
        flex: 1;
        
        .stat-label {
          font-size: 13px;
          color: #666;
          margin-bottom: 4px;
        }
        
        .stat-value {
          font-size: 16px;
          font-weight: 600;
          
          &.negative {
            color: #ff4d4f;
          }
        }
        
        &.income .stat-value {
          color: #52c41a;
        }
        
        &.expense .stat-value {
          color: #ff7875;
        }
        
        &.profit .stat-value {
          color: #1890ff;
        }
        
        &.transactions .stat-value {
          color: #722ed1;
        }
      }
    }
  }
  
  .preview-html {
    .html-title {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 12px;
    }
    
    .html-container {
      border: 1px solid #f0f0f0;
      border-radius: 8px;
      overflow: hidden;
    }
  }
}

// 报表类型卡片
.report-types {
  display: flex;
  flex-direction: column;
  gap: 12px;
  
  .report-type-card {
    background: white;
    border-radius: 12px;
    padding: 16px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
      border-color: #d9d9d9;
    }
    
    &.active {
      border-color: #1890ff;
      background: #f6ffed;
    }
    
    display: flex;
    align-items: center;
    
    .type-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      font-size: 20px;
      color: white;
      
      &.weekly {
        background: linear-gradient(135deg, #1890ff, #36cfc9);
      }
      
      &.monthly {
        background: linear-gradient(135deg, #722ed1, #eb2f96);
      }
      
      &.custom {
        background: linear-gradient(135deg, #fa8c16, #fadb14);
      }
    }
    
    .type-info {
      flex: 1;
      
      .type-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }
      
      .type-desc {
        font-size: 14px;
        color: #666;
        line-height: 1.4;
      }
    }
    
    .type-check {
      width: 24px;
      height: 24px;
      background: #52c41a;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 16px;
    }
  }
}

// 日期选择器
.date-picker-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  :deep(.el-date-editor) {
    width: 100%;
    height: 48px;
    
    .el-input__wrapper {
      border-radius: 8px;
    }
  }
}

// 店铺选择器
.shop-selector {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  :deep(.el-radio-group) {
    display: flex;
    flex-direction: column;
    gap: 12px;
    
    .el-radio {
      margin-right: 0;
      
      &.shop-radio {
        width: 100%;
        height: 44px;
        margin: 0;
        
        .el-radio__label {
          width: 100%;
          text-align: left;
          padding-left: 8px;
        }
      }
    }
  }
}

// 收件人输入
.recipients-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  :deep(.el-textarea) {
    .el-textarea__inner {
      border-radius: 8px;
      line-height: 1.5;
    }
  }
  
  .recipients-tip {
    font-size: 13px;
    color: #999;
    margin-top: 8px;
    line-height: 1.4;
  }
}

// 预览容器
.preview-container {
  background: white;
  border-radius: 12px;
  padding: 20px;
  
  .preview-header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 16px;
    border-bottom: 1px solid #f0f0f0;
    
    .preview-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    
    .preview-period {
      font-size: 14px;
      color: #666;
    }
  }
  
  .summary-stats {
    display: flex;
    justify-content: space-around;
    margin-bottom: 20px;
    
    .stat-item {
      text-align: center;
      
      .stat-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .stat-value {
        font-size: 20px;
        font-weight: 600;
        
        &.negative {
          color: #ff4d4f;
        }
      }
      
      &.income .stat-value {
        color: #52c41a;
      }
      
      &.expense .stat-value {
        color: #ff7875;
      }
      
      &.profit .stat-value {
        color: #1890ff;
      }
    }
  }
  
  .preview-note {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    color: #999;
    background: #fafafa;
    padding: 12px;
    border-radius: 8px;
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  gap: 12px;
  margin: 20px;
  
  .preview-btn,
  .send-btn {
    flex: 1;
    height: 48px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
  }
  
  .preview-btn {
    border: 1px solid #d9d9d9;
    background: white;
    color: #333;
    
    &:hover {
      border-color: #40a9ff;
      color: #40a9ff;
    }
  }
  
  .send-btn {
    background: linear-gradient(135deg, #1890ff 0%, #36cfc9 100%);
    border: none;
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3);
    
    &:hover {
      background: linear-gradient(135deg, #40a9ff 0%, #5cdbd3 100%);
      box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4);
    }
    
    &:disabled {
      background: #d9d9d9;
      box-shadow: none;
    }
  }
}

// 历史记录
.history-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  
  .history-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .history-info {
      flex: 1;
      
      .history-title {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 8px;
        
        .shop-name {
          font-size: 14px;
          font-weight: 500;
          color: #333;
        }
      }
      
      .history-details {
        font-size: 12px;
        color: #999;
        line-height: 1.4;
        
        .history-time {
          display: block;
          margin-bottom: 2px;
        }
        
        .history-period {
          display: block;
          margin-bottom: 2px;
        }
        
        .history-recipients {
          display: block;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }
      }
    }
    
    .history-status {
      display: flex;
      align-items: center;
      gap: 4px;
    }
  }
}

.empty-history {
  background: white;
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  
  .empty-text {
    font-size: 16px;
    color: #666;
    margin-bottom: 8px;
  }
  
  .empty-desc {
    font-size: 14px;
    color: #999;
  }
}

// 移动端适配
@media (max-width: 480px) {
  .header {
    padding: 12px 15px;
    
    .title {
      font-size: 16px;
    }
  }
  
  .send-report-section,
  .config-info-section,
  .history-section,
  .action-buttons {
    margin: 15px;
  }
  
  .section-title {
    font-size: 15px;
  }
  
  .form-row {
    flex-direction: column;
    gap: 16px;
  }
  
  .report-type-card {
    .type-icon {
      width: 40px;
      height: 40px;
      font-size: 18px;
      margin-right: 12px;
    }
    
    .type-info {
      .type-title {
        font-size: 15px;
      }
      
      .type-desc {
        font-size: 13px;
      }
    }
  }
  
  .preview-stats .stats-row {
    flex-direction: column;
    gap: 16px;
    
    .stat-item {
      .stat-value {
        font-size: 18px;
      }
    }
  }
  
  .action-buttons {
    .preview-btn,
    .send-btn {
      height: 44px;
      font-size: 15px;
    }
  }
}

// 全局日期选择器弹出层样式
:deep(.date-picker-popper) {
  max-width: calc(100vw - 40px) !important;
  
  .el-picker-panel {
    max-width: calc(100vw - 40px);
    overflow: hidden;
  }
  
  .el-date-range-picker {
    max-width: calc(100vw - 40px);
    
    .el-picker-panel__body {
      overflow-x: auto;
    }
  }
  
  // 移动端日期选择器优化
  @media (max-width: 480px) {
    .el-date-range-picker {
      .el-picker-panel__content {
        display: flex;
        flex-direction: column;
        
        .el-date-range-picker__time-header {
          flex-direction: column;
          gap: 8px;
        }
        
        .el-picker-panel__body-wrapper {
          display: flex;
          flex-direction: column;
          
          .el-date-table {
            margin: 0;
            
            th, td {
              padding: 4px 2px;
              font-size: 12px;
            }
          }
        }
      }
    }
  }
}
</style>