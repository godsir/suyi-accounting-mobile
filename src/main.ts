import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useUserStore } from './store/user'

// Element Plus
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 样式文件
import './style.css'

const app = createApp(App)
const pinia = createPinia()

// 注册Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(ElementPlus)
app.use(pinia)
app.use(router)

// 初始化用户状态
const userStore = useUserStore()
userStore.init()

// 在已登录状态下，立即获取最新用户信息
if (userStore.isLoggedIn) {
  userStore.initializeUser().catch(error => {
    console.error('初始化用户状态失败:', error)
  })
}

app.mount('#app')
