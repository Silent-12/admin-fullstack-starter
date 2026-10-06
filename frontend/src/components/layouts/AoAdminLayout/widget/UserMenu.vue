<!-- 顶部栏用户菜单：头像触发 + 用户信息展示与登出 -->
<!-- 由 AoAdminLayout 经 #user-avatar 插槽注入；用户数据与登出逻辑由模板 user store 持有 -->
<template>
  <ElPopover
    ref="popoverRef"
    placement="bottom-end"
    :width="240"
    :hide-after="0"
    :offset="10"
    trigger="hover"
    :show-arrow="false"
    popper-class="user-menu-popover"
    popper-style="padding: 5px 16px;"
  >
    <template #reference>
      <!-- 关闭点击预览，避免与 hover 弹层交互冲突 -->
      <AoImage class="trigger-avatar" :src="avatar" :preview-src-list="[]" fit="cover" />
    </template>
    <template #default>
      <div class="user-menu">
        <div class="header">
          <AoImage class="avatar" :src="avatar" :preview-src-list="[]" fit="cover" />
          <div class="info">
            <span class="name">{{ info.userName }}</span>
            <span class="email">{{ info.email }}</span>
          </div>
        </div>
        <ul class="list">
          <li class="item" @click="showDevTip">
            <AoSvgIcon icon="ri:user-3-line" />
            <span>个人中心</span>
          </li>
          <div class="divider"></div>
          <div class="log-out" @click="handleLogout">退出登录</div>
        </ul>
      </div>
    </template>
  </ElPopover>
</template>

<script setup lang="ts">
  import { computed, ref } from 'vue'
  import { storeToRefs } from 'pinia'
  import { ElMessage, ElMessageBox, ElPopover } from 'element-plus'
  import { AoSvgIcon } from '@ao/admin-components'
  import AoImage from '@/components/media/AoImage.vue'
  import { useUserStore } from '@/store/modules/user'
  import defaultAvatar from '@imgs/avatar/avatar.webp'

  defineOptions({ name: 'UserMenu' })

  const userStore = useUserStore()
  // 用户信息：头像、用户名与邮箱
  const { info } = storeToRefs(userStore)

  /** 头像地址：后端未返回头像时回退到默认头像 */
  const avatar = computed(() => info.value.avatar || defaultAvatar)

  // 用户菜单弹出层实例
  const popoverRef = ref()

  /**
   * @description 展示用户中心占位提示
   */
  const showDevTip = (): void => {
    ElMessage.info('正在开发中')
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
   * @description 二次确认后退出登录
   */
  const handleLogout = (): void => {
    closePopover()
    setTimeout(() => {
      ElMessageBox.confirm('您是否要退出登录?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        customClass: 'login-out-dialog'
      }).then(() => {
        userStore.logOut()
      })
    }, 200)
  }
</script>

<style scoped lang="scss">
  // 头像（弹层触发器）：间距由布局包 .header-bar__user-avatar 容器统一提供，此处不再重复设置
  .trigger-avatar {
    width: 2.125rem;
    height: 2.125rem;
    cursor: pointer;
    border-radius: 9999px;
    @media (width <= 39.99rem) {
      width: 1.625rem;
      height: 1.625rem;
    }
  }

  // 用户菜单弹层
  .user-menu {
    padding-top: 0.75rem;

    .header {
      display: flex;
      align-items: center;
      padding-bottom: 0.25rem;
    }

    .avatar {
      width: 2.5rem;
      height: 2.5rem;
      margin-right: 0.75rem;
      overflow: hidden;
      border-radius: 9999px;
    }

    .info {
      width: calc(100% - 60px);
      height: 100%;
    }

    // 用户名
    .name {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      line-height: 1.25rem;
      color: var(--ao-gray-800);
      @include ellipsis;
    }

    // 邮箱
    .email {
      display: block;
      margin-top: 0.125rem;
      font-size: 0.75rem;
      line-height: 1rem;
      color: var(--ao-gray-500);
      @include ellipsis;
    }

    .list {
      padding-top: 1rem;
      padding-bottom: 1rem;
      margin-top: 0.75rem;
      border-top: 1px solid color-mix(in srgb, var(--ao-gray-300) 80%, transparent);
    }

    // 分割线
    .divider {
      width: 100%;
      height: 1px;
      margin-top: 0.5rem;
      margin-bottom: 0.5rem;
      background: color-mix(in srgb, var(--ao-gray-300) 80%, transparent);
    }

    // 菜单项
    .item {
      display: flex;
      align-items: center;
      padding: 0.5rem;
      margin-bottom: 0.75rem;
      cursor: pointer;
      user-select: none;
      border-radius: 0.375rem;

      span {
        font-size: 0.875rem;
        line-height: 1.25rem;
      }

      :deep(.ao-svg-icon) {
        margin-right: 0.5rem;
        font-size: 1rem;
        line-height: 1.5rem;
      }

      &:hover {
        background-color: var(--ao-gray-200);
      }
    }

    // 退出登录按钮
    .log-out {
      padding-top: 0.375rem;
      padding-bottom: 0.375rem;
      margin-top: 1.25rem;
      font-size: 0.75rem;
      line-height: 1rem;
      text-align: center;
      cursor: pointer;
      border: 1px solid var(--ao-gray-400);
      border-radius: 0.375rem;
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
