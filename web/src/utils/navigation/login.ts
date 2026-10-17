/**
 * @description 仅接受站内路由回跳，排除外站、反斜杠和登录页循环
 * @param redirect 路由查询参数
 * @returns 安全的目标路由
 */
export function getLoginRedirect(redirect: unknown): string {
  if (typeof redirect !== 'string' || !redirect.startsWith('/') || redirect.startsWith('//'))
    return '/'
  try {
    const decoded = decodeURIComponent(redirect)
    if (
      decoded.includes('\\') ||
      Array.from(decoded).some((character) => character.charCodeAt(0) <= 32) ||
      decoded.startsWith('//')
    )
      return '/'
    const target = new URL(redirect, window.location.origin)
    if (
      target.origin !== window.location.origin ||
      /^\/auth\/login(?:\/|$)/.test(decodeURIComponent(target.pathname))
    )
      return '/'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/'
  }
}
