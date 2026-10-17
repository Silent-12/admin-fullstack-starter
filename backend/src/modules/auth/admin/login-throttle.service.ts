import { HttpException, HttpStatus, Injectable, Logger, OnModuleInit, ServiceUnavailableException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import type { Response } from 'express'
import { getDefaultErrorMessage } from '../../../common/utils/error-message.util.js'
import { RedisService } from '../../../common/redis/redis.service.js'

const SCRIPT = `
local remaining = 0
for i = 1, 2 do
  local hits = redis.call('INCR', KEYS[i])
  if hits == 1 then redis.call('EXPIRE', KEYS[i], 60) end
  if hits > tonumber(ARGV[i]) then
    local wait = math.max(1, math.ceil(redis.call('PTTL', KEYS[i]) / 1000))
    remaining = math.max(remaining, wait)
  end
end
return remaining
`

/**
 * 登录独立限流服务
 * @description IP 与账号两个共享窗口均需通过；Redis 故障时拒绝认证，不降级放行
 */
@Injectable()
export class LoginThrottleService implements OnModuleInit {
  private readonly logger = new Logger(LoginThrottleService.name)

  constructor(private readonly redis: RedisService) {}

  /**
   * 检查限流依赖
   * @description 认证模块启用时要求 Redis 已开启并连接，否则拒绝启动
   */
  onModuleInit(): void {
    if (!this.redis.isAvailable()) throw new Error('后台认证要求启用 Redis 并确保连接可用')
  }

  /**
   * 检查登录尝试频率
   * @description 在密码计算前执行 IP 与账号双窗口限流，超限时通过 `Retry-After` 响应头返回等待秒数；Redis 故障时拒绝认证
   * @param ip 客户端 IP
   * @param username 登录用户名
   * @param response HTTP 响应，用于写入限流响应头
   */
  async check(ip: string, username: string, response: Response): Promise<void> {
    let retryAfter: number
    try {
      const client = this.redis.getClient()
      if (!this.redis.isAvailable() || !client) throw new Error('Redis unavailable')
      const hash = (value: string): string => createHash('sha256').update(value).digest('hex')
      retryAfter = Number(await client.eval(SCRIPT, 2, `admin-login:ip:${hash(ip)}`, `admin-login:user:${hash(username)}`, 30, 5))
    } catch {
      this.logger.error('登录限流存储不可用')
      throw new ServiceUnavailableException(getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE))
    }
    if (retryAfter > 0) {
      response.setHeader('Retry-After', retryAfter)
      throw new HttpException('登录尝试过于频繁，请稍后再试', 429)
    }
  }
}
