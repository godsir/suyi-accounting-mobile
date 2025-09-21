<template>
  <div class="email-settings-container">
    <!-- 头部导航 -->
    <div class="settings-header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="header-title">邮件设置</div>
      <div class="placeholder"></div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 功能状态 -->
      <div class="settings-section">
        <div class="section-title">邮件功能</div>
        <div class="settings-list">
          <div class="setting-item">
            <div class="item-info">
              <div class="item-icon">
                <Message />
              </div>
              <div class="item-text">
                <div class="item-title">启用邮件功能</div>
                <div class="item-desc">配置后可自动发送周报/月报邮件</div>
              </div>
            </div>
            <el-switch
              v-model="emailForm.enabled"
              size="small"
            />
          </div>
        </div>
      </div>

      <!-- SMTP配置 -->
      <div class="settings-section">
        <div class="section-title">SMTP服务器配置</div>
        <div class="form-container">
          <el-form ref="emailFormRef" :model="emailForm" :rules="emailRules" label-position="top">
            <div class="form-row">
              <el-form-item label="SMTP服务器" prop="smtp_host">
                <el-input 
                  v-model="emailForm.smtp_host" 
                  placeholder="如：smtp.qq.com"
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
              
              <el-form-item label="SMTP端口" prop="smtp_port">
                <el-input 
                  v-model.number="emailForm.smtp_port" 
                  placeholder="587"
                  type="number"
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
            </div>
            
            <div class="form-row">
              <el-form-item label="邮箱用户名" prop="smtp_user">
                <el-input 
                  v-model="emailForm.smtp_user" 
                  placeholder="发件人邮箱"
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
              
              <el-form-item label="邮箱密码/授权码" prop="smtp_pass">
                <el-input 
                  v-model="emailForm.smtp_pass" 
                  type="password" 
                  :placeholder="isPasswordSaved ? '密码已保存，如需修改请重新输入' : '邮箱密码或授权码'"
                  show-password
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
            </div>
            
            <div class="form-row">
              <el-form-item label="发件人邮箱" prop="from_email">
                <el-input 
                  v-model="emailForm.from_email" 
                  placeholder="发件人邮箱地址"
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
              
              <el-form-item label="发件人名称" prop="from_name">
                <el-input 
                  v-model="emailForm.from_name" 
                  placeholder="Suyi账务管理"
                  :disabled="!emailForm.enabled"
                />
              </el-form-item>
            </div>
            
            <el-form-item label="收件人邮箱" prop="recipients">
              <el-input 
                v-model="emailForm.recipients" 
                type="textarea"
                :rows="3"
                placeholder="多个邮箱用英文逗号分隔，如：admin@example.com,user@example.com"
                :disabled="!emailForm.enabled"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 测试区域 -->
      <div class="settings-section" v-if="emailForm.enabled">
        <div class="section-title">邮件测试</div>
        <div class="test-container">
          <el-input 
            v-model="testEmail" 
            placeholder="请输入要发送测试邮件的邮箱地址"
            :prefix-icon="Message"
          />
          <el-button 
            type="primary" 
            @click="handleTestEmail" 
            :loading="testLoading"
            class="test-btn"
          >
            {{ testLoading ? '发送中...' : '发送测试邮件' }}
          </el-button>
          <div class="test-tip">
            系统将发送一封测试邮件到指定邮箱，请检查邮件是否正常接收。
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button @click="handleReset">
          重置表单
        </el-button>
        <el-button 
          type="primary" 
          @click="handleSave"
          :loading="saveLoading"
        >
          {{ saveLoading ? '保存中...' : '保存配置' }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElForm } from 'element-plus'
import { 
  ArrowLeft,
  Message
} from '@element-plus/icons-vue'
import { api } from '@/api'

const router = useRouter()
const emailFormRef = ref<InstanceType<typeof ElForm>>()

// 表单数据
const emailForm = reactive({
  smtp_host: '',
  smtp_port: 587,
  smtp_user: '',
  smtp_pass: '',
  from_email: '',
  from_name: 'Suyi账务管理',
  recipients: '',
  enabled: false
})

// 是否已保存密码
const isPasswordSaved = ref(false)

// 表单验证规则
const emailRules = {
  smtp_host: [
    { required: true, message: '请输入SMTP服务器地址', trigger: 'blur' }
  ],
  smtp_port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { type: 'number', message: '端口号必须为数字', trigger: 'blur' }
  ],
  smtp_user: [
    { required: true, message: '请输入邮箱用户名', trigger: 'blur' }
  ],
  smtp_pass: [
    { required: true, message: '请输入邮箱密码或授权码', trigger: 'blur' }
  ],
  from_email: [
    { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' }
  ],
  from_name: [
    { required: true, message: '请输入发件人名称', trigger: 'blur' }
  ],
  recipients: [
    { required: true, message: '请输入收件人邮箱', trigger: 'blur' }
  ]
}

// 其他数据
const testEmail = ref('')
const testLoading = ref(false)
const saveLoading = ref(false)

// 返回设置页面
const handleGoBack = () => {
  router.push('/settings')
}

// 测试邮件发送
const handleTestEmail = async () => {
  if (!testEmail.value) {
    ElMessage.warning('请输入测试邮箱地址')
    return
  }

  if (!emailFormRef.value) return
  
  // 先验证表单
  const valid = await emailFormRef.value.validate().catch(() => false)
  if (!valid) {
    ElMessage.error('请先完善邮件配置信息')
    return
  }

  testLoading.value = true
  
  try {
    // 调用后端API发送测试邮件
    const result = await api.post('/email/test', {
      config: emailForm,
      testEmail: testEmail.value
    })

    ElMessage.success(result.message || `测试邮件已发送到 ${testEmail.value}`)
  } catch (error: any) {
    console.error('测试邮件发送失败:', error)
    const errorMessage = error.response?.data?.error || error.message || '请检查邮件配置'
    ElMessage.error('测试邮件发送失败: ' + errorMessage)
  } finally {
    testLoading.value = false
  }
}

// 保存设置
const handleSave = async () => {
  if (!emailFormRef.value) return
  
  // 如果启用了邮件功能，才验证表单
  if (emailForm.enabled) {
    const valid = await emailFormRef.value.validate().catch(() => false)
    if (!valid) return
  }

  saveLoading.value = true
  
  try {
    // 调用后端API保存邮件配置
    const result = await api.post('/email/config', emailForm)
    
    // 同时保存到本地存储作为备份
    localStorage.setItem('emailSettings', JSON.stringify(emailForm))
    
    ElMessage.success(result.message || '邮件配置保存成功')
  } catch (error: any) {
    console.error('保存邮件配置失败:', error)
    const errorMessage = error.response?.data?.error || error.message || '请检查网络连接'
    ElMessage.error('保存失败: ' + errorMessage)
  } finally {
    saveLoading.value = false
  }
}

// 重置设置
const handleReset = () => {
  emailFormRef.value?.resetFields()
  Object.assign(emailForm, {
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_email: '',
    from_name: 'Suyi账务管理',
    recipients: '',
    enabled: false
  })
  testEmail.value = ''
  isPasswordSaved.value = false
  ElMessage.info('设置已重置')
}

// 获取邮件配置
const loadEmailConfig = async () => {
  try {
    const config = await api.get('/email/config')
    
    if (config) {
      Object.assign(emailForm, config)
      
      // 检查是否有保存的密码 - 后端返回 ••••••••• 表示已保存
      if (config.smtp_pass === '••••••••') {
        isPasswordSaved.value = true
      }
    }
  } catch (error) {
    console.error('获取邮件配置失败:', error)
    // 降级到本地存储
    const savedSettings = localStorage.getItem('emailSettings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        Object.assign(emailForm, settings)
        
        if (settings.smtp_pass && settings.smtp_pass !== '') {
          isPasswordSaved.value = true
          emailForm.smtp_pass = '••••••••'
        }
      } catch (error) {
        console.error('读取本地邮件设置失败:', error)
      }
    }
  }
}

// 初始化
onMounted(() => {
  loadEmailConfig()
})
</script>

<style lang="scss" scoped>
.email-settings-container {
  min-height: 100vh;
  background: #f5f5f5;
}

// 头部导航
.settings-header {
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
  
  .header-title {
    font-size: 18px;
    font-weight: 600;
    color: #333;
  }
  
  .placeholder {
    width: 32px;
  }
}

// 设置内容
.settings-content {
  padding: 20px;
}

.settings-section {
  margin-bottom: 20px;
  
  .section-title {
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
    padding-left: 5px;
  }
}

// 表单容器
.form-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  
  .form-row {
    display: flex;
    gap: 15px;
    
    .el-form-item {
      flex: 1;
    }
  }
  
  :deep(.el-form-item) {
    margin-bottom: 20px;
    
    .el-form-item__label {
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
    }
    
    .el-input {
      height: 44px;
      
      .el-input__wrapper {
        border-radius: 8px;
      }
    }
    
    .el-textarea {
      .el-textarea__inner {
        border-radius: 8px;
      }
    }
  }
}

// 设置列表
.settings-list {
  background: white;
  border-radius: 10px;
  overflow: hidden;
  
  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 20px;
    
    .item-info {
      display: flex;
      align-items: center;
      flex: 1;
      
      .item-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        font-size: 16px;
        color: #666;
      }
      
      .item-text {
        .item-title {
          font-size: 16px;
          color: #333;
          margin-bottom: 2px;
        }
        
        .item-desc {
          font-size: 13px;
          color: #999;
        }
      }
    }
  }
}

// 测试容器
.test-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 15px;
  
  .el-input {
    :deep(.el-input__wrapper) {
      border-radius: 8px;
      height: 44px;
    }
  }
  
  .test-btn {
    height: 44px;
    border-radius: 8px;
    font-weight: 500;
  }
  
  .test-tip {
    font-size: 13px;
    color: #999;
    line-height: 1.5;
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  gap: 15px;
  margin-top: 30px;
  
  .el-button {
    flex: 1;
    height: 48px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: 500;
  }
}

// 移动端适配
@media (max-width: 480px) {
  .settings-header {
    padding: 12px 15px;
    
    .header-title {
      font-size: 16px;
    }
  }
  
  .settings-content {
    padding: 15px;
  }
  
  .form-container,
  .test-container {
    padding: 15px;
  }
  
  .action-buttons {
    gap: 12px;
    
    .el-button {
      height: 44px;
      font-size: 14px;
    }
  }
}
</style>