/**
 * HTTP 限流策略常量。
 * @description 定义用户端全局请求限流与未知路由 404 封禁所需的窗口、阈值、封禁时长和 Redis key 前缀。
 */
export const THROTTLE_POLICY = {
  /** 用户端全局限流时间窗口，单位毫秒 */
  USER_API_WINDOW_MS: 10 * 1000,
  /** 用户端全局限流窗口内允许的最大请求次数 */
  USER_API_LIMIT: 30,
  /** 用户端全局限流超限封禁时长，单位秒 */
  USER_API_BLOCK_SECONDS: 10 * 60,
  /** 用户端全局限流 Redis key 前缀 */
  USER_API_KEY_PREFIX: 'user-api:',
  /** 未知路由 404 统计时间窗口，单位毫秒 */
  MISSING_ROUTE_WINDOW_MS: 30 * 1000,
  /** 未知路由 404 触发封禁所需的次数 */
  MISSING_ROUTE_TRIGGER_HITS: 5,
  /** 未知路由 404 超限封禁时长，单位秒 */
  MISSING_ROUTE_BLOCK_SECONDS: 24 * 60 * 60,
  /** 未知路由 404 Redis key 前缀 */
  MISSING_ROUTE_KEY_PREFIX: 'missing-route:',
  /** 未知路由 404 限流器名称 */
  MISSING_ROUTE_THROTTLER_NAME: 'missing-route',
  /** 对外统一限流提示 */
  MESSAGE: '当前操作频率过快，请稍后再试',
}
