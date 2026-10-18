/**
 * 判断 Controller 路径是否属于后台接口
 * @description 识别以 `/v数字/admin` 开头的路由，支持单个路径或路径数组
 * @param value Nest Controller 的路径元数据
 * @returns 是否包含后台接口路径
 */
export function isAdminControllerPath(value: unknown): boolean {
  const paths = typeof value === 'string' ? [value] : Array.isArray(value) ? value : []
  return paths.some((path) => typeof path === 'string' && /^\/?v\d+\/admin(?:\/|$)/i.test(path))
}
