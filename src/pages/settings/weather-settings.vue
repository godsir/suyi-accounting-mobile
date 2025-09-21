<template>
  <div class="weather-settings-container">
    <!-- 头部导航 -->
    <div class="settings-header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="header-title">天气API设置</div>
      <div class="placeholder"></div>
    </div>

    <!-- 设置内容 -->
    <div class="settings-content">
      <!-- 现有配置列表 -->
      <div class="settings-section" v-if="configs.length > 0">
        <div class="section-title">已配置的API</div>
        <div class="config-list">
          <div 
            v-for="config in configs" 
            :key="config.id" 
            class="config-item"
            :class="{ active: config.enabled }"
          >
            <div class="config-info">
              <div class="config-header">
                <div class="provider-info">
                  <div class="provider-name">{{ getProviderName(config.provider) }}</div>
                  <div class="config-status">
                    <el-switch
                      v-model="config.enabled"
                      size="small"
                      @change="handleToggleConfig(config)"
                    />
                  </div>
                </div>
              </div>
              
              <div class="config-details">
                <div class="api-key">API密钥: {{ config.api_key }}</div>
                <div class="priority" v-if="config.priority > 0">优先级: {{ config.priority }}</div>
                <div class="description" v-if="config.description">{{ config.description }}</div>
              </div>
              
              <div class="config-actions">
                <el-button 
                  type="primary"
                  size="large"
                  @click="handleTestConfig(config)"
                  :disabled="!config.enabled"
                  class="action-btn test-btn"
                >
                  测试
                </el-button>
                <el-button 
                  type="danger"
                  size="large"
                  @click="handleDeleteConfig(config.id)"
                  class="action-btn delete-btn"
                >
                  删除
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加新配置 -->
      <div class="settings-section">
        <div class="section-title">
          {{ configs.length > 0 ? '添加新配置' : '配置天气API' }}
        </div>
        <div class="form-container">
          <el-form ref="weatherFormRef" :model="weatherForm" :rules="weatherRules" label-position="top">
            <!-- API提供商选择 -->
            <el-form-item label="API提供商" prop="provider">
              <el-select 
                v-model="weatherForm.provider" 
                placeholder="请选择API提供商"
                @change="handleProviderChange"
                size="large"
              >
                <el-option
                  v-for="provider in weatherProviders"
                  :key="provider.value"
                  :label="provider.label"
                  :value="provider.value"
                >
                  <div class="provider-option">
                    <div class="provider-label">{{ provider.label }}</div>
                    <div class="provider-desc">{{ provider.description }}</div>
                  </div>
                </el-option>
              </el-select>
            </el-form-item>
            
            <!-- API密钥 -->
            <el-form-item label="API密钥" prop="api_key">
              <el-input 
                v-model="weatherForm.api_key" 
                type="password"
                placeholder="请输入API密钥"
                show-password
                size="large"
              />
            </el-form-item>
            
            <!-- API主机地址（仅Meteostat需要） -->
            <el-form-item 
              label="API主机地址" 
              prop="api_host"
              v-if="weatherForm.provider === 'meteostat'"
            >
              <el-input 
                v-model="weatherForm.api_host" 
                placeholder="如：meteostat.p.rapidapi.com"
                size="large"
              />
              <div class="form-tip">
                Meteostat通过RapidAPI提供服务，需要填写主机地址
              </div>
            </el-form-item>
            
            <!-- 优先级和启用状态 -->
            <div class="form-section">
              <div class="section-label">基本设置</div>
              <div class="form-row-compact">
                <div class="form-item-half">
                  <el-form-item label="优先级" prop="priority">
                    <el-input-number 
                      v-model="weatherForm.priority" 
                      :min="0"
                      :max="100"
                      placeholder="0"
                      size="large"
                      style="width: 100%;"
                    />
                  </el-form-item>
                  <div class="form-tip">数字越大优先级越高</div>
                </div>
                
                <div class="form-item-half">
                  <div class="switch-container">
                    <div class="switch-label">启用配置</div>
                    <el-switch
                      v-model="weatherForm.enabled"
                      size="default"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <!-- 描述信息 -->
            <el-form-item label="描述信息" prop="description">
              <el-input 
                v-model="weatherForm.description" 
                type="textarea"
                :rows="3"
                placeholder="可选，描述此配置的用途或备注信息"
                maxlength="200"
                show-word-limit
                size="large"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 配置说明 -->
      <div class="settings-section">
        <div class="section-title">配置说明</div>
        <div class="info-container">
          <div class="info-item">
            <div class="info-title">高德地图</div>
            <div class="info-desc">需要到高德开放平台申请Web服务API密钥</div>
          </div>
          <div class="info-item">
            <div class="info-title">OpenWeatherMap</div>
            <div class="info-desc">到openweathermap.org注册获取免费API密钥</div>
          </div>
          <div class="info-item">
            <div class="info-title">Meteostat</div>
            <div class="info-desc">通过RapidAPI平台订阅，需要填写API主机地址</div>
          </div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <el-button 
          size="large" 
          @click="handleReset"
          class="reset-btn"
        >
          重置表单
        </el-button>
        <el-button 
          type="primary" 
          size="large" 
          @click="handleSave"
          :loading="saveLoading"
          class="save-btn"
        >
          {{ saveLoading ? '保存中...' : '保存配置' }}
        </el-button>
      </div>
    </div>

    <!-- 测试弹窗 -->
    <el-dialog
      v-model="testDialogVisible"
      title="测试天气API配置"
      width="400px"
    >
      <el-form label-position="top">
        <el-form-item label="测试城市">
          <el-input 
            v-model="testCity" 
            placeholder="如：北京、上海、广州"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="testDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="handleConfirmTest"
          :loading="testLoading"
        >
          {{ testLoading ? '测试中...' : '开始测试' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElForm } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'

const router = useRouter()
const weatherFormRef = ref<InstanceType<typeof ElForm>>()

// 配置列表
const configs = ref<any[]>([])

// 天气服务提供商
const weatherProviders = [
  { value: 'amap', label: '高德地图', description: '高德开放平台天气API，支持中国城市' },
  { value: 'openweather', label: 'OpenWeatherMap', description: '国际天气API，支持全球城市' },
  { value: 'meteostat', label: 'Meteostat', description: '历史天气数据API，支持历史天气查询' }
]

// 表单数据
const weatherForm = reactive({
  provider: '',
  api_key: '',
  api_host: '',
  enabled: true,
  priority: 0,
  description: ''
})

// 表单验证规则
const weatherRules = {
  provider: [
    { required: true, message: '请选择API提供商', trigger: 'change' }
  ],
  api_key: [
    { required: true, message: '请输入API密钥', trigger: 'blur' }
  ]
}

// 其他数据
const testCity = ref('北京')
const testLoading = ref(false)
const saveLoading = ref(false)
const testDialogVisible = ref(false)
const testingConfig = ref<any>(null)

// 获取提供商名称
const getProviderName = (provider: string) => {
  const providerInfo = weatherProviders.find(p => p.value === provider)
  return providerInfo?.label || provider
}

// 返回设置页面
const handleGoBack = () => {
  router.push('/settings')
}

// 处理提供商变化
const handleProviderChange = (provider: string) => {
  // 清空API主机地址，只有meteostat需要
  if (provider !== 'meteostat') {
    weatherForm.api_host = ''
  }
}

// 切换配置启用状态
const handleToggleConfig = async (config: any) => {
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))
    ElMessage.success(`配置已${config.enabled ? '启用' : '禁用'}`)
    // 这里应该调用实际的API来更新状态
  } catch (error) {
    ElMessage.error('操作失败，请重试')
    // 回滚状态
    config.enabled = !config.enabled
  }
}

// 测试配置
const handleTestConfig = (config: any) => {
  testingConfig.value = config
  testCity.value = '北京'
  testDialogVisible.value = true
}

// 确认测试
const handleConfirmTest = async () => {
  if (!testCity.value) {
    ElMessage.warning('请输入测试城市名称')
    return
  }

  testLoading.value = true
  
  try {
    // 模拟API测试调用
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // 模拟测试结果
    ElMessageBox.alert(
      `API配置测试成功！\n城市: ${testCity.value}\n温度: ${Math.floor(Math.random() * 30) + 5}°C\n天气: 晴`,
      '测试结果',
      { type: 'success' }
    )
    
    testDialogVisible.value = false
  } catch (error) {
    ElMessage.error('测试失败，请检查配置')
  } finally {
    testLoading.value = false
  }
}

// 删除配置
const handleDeleteConfig = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除此配置吗？', '确认删除', {
      type: 'warning'
    })
    
    // 模拟删除操作
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 从列表中移除
    const index = configs.value.findIndex(c => c.id === id)
    if (index > -1) {
      configs.value.splice(index, 1)
    }
    
    ElMessage.success('配置删除成功')
  } catch (error) {
    // 用户取消或其他错误
  }
}

// 保存配置
const handleSave = async () => {
  if (!weatherFormRef.value) return
  
  const valid = await weatherFormRef.value.validate().catch(() => false)
  if (!valid) return

  // 检查是否已存在相同提供商的配置
  const existingConfig = configs.value.find(c => c.provider === weatherForm.provider)
  if (existingConfig) {
    ElMessage.error(`已存在 ${getProviderName(weatherForm.provider)} 的配置，请先删除或修改现有配置`)
    return
  }

  saveLoading.value = true
  
  try {
    // 模拟保存过程
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 添加到配置列表
    const newConfig = {
      id: Date.now(),
      ...weatherForm,
      api_key: weatherForm.api_key.length > 8 
        ? weatherForm.api_key.substring(0, 4) + '••••••••' + weatherForm.api_key.substring(weatherForm.api_key.length - 4)
        : '••••••••',
      createdAt: new Date().toISOString()
    }
    configs.value.push(newConfig)
    
    // 重置表单
    handleReset()
    
    ElMessage.success('天气API配置保存成功')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

// 重置表单
const handleReset = () => {
  weatherFormRef.value?.resetFields()
  Object.assign(weatherForm, {
    provider: '',
    api_key: '',
    api_host: '',
    enabled: true,
    priority: 0,
    description: ''
  })
  ElMessage.info('表单已重置')
}

// 初始化
onMounted(() => {
  // 模拟从本地存储或API获取现有配置
  const savedConfigs = localStorage.getItem('weatherApiConfigs')
  if (savedConfigs) {
    try {
      configs.value = JSON.parse(savedConfigs)
    } catch (error) {
      console.error('读取天气API配置失败:', error)
    }
  }
  
  // 也可以添加一些示例配置
  if (configs.value.length === 0) {
    configs.value = [
      {
        id: 1,
        provider: 'amap',
        api_key: 'demo••••••••key1',
        api_host: '',
        enabled: true,
        priority: 1,
        description: '高德地图API配置',
        createdAt: '2024-01-01T00:00:00.000Z'
      }
    ]
  }
})
</script>

<style lang="scss" scoped>
.weather-settings-container {
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

// 服务提供商选择
.provider-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  
  .provider-group {
    width: 100%;
    
    .provider-item {
      margin-bottom: 20px;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .provider-radio {
        width: 100%;
        height: auto;
        margin-right: 0;
        
        :deep(.el-radio__label) {
          width: 100%;
          padding-left: 10px;
        }
      }
      
      .provider-info {
        .provider-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
          margin-bottom: 4px;
        }
        
        .provider-desc {
          font-size: 14px;
          color: #666;
          margin-bottom: 6px;
        }
        
        .provider-url {
          font-size: 12px;
        }
      }
    }
  }
}

// 配置列表
.config-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  
  .config-item {
    background: white;
    border-radius: 10px;
    padding: 20px;
    border: 2px solid transparent;
    
    &.active {
      border-color: #409eff;
    }
    
    .config-info {
      .config-header {
        margin-bottom: 15px;
        
        .provider-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .provider-name {
            font-size: 18px;
            font-weight: 600;
            color: #333;
          }
          
          .config-status {
            display: flex;
            align-items: center;
          }
        }
      }
      
      .config-details {
        font-size: 13px;
        color: #666;
        margin-bottom: 20px;
        line-height: 1.6;
        
        .api-key {
          font-family: monospace;
          margin-bottom: 4px;
        }
        
        .priority {
          margin-bottom: 4px;
        }
        
        .description {
          font-style: italic;
        }
      }
      
      .config-actions {
        display: flex;
        gap: 12px;
        
        .action-btn {
          flex: 1;
          height: 48px;
          border-radius: 10px;
          font-size: 16px;
          font-weight: 500;
          
          &.test-btn {
            &:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
          }
          
          &.delete-btn {
            background-color: #f56c6c;
            border-color: #f56c6c;
            
            &:hover {
              background-color: #f78989;
              border-color: #f78989;
            }
            
            &:active {
              background-color: #dd6161;
              border-color: #dd6161;
            }
          }
        }
      }
    }
  }
}

// 表单容器
.form-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  
  .form-section {
    margin: 25px 0;
    
    .section-label {
      font-size: 15px;
      font-weight: 600;
      color: #333;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 1px solid #f0f0f0;
    }
  }
  
  .form-row-compact {
    display: flex;
    gap: 15px;
    align-items: flex-start;
    
    .form-item-half {
      flex: 1;
      
      .form-tip {
        font-size: 12px;
        color: #999;
        margin-top: 6px;
        line-height: 1.4;
      }
    }
  }
  
  .switch-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60px;  // 与input高度对齐
    
    .switch-label {
      font-size: 14px;
      font-weight: 500;
      color: #333;
      margin-bottom: 10px;
    }
  }
  
  .form-tip {
    font-size: 12px;
    color: #666;
    margin-top: 8px;
    line-height: 1.5;
    padding: 8px 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 3px solid #409eff;
  }
  
  .provider-option {
    .provider-label {
      font-weight: 500;
      margin-bottom: 2px;
    }
    
    .provider-desc {
      font-size: 12px;
      color: #999;
      line-height: 1.2;
    }
  }
  
  :deep(.el-form-item) {
    margin-bottom: 20px;
    
    .el-form-item__label {
      font-weight: 500;
      color: #333;
      margin-bottom: 8px;
      font-size: 14px;
    }
    
    .el-input {
      height: 48px;
      
      .el-input__wrapper {
        border-radius: 8px;
        padding: 0 15px;
      }
    }
    
    .el-textarea {
      .el-textarea__inner {
        border-radius: 8px;
        padding: 12px 15px;
        line-height: 1.5;
      }
    }
    
    .el-select {
      width: 100%;
      
      .el-select__wrapper {
        border-radius: 8px;
        height: 48px;
        padding: 0 15px;
      }
    }
    
    .el-input-number {
      width: 100%;
      
      .el-input-number__wrapper {
        border-radius: 8px;
        height: 48px;
      }
    }
  }
}

// 信息容器
.info-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  
  .info-item {
    margin-bottom: 15px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .info-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      margin-bottom: 4px;
    }
    
    .info-desc {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
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
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
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

// 更新频率
.frequency-container {
  background: white;
  border-radius: 10px;
  padding: 20px;
  
  .frequency-group {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    
    :deep(.el-radio) {
      margin-right: 0;
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
  
  .test-result {
    margin-top: 10px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    
    .weather-info {
      .weather-main {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 10px;
        
        .temperature {
          font-size: 24px;
          font-weight: 600;
          color: #4facfe;
        }
        
        .weather {
          font-size: 16px;
          color: #333;
        }
      }
      
      .weather-details {
        display: flex;
        gap: 20px;
        
        .detail-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          font-size: 14px;
          
          span:first-child {
            color: #999;
          }
          
          span:last-child {
            color: #333;
            font-weight: 500;
          }
        }
      }
    }
  }
}

// 操作按钮
.action-buttons {
  display: flex;
  gap: 12px;
  margin-top: 30px;
  
  .reset-btn {
    flex: 1;
    height: 50px;
    border-radius: 10px;
    font-size: 15px;
    font-weight: 500;
    border: 1px solid #dcdfe6;
    background: white;
    color: #606266;
    
    &:hover {
      border-color: #c0c4cc;
      background: #f5f7fa;
    }
    
    &:active {
      transform: scale(0.98);
    }
  }
  
  .save-btn {
    flex: 1;
    height: 50px;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    background: linear-gradient(135deg, #409eff 0%, #66b3ff 100%);
    border: none;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
    
    &:hover {
      background: linear-gradient(135deg, #66b3ff 0%, #409eff 100%);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
      transform: translateY(-1px);
    }
    
    &:active {
      transform: translateY(0) scale(0.98);
      box-shadow: 0 2px 6px rgba(64, 158, 255, 0.3);
    }
    
    &:disabled {
      background: #a0cfff;
      box-shadow: none;
      transform: none;
      cursor: not-allowed;
    }
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
  
  .provider-container,
  .form-container,
  .frequency-container,
  .test-container {
    padding: 15px;
  }
  
  .frequency-group {
    flex-direction: column;
    gap: 10px;
  }
  
  .action-buttons {
    gap: 10px;
    
    .reset-btn, .save-btn {
      height: 44px;
      font-size: 14px;
    }
  }
  
  .weather-details {
    justify-content: space-around;
  }
}
</style>