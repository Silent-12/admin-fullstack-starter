import type { ValueTransformer } from 'typeorm'

/**
 * 布尔列转换器
 * @description 数据库使用 `tinyint unsigned` 的 0/1 表达布尔值，读取时归一为布尔属性、写入时反向归一为 0/1；
 * 未赋值时保持 `undefined` 以沿用列默认值，避免隐式写入 0
 */
export const TINYINT_BOOLEAN_TRANSFORMER: ValueTransformer = {
  from: (value: number | string | null): boolean => Number(value) === 1,
  to: (value: boolean | null | undefined): number | null | undefined => (value === null || value === undefined ? value : value ? 1 : 0),
}
