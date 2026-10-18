/**
 * 请求代次
 */
import { onBeforeUnmount } from 'vue'

/**
 * 请求代次状态
 * @description 集中“代次递增 + 只接受最后一次响应 + 卸载失效”的请求隔离逻辑
 */
export interface LatestRequest {
  // 开启新代次并返回本次请求令牌
  begin: () => number
  // 判断令牌是否仍为最后一次请求
  isCurrent: (token: number) => boolean
  // 使所有未完成请求失效
  invalidate: () => void
}

/**
 * @description 创建请求代次，开启新请求或组件卸载后旧响应自动失效
 * @return 代次开启、有效性判断与失效方法。
 */
export function useLatestRequest(): LatestRequest {
  // 请求代次，递增即表示此前的请求均已过期
  let generation = 0

  /**
   * @description 开启新代次，使此前未完成的请求失效
   * @return 本次请求令牌。
   */
  const begin = (): number => ++generation

  /**
   * @description 判断令牌是否仍属于最后一次请求
   * @param token 请求令牌。
   * @return 是否仍是最后一次请求。
   */
  const isCurrent = (token: number): boolean => token === generation

  /**
   * @description 使所有未完成请求失效
   * @return 无返回值。
   */
  const invalidate = (): void => {
    generation++
  }

  onBeforeUnmount(invalidate)

  return { begin, isCurrent, invalidate }
}
