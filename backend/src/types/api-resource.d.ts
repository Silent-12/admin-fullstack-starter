/**
 * 接口访问策略
 * @description public 允许匿名，authenticated 仅校验身份，permission 需要角色接口授权
 */
export type ApiAccess = 'public' | 'authenticated' | 'permission'

/**
 * 接口登记元数据
 * @description 代码维护接口身份与访问策略，展示信息允许通过接口清单调整
 */
export interface AdminApiMetadata {
  // 稳定且唯一的接口编码
  code: string
  // 模块默认名称
  module: string
  // 功能默认名称
  feature: string
  // 操作默认名称
  action: string
  // 可选的访问策略，默认需要角色接口授权
  access?: ApiAccess
}

/**
 * 当前运行版本的接口定义
 * @description 安全字段来自实际处理方法，不能由数据库展示配置覆盖
 */
export interface ApiDefinition {
  // 稳定接口编码
  code: string
  // 模块名称
  module: string
  // 功能名称
  feature: string
  // 操作名称
  action: string
  // HTTP 方法
  method: string
  // 不含可配置全局前缀的路由模板
  path: string
  // 接口访问策略
  access: ApiAccess
}

/**
 * 接口清单展示项
 * @description 在实际接口定义上合并持久化的展示分组与排序配置
 */
export interface ApiResourceItem extends ApiDefinition {
  // 展示顺序
  sort: number
}

/**
 * 可绑定接口项
 * @description 供角色资源选择可授权接口，仅包含识别接口与展示分组所需字段
 */
export interface ApiBindableItem {
  // 稳定接口编码
  code: string
  // 模块名称
  module: string
  // 功能名称
  feature: string
  // 操作名称
  action: string
  // HTTP 方法
  method: string
  // 不含可配置全局前缀的路由模板
  path: string
}
