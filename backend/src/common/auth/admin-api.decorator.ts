import { SetMetadata } from '@nestjs/common'
import type { CustomDecorator } from '@nestjs/common'
import type { AdminApiMetadata } from '../../types/api-resource.js'

/** 接口身份元数据键 */
export const ADMIN_API_METADATA = 'admin:api'

/**
 * 登记后端接口
 * @description 使用稳定编码绑定实际处理方法；后台接口必须使用本装饰器声明，未指定访问策略时要求角色接口授权
 * @param metadata 接口身份、分组与访问策略
 * @returns 接口元数据装饰器
 */
export function AdminApi(metadata: AdminApiMetadata): CustomDecorator<string> {
  return SetMetadata(ADMIN_API_METADATA, metadata)
}
