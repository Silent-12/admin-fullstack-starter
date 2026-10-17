<!-- 顶部栏用户菜单：头像与用户名触发 + 个人资料入口与登出 -->
<!-- 由 AoAdminLayout 经 #user-avatar 插槽注入；用户数据与登出逻辑由模板 user store 持有 -->
<template>
  <ElPopover
    ref="popoverRef"
    placement="bottom-end"
    :width="170"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
    popper-style="padding: 12px 16px;"
  >
    <template #reference>
      <div class="user-menu-trigger">
        <!-- 关闭点击预览，避免与 hover 弹层交互冲突 -->
        <AoImage class="trigger-avatar" :src="avatar" :preview-src-list="[]" fit="cover" />
        <span class="name">{{ info.name || info.userName }}</span>
      </div>
    </template>
    <template #default>
      <div class="user-menu">
        <ul class="list">
          <li class="item" @click="showProfile">
            <AoSvgIcon icon="ri:user-3-line" />
            <span>个人资料</span>
          </li>
        </ul>
        <div class="log-out" @click="handleLogout">退出登录</div>
      </div>
    </template>
  </ElPopover>

  <UserProfileDialog v-model:visible="profileVisible" />
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { ElMessageBox, ElPopover } from 'element-plus'
  import { AoSvgIcon } from '@ao/admin-components'
  import AoImage from '@/components/media/AoImage.vue'
  import UserProfileDialog from './UserProfileDialog.vue'
  import { useUserStore } from '@/store/modules/user'
  import defaultAvatar from '@imgs/avatar/avatar.svg'
  import { fetchLogout } from '@/api/auth'
  import { isHttpError } from '@/utils/http/error'

  defineOptions({ name: 'UserMenu' })

  const userStore = useUserStore()
  // 用户信息：顶部头像与用户名
  const { info } = storeToRefs(userStore)

  /** 头像地址：后端未返回头像时回退到默认头像 */
  const avatar = computed(() => info.value.avatar || defaultAvatar)

  // 用户菜单弹出层实例
  const popoverRef = ref()
  // 个人资料弹窗显示状态
  const profileVisible = ref(false)
  // 登出进行中标记，避免确认框与撤销请求期间重复提交
  const loggingOut = ref(false)

  /**
   * @description 收起用户菜单并展示当前用户的只读资料
   */
  const showProfile = (): void => {
    popoverRef.value?.hide()
    profileVisible.value = true
  }

  /**
   * @description 关闭用户菜单弹出层
   */
  const closePopover = (): void => {
    setTimeout(() => {
      popoverRef.value?.hide()
    }, 100)
  }

  /**
   * @description 二次确认后调用后端撤销该账号全部令牌，再清理本地会话；401 降级为本地清理，其他失败保留登录态以便重试
   */
  const handleLogout = async (): Promise<void> => {
    if (loggingOut.value) return
    loggingOut.value = true
    closePopover()
    try {
      await ElMessageBox.confirm('退出后，此账号所有设备的登录都将失效，是否继续？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'login-out-dialog'
      })
    } catch {
      loggingOut.value = false
      return
    }
    const version = userStore.getSessionVersion()
    try {
      await fetchLogout()
      if (version === userStore.getSessionVersion()) userStore.clearSession()
    } catch (error) {
      if (isHttpError(error) && error.code === 401 && version === userStore.getSessionVersion())
        userStore.clearSession()
      // 其他失败已由请求层提示，保留登录态以便重试。
    } finally {
      loggingOut.value = false
    }
  }
</script>

<style scoped lang="scss">
  // 头像与用户名共同触发弹层，外侧间距由布局包统一提供
  .user-menu-trigger {
    display: flex;
    gap: 8px;
    align-items: center;
    cursor: pointer;

    .trigger-avatar {
      flex-shrink: 0;
      width: 34px;
      height: 34px;
      border-radius: 9999px;

      @media (width <= 39.99rem) {
        width: 26px;
        height: 26px;
      }
    }

    .name {
      max-width: 128px;
      font-size: 0.875rem;
      line-height: 1.25rem;
      color: var(--ao-gray-700);
      @include ellipsis;

      @media (width <= 39.99rem) {
        max-width: 80px;
      }
    }
  }

  // 用户菜单弹层
  .user-menu {
    display: flex;
    flex-direction: column;
    gap: 8px;

    .list {
      padding: 0 0 8px;
      margin: 0;
      list-style: none;
      border-bottom: 1px solid color-mix(in srgb, var(--ao-gray-300) 80%, transparent);
    }

    // 菜单项
    .item {
      display: flex;
      align-items: center;
      padding: 8px;
      cursor: pointer;
      user-select: none;
      border-radius: 6px;

      span {
        font-size: 0.875rem;
        line-height: 1.25rem;
      }

      :deep(.ao-svg-icon) {
        margin-right: 8px;
        font-size: 16px;
        line-height: 24px;
      }

      &:hover {
        background-color: var(--ao-gray-200);
      }
    }

    // 退出登录按钮
    .log-out {
      padding-top: 6px;
      padding-bottom: 6px;
      font-size: 0.75rem;
      line-height: 1rem;
      text-align: center;
      cursor: pointer;
      border: 1px solid var(--ao-gray-400);
      border-radius: 6px;
      transition-duration: 200ms;
      transition-property: all;

      &:hover {
        box-shadow:
          0 20px 25px -5px var(--ao-shadow-10),
          0 8px 10px -6px var(--ao-shadow-10);
      }
    }
  }
</style>
