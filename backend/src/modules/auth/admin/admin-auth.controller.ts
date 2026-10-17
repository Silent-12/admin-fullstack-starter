import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import { ApiResponseDto } from '../../../common/dto/api-response.dto.js'
import { getClientIp } from '../../../common/utils/client-ip.util.js'
import { getDefaultErrorMessage } from '../../../common/utils/error-message.util.js'
import type { AdminAuthRequest } from '../../../types/admin-auth.js'
import { AdminAuthService } from './admin-auth.service.js'
import { LoginThrottleService } from './login-throttle.service.js'
import { LoginDto } from './dto/login.dto.js'

/**
 * 后台认证控制器
 * @description 提供后台登录、当前用户信息与全端登出接口，路径统一为 `v1/admin/auth`；
 * 响应只包含当前流程所需的最小业务字段，不暴露实体或内部认证字段
 */
@ApiTags('后台认证')
@Controller('v1/admin/auth')
export class AdminAuthController {
  constructor(
    private readonly auth: AdminAuthService,
    private readonly throttle: LoginThrottleService,
  ) {}

  /**
   * 用户登录
   * @description 校验用户名与密码后签发访问令牌，并原子记录本次成功登录；同一 IP 与账号的尝试频率由登录限流服务控制，
   * 触发限流时通过 `Retry-After` 响应头返回等待秒数
   * @param dto 登录参数，包含用户名与密码
   * @param request HTTP 请求，用于解析客户端 IP
   * @param response HTTP 响应，用于写入限流响应头
   * @returns 登录结果，`data` 为访问令牌与过期时间（Unix 秒）
   */
  @Post('login')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '用户登录' })
  @ApiResponse({ status: 200, description: '登录成功，data 为 { accessToken, expiresAt }', type: ApiResponseDto })
  @ApiResponse({ status: 400, description: '登录参数格式错误' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  @ApiResponse({ status: 429, description: '尝试过于频繁，Retry-After 表示等待秒数' })
  @ApiResponse({ status: 503, description: getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE) })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ApiResponseDto<{ accessToken: string; expiresAt: number }>> {
    const ip = getClientIp(request)
    await this.throttle.check(ip, dto.userName, response)
    return ApiResponseDto.success(await this.auth.login(dto, ip))
  }

  /**
   * 获取当前用户信息
   * @description 返回认证守卫写入请求上下文的当前用户最小展示资料，`userId` 为 UUID；`auth` 与 `roles` 当前为空数组
   * @param request 已通过认证的请求，包含当前用户与令牌声明
   * @returns 当前用户展示资料，包含 `userId`、`userName`、`name`、`email`、`avatar`、`auth` 与 `roles`
   */
  @Get('profile')
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({ status: 200, description: '当前用户的最小展示资料，userId 为 UUID', type: ApiResponseDto })
  @ApiResponse({ status: 401, description: '未登录或令牌已失效' })
  @ApiResponse({ status: 503, description: getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE) })
  profile(@Req() request: AdminAuthRequest): ApiResponseDto<{
    userId: string
    userName: string
    name: string
    email: string | null
    avatar: string | null
    auth: string[]
    roles: string[]
  }> {
    const user = request.adminUser
    return ApiResponseDto.success({
      userId: user.id,
      userName: user.username,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      auth: [],
      roles: [],
    })
  }

  /**
   * 用户全端登出
   * @description 递增令牌版本使该用户全部已签发令牌失效，并保留最近登录时间与 IP 供审计
   * @param request 已通过认证的请求，包含当前用户与令牌声明
   * @returns 空数据响应，`data` 为 null
   */
  @Post('logout')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户全端登出' })
  @ApiResponse({ status: 200, description: '全部旧令牌已撤销，data 为 null', type: ApiResponseDto })
  @ApiResponse({ status: 401, description: '令牌已经失效' })
  @ApiResponse({ status: 503, description: getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE) })
  async logout(@Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.auth.logout(request.adminClaims.sub, request.adminClaims.ver)
    return ApiResponseDto.success(null)
  }
}
