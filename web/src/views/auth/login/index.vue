<!-- 登录页面 -->
<template>
  <div class="login-container">
    <LoginLeftView />

    <div class="login-right-side">
      <AuthTopBar />

      <div class="auth-right-wrap">
        <div class="form">
          <h3 class="title">欢迎回来</h3>
          <ElForm
            ref="formRef"
            :model="formData"
            :rules="rules"
            class="login-form"
            @submit.prevent="handleSubmit"
          >
            <ElFormItem prop="username">
              <ElInput
                class="custom-height"
                placeholder="请输入账号"
                aria-label="用户名"
                v-model.trim="formData.username"
                autocomplete="username"
                :maxlength="64"
              />
            </ElFormItem>
            <ElFormItem prop="password">
              <ElInput
                class="custom-height"
                placeholder="请输入密码"
                aria-label="密码"
                v-model="formData.password"
                type="password"
                autocomplete="current-password"
                :maxlength="128"
                show-password
              />
            </ElFormItem>

            <div class="actions">
              <ElButton
                class="submit-btn custom-height"
                type="primary"
                native-type="submit"
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
  import { reactive, ref } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { ElButton, ElForm, ElFormItem, ElInput } from 'element-plus'
  import { useUserStore } from '@/store/modules/user'
  import { HttpError } from '@/utils/http/error'
  import { fetchLogin } from '@/api/auth'
  import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
  import { getLoginRedirect } from '@/utils/navigation/login'
  import AuthTopBar from './components/AuthTopBar.vue'
  import LoginLeftView from './components/LoginLeftView.vue'

  defineOptions({ name: 'Login' })

  const userStore = useUserStore()
  const router = useRouter()
  const route = useRoute()

  // 表单引用与输入数据
  const formRef = ref<FormInstance>()

  const formData = reactive({
    username: '',
    password: ''
  })

  const rules: FormRules = {
    username: [
      { required: true, message: '请输入账号', trigger: 'blur' },
      { pattern: /^[a-zA-Z]{1,64}$/, message: '账号仅允许1至64位英文字母', trigger: 'blur' }
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { max: 128, message: '密码不能超过128位', trigger: 'blur' }
    ]
  }

  const loading = ref(false)

  /**
   * @description 提交登录表单
   */
  const handleSubmit = async (): Promise<void> => {
    if (loading.value || !formRef.value) return
    loading.value = true
    try {
      const valid = await formRef.value.validate().catch(() => false)
      if (!valid || !formData.username || !formData.password) return
      const { username, password } = formData
      const version = userStore.getSessionVersion()
      const { accessToken, expiresAt } = await fetchLogin({
        userName: username.toLowerCase(),
        password
      })
      if (version !== userStore.getSessionVersion()) return
      if (!accessToken || !Number.isSafeInteger(expiresAt) || expiresAt <= Date.now() / 1000)
        throw new Error('登录服务返回了无效凭证')
      userStore.setToken(accessToken, expiresAt)
      formData.password = ''
      const failure = await router.replace(getLoginRedirect(route.query.redirect))
      if (
        !failure &&
        userStore.isLogin &&
        !['Login', 'Exception500'].includes(String(router.currentRoute.value.name))
      )
        ElMessage.success('登录成功')
    } catch (error) {
      if (!(error instanceof HttpError)) ElMessage.error('登录失败，请稍后重试')
    } finally {
      loading.value = false
    }
  }
</script>

<style scoped lang="scss">
  /* 登录页根容器 */
  .login-container {
    display: flex;
    width: 100%;
    height: 100vh;
    background-color: var(--default-bg-color);
    .login-form {
      margin-top: 25px;
    }
    .actions {
      margin-top: 30px;
    }
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
    height: min(650px, 100dvh);
    padding-top: 5px;
    padding-bottom: 5px;
    margin: auto;
    overflow: auto;
    animation: slideInRight 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
    /* 响应式 max-sm: 最大宽度 39.99rem（默认字号下 639.84px） */
    @media (width <= 39.99rem) {
      width: 100%;
      padding-right: 28px;
      padding-left: 28px;
    }
    /* 响应式 max-md: 最大宽度 47.99rem（默认字号下 767.84px），禁用动画 */
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
        padding-top: 40px;
      }
    }
    /* 表单控件统一高度 */
    .custom-height {
      height: var(--login-input-height, 40px) !important;
    }
  }

  /* 提交按钮宽度 */
  .submit-btn {
    width: 100%;
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
