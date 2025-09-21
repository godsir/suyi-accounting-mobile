<template>
  <div class="shop-settings-container">
    <!-- 头部导航 -->
    <div class="settings-header">
      <button class="back-btn" @click="handleGoBack">
        <ArrowLeft />
      </button>
      <div class="header-title">店铺管理</div>
      <button class="add-btn" @click="handleAddShop" v-if="canManageShops">
        <Plus />
      </button>
    </div>

    <!-- 店铺列表 -->
    <div class="section">
      <div class="section-title">{{ canManageShops ? '店铺管理' : '我的店铺' }}</div>
      <div class="shop-list" v-if="displayShops.length > 0">
        <div 
          class="shop-item" 
          v-for="shop in displayShops" 
          :key="shop.id"
          @click="handleSelectShop(shop)"
        >
          <div class="shop-icon">
            <Shop />
          </div>
          <div class="shop-info">
            <div class="shop-name">{{ shop.name }}</div>
            <div class="shop-location">{{ shop.city }}</div>
            <div class="current-tag" v-if="shop.id === currentShopId">当前店铺</div>
          </div>
          <div class="shop-actions" v-if="canManageShops">
            <button class="edit-btn" @click.stop="handleEditShop(shop)">
              <Edit />
            </button>
            <button class="delete-btn" @click.stop="handleDeleteShop(shop)">
              <Delete />
            </button>
          </div>
        </div>
      </div>
      
      <div class="empty-state" v-else>
        <div class="empty-text">暂无店铺信息</div>
        <div class="empty-desc">{{ canManageShops ? '点击右上角+号添加店铺' : '请联系管理员添加店铺或分配权限' }}</div>
      </div>
    </div>

    <!-- 添加/编辑店铺对话框 -->
    <el-dialog 
      v-model="showShopDialog" 
      :title="editingShop ? '编辑店铺' : '添加店铺'"
      width="90%"
      :show-close="false"
    >
      <el-form ref="shopFormRef" :model="shopForm" :rules="shopRules" label-position="top">
        <el-form-item label="店铺名称" prop="name">
          <el-input 
            v-model="shopForm.name" 
            placeholder="请输入店铺名称"
          />
        </el-form-item>
        
        <el-form-item label="所在城市" prop="city">
          <el-select 
            v-model="shopForm.city" 
            placeholder="请选择城市"
            style="width: 100%"
          >
            <el-option value="北京">北京</el-option>
            <el-option value="上海">上海</el-option>
            <el-option value="包头">包头</el-option>
            <el-option value="广州">广州</el-option>
            <el-option value="深圳">深圳</el-option>
            <el-option value="杭州">杭州</el-option>
            <el-option value="成都">成都</el-option>
            <el-option value="武汉">武汉</el-option>
            <el-option value="西安">西安</el-option>
          </el-select>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showShopDialog = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSaveShop"
            :loading="saveLoading"
          >
            {{ saveLoading ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, ElForm } from 'element-plus'
import { 
  ArrowLeft,
  Shop,
  Plus,
  Edit,
  Delete,
  Check
} from '@element-plus/icons-vue'
import { api } from '@/api'
import { useUserStore } from '@/store/user'

const router = useRouter()
const userStore = useUserStore()
const shopFormRef = ref<InstanceType<typeof ElForm>>()

// 店铺数据
const userShops = ref<any[]>([])
const allShops = ref<any[]>([])
const currentShopId = ref<number | null>(null)

// 对话框状态
const showShopDialog = ref(false)
const editingShop = ref<any>(null)
const saveLoading = ref(false)

// 表单数据
const shopForm = reactive({
  name: '',
  city: ''
})

// 表单验证规则
const shopRules = {
  name: [
    { required: true, message: '请输入店铺名称', trigger: 'blur' }
  ],
  city: [
    { required: true, message: '请输入城市名称', trigger: 'blur' }
  ]
}

// 权限判断 - 只有超级管理员可以管理店铺
const canManageShops = computed(() => {
  const user = userStore.user
  return user && user.role === 'super_admin'
})

// 显示的店铺列表
const displayShops = computed(() => {
  // 只有超级管理员显示所有店铺，其他用户（包括普通管理员）只显示有权限的店铺
  return canManageShops.value ? allShops.value : userShops.value
})

// 返回设置页面
const handleGoBack = () => {
  router.push('/settings')
}

// 选择店铺
const handleSelectShop = (shop: any) => {
  currentShopId.value = shop.id
  localStorage.setItem('currentShopId', shop.id.toString())
  ElMessage.success(`已切换到 ${shop.name}`)
}

// 添加店铺
const handleAddShop = () => {
  editingShop.value = null
  shopForm.name = ''
  shopForm.city = ''
  showShopDialog.value = true
}

// 编辑店铺
const handleEditShop = (shop: any) => {
  editingShop.value = shop
  shopForm.name = shop.name
  shopForm.city = shop.city
  showShopDialog.value = true
}

// 删除店铺
const handleDeleteShop = async (shop: any) => {
  try {
    await ElMessageBox.confirm(
      `确认删除店铺 "${shop.name}" 吗？此操作不可恢复。`,
      '删除确认',
      {
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    
    await api.delete(`/shops/${shop.id}`)
    ElMessage.success('店铺删除成功')
    await loadShops()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('删除店铺失败:', error)
      const errorMessage = error.response?.data?.message || error.message || '删除失败'
      ElMessage.error(errorMessage)
    }
  }
}

// 保存店铺
const handleSaveShop = async () => {
  if (!shopFormRef.value) return
  
  const valid = await shopFormRef.value.validate().catch(() => false)
  if (!valid) return

  saveLoading.value = true
  
  try {
    if (editingShop.value) {
      // 编辑店铺
      await api.put(`/shops/${editingShop.value.id}`, shopForm)
      ElMessage.success('店铺更新成功')
    } else {
      // 添加店铺
      await api.post('/shops', shopForm)
      ElMessage.success('店铺添加成功')
    }
    
    showShopDialog.value = false
    await loadShops()
  } catch (error: any) {
    console.error('保存店铺失败:', error)
    const errorMessage = error.response?.data?.message || error.message || '保存失败'
    ElMessage.error(errorMessage)
  } finally {
    saveLoading.value = false
  }
}

// 加载店铺数据
const loadShops = async () => {
  try {
    const user = userStore.user
    if (!user) return

    // 获取用户的店铺权限
    try {
      const response = await api.get(`/users/${user.id}/shops`)
      userShops.value = response.shops || []
    } catch (error) {
      console.error('获取用户店铺权限失败:', error)
      // 降级到用户信息中的店铺数据
      if (user.shops && user.shops.length > 0) {
        userShops.value = user.shops
      } else {
        userShops.value = []
      }
    }

    // 如果是管理员，获取所有店铺
    if (canManageShops.value) {
      try {
        const shops = await api.get('/shops')
        allShops.value = Array.isArray(shops) ? shops : []
      } catch (error) {
        console.error('获取所有店铺失败:', error)
        allShops.value = []
      }
    }

    // 获取当前选中的店铺ID
    const savedShopId = localStorage.getItem('currentShopId')
    if (savedShopId) {
      currentShopId.value = parseInt(savedShopId)
    } else if (userShops.value.length > 0) {
      // 如果没有保存的店铺ID，默认选择第一个
      currentShopId.value = userShops.value[0].id
      localStorage.setItem('currentShopId', currentShopId.value.toString())
    }
  } catch (error) {
    console.error('加载店铺数据失败:', error)
    ElMessage.error('加载店铺数据失败')
  }
}

// 初始化
onMounted(() => {
  loadShops()
})
</script>

<style lang="scss" scoped>
.shop-settings-container {
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
  
  .add-btn {
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    cursor: pointer;
    font-size: 18px;
    color: #007AFF;
  }
}

// 区域
.section {
  margin-top: 20px;
  
  .section-title {
    font-size: 14px;
    color: #999;
    margin-bottom: 8px;
    padding: 0 20px;
  }
}

// 店铺列表
.shop-list {
  background: white;
  
  .shop-item {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    border-bottom: 1px solid #f0f0f0;
    
    &:last-child {
      border-bottom: none;
    }
    
    .shop-icon {
      width: 40px;
      height: 40px;
      background: #007AFF;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 15px;
      
      svg {
        color: white;
        width: 20px;
        height: 20px;
      }
    }
    
    .shop-info {
      flex: 1;
      
      .shop-name {
        font-size: 16px;
        color: #333;
        margin-bottom: 4px;
      }
      
      .shop-location {
        font-size: 14px;
        color: #999;
        margin-bottom: 4px;
      }
      
      .current-tag {
        display: inline-block;
        padding: 2px 8px;
        background: #007AFF;
        color: white;
        font-size: 12px;
        border-radius: 12px;
      }
      
      .user-count {
        font-size: 13px;
        color: #999;
      }
    }
    
    .edit-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      cursor: pointer;
      
      svg {
        color: #999;
        width: 16px;
        height: 16px;
      }
    }
    
    .shop-actions {
      display: flex;
      gap: 8px;
      
      .edit-btn, .delete-btn {
        width: 32px;
        height: 32px;
        border: none;
        background: transparent;
        cursor: pointer;
        
        svg {
          width: 16px;
          height: 16px;
        }
      }
      
      .edit-btn svg {
        color: #999;
      }
      
      .delete-btn svg {
        color: #ff4757;
      }
    }
  }
}

// 空状态
.empty-state {
  background: white;
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

// 对话框
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-dialog) {
  border-radius: 12px;
  
  .el-dialog__body {
    padding: 20px;
  }
}
</style>
