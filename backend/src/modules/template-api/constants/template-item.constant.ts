/**
 * 模板条目状态常量
 * @description 模板条目状态的唯一真源：实体默认值、实体注释与各 DTO 的校验枚举均由此派生，
 * 避免同一组状态值在多处散落并互相矛盾
 */
export const TEMPLATE_ITEM_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  ARCHIVED: 'archived',
} as const

/** 模板条目状态的合法取值列表 */
export const TEMPLATE_ITEM_STATUS_VALUES: string[] = Object.values(TEMPLATE_ITEM_STATUS)
