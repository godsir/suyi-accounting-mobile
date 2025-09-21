<template>
  <div class="login-container">
    <div class="login-card">
      <!-- 头部标题 -->
      <div class="login-header">
        <h1>Suyi账务管理系统</h1>
        <p>现代化的账务管理解决方案</p>
      </div>

      <!-- 标签页切换 -->
      <el-tabs v-model="currentTab" class="login-tabs">
        <el-tab-pane label="登录" name="login"></el-tab-pane>
        <el-tab-pane label="注册" name="register"></el-tab-pane>
      </el-tabs>

      <!-- 登录表单 -->
      <div v-if="currentTab === 'login'" class="form-section">
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="auth-form"
        >
          <el-form-item prop="email">
            <el-input
              v-model="loginForm.email"
              size="large"
              placeholder="邮箱地址"
              :prefix-icon="Message"
              clearable
              type="email"
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              size="large"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleLogin"
            />
          </el-form-item>

          <div class="form-options">
            <el-checkbox v-model="rememberEmail">记住邮箱</el-checkbox>
          </div>
          
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            @click="handleLogin"
            class="submit-btn"
          >
            {{ loading ? '登录中...' : '登录' }}
          </el-button>
        </el-form>
      </div>

      <!-- 注册表单 -->
      <div v-if="currentTab === 'register'" class="form-section">
        <el-form
          ref="registerFormRef"
          :model="registerForm"
          :rules="registerRules"
          class="auth-form"
        >
          <el-form-item prop="username">
            <el-input
              v-model="registerForm.username"
              size="large"
              placeholder="用户名"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>

          <el-form-item prop="email">
            <el-input
              v-model="registerForm.email"
              size="large"
              placeholder="邮箱地址"
              :prefix-icon="Message"
              clearable
              type="email"
            />
          </el-form-item>

          <el-form-item prop="verificationCode">
            <el-input
              v-model="registerForm.verificationCode"
              size="large"
              placeholder="邮箱验证码"
              :prefix-icon="Key"
              maxlength="6"
            >
              <template #suffix>
                <el-button
                  type="primary"
                  text
                  size="small"
                  :loading="codeLoading"
                  :disabled="countdown > 0"
                  @click="sendVerificationCode"
                  class="code-btn"
                >
                  {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
                </el-button>
              </template>
            </el-input>
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="registerForm.password"
              type="password"
              size="large"
              placeholder="密码"
              :prefix-icon="Lock"
              show-password
            />
          </el-form-item>

          <el-form-item prop="confirmPassword">
            <el-input
              v-model="registerForm.confirmPassword"
              type="password"
              size="large"
              placeholder="确认密码"
              :prefix-icon="Lock"
              show-password
              @keyup.enter="handleRegister"
            />
          </el-form-item>
          
          <el-button
            type="primary"
            size="large"
            :loading="registerLoading"
            @click="handleRegister"
            class="submit-btn"
          >
            {{ registerLoading ? '注册中...' : '注册' }}
          </el-button>
        </el-form>
      </div>

      <!-- 底部信息 -->
      <div class="footer">
        <p>© 2025 Suyi账务管理系统</p>
        <p>现代化 · 简洁 · 高效</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { authAPI, api, API_ENDPOINTS } from '@/api'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { 
  User, 
  Lock, 
  Message,
  Key,
  Money
} from '@element-plus/icons-vue'

const router = useRouter()
const userStore = useUserStore()

// 当前选项卡
const currentTab = ref<'login' | 'register'>('login')

// 表单引用
const loginFormRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()

// 登录表单数据
const loginForm = ref({
  email: '',
  password: ''
})

// 注册表单数据
const registerForm = ref({
  username: '',
  email: '',
  verificationCode: '',
  password: '',
  confirmPassword: ''
})

// 状态
const loading = ref(false)
const registerLoading = ref(false)
const codeLoading = ref(false)
const rememberEmail = ref(false)
const countdown = ref(0)
const emailHistory = ref<string[]>([])

// 登录表单验证规则
const loginRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6位', trigger: 'blur' }
  ]
}

// 注册表单验证规则
const registerRules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  verificationCode: [
    { required: true, message: '请输入邮箱验证码', trigger: 'blur' },
    { len: 6, message: '验证码为6位数字', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少为6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== registerForm.value.password) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 倒计时效果
onMounted(() => {
  const timer = setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
    }
  }, 1000)
  
  // 在组件卸载时清除定时器
  const cleanup = () => {
    clearInterval(timer)
  }
  
  // 手动管理清理
  window.addEventListener('beforeunload', cleanup)
  
  // 恢复邮箱历史记录
  const savedEmails = localStorage.getItem('loginEmailHistory')
  if (savedEmails) {
    const emailList = JSON.parse(savedEmails)
    emailHistory.value = emailList
    // 自动填充最近使用的邮箱
    if (emailList.length > 0) {
      loginForm.value.email = emailList[0]
      rememberEmail.value = true
    }
  }
  
  // 如果已经登录，直接跳转
  if (userStore.isLoggedIn) {
    router.replace('/dashboard')
  }
})

// 保存邮箱到历史记录
const saveEmailToHistory = (email: string) => {
  const currentHistory = [...emailHistory.value]
  // 如果邮箱已存在，先移除
  const existingIndex = currentHistory.indexOf(email)
  if (existingIndex > -1) {
    currentHistory.splice(existingIndex, 1)
  }
  // 将新邮箱添加到开头
  currentHistory.unshift(email)
  // 最多保留5个历史记录
  const newHistory = currentHistory.slice(0, 5)
  
  emailHistory.value = newHistory
  localStorage.setItem('loginEmailHistory', JSON.stringify(newHistory))
}

// 发送验证码
const sendVerificationCode = async () => {
  const email = registerForm.value.email
  if (!email) {
    ElMessage.error('请先输入邮箱地址')
    return
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    ElMessage.error('请输入正确的邮箱格式')
    return
  }

  codeLoading.value = true
  
  try {
    const response = await api.post(`${API_ENDPOINTS.email}/send-verification-code`, { email })
    
    if (response.success) {
      ElMessage.success('验证码已发送，请查收邮箱（包括垃圾邮件箱）')
      countdown.value = 60 // 60秒倒计时
    } else {
      ElMessage.error(response.error || '发送验证码失败')
    }
  } catch (error: any) {
    console.error('发送验证码失败:', error)
    
    let errorMessage = '发送验证码失败，请重试'
    if (error.response?.status === 429) {
      const data = error.response.data
      if (data.remainingTime) {
        countdown.value = data.remainingTime
      }
      errorMessage = data.error || '请等待后再试'
    }
    
    ElMessage.error(errorMessage)
  } finally {
    codeLoading.value = false
  }
}

// 验证验证码
const verifyCode = async (email: string, code: string) => {
  try {
    const response = await api.post(`${API_ENDPOINTS.email}/verify-code`, { email, code })
    return response.success
  } catch (error) {
    console.error('验证码校验失败:', error)
    return false
  }
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  const valid = await loginFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  try {
    loading.value = true
    
    // 调试信息
    console.log('开始登录，API Base URL:', 'https://suyiapi.cpolar.cn/api')
    console.log('登录数据:', loginForm.value)
    
    const result = await userStore.login(loginForm.value.email, loginForm.value.password)
    
    console.log('登录结果:', result)
    
    if (result.success) {
      ElMessage.success('登录成功！')
      
      // 保存邮箱到历史记录
      if (rememberEmail.value) {
        saveEmailToHistory(loginForm.value.email)
      }
      
      // 检查重定向路径
      const redirectPath = localStorage.getItem('redirectAfterLogin') || '/dashboard'
      localStorage.removeItem('redirectAfterLogin')
      
      setTimeout(() => {
        router.replace(redirectPath)
        // 登录成功后强制刷新页面，确保所有数据和状态正确加载
        setTimeout(() => {
          window.location.reload()
        }, 100)
      }, 500)
    } else {
      console.error('登录失败，错误信息:', result.message)
      ElMessage.error(result.message || '登录失败')
      // 清空密码字段
      loginForm.value.password = ''
    }
  } catch (error: any) {
    console.error('登录异常:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response,
      status: error.response?.status,
      data: error.response?.data
    })
    
    let errorMsg = '登录失败，请重试'
    if (error.response?.data?.message) {
      errorMsg = error.response.data.message
    } else if (error.message) {
      errorMsg = error.message
    }
    
    ElMessage.error(errorMsg)
  } finally {
    loading.value = false
  }
}

// 处理注册
const handleRegister = async () => {
  if (!registerFormRef.value) return
  
  const valid = await registerFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  try {
    registerLoading.value = true
    
    // 先验证邮箱验证码
    const isCodeValid = await verifyCode(registerForm.value.email, registerForm.value.verificationCode)
    if (!isCodeValid) {
      ElMessage.error('验证码错误或已过期')
      return
    }
    
    const response = await authAPI.register({
      username: registerForm.value.username,
      email: registerForm.value.email,
      password: registerForm.value.password
    })
    
    if (response.success) {
      ElMessage.success('注册成功！已获得7天试用授权，自动登录中...')
      
      // 自动登录
      if (response.data && response.data.token) {
        userStore.login(response.data.user, response.data.token)
        
        setTimeout(() => {
          router.replace('/dashboard')
        }, 500)
      } else {
        // 切换到登录页面并填入邮箱
        currentTab.value = 'login'
        loginForm.value.email = registerForm.value.email
        
        // 清空注册表单
        registerForm.value = {
          username: '',
          email: '',
          verificationCode: '',
          password: '',
          confirmPassword: ''
        }
      }
    } else {
      ElMessage.error(response.message || '注册失败')
    }
  } catch (error: any) {
    console.error('注册失败:', error)
    ElMessage.error(error.response?.data?.message || '注册失败，请重试')
  } finally {
    registerLoading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: #f5f5f5;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.login-header {
  text-align: center;
  padding: 32px 32px 0;
  
  h1 {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin: 0 0 8px 0;
  }
  
  p {
    font-size: 14px;
    color: #666;
    margin: 0 0 24px 0;
  }
}

.login-tabs {
  padding: 0 32px;
  margin-bottom: 24px;
  
  :deep(.el-tabs__header) {
    margin: 0;
    border-bottom: 1px solid #eee;
  }
  
  :deep(.el-tabs__nav-wrap) {
    &::after {
      display: none;
    }
  }
  
  :deep(.el-tabs__item) {
    color: #666;
    font-weight: 500;
    padding: 0 20px;
    height: 44px;
    line-height: 44px;
    
    &.is-active {
      color: #409EFF;
    }
  }
  
  :deep(.el-tabs__active-bar) {
    background-color: #409EFF;
    height: 2px;
  }
}

.form-section {
  padding: 0 32px 32px;
  
  .auth-form {
    .el-form-item {
      margin-bottom: 20px;
    }
    
    .form-options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      font-size: 14px;
      
      .el-checkbox {
        :deep(.el-checkbox__label) {
          color: #666;
        }
      }
    }
    
    .submit-btn {
      width: 100%;
      height: 44px;
      border-radius: 6px;
      font-size: 16px;
      font-weight: 500;
    }
  }
}

.footer {
  text-align: center;
  padding: 16px;
  background: #fafafa;
  border-top: 1px solid #eee;
  
  p {
    margin: 2px 0;
    font-size: 12px;
    color: #999;
  }
}

// Element Plus 样式覆盖
:deep(.el-input) {
  .el-input__wrapper {
    border-radius: 6px;
    transition: all 0.2s;
    
    &.is-focus {
      box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
    }
  }
}

:deep(.el-button) {
  border-radius: 6px;
  transition: all 0.2s;
}

// 移动端适配
@media (max-width: 480px) {
  .login-container {
    padding: 0;
  }
  
  .login-card {
    max-width: none;
    border-radius: 0;
    box-shadow: none;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  
  .login-header {
    flex-shrink: 0;
    padding: 24px 24px 0;
    position: sticky;
    top: 0;
    background: white;
    z-index: 10;
    
    h1 {
      font-size: 22px;
    }
  }
  
  .login-tabs {
    flex-shrink: 0;
    padding: 0 24px;
    background: white;
    position: sticky;
    top: 120px;
    z-index: 9;
  }
  
  .form-section {
    flex: 1;
    padding: 0 24px 24px;
    overflow-y: auto;
    
    .auth-form {
      .submit-btn {
        height: 42px;
        font-size: 15px;
      }
    }
  }
  
  .footer {
    flex-shrink: 0;
    position: sticky;
    bottom: 0;
    z-index: 10;
  }
}

@media (max-width: 360px) {
  .login-header {
    padding: 20px 20px 0;
    top: 0;
  }
  
  .login-tabs {
    padding: 0 20px;
    top: 100px;
  }
  
  .form-section {
    padding: 0 20px 20px;
  }
}
</style>
