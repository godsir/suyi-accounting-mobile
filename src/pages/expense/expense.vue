<template>
  <div class="expense-container">
    
    <!-- 店铺权限提示 -->
    <el-alert
      v-if="!userStore.hasShopAccess"
      title="无店铺访问权限"
      description="您当前没有任何店铺的访问权限，无法添加支出记录。请联系管理员为您分配店铺权限。"
      type="error"
      show-icon
      style="margin: 16px; margin-bottom: 24px"
    />

    <div class="main-content">
      <!-- 主表单区域 -->
      <div class="form-section">
        <div class="section-header">
          <h3>支出信息</h3>
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
                  :disabled-date="(time) => time.getTime() > Date.now()"
                />
              </el-form-item>
            </div>
          </div>

          <!-- 支出项目 -->
          <div class="expense-details">
            <div class="expense-header">
              <h4>支出项目</h4>
              <el-button
                type="primary"
                :icon="Plus"
                size="small"
                @click="addExpenseItem"
                :disabled="expenseItems.length >= 10"
              >
                添加项目
              </el-button>
            </div>
            
            <div class="expense-items">
              <div 
                v-for="(item, index) in expenseItems" 
                :key="index" 
                class="expense-item"
              >
                <el-input
                  v-model="item.description"
                  placeholder="项目描述"
                  style="flex: 1; margin-right: 8px"
                />
                
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
                  v-if="expenseItems.length > 1"
                  danger
                  :icon="Minus"
                  size="small"
                  @click="removeExpenseItem(index)"
                  style="min-width: 32px; width: 32px; height: 32px"
                />
              </div>
            </div>

            <!-- 总计显示 -->
            <div class="total-display">
              <div class="total-label">总支出</div>
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
水果 100
蔬菜: 200
交通费 50
餐费：30
或一行多个: 雪碧70, 西瓜22.18, 电话费79"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { recordsAPI, type ExpenseRecord, type ExpenseItem } from '@/api'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { 
  ArrowLeft, 
  ShoppingCart, 
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

// 支出项目
const expenseItems = ref<ExpenseItem[]>([
  { description: '', amount: 0 }
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

// 计算总支出
const calculateTotal = () => {
  return expenseItems.value.reduce((sum, item) => sum + (item.amount || 0), 0)
}

// 添加支出项目
const addExpenseItem = () => {
  if (expenseItems.value.length < 10) {
    expenseItems.value.push({ description: '', amount: 0 })
  } else {
    ElMessage.warning('最多只能添加10个支出项目')
  }
}

// 删除支出项目
const removeExpenseItem = (index: number) => {
  if (expenseItems.value.length <= 1) {
    ElMessage.warning('至少保留一个支出项目')
    return
  }
  expenseItems.value.splice(index, 1)
}

// 重置表单
const resetForm = () => {
  formRef.value?.resetFields()
  expenseItems.value = [{ description: '', amount: 0 }]
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

    const newExpenseItems: ExpenseItem[] = []
    let parsedFields = 0
    const warnings: string[] = []

    for (const line of lines) {
      console.log('解析行:', line)
      
      // 首先检查是否是多个项目在一行（用逗号分隔）
      if (line.includes(',') || line.includes('，')) {
        const items = line.split(/[,，]/).map(item => item.trim()).filter(item => item)
        
        for (const item of items) {
          const patterns = [
            // 数字+描述 (如: 1958进货, 70雪碧) - 优先匹配
            /^(\d+(?:\.\d+)?)([^\d\s]+)$/,
            // 描述+数字 (如: 雪碧70)
            /^([^\d]+)(\d+(?:\.\d+)?)$/,
            // 描述:金额 或 描述：金额
            /^([^\d:：]+)[:：]\s*(\d+(?:\.\d+)?)/,
            // 描述 金额 (空格分隔)
            /^([^\d]+)\s+(\d+(?:\.\d+)?)$/,
            // 金额 描述 (空格分隔)
            /^(\d+(?:\.\d+)?)\s+([^\d]+)$/,
            // 描述元
            /^([^\d]+)(\d+(?:\.\d+)?)元$/,
            // 数字元+描述
            /^(\d+(?:\.\d+)?)元([^\d]+)$/,
          ]

          let matched = false
          for (const pattern of patterns) {
            const match = item.match(pattern)
            if (match) {
              let description = ''
              let amount = 0

              // 检查第一个匹配组是否为数字
              if (!isNaN(Number(match[1]))) {
                // 金额在前，描述在后
                amount = Number(match[1])
                description = match[2].trim()
              } else {
                // 描述在前，金额在后
                description = match[1].trim()
                amount = Number(match[2])
              }

              // 清理描述中的特殊字符
              description = description.replace(/[元￥$]/g, '').trim()

              if (description && amount > 0) {
                newExpenseItems.push({ description, amount })
                parsedFields++
                matched = true
                break
              }
            }
          }
        }
        continue
      }
      
      // 单个项目的解析
      const itemPatterns = [
        // 数字+描述 (如: 1958进货, 70雪碧) - 优先匹配
        /^(\d+(?:\.\d+)?)([^\d\s]+)$/,
        // 描述+数字 (如: 雪碧70)
        /^([^\d]+)(\d+(?:\.\d+)?)$/,
        // 描述:金额 或 描述：金额
        /^([^\d:：]+)[:：]\s*(\d+(?:\.\d+)?)/,
        // 描述 金额 (空格分隔)
        /^([^\d]+)\s+(\d+(?:\.\d+)?)$/,
        // 金额 描述 (空格分隔)
        /^(\d+(?:\.\d+)?)\s+([^\d]+)$/,
        // 描述元
        /^([^\d]+)(\d+(?:\.\d+)?)元$/,
        // 数字元+描述
        /^(\d+(?:\.\d+)?)元([^\d]+)$/,
      ]

      let matched = false
      for (const pattern of itemPatterns) {
        const match = line.match(pattern)
        if (match) {
          let description = ''
          let amount = 0

          // 检查第一个匹配组是否为数字
          if (!isNaN(Number(match[1]))) {
            // 金额在前，描述在后
            amount = Number(match[1])
            description = match[2].trim()
          } else {
            // 描述在前，金额在后
            description = match[1].trim()
            amount = Number(match[2])
          }

          // 清理描述中的特殊字符
          description = description.replace(/[元￥$]/g, '').trim()

          if (description && amount > 0) {
            newExpenseItems.push({ description, amount })
            parsedFields++
            matched = true
            break
          }
        }
      }
    }

    if (newExpenseItems.length === 0) {
      parseResult.value = {
        success: false,
        message: '未找到可解析的支出项目'
      }
      ElMessage.warning('未找到可解析的支出项目')
      return
    }

    // 更新支出项目
    expenseItems.value = newExpenseItems
    
    const parsedItems = newExpenseItems.map(item => `${item.description}: ¥${item.amount}`)
    const successMessage = `解析成功！共解析出 ${newExpenseItems.length} 个支出项目: ${parsedItems.join(', ')}`
    
    parseResult.value = {
      success: true,
      message: successMessage
    }
    
    ElMessage.success(`解析出 ${newExpenseItems.length} 个支出项目`)
    
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
  
  // 验证支出项目
  const validItems = expenseItems.value.filter(item => item.description && item.amount > 0)
  if (validItems.length === 0) {
    ElMessage.warning('请填写至少一个有效支出项目')
    return
  }
  
  const totalExpense = calculateTotal()
  if (totalExpense <= 0) {
    ElMessage.warning('总支出必须大于0')
    return
  }
  
  try {
    loading.value = true
    
    // 构建支出记录数据
    const expenseData: Omit<ExpenseRecord, 'id'> = {
      type: 'expense',
      shopName: formData.value.shop,
      date: formData.value.date,
      expenseItems: validItems,
      totalExpense: totalExpense
    }
    
    const response = await recordsAPI.createExpenseRecord(expenseData)
    
    if (response.success) {
      ElMessage.success('支出记录保存成功！')
      
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
    console.error('保存支出记录失败:', error)
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
.expense-container {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 1rem;
}

.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #F56C6C 0%, #FF7875 100%);
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

.expense-details {
  margin-bottom: 24px;
  
  .expense-header {
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
  
  .expense-items {
    margin-bottom: 16px;
    
    .expense-item {
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
    background: #fff2f0;
    border-radius: 8px;
    border-left: 4px solid #F56C6C;
    
    .total-label {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
    
    .total-amount {
      font-size: 20px;
      font-weight: 700;
      color: #F56C6C;
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