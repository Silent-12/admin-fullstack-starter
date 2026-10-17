<!-- 当前用户的只读个人资料弹窗 -->
<template>
  <!-- 弹窗脱离顶部栏，避免继承顶部栏行高与层叠上下文 -->
  <Teleport to="body">
    <AoForm
      v-model="profileForm"
      v-model:visible="visible"
      title="个人资料"
      width="400px"
      align-center
      :items="profileItems"
      :span="24"
      label-width="70px"
      disabled
      :show-submit="false"
      cancel-text="关闭"
    >
      <template #avatar>
        <div class="user-profile">
          <AoImage class="avatar" :src="avatar" :preview-src-list="[]" fit="cover" />
        </div>
      </template>
    </AoForm>
  </Teleport>
</template>

<script setup lang="ts">
  import { computed, ref, watch } from 'vue'
  import { storeToRefs } from 'pinia'
  import { AoForm } from '@ao/admin-components'
  import type { FormItem } from '@ao/admin-components'
  import AoImage from '@/components/media/AoImage.vue'
  import { useUserStore } from '@/store/modules/user'
  import defaultAvatar from '@imgs/avatar/avatar.svg'

  defineOptions({ name: 'UserProfileDialog' })

  // 弹窗显示状态，由用户菜单通过 v-model 控制
  const visible = defineModel<boolean>('visible', { required: true })
  // 当前用户资料
  const { info } = storeToRefs(useUserStore())

  /** 头像地址：后端未返回头像时回退到默认头像 */
  const avatar = computed(() => info.value.avatar || defaultAvatar)

  // 个人资料表单：打开时从当前用户资料初始化，避免直接修改 Store
  const profileForm = ref({ userName: '', name: '', email: '' })
  // 个人资料表单项，统一使用单列布局与禁用输入框展示
  const profileItems: FormItem[] = [
    { label: '', key: 'avatar', span: 24 },
    { label: '用户名', key: 'userName', type: 'input', span: 24, props: { placeholder: '—' } },
    { label: '姓名', key: 'name', type: 'input', span: 24, props: { placeholder: '—' } },
    { label: '邮箱', key: 'email', type: 'input', span: 24, props: { placeholder: '—' } }
  ]

  /**
   * @description 每次打开弹窗时初始化当前用户的只读资料
   */
  watch(
    visible,
    (isVisible) => {
      if (!isVisible) return
      profileForm.value = {
        userName: info.value.userName || '',
        name: info.value.name || '',
        email: info.value.email || ''
      }
    },
    { immediate: true }
  )
</script>

<style scoped lang="scss">
  .user-profile {
    display: flex;
    justify-content: center;
    width: 100%;

    .avatar {
      width: 64px;
      height: 64px;
      border-radius: 9999px;
    }
  }
</style>
