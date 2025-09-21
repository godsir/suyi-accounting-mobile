<template>
  <div class="user-settings-container">
    <!-- 头部导航 -->
    <div class="settings-header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="header-title">用户设置</div>
      <div class="placeholder"></div>
    </div>

    <!-- 基本信息列表 -->
    <div class="info-card">
      <div class="info-list">
        <div class="info-item" @click="handleAvatarUpload">
          <div class="info-label">头像</div>
          <div class="info-value">
            <el-avatar 
              :size="40" 
              :src="userStore.user?.avatar" 
              :icon="UserFilled"
            />
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
        
        <div class="info-item" @click="handleEditUsername">
          <div class="info-label">用户名</div>
          <div class="info-value">
            <span>{{ userStore.user?.username }}</span>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">邮箱</div>
          <div class="info-value">
            <span>{{ userStore.user?.email || '未设置' }}</span>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">角色</div>
          <div class="info-value">
            <span>{{ getRoleText(userStore.user?.role) }}</span>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">用户ID</div>
          <div class="info-value">
            <span>{{ userStore.user?.id }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 状态信息 -->
    <div class="info-card">
      <div class="info-list">
        <div class="info-item">
          <div class="info-label">账户状态</div>
          <div class="info-value">
            <el-tag type="success" size="small">正常</el-tag>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">授权状态</div>
          <div class="info-value">
            <div class="license-status">
              <el-tag :type="getLicenseTagType()" size="small">
                {{ getLicenseStatusText() }}
              </el-tag>
              <div v-if="getLicenseRemainingDays()" class="remaining-days">
                剩余{{ getLicenseRemainingDays() }}天
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-item">
          <div class="info-label">上次登录</div>
          <div class="info-value">
            <span class="time-text">{{ formatDateTime(userStore.user?.lastLogin) }}</span>
          </div>
        </div>
        
        <div class="info-item" v-if="userShops.length > 0">
          <div class="info-label">授权店铺</div>
          <div class="info-value">
            <span>{{ userShops.length }} 个</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 安全设置 -->
    <div class="info-card">
      <div class="card-title">安全设置</div>
      <div class="info-list">
        <div class="info-item" @click="handleChangePassword">
          <div class="info-label">修改密码</div>
          <div class="info-value">
            <span class="placeholder">为了账户安全，建议定期修改密码</span>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 头像选择弹窗 -->
    <el-dialog
      v-model="showAvatarPicker"
      title="选择头像"
      width="85%"
      class="avatar-picker-dialog"
    >
      <div class="picker-list">
        <div class="picker-item" @click="handlePickFromGallery">
          <div class="item-icon">
            <el-icon><Picture /></el-icon>
          </div>
          <div class="item-label">相册选择</div>
        </div>
        
        <div class="picker-item" @click="handleTakePhoto">
          <div class="item-icon">
            <el-icon><Camera /></el-icon>
          </div>
          <div class="item-label">拍照</div>
        </div>
        
        <div v-if="userStore.user?.avatar" class="picker-item delete-item" @click="handleRemoveAvatar">
          <div class="item-icon">
            <el-icon><Delete /></el-icon>
          </div>
          <div class="item-label">删除头像</div>
        </div>
      </div>
      
      <template #footer>
        <el-button @click="showAvatarPicker = false" style="width: 100%; height: 44px;">
          取消
        </el-button>
      </template>
    </el-dialog>

    <!-- 密码修改对话框 -->
    <el-dialog 
      v-model="showPasswordDialog" 
      title="修改密码"
      width="90%"
      :show-close="false"
    >
      <el-form :model="passwordForm" :rules="passwordRules" ref="passwordFormRef" label-position="top">
        <el-form-item label="当前密码" prop="currentPassword">
          <el-input 
            type="password" 
            v-model="passwordForm.currentPassword" 
            placeholder="请输入当前密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="新密码" prop="newPassword">
          <el-input 
            type="password" 
            v-model="passwordForm.newPassword" 
            placeholder="请输入新密码"
            show-password
          />
        </el-form-item>
        
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input 
            type="password" 
            v-model="passwordForm.confirmPassword" 
            placeholder="请确认新密码"
            show-password
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showPasswordDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSavePassword"
            :loading="passwordLoading"
          >
            {{ passwordLoading ? '修改中...' : '确认修改' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElForm, ElAvatar } from 'element-plus'
import { 
  ArrowLeft,
  ArrowRight,
  UserFilled,
  Camera,
  Close,
  Shop,
  Picture,
  Delete
} from '@element-plus/icons-vue'
import { useUserStore } from '@/store/user'
import { api } from '@/api'

const router = useRouter()
const userStore = useUserStore()
const userFormRef = ref<InstanceType<typeof ElForm>>()
const passwordFormRef = ref<InstanceType<typeof ElForm>>()

// 数据
const userShops = ref<any[]>([])
const saveLoading = ref(false)
const passwordLoading = ref(false)
const showPasswordDialog = ref(false)
const showAvatarPicker = ref(false)
const avatarLoading = ref(false)

// 表单数据
const userForm = reactive({
  username: '',
  email: ''
})

const passwordForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
})

// 表单验证规则
const userRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度为2-20个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

const passwordRules = {
  currentPassword: [
    { required: true, message: '请输入当前密码', trigger: 'blur' }
  ],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, max: 50, message: '密码长度为6-50个字符', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule: any, value: string, callback: Function) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

// 获取角色文本
const getRoleText = (role?: string) => {
  switch (role) {
    case 'super_admin': return '超级管理员'
    case 'admin': return '管理员'
    case 'user': return '普通用户'
    case 'observer': return '观察者'
    default: return '未知角色'
  }
}

// 获取授权状态标签类型
const getLicenseTagType = () => {
  const user = userStore.user
  if (!user) return 'info'
  
  // 永久授权
  if (!user.licenseExpiry || user.licenseExpiry === null) {
    return 'primary'
  }
  
  // 检查是否过期
  if (user.isLicenseExpired) {
    return 'danger'
  }
  
  // 检查剩余天数
  if (user.daysUntilExpiry !== undefined && user.daysUntilExpiry !== null) {
    if (user.daysUntilExpiry <= 7) {
      return 'warning'
    }
  }
  
  return 'success'
}

// 获取授权状态文本
const getLicenseStatusText = () => {
  const user = userStore.user
  if (!user) return '未知'
  
  // 永久授权
  if (!user.licenseExpiry || user.licenseExpiry === null) {
    return '永久授权'
  }
  
  // 检查是否过期
  if (user.isLicenseExpired) {
    return '已过期'
  }
  
  return '有效'
}

// 获取剩余天数
const getLicenseRemainingDays = () => {
  const user = userStore.user
  if (!user || !user.licenseExpiry || user.licenseExpiry === null) {
    return null
  }
  
  return user.daysUntilExpiry || null
}

// 格式化日期时间
const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '未知'
  try {
    return new Date(dateStr).toLocaleString('zh-CN')
  } catch {
    return '未知'
  }
}

// 返回设置页面
const handleGoBack = () => {
  router.push('/settings')
}

// 上传头像 - 显示选择弹窗
const handleAvatarUpload = () => {
  showAvatarPicker.value = true
}

// 从相册选择
const handlePickFromGallery = () => {
  showAvatarPicker.value = false
  
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = false
  // 不设置capture属性，让用户能选择相册
  
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      handleUploadAvatar(file)
    }
  }
  
  input.click()
}

// 拍照
const handleTakePhoto = () => {
  showAvatarPicker.value = false
  
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.capture = 'camera' // 明确指定使用相机拍照
  input.multiple = false
  
  input.onchange = (event) => {
    const file = (event.target as HTMLInputElement).files?.[0]
    if (file) {
      handleUploadAvatar(file)
    }
  }
  
  input.click()
}

// 处理头像上传
const handleUploadAvatar = async (file: File) => {
  // 检查文件大小（限制为5MB）
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过5MB')
    return
  }
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  try {
    saveLoading.value = true
    ElMessage.info('正在上传头像...')
    
    // 压缩图片并转换为base64
    const compressedBase64 = await compressAndConvertImage(file)
    
    // 参考electron客户端的方式，提供完整的用户数据
    const updatedUserData = {
      username: userStore.user!.username,
      email: userStore.user!.email,
      role: userStore.user!.role,
      avatar: compressedBase64
    }
    
    try {
      // 直接调用后端API
      const response = await api.put(`/users/${userStore.user!.id}`, updatedUserData)
      
      if (response.success) {
        // 重新获取用户信息以确保数据同步
        await userStore.initializeUser()
        ElMessage.success('头像上传成功')
      } else {
        ElMessage.error(response.message || '头像上传失败')
      }
    } catch (apiError: any) {
      console.warn('头像保存到数据库失败，仅更新本地存储:', apiError)
      // 降级处理：仅更新本地存储
      const updatedUser = { ...userStore.user!, avatar: compressedBase64 }
      // 使用updateUser方法更新用户数据
      userStore.updateUser(updatedUser)
      ElMessage.success('头像上传成功（本地）')
    }
  } catch (error) {
    console.error('头像上传失败:', error)
    ElMessage.error('头像上传失败')
  } finally {
    saveLoading.value = false
  }
}

// 压缩图片并转换为base64
const compressAndConvertImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // 设置最大尺寸
      const maxSize = 300
      let { width, height } = img
      
      // 计算新尺寸
      if (width > height) {
        if (width > maxSize) {
          height = (height * maxSize) / width
          width = maxSize
        }
      } else {
        if (height > maxSize) {
          width = (width * maxSize) / height
          height = maxSize
        }
      }
      
      // 设置canvas尺寸
      canvas.width = width
      canvas.height = height
      
      // 绘制压缩后的图片
      ctx?.drawImage(img, 0, 0, width, height)
      
      // 转换为base64
      const compressedDataURL = canvas.toDataURL('image/jpeg', 0.8)
      resolve(compressedDataURL)
    }
    
    img.onerror = reject
    
    // 开始加载图片
    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// 删除头像
const handleRemoveAvatar = async () => {
  showAvatarPicker.value = false
  
  try {
    await ElMessageBox.confirm('确认删除头像吗？', '删除确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    avatarLoading.value = true
    
    // 参考user-settings页面的实现
    const updatedUserData = {
      username: userStore.user!.username,
      email: userStore.user!.email,
      role: userStore.user!.role,
      avatar: null
    }
    
    try {
      const response = await api.put(`/users/${userStore.user!.id}`, updatedUserData)
      
      if (response.success) {
        await userStore.initializeUser()
        ElMessage.success('头像删除成功')
      } else {
        ElMessage.error(response.message || '头像删除失败')
      }
    } catch (apiError: any) {
      console.warn('头像删除失败，仅更新本地存储:', apiError)
      const updatedUser = { ...userStore.user!, avatar: null }
      userStore.updateUser(updatedUser)
      ElMessage.success('头像删除成功（本地）')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除头像失败:', error)
      ElMessage.error('删除头像失败')
    }
  } finally {
    avatarLoading.value = false
  }
}

// 保存基本信息
const handleSaveUserInfo = async () => {
  if (!userFormRef.value) return
  
  const valid = await userFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  saveLoading.value = true
  
  try {
    const updatedUserData = {
      username: userForm.username,
      email: userForm.email,
      role: userStore.user!.role,
      avatar: userStore.user!.avatar
    }
    
    try {
      const response = await api.put(`/users/${userStore.user!.id}`, updatedUserData)
      const userResponse = await api.get(`/users/${userStore.user!.id}`)
      const latestUserData = userResponse.user || userResponse
      
      const completeUserData = {
        ...userStore.user!,
        ...latestUserData
      }
      
      userStore.updateUser(completeUserData)
      ElMessage.success('用户信息保存成功')
    } catch (apiError) {
      console.warn('保存到数据库失败，仅更新本地存储:', apiError)
      const updatedUser = { ...userStore.user!, ...updatedUserData }
      userStore.updateUser(updatedUser)
      ElMessage.success('用户信息保存成功（本地）')
    }
  } catch (error) {
    console.error('保存用户信息失败:', error)
    ElMessage.error('保存用户信息失败')
  } finally {
    saveLoading.value = false
  }
}

// 编辑用户名
const handleEditUsername = async () => {
  try {
    const { value } = await ElMessageBox.prompt('请输入新的用户名', '修改用户名', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputValue: userStore.user?.username || '',
      inputValidator: (value: string) => {
        if (!value) return '用户名不能为空'
        if (value.length < 2) return '用户名至少2个字符'
        if (value.length > 20) return '用户名最多20个字符'
        return true
      }
    })
    
    saveLoading.value = true
    
    try {
      // 直接调用用户更新API
      const updateData = {
        username: value,
        email: userStore.user!.email,
        role: userStore.user!.role,
        avatar: userStore.user!.avatar
      }
      
      const response = await api.put(`/users/${userStore.user!.id}`, updateData)
      
      if (response.success) {
        // 重新获取用户信息
        await userStore.initializeUser()
        ElMessage.success('用户名修改成功')
      } else {
        ElMessage.error(response.message || '用户名修改失败')
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '用户名修改失败'
      ElMessage.error(errorMessage)
    }
  } catch (error) {
    console.error('修改用户名失败:', error)
    if (error !== 'cancel') {
      ElMessage.error('修改用户名失败')
    }
  } finally {
    saveLoading.value = false
  }
}

// 修改密码 - 显示对话框
const handleChangePassword = () => {
  // 清空表单
  passwordForm.currentPassword = ''
  passwordForm.newPassword = ''
  passwordForm.confirmPassword = ''
  showPasswordDialog.value = true
}

// 保存密码修改
const handleSavePassword = async () => {
  if (!passwordFormRef.value) return
  
  const valid = await passwordFormRef.value.validate().catch(() => false)
  if (!valid) return
  
  passwordLoading.value = true
  
  try {
    const response = await api.put(`/users/${userStore.user!.id}/password`, {
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword
    })
    
    if (response.success) {
      ElMessage.success('密码修改成功')
      showPasswordDialog.value = false
      passwordForm.currentPassword = ''
      passwordForm.newPassword = ''
      passwordForm.confirmPassword = ''
    } else {
      ElMessage.error(response.message || '密码修改失败')
    }
  } catch (error: any) {
    const errorMessage = error.response?.data?.message || error.message || '密码修改失败'
    ElMessage.error(errorMessage)
  } finally {
    passwordLoading.value = false
  }
}

// 加载用户店铺权限
const loadUserShops = async () => {
  try {
    const user = userStore.user
    if (!user) return
    
    const response = await api.get(`/users/${user.id}/shops`)
    userShops.value = response.shops || []
  } catch (error) {
    console.error('获取用户店铺权限失败:', error)
    // 降级到用户信息中的店铺数据
    if (userStore.user?.shops) {
      userShops.value = userStore.user.shops
    }
  }
}

// 初始化
onMounted(() => {
  const user = userStore.user
  if (user) {
    userForm.username = user.username || ''
    userForm.email = user.email || ''
  }
  
  loadUserShops()
})
</script>

<style lang="scss" scoped>
.user-settings-container {
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
    font-size: 16px;
    font-weight: 400;
    color: #333;
  }
  
  .placeholder {
    width: 32px;
  }
}

// 用户信息卡片
.profile-card {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  
  .avatar-section {
    position: relative;
    margin-right: 20px;
    
    .avatar-container {
      position: relative;
      cursor: pointer;
      
      .avatar-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.3s;
        
        svg {
          color: white;
          font-size: 24px;
        }
      }
      
      &:hover .avatar-overlay {
        opacity: 1;
      }
    }
    
    .remove-avatar-btn {
      position: absolute;
      top: -5px;
      right: -5px;
      width: 20px;
      height: 20px;
      border: none;
      background: #ff4757;
      color: white;
      border-radius: 50%;
      cursor: pointer;
      font-size: 12px;
    }
  }
  
  .user-info {
    flex: 1;
    
    .username {
      font-size: 20px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }
    
    .role {
      font-size: 14px;
      color: #666;
      margin-bottom: 4px;
    }
    
    .user-id {
      font-size: 12px;
      color: #999;
    }
  }
}

// 状态卡片
.status-card {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  
  .status-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 15px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .status-label {
      font-size: 14px;
      color: #666;
    }
    
    .license-status {
      text-align: right;
      
      .remaining-days {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
      }
    }
    
    .login-time, .shops-count {
      font-size: 14px;
      color: #333;
    }
  }
}

// 店铺卡片
.shops-card {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  
  .shops-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
    gap: 15px;
    margin-top: 15px;
    
    .shop-item {
      text-align: center;
      
      .shop-icon {
        width: 40px;
        height: 40px;
        background: #007AFF;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 8px;
        
        svg {
          color: white;
          font-size: 20px;
        }
      }
      
      .shop-name {
        font-size: 12px;
        color: #333;
        margin-bottom: 4px;
      }
      
      .shop-city {
        font-size: 11px;
        color: #999;
      }
    }
  }
}

// 信息卡片
.info-card {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

// 信息列表
.info-list {
  .info-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 0;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: #f9f9f9;
      margin: 0 -20px;
      padding-left: 20px;
      padding-right: 20px;
    }
    
    .info-label {
      font-size: 16px;
      color: #333;
      font-weight: 500;
    }
    
    .info-value {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: #666;
      
      .placeholder {
        color: #999;
        font-size: 13px;
      }
      
      .arrow-icon {
        margin-left: 8px;
        color: #ccc;
        font-size: 14px;
      }
      
      .license-status {
        text-align: right;
        
        .remaining-days {
          font-size: 12px;
          color: #999;
          margin-top: 4px;
        }
      }
      
      .time-text {
        font-size: 14px;
        color: #666;
      }
    }
  }
}

// 编辑卡片
.edit-card {
  margin: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-input) {
  height: 44px;
  
  .el-input__wrapper {
    border-radius: 8px;
  }
}

:deep(.el-button) {
  height: 44px;
  border-radius: 8px;
}

// 头像选择弹窗样式
:deep(.avatar-picker-dialog) {
  .el-dialog {
    border-radius: 8px;
  }
  
  .el-dialog__header {
    padding: 20px;
    border-bottom: 1px solid #f0f0f0;
    
    .el-dialog__title {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }
  }
  
  .el-dialog__body {
    padding: 0;
  }
  
  .el-dialog__footer {
    padding: 20px;
    border-top: 1px solid #f0f0f0;
  }
}

.picker-list {
  .picker-item {
    display: flex;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
    cursor: pointer;
    transition: background-color 0.2s ease;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background-color: #f9f9f9;
    }
    
    &.delete-item {
      color: #ff4757;
      
      .item-icon {
        color: #ff4757;
      }
    }
    
    .item-icon {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      color: #666;
      font-size: 16px;
    }
    
    .item-label {
      font-size: 15px;
      color: #333;
    }
  }
}
</style>