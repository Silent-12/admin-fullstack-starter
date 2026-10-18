import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants.js'
import type { Response } from 'express'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { AdminAuthService } from './admin-auth.service.js'
import type { AdminAuthRequest } from '../../../types/admin-auth.js'
import type { ApiDefinition } from '../../../types/api-resource.js'
import { isAdminControllerPath } from '../../../common/auth/admin-route.util.js'
import { RbacService } from '../../rbac/admin/rbac.service.js'
import { ApiResourceService } from '../../api-resource/admin/api-resource.service.js'

/**
 * 后台默认认证守卫
 * @description 根据已匹配处理方法执行身份与接口授权校验，未登记的后台接口拒绝访问
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly apiResources: ApiResourceService,
    private readonly rbac: RbacService,
  ) {}

  /**
   * 校验后台请求认证
   * @description 从实际处理方法读取策略，验证身份后实时查询角色授权；公开接口显式放行，后台响应禁止缓存
   * @param context 执行上下文，提供路由元数据、请求与响应对象
   * @returns 是否允许请求继续处理
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp()
    const request = http.getRequest<AdminAuthRequest>()
    if (!isAdminControllerPath(Reflect.getMetadata(PATH_METADATA, context.getClass()))) return true

    http.getResponse<Response>().setHeader('Cache-Control', 'no-store')
    const definition = this.getApiDefinition(context.getHandler())
    if (definition.access === 'public') return true

    const authorization = await this.authenticateRequest(request)
    if (definition.access === 'permission') this.assertApiPermission(definition.code, authorization.apiCodes)
    return true
  }

  /**
   * 获取已登记的后台接口定义
   * @description 未登记的处理方法一律拒绝访问，避免后台接口漏配安全策略
   * @param handler Nest 已匹配的实际处理方法
   * @returns 当前处理方法对应的接口定义
   * @throws ForbiddenException 处理方法未登记
   */
  private getApiDefinition(handler: object): ApiDefinition {
    const definition = this.apiResources.getDefinition(handler)
    if (!definition) throw new ForbiddenException('无权限访问该接口')
    return definition
  }

  /**
   * 验证请求身份并加载当前授权
   * @description 校验长度受限的 Bearer 令牌后写入请求上下文，供 Controller 和后续权限检查使用
   * @param request 当前后台请求
   * @returns 当前用户的实时授权
   * @throws UnauthorizedException 缺少、格式错误或无效的访问令牌
   */
  private async authenticateRequest(request: AdminAuthRequest) {
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')
    if (!match || match[1]!.length > 2048) throw new UnauthorizedException('请先登录')

    const { user, claims } = await this.auth.authenticate(match[1]!)
    request.adminUser = user
    request.adminClaims = claims
    const authorization = await this.rbac.getAuthorization(user.id)
    request.adminAuthorization = authorization
    return authorization
  }

  /**
   * 检查当前用户是否拥有接口权限
   * @description 所有后台业务接口统一按角色资源绑定的接口编码授权，不存在超级管理员旁路
   * @param code 当前接口编码
   * @param apiCodes 当前用户已授权的接口编码
   * @throws ForbiddenException 当前用户未获授权
   */
  private assertApiPermission(code: string, apiCodes: string[]): void {
    if (!apiCodes.includes(code)) throw new ForbiddenException('无权限访问该接口')
  }
}
