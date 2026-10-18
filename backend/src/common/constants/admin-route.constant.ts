/** 后台菜单路由契约；公共路由名称与前端 publicRoutes 保持一致 */
export const ADMIN_ROUTE_POLICY = {
  reservedNames: ['Login', 'Exception403', 'Exception500', 'Outside', 'Iframe', 'Exception404'],
  // 菜单仅支持规范化静态路径，不接受参数、正则、编码或空路径段。
  pathPattern: /^\/?[A-Za-z0-9_-]+(?:\/[A-Za-z0-9_-]+)*$/,
}
