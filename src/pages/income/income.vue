<template>
  <div class="income-container">
    
    <!-- 店铺权限提示 -->
    <el-alert
      v-if="!userStore.hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法添加收入记录。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 16px; margin-bottom: 24px"
    />

    <div class="main-content">
      <!-- 主表单区域 -->
      <div class="form-section">
        <div class="section-header">
          <h3>收入信息</h3>
        </div>
        
        <el-form
          ref="formRef"
          :model="formData"
          label-position="top"
          :rules="formRules"
        >
          <!-- 基本信息 -->
          <div class="basic-info">
            <div class="form-row">
              <el-form-item
                label="门店选择"
                prop="shop"
              >
                <el-select
                  v-model="formData.shop"
                  placeholder="选择门店"
                  style="width: 100%"
                  :disabled="!userStore.hasShopAccess"
                >
                  <el-option
                    v-for="shop in userStore.userShops"
                    :key="shop.id"
                    :label="`${shop.name} (${shop.city})`"
                    :value="shop.name"
                  />
                </el-select>
              </el-form-item>
              
              <el-form-item
                label="日期"
                prop="date"
              >
                <el-date-picker
                  v-model="formData.date"
                  type="date"
                  placeholder="选择日期"
                  format="YYYY年MM月DD日"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </el-form-item>
            </div>
          </div>

          <!-- 收入项目 -->
          <div class="income-details">
            <div class="income-header">
              <h4>收入项目</h4>
              <el-button
                type="primary"
                :icon="Plus"
                size="small"
                @click="addIncomeItem"
                :disabled="incomeItems.length >= 10"
              >
                添加项目
              </el-button>
            </div>
            
            <div class="income-items">
              <div 
                v-for="(item, index) in incomeItems" 
                :key="index" 
                class="income-item"
              >
                <el-select
                  v-model="item.type"
                  placeholder="选择收入类型"
                  style="flex: 1; margin-right: 8px"
                >
                  <el-option
                    v-for="(platform, key) in PLATFORM_MAP"
                    :key="key"
                    :label="platform.name"
                    :value="platform.name"
                  />
                </el-select>
                
                <el-input-number
                  v-model="item.amount"
                  placeholder="金额"
                  :formatter="(value) => `¥ ${value}`"
                  :parser="(value) => {
                    const cleaned = value?.replace(/¥\s?|(,*)/g, '')
                    return cleaned ? Number(cleaned) : 0
                  }"
                  style="flex: 1; margin-right: 8px"
                  :min="0"
                  :step="0.01"
                />
                
                <el-button
                  v-if="incomeItems.length > 1"
                  danger
                  :icon="Minus"
                  size="small"
                  @click="removeIncomeItem(index)"
                  style="min-width: 32px; width: 32px; height: 32px"
                />
              </div>
            </div>

            <!-- 总计显示 -->
            <div class="total-display">
              <div class="total-label">总收入</div>
              <div class="total-amount">
                ¥{{ calculateTotal().toFixed(2) }}
              </div>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <el-button
              type="primary"
              :icon="Check"
              @click="handleSubmit"
              :loading="loading"
              :disabled="!userStore.canAddRecords"
            >
              {{ loading ? '保存中...' : '保存记录' }}
            </el-button>
            
            <el-button
              :icon="RefreshLeft"
              @click="resetForm"
            >
              重置
            </el-button>
          </div>
        </el-form>
      </div>

      <!-- 辅助功能区域 -->
      <div class="helper-section">
        <!-- 智能文本解析 -->
        <div class="helper-card">
          <div class="card-header">
            <h4>智能文本解析</h4>
          </div>
          <div class="card-content">
            <el-input
              v-model="textContent"
              type="textarea"
              :rows="6"
              placeholder="支持格式：
店名: 测试店
日期: 2024-01-01
现金: 100
微信: 200
美团: 150
或一行多个: 现金100, 微信200, 美团150"
              style="margin-bottom: 16px"
            />
            
            <el-button
              type="primary"
              :icon="DocumentCopy"
              @click="handleTextParse"
              style="width: 100%"
            >
              智能解析
            </el-button>

            <div v-if="parseResult" class="parse-result">
              <div :class="parseResult.success ? 'success' : 'error'">
                {{ parseResult.message }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { recordsAPI, PLATFORM_MAP, type IncomeRecord } from '@/api'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { 
  ArrowLeft, 
  Money, 
  Plus, 
  Minus, 
  Check, 
  RefreshLeft, 
  DocumentCopy 
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = ref({
  shop: '',
  date: new Date().toISOString().split('T')[0]
})

// 收入项目
interface IncomeItem {
  type: string
  amount: number
}

const incomeItems = ref<IncomeItem[]>([
  { type: '微信', amount: 0 }
])

// 状态
const loading = ref(false)
const textContent = ref('')
const parseResult = ref<{ success: boolean; message: string } | null>(null)

// 表单验证规则
const formRules: FormRules = {
  shop: [
    { required: true, message: '请选择门店', trigger: 'change' }
  ],
  date: [
    { required: true, message: '请选择日期', trigger: 'change' }
  ]
}

// 计算总收入
const calculateTotal = () => {
  return incomeItems.value.reduce((sum, item) => sum + (item.amount || 0), 0)
}

// 添加收入项目
const addIncomeItem = () => {
  if (incomeItems.value.length < 10) {
    incomeItems.value.push({ type: '', amount: 0 })
  } else {
    ElMessage.warning('最多只能添加10个收入项目')
  }
}

// 删除收入项目
const removeIncomeItem = (index: number) => {
  if (incomeItems.value.length <= 1) {
    ElMessage.warning('至少保留一个收入项目')
    return
  }
  incomeItems.value.splice(index, 1)
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  incomeItems.value = [{ type: '微信', amount: 0 }]
  textContent.value = ''
  parseResult.value = null
  ElMessage.info('表单已重置')
}

// 智能文本解析
const handleTextParse = () => {
  if (!textContent.value || textContent.value.trim() === '') {
    ElMessage.error('请输入文本内容')
    return
  }

  try {
    const lines = textContent.value
      .split(/[\n\r]+/)
      .map(line => line.trim())
      .filter(line => line)

    const newIncomeItems: IncomeItem[] = []
    let parsedFields = 0
    let shopName = ''
    let date = new Date().toISOString().split('T')[0]
    const warnings: string[] = []

    for (const line of lines) {
      console.log('解析行:', line)
      
      // 处理多个项目在一行（用逗号分隔）
      if (line.includes(',') || line.includes('，')) {
        const items = line.split(/[,，]/).map(item => item.trim()).filter(item => item)
        
        for (const item of items) {
          const patterns = [
            /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)[:：]\s*(\d+(?:\.\d+)?)$/i,
            /^(\d+(?:\.\d+)?)(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)$/i,
            /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)(\d+(?:\.\d+)?)$/i,
            /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)\s+(\d+(?:\.\d+)?)$/i,
            /^(\d+(?:\.\d+)?)\s+(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)$/i,
          ]

          let matched = false
          for (const pattern of patterns) {
            const match = item.match(pattern)
            if (match) {
              let type = ''
              let amount = 0

              if (!isNaN(Number(match[1]))) {
                amount = Number(match[1])
                type = match[2].trim()
              } else {
                type = match[1].trim()
                amount = Number(match[2])
              }

              if (type && amount > 0) {
                newIncomeItems.push({ type, amount })
                parsedFields++
                matched = true
                break
              }
            }
          }
        }
        continue
      }
      
      // 解析店名
      const shopPatterns = [
        /(?:店名|店铺|门店|商店|shop)\s*[:：=\s]\s*(.+)/i,
        /门店\s*[:：=\s]\s*(.+)/i,
      ]

      for (const pattern of shopPatterns) {
        const shopMatch = line.match(pattern)
        if (shopMatch) {
          const name = shopMatch[1].trim()
          const matchedShop = userStore.userShops.find(shop => shop.name === name)
          if (matchedShop) {
            shopName = matchedShop.name
            parsedFields++
          } else {
            warnings.push(`门店 "${name}" 不存在，已忽略`)
          }
          break
        }
      }
      
      // 解析日期
      const datePatterns = [
        /(?:日期|时间|date)\s*[:：=\s]\s*(.+)/i,
        /(\d{4}[-/年]\d{1,2}[-/月]\d{1,2}日?)/,
        /(\d{1,2}[-/]\d{1,2}[-/]\d{4})/,
      ]

      for (const pattern of datePatterns) {
        const dateMatch = line.match(pattern)
        if (dateMatch) {
          const dateStr = dateMatch[1].trim()
          
          if (dateStr.match(/今天|today/i)) {
            date = new Date().toISOString().split('T')[0]
            parsedFields++
            break
          }
          
          // 尝试解析日期格式
          const formats = [
            /(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/,
            /(\d{1,2})[-/](\d{1,2})[-/](\d{4})/,
          ]
          
          for (const format of formats) {
            const formatMatch = dateStr.match(format)
            if (formatMatch) {
              if (formatMatch[1].length === 4) {
                // YYYY-MM-DD 格式
                date = `${formatMatch[1]}-${formatMatch[2].padStart(2, '0')}-${formatMatch[3].padStart(2, '0')}`
              } else {
                // MM/DD/YYYY 格式
                date = `${formatMatch[3]}-${formatMatch[1].padStart(2, '0')}-${formatMatch[2].padStart(2, '0')}`
              }
              parsedFields++
              break
            }
          }
          break
        }
      }
      
      // 解析单个收入项目
      const itemPatterns = [
        /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)[:：]\s*(\d+(?:\.\d+)?)\s*元?$/i,
        /^(\d+(?:\.\d+)?)\s*元?\s*(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)$/i,
        /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)\s*(\d+(?:\.\d+)?)\s*元?$/i,
        /^(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)\s+(\d+(?:\.\d+)?)\s*元?$/i,
        /^(\d+(?:\.\d+)?)\s*元?\s+(现金|微信|美团|京东|团购|宿捷|快跑者|买单吧|饿了么|鹿城生)$/i,
      ]

      for (const pattern of itemPatterns) {
        const match = line.match(pattern)
        if (match) {
          let type = ''
          let amount = 0

          if (!isNaN(Number(match[1]))) {
            amount = Number(match[1])
            type = match[2].trim()
          } else {
            type = match[1].trim()
            amount = Number(match[2])
          }

          if (type && amount > 0) {
            newIncomeItems.push({ type, amount })
            parsedFields++
            break
          }
        }
      }
    }

    if (newIncomeItems.length === 0) {
      parseResult.value = {
        success: false,
        message: '未找到可解析的收入项目'
      }
      ElMessage.warning('未找到可解析的收入项目')
      return
    }

    // 更新表单数据
    incomeItems.value = newIncomeItems
    if (shopName) {
      formData.value.shop = shopName
    }
    if (date) {
      formData.value.date = date
    }
    
    const parsedItems = newIncomeItems.map(item => `${item.type}: ¥${item.amount}`)
    const successMessage = `解析成功！共解析出 ${newIncomeItems.length} 个收入项目: ${parsedItems.join(', ')}`
    
    parseResult.value = {
      success: true,
      message: successMessage
    }
    
    ElMessage.success(`解析出 ${newIncomeItems.length} 个收入项目`)
    
    // 显示警告信息
    warnings.forEach(warning => {
      ElMessage.warning(warning)
    })
    
  } catch (e) {
    parseResult.value = {
      success: false,
      message: `解析失败: ${e instanceof Error ? e.message : String(e)}`
    }
    ElMessage.error(`解析失败: ${e instanceof Error ? e.message : String(e)}`)
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  // 验证表单
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  
  // 验证收入项目
  const validItems = incomeItems.value.filter(item => item.type && item.amount > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请填写至少一个有效收入项目')
    return
  }
  
  const totalIncome = calculateTotal()
  if (totalIncome <= 0) {
    ElMessage.warning('总收入必须大于0')
    return
  }
  
  try {
    loading.value = true
    
    // 转换为后端期望的格式
    const incomeData: Partial<IncomeRecord> = {
      type: 'income',
      shopName: formData.value.shop,
      date: formData.value.date,
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
      totalIncome: totalIncome
    }
    
    // 映射收入项目到固定字段
    validItems.forEach(item => {
      switch (item.type) {
        case '现金':
          incomeData.cashIncome! += item.amount
          break
        case '微信':
          incomeData.wechatIncome! += item.amount
          break
        case '美团':
          incomeData.meituanIncome! += item.amount
          break
        case '京东':
          incomeData.jingdongIncome! += item.amount
          break
        case '团购':
          incomeData.groupBuyIncome! += item.amount
          break
        case '宿捷':
          incomeData.sujieIncome! += item.amount
          break
        case '快跑者':
          incomeData.kuaipaoIncome! += item.amount
          break
        case '买单吧':
          incomeData.maidanbaIncome! += item.amount
          break
        case '饿了么':
          incomeData.elemeIncome! += item.amount
          break
        case '鹿城生':
          incomeData.luchengIncome! += item.amount
          break
      }
    })
    
    const response = await recordsAPI.createIncomeRecord(incomeData as Omit<IncomeRecord, 'id'>)
    
    if (response.success) {
      ElMessage.success('收入记录保存成功！')
      
      // 重置表单
      resetForm()
      
      // 延迟跳转到首页
      setTimeout(() => {
        router.push('/dashboard')
      }, 800)
    } else {
      ElMessage.error(response.message || '保存失败')
    }
    
  } catch (error: any) {
    console.error('保存收入记录失败:', error)
    ElMessage.error(error.response?.data?.message || '保存失败，请重试')
  } finally {
    loading.value = false
  }
}

// 初始化默认店铺选择
onMounted(() => {
  if (userStore.userShops.length > 0) {
    formData.value.shop = userStore.userShops[0].name
  }
})
</script>

<style lang="scss" scoped>
.income-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 1rem;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #67C23A 0%, #85CE61 100%);
  color: white;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  
  .back-button {
    color: white;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
    }
  }
  
  .header-content {
    flex: 1;
    
    .page-title {
      font-size: 20px;
      font-weight: 600;
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .page-subtitle {
      font-size: 14px;
      margin: 0;
      opacity: 0.8;
    }
  }
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 16px;
}

.form-section {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  .section-header {
    margin-bottom: 20px;
    
    h3 {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }
}

.basic-info {
  margin-bottom: 24px;
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    
    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }
}

.income-details {
  margin-bottom: 24px;
  
  .income-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin: 0;
    }
  }
  
  .income-items {
    margin-bottom: 16px;
    
    .income-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  .total-display {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #67C23A;
    
    .total-label {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
    
    .total-amount {
      font-size: 20px;
      font-weight: 700;
      color: #67C23A;
    }
  }
}

.form-actions {
  display: flex;
  gap: 12px;
  
  .el-button {
    flex: 1;
  }
}

.helper-section {
  .helper-card {
    background: white;
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    
    .card-header {
      margin-bottom: 16px;
      
      h4 {
        font-size: 16px;
        font-weight: 600;
        color: #303133;
        margin: 0;
      }
    }
    
    .parse-result {
      margin-top: 12px;
      padding: 12px;
      border-radius: 6px;
      
      .success {
        background: #f0f9ff;
        color: #1890ff;
        border: 1px solid #b3d8ff;
      }
      
      .error {
        background: #fff2f0;
        color: #f5222d;
        border: 1px solid #ffb3b3;
      }
    }
  }
}

// Element Plus 样式覆盖
:deep(.el-form-item__label) {
  font-weight: 600;
  color: #303133;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-select) {
  .el-input__wrapper {
    border-radius: 8px;
  }
}

:deep(.el-date-editor) {
  border-radius: 8px;
}

:deep(.el-textarea__inner) {
  border-radius: 8px;
  background: #f8f9fa;
  
  &:focus {
    background: white;
  }
}
</style>