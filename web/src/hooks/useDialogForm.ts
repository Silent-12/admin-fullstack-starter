/**
 * 弹窗表单状态骨架
 */
import { computed, nextTick, ref, watch, type Ref, type WritableComputedRef } from 'vue'
import { ElMessage } from 'element-plus'
import { useLatestRequest } from './useLatestRequest'

/**
 * 弹窗表单引用
 * @description 仅声明清理旧校验所需的最小能力
 */
export interface DialogFormHandle {
  // 仅清理校验状态，不修改表单数据
  clearValidate: () => void
}

/**
 * 弹窗表单配置
 * @description 由调用方提供数据加载、业务校验与保存请求，骨架统一处理显隐、加载与提交状态
 */
export interface UseDialogFormOptions<T extends object> {
  // 弹窗是否打开
  open: () => boolean
  // 写回关闭状态
  close: () => void
  // 创建空白表单
  createForm: () => T
  // 可选表单引用，用于在模型重置后清理旧校验
  formRef?: Ref<DialogFormHandle | undefined>
  // 打开时加载数据，返回 false 表示放弃本次打开
  load?: (form: Ref<T>, isCurrent: () => boolean) => Promise<boolean | void>
  // 提交前业务校验，返回 false 阻止保存
  validate?: (form: T) => boolean
  // 保存请求，失败时保留输入
  submit: (form: T) => Promise<void>
  // 保存成功提示，默认“保存成功”
  successMessage?: string
  // 保存成功回调，可继续刷新列表
  success?: () => void | Promise<void>
  // 打开或关闭时清理页面专属状态
  reset?: () => void
}

/**
 * 弹窗表单状态
 * @description 提供表单模型、显隐、加载与提交状态以及保存方法
 */
export interface DialogForm<T extends object> {
  // 表单模型
  form: Ref<T>
  // 弹窗显隐
  visible: WritableComputedRef<boolean>
  // 数据加载状态
  loading: Ref<boolean>
  // 数据就绪状态，未就绪时禁止保存
  ready: Ref<boolean>
  // 保存提交状态
  busy: Ref<boolean>
  // 校验后保存
  save: () => Promise<void>
}

/**
 * @description 创建弹窗表单骨架，关闭弹窗使旧请求失效，保存失败保留输入
 * @param options 弹窗显隐、表单初值、数据加载与保存配置。
 * @return 弹窗表单状态与保存方法。
 */
export function useDialogForm<T extends object>(options: UseDialogFormOptions<T>): DialogForm<T> {
  /** 表单与加载、提交状态 */
  const form = ref(options.createForm()) as Ref<T>
  const loading = ref(false)
  const ready = ref(false)
  const busy = ref(false)
  // 请求代次，关闭或重新打开时使旧请求失效
  const request = useLatestRequest()
  const visible = computed({
    get: () => options.open(),
    set: (value) => {
      if (!busy.value && !value) options.close()
    }
  })

  /**
   * @description 打开时重置并加载数据，关闭时使旧请求失效
   * @return 无返回值。
   */
  watch(options.open, async (open) => {
    const token = request.begin()
    ready.value = false
    options.reset?.()
    if (!open) return
    form.value = options.createForm()
    loading.value = true
    await nextTick()
    if (!request.isCurrent(token)) return
    options.formRef?.value?.clearValidate()
    try {
      const proceed = await options.load?.(form, () => request.isCurrent(token))
      if (!request.isCurrent(token) || proceed === false) return
      await nextTick()
      if (!request.isCurrent(token)) return
      options.formRef?.value?.clearValidate()
      ready.value = true
    } catch {
      /* 请求层统一显示错误，禁用保存 */
    } finally {
      if (request.isCurrent(token)) loading.value = false
    }
  })

  /**
   * @description 业务校验通过后提交表单，成功关闭弹窗并通知刷新列表
   * @return 无返回值。
   */
  const save = async (): Promise<void> => {
    if (busy.value || !ready.value) return
    if (options.validate && !options.validate(form.value)) return
    busy.value = true
    try {
      await options.submit(form.value)
      ElMessage.success(options.successMessage || '保存成功')
      options.close()
      await options.success?.()
    } catch {
      /* 保存失败保留输入以便重试 */
    } finally {
      busy.value = false
    }
  }

  return { form, visible, loading, ready, busy, save }
}
