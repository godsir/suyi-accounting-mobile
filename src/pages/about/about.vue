<template>
  <div class="about-container">
    <!-- 头部导航 -->
    <div class="header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="title">关于我们</div>
      <div class="placeholder"></div>
    </div>

    <!-- 应用介绍 -->
    <div class="app-info">
      <div class="app-logo">
        <div class="logo-icon">
          <TrendCharts />
        </div>
      </div>
      <div class="app-name">Suyi账务管理手机端</div>
      <div class="app-version">版本 {{ appVersion }}</div>
      <div class="app-description">
        专业的店铺账务管理系统，帮助您轻松记录和管理店铺的收支情况，提供详细的数据统计和分析功能。
      </div>
    </div>

    <!-- 功能特色 -->
    <div class="features-section">
      <div class="section-title">功能特色</div>
      <div class="features-list">
        <div class="feature-item">
          <div class="feature-icon income">
            <Money />
          </div>
          <div class="feature-content">
            <div class="feature-title">收入管理</div>
            <div class="feature-desc">支持多种收入类型记录，包括现金、微信、美团等多个平台</div>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon expense">
            <ShoppingCart />
          </div>
          <div class="feature-content">
            <div class="feature-title">支出记录</div>
            <div class="feature-desc">灵活的支出项目管理，支持智能文本解析功能</div>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon stats">
            <PieChart />
          </div>
          <div class="feature-content">
            <div class="feature-title">数据统计</div>
            <div class="feature-desc">提供详细的收支统计图表，帮助分析经营状况</div>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon weather">
            <Sunny />
          </div>
          <div class="feature-content">
            <div class="feature-title">天气信息</div>
            <div class="feature-desc">集成天气API，为营业决策提供天气参考</div>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon email">
            <Message />
          </div>
          <div class="feature-content">
            <div class="feature-title">邮件报告</div>
            <div class="feature-desc">自动生成周报、月报，支持邮件发送功能</div>
          </div>
        </div>
        
        <div class="feature-item">
          <div class="feature-icon multi-shop">
            <Shop />
          </div>
          <div class="feature-content">
            <div class="feature-title">多店铺管理</div>
            <div class="feature-desc">支持多个店铺的独立管理和权限控制</div>
          </div>
        </div>
      </div>
    </div>


    <!-- 联系信息 -->
    <div class="contact-section">
      <div class="section-title">联系我们</div>
      <div class="contact-list">
        <div class="contact-item" @click="handleContact('email')">
          <div class="contact-icon">
            <Message />
          </div>
          <div class="contact-content">
            <div class="contact-label">邮箱联系</div>
            <div class="contact-value">1765423700@qq.com</div>
          </div>
          <div class="contact-arrow">
            <ArrowRight />
          </div>
        </div>
        
      </div>
    </div>

    <!-- 版权信息 -->
    <div class="footer">
      <div class="copyright">© 2025 Suyi Technology Co.,Ltd.</div>
      <div class="rights">保留所有权利</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { 
  ArrowLeft,
  ArrowRight,
  TrendCharts,
  Money,
  ShoppingCart,
  PieChart,
  Sunny,
  Message,
  Shop,
  Phone,
  Link
} from '@element-plus/icons-vue'

const router = useRouter()

// 应用信息
const appVersion = ref('1.0.0')
const buildTime = ref('')

// 返回上一页
const handleGoBack = () => {
  router.go(-1)
}

// 处理联系方式点击
const handleContact = (type: string) => {
  switch (type) {
    case 'email':
      // 复制邮箱到剪贴板
      if (navigator.clipboard) {
        navigator.clipboard.writeText('support@suyi.com')
        ElMessage.success('邮箱地址已复制到剪贴板')
      } else {
        ElMessage.info('邮箱：support@suyi.com')
      }
      break
    case 'phone':
      // 复制电话到剪贴板
      if (navigator.clipboard) {
        navigator.clipboard.writeText('400-123-4567')
        ElMessage.success('电话号码已复制到剪贴板')
      } else {
        ElMessage.info('电话：400-123-4567')
      }
      break
    case 'website':
      // 复制网址到剪贴板
      if (navigator.clipboard) {
        navigator.clipboard.writeText('www.suyi.com')
        ElMessage.success('网址已复制到剪贴板')
      } else {
        ElMessage.info('网址：www.suyi.com')
      }
      break
  }
}

// 获取构建时间
const getBuildTime = () => {
  // 这里可以从环境变量或配置文件中获取构建时间
  const now = new Date()
  buildTime.value = now.toLocaleString('zh-CN')
}

// 获取应用版本
const getAppVersion = () => {
  // 这里可以从package.json或环境变量中获取版本号
  try {
    // 模拟从配置中获取版本号
    appVersion.value = '1.0.0'
  } catch (error) {
    appVersion.value = '1.0.0'
  }
}

onMounted(() => {
  getBuildTime()
  getAppVersion()
})
</script>

<style lang="scss" scoped>
.about-container {
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

// 应用介绍
.app-info {
  background: white;
  text-align: center;
  padding: 40px 20px;
  margin: 20px;
  border-radius: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  .app-logo {
    margin-bottom: 20px;
    
    .logo-icon {
      width: 64px;
      height: 64px;
      background: #f0f0f0;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto;
      
      svg {
        font-size: 28px;
        color: #666;
      }
    }
  }
  
  .app-name {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    margin-bottom: 8px;
  }
  
  .app-version {
    font-size: 16px;
    color: #999;
    margin-bottom: 20px;
  }
  
  .app-description {
    font-size: 16px;
    line-height: 1.6;
    color: #666;
    max-width: 320px;
    margin: 0 auto;
  }
}

// 功能特色
.features-section,
.tech-section,
.contact-section {
  margin: 20px;
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f0f2f5;
}

.features-list {
  .feature-item {
    display: flex;
    align-items: flex-start;
    margin-bottom: 20px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .feature-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      flex-shrink: 0;
      background: #f0f0f0;
      
      svg {
        font-size: 20px;
        color: #666;
      }
    }
    
    .feature-content {
      flex: 1;
      
      .feature-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
        margin-bottom: 4px;
      }
      
      .feature-desc {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
      }
    }
  }
}

// 技术栈
.tech-list {
  .tech-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f2f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    .tech-name {
      font-size: 15px;
      color: #666;
    }
    
    .tech-value {
      font-size: 15px;
      font-weight: 500;
      color: #333;
    }
  }
}

// 联系信息
.contact-list {
  .contact-item {
    display: flex;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid #f0f2f5;
    cursor: pointer;
    transition: background-color 0.3s;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background: #f9f9f9;
      margin: 0 -20px;
      padding-left: 20px;
      padding-right: 20px;
    }
    
    &:active {
      background: #f0f2f5;
    }
    
    .contact-icon {
      width: 40px;
      height: 40px;
      background: #f0f2f5;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 16px;
      
      svg {
        font-size: 18px;
        color: #666;
      }
    }
    
    .contact-content {
      flex: 1;
      
      .contact-label {
        font-size: 16px;
        font-weight: 500;
        color: #333;
        margin-bottom: 2px;
      }
      
      .contact-value {
        font-size: 14px;
        color: #666;
      }
    }
    
    .contact-arrow {
      svg {
        font-size: 16px;
        color: #ccc;
      }
    }
  }
}

// 版权信息
.footer {
  text-align: center;
  padding: 40px 20px 20px;
  color: #999;
  
  .copyright {
    font-size: 14px;
    margin-bottom: 4px;
  }
  
  .rights {
    font-size: 13px;
    margin-bottom: 8px;
  }
  
  .build-info {
    font-size: 12px;
    opacity: 0.7;
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
  
  .app-info {
    padding: 30px 15px;
    
    .app-name {
      font-size: 24px;
    }
    
    .app-version {
      font-size: 14px;
    }
    
    .app-description {
      font-size: 14px;
    }
  }
  
  .features-section,
  .tech-section,
  .contact-section {
    margin: 15px;
    padding: 15px;
  }
  
  .section-title {
    font-size: 16px;
  }
  
  .feature-item {
    .feature-icon {
      width: 36px;
      height: 36px;
      margin-right: 12px;
      
      svg {
        font-size: 18px;
      }
    }
    
    .feature-content {
      .feature-title {
        font-size: 15px;
      }
      
      .feature-desc {
        font-size: 13px;
      }
    }
  }
}
</style>