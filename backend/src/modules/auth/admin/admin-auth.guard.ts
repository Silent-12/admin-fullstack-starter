import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PATH_METADATA } from '@nestjs/common/constants.js'
import type { Response } from 'express'
import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { AdminAuthService } from './admin-auth.service.js'
import type { AdminAuthRequest } from '../../../types/admin-auth.js'

/**
 * 后台默认认证守卫
 * @description 作为全局守卫保护所有版本的后台路径，仅登录端点允许匿名访问
 */
@Injectable()
export class AdminAuthGuard implements CanActivate {
  constructor(private readonly auth: AdminAuthService) {}

  /**
   * 校验后台请求认证
   * @description 识别当前控制器是否属于后台路径：非后台路径直接放行；后台路径校验 Bearer JWT 并把已验证的用户与令牌声明写入请求上下文，
   * 登录端点除外。后台认证端点统一设置 `Cache-Control: no-store`，避免响应被缓存
   * @param context 执行上下文，提供路由元数据、请求与响应对象
   * @returns 是否允许请求继续处理
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AdminAuthRequest>()
    // 基于已匹配 Controller 的元数据识别后台，避免大小写、编码和代理前缀绕过。
    const path = Reflect.getMetadata(PATH_METADATA, context.getClass()) as string | string[] | undefined
    const paths = typeof path === 'string' ? [path] : (path ?? [])
    if (!paths.some((value) => /^\/?v\d+\/admin(?:\/|$)/i.test(value))) return true
    // 后台认证端点统一禁止缓存；登录端点放行，其余端点继续校验令牌
    if (paths.includes('v1/admin/auth')) context.switchToHttp().getResponse<Response>().setHeader('Cache-Control', 'no-store')
    if (paths.includes('v1/admin/auth') && context.getHandler().name === 'login' && request.method === 'POST') return true
    // 其余后台端点必须携带长度受限的 Bearer 令牌
    const match = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')
    if (!match || match[1]!.length > 2048) throw new UnauthorizedException('请先登录')
    const { user, claims } = await this.auth.authenticate(match[1]!)
    request.adminUser = user
    request.adminClaims = claims
    return true
  }
}
