<!-- 登录页面 -->
<template>
  <div class="login-container">
    <LoginLeftView />

    <div class="login-right-side">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">欢迎回来</h3>
          <p class="sub-title">输入您的账号和密码登录</p>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            @keyup.enter="handleSubmit"
            style="margin-top: 25px"
          >
            <ElFormItem prop="account">
              <ElSelect v-model="formData.account" @change="setupAccount">
                <ElOption
                  v-for="account in accounts"
                  :key="account.key"
                  :label="account.label"
                  :value="account.key"
                >
                  <span>{{ account.label }}</span>
                </ElOption>
              </ElSelect>
            </ElFormItem>
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                placeholder="请输入账号"
                v-model.trim="formData.username"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                placeholder="请输入密码"
                v-model.trim="formData.password"
                type="password"
                autocomplete="off"
                show-password
              />
            </ElFormItem>

            <div class="action-row remember-row">
              <ElCheckbox v-model="formData.rememberPassword">记住密码</ElCheckbox>
            </div>

            <div style="margin-top: 30px">
              <ElButton
                class="submit-btn custom-height"
                type="primary"
                @click="handleSubmit"
                :loading="loading"
              >
                登录
              </ElButton>
            </div>
          </ElForm>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { computed, onMounted, reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import {
    ElButton,
    ElCheckbox,
    ElForm,
    ElFormItem,
    ElInput,
    ElOption,
    ElSelect
  } from 'element-plus'
  import AppConfig from '@/config'
  import { useUserStore } from '@/store/modules/user'
  import { HttpError } from '@/utils/http/error'
  import { fetchLogin } from '@/api/auth'
  import { ElNotification, type FormInstance, type FormRules } from 'element-plus'
  import AuthTopBar from './components/AuthTopBar.vue'
  import LoginLeftView from './components/LoginLeftView.vue'
  import type { AccountKey, Account } from './types'

  defineOptions({ name: 'Login' })

  const accounts = computed<Account[]>(() => [
    {
      key: 'super',
      label: '超级管理员',
      userName: 'Super',
      password: '123456',
      roles: ['R_SUPER']
    },
    {
      key: 'admin',
      label: '管理员',
      userName: 'Admin',
      password: '123456',
      roles: ['R_ADMIN']
    },
    {
      key: 'user',
      label: '普通用户',
      userName: 'User',
      password: '123456',
      roles: ['R_USER']
    }
  ])

  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()

  const systemName = AppConfig.systemInfo.name
  const formRef = ref<FormInstance>()

  const formData = reactive({
    account: '',
    username: '',
    password: '',
    rememberPassword: true
  })

  const rules = computed<FormRules>(() => ({
    username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
    password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
  }))

  const loading = ref(false)

  onMounted(() => {
    setupAccount('super')
  })

  /**
   * @description 设置选中账号并填充用户名密码
   * @param key 账号标识
   */
  const setupAccount = (key: AccountKey): void => {
    const selectedAccount = accounts.value.find((account: Account) => account.key === key)
    formData.account = key
    formData.username = selectedAccount?.userName ?? ''
    formData.password = selectedAccount?.password ?? ''
  }

  /**
   * @description 提交登录表单
   */
  const handleSubmit = async (): Promise<void> => {
    if (!formRef.value) return

    try {
      // 表单验证
      const valid = await formRef.value.validate()
      if (!valid) return

      loading.value = true

      // 登录请求
      const { username, password } = formData

      const { token, refreshToken } = await fetchLogin({
        userName: username,
        password
      })

      // 验证token
      if (!token) {
        throw new Error('Login failed - no token received')
      }

      // 存储 token 和登录状态
      userStore.setToken(token, refreshToken)
      userStore.setLoginStatus(true)

      // 登录成功处理
      showLoginSuccessNotice()

      // 获取 redirect 参数，如果存在则跳转到指定页面，否则跳转到首页
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } catch (error) {
      // 处理 HttpError
      if (error instanceof HttpError) {
        // console.log(error.code)
      } else {
        // 处理非 HttpError
        // ElMessage.error('登录失败，请稍后重试')
        console.error('[Login] Unexpected error:', error)
      }
    } finally {
      loading.value = false
    }
  }

  /**
   * @description 登录成功后显示通知
   */
  const showLoginSuccessNotice = (): void => {
    setTimeout(() => {
      ElNotification({
        title: '登录成功',
        type: 'success',
        duration: 2500,
        zIndex: 10000,
        message: `欢迎回来, ${systemName}!`
      })
    }, 1000)
  }
</script>

<style scoped lang="scss">
  /* 登录页根容器 */
  .login-container {
    display: flex;
    width: 100%;
    height: 100vh;
    background-color: var(--default-bg-color);
  }

  /* 右侧区域容器 */
  .login-right-side {
    position: relative;
    flex: 1 1 0%;
  }

  /* 授权页右侧区域 */
  .auth-right-wrap {
    position: absolute;
    inset: 0;
    width: 440px;
    height: 650px;
    padding-top: 5px;
    padding-bottom: 5px;
    margin: auto;
    overflow: hidden;
    animation: slideInRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    /* 响应式 max-sm: 最大宽度 39.99rem（640px） */
    @media (width <= 39.99rem) {
      width: 100%;
      padding-right: 1.75rem;
      padding-left: 1.75rem;
    }
    /* 响应式 max-md: 最大宽度 47.99rem（768px），禁用动画 */
    @media (width <= 47.99rem) {
      animation: none;
    }
    /* 表单容器 */
    .form {
      height: 100%;
      padding-top: 40px;
      padding-bottom: 40px;
    }
    /* 标题 */
    .title {
      font-size: 2.25rem;
      font-weight: 600;
      line-height: 2.5rem;
      color: var(--ao-gray-900);
      /* 响应式 max-md：缩小标题字号 */
      @media (width <= 47.99rem) {
        font-size: 1.875rem;
        line-height: 2.25rem;
      }
      /* 响应式 max-sm：移动端增加顶部间距 */
      @media (width <= 39.99rem) {
        padding-top: 2.5rem;
      }
    }
    /* 副标题 */
    .sub-title {
      margin-top: 10px;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--ao-gray-600);
    }
    /* 表单控件统一高度 */
    .custom-height {
      height: var(--login-input-height, 40px) !important;
    }
  }

  /* 操作行样式 */
  .action-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    line-height: 1.25rem;
  }

  /* 记住密码行 */
  .remember-row {
    margin-top: 0.5rem;
  }

  /* 主题色链接 */
  .link-theme {
    color: var(--theme-color);
  }

  /* 提交按钮宽度 */
  .submit-btn {
    width: 100%;
  }

  /* Element Plus 选择器高度调整 */
  :deep(.el-select__wrapper) {
    height: var(--login-input-height, 40px) !important;
  }

  /* 滑入动画 */
  @keyframes slideInRight {
    from {
      opacity: 0;
      transform: translateX(30px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
</style>
