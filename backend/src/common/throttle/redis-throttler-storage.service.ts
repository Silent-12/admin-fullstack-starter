import { Injectable, Logger } from '@nestjs/common'
import { ThrottlerStorage } from '@nestjs/throttler'
import { RedisService } from '../redis/redis.service.js'

/**
 * 限流存储记录。
 * @description 对应 @nestjs/throttler 的 ThrottlerStorageRecord 接口。
 */
interface ThrottlerStorageRecord {
  totalHits: number
  timeToExpire: number
  isBlocked: boolean
  timeToBlockExpire: number
}

/** 计数器的 Redis key 前缀 */
const COUNTER_PREFIX = 'throttle:counter:'
/** 封禁标记的 Redis key 前缀 */
const BLOCK_PREFIX = 'throttle:block:'
/**
 * 限流 Lua 脚本。
 * @description 原子执行封禁检查、计数递增、窗口过期设置和超限封禁。
 * KEYS[1] 为封禁 key，KEYS[2] 为计数器 key；ARGV 依次为窗口毫秒数、次数上限与封禁秒数。
 * @returns [totalHits, timeToExpire(秒), isBlocked(0/1), timeToBlockExpire(秒)]
 */
const LUA_INCREMENT = `
-- 1. 检查封禁状态
local blocked = redis.call('GET', KEYS[1])
if blocked then
  local ttl = redis.call('PTTL', KEYS[1])
  return {0, 0, 1, ttl > 0 and math.ceil(ttl / 1000) or 0}
end
-- 2. 递增计数器（首次设置 TTL）
local hits = redis.call('INCR', KEYS[2])
if hits == 1 then redis.call('PEXPIRE', KEYS[2], tonumber(ARGV[1])) end
-- 3. 获取窗口剩余时间；超限时设置独立封禁标记
local ttl = redis.call('PTTL', KEYS[2])
if hits > tonumber(ARGV[2]) then
  redis.call('SETEX', KEYS[1], tonumber(ARGV[3]), '1')
  return {hits, math.max(math.ceil(ttl / 1000), 0), 1, tonumber(ARGV[3])}
end
return {hits, math.max(math.ceil(ttl / 1000), 0), 0, 0}
`

/**
 * Redis 固定窗口限流存储服务。
 * @description 替代 @nestjs/throttler 默认的内存存储，采用固定窗口与独立封禁标记；Redis 故障时降级放行。
 */
@Injectable()
export class RedisThrottlerStorageService implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStorageService.name)

  constructor(private readonly redisService: RedisService) {}

  /**
   * 递增限流计数。
   * @description 通过 Lua 脚本原子执行封禁检查、计数递增与封禁设置，返回 ThrottlerGuard 所需的状态。
   * @param key 限流键
   * @param ttl 窗口时长，毫秒
   * @param limit 窗口内最大请求数
   * @param blockDuration 封禁时长，毫秒
   * @param throttlerName 限流器名称（内部透传，未参与逻辑）
   * @returns 限流存储记录
   */
  async increment(key: string, ttl: number, limit: number, blockDuration: number, throttlerName: string): Promise<ThrottlerStorageRecord> {
    void throttlerName
    const client = this.redisService.getClient()
    if (!client) return this.emptyRecord()
    try {
      const result = (await client.eval(
        LUA_INCREMENT,
        2,
        `${BLOCK_PREFIX}${key}`,
        `${COUNTER_PREFIX}${key}`,
        ttl.toString(),
        limit.toString(),
        Math.ceil(blockDuration / 1000).toString(),
      )) as [number, number, number, number]
      return { totalHits: result[0], timeToExpire: result[1], isBlocked: result[2] === 1, timeToBlockExpire: result[3] }
    } catch (error: unknown) {
      this.logger.error('Redis 限流执行失败', error instanceof Error ? error.stack : undefined)
      return this.emptyRecord()
    }
  }

  /**
   * 查询封禁剩余时间。
   * @description 只读取 Redis 封禁标记，不递增请求计数，供未知路由中间件在进入业务处理前检查 IP 是否已被封禁。
   * @param key 限流键
   * @returns 剩余封禁秒数
   */
  async getBlockRemaining(key: string): Promise<number> {
    const client = this.redisService.getClient()
    if (!client) return 0
    try {
      const ttl = await client.pttl(`${BLOCK_PREFIX}${key}`)
      return ttl > 0 ? Math.ceil(ttl / 1000) : 0
    } catch (error: unknown) {
      this.logger.error('Redis 封禁状态查询失败', error instanceof Error ? error.stack : undefined)
      return 0
    }
  }

  /**
   * 返回 Redis 不可用时的放行记录。
   * @description 采用 fail-open 策略，避免基础设施故障阻塞业务。
   * @returns 未命中限制的记录
   */
  private emptyRecord(): ThrottlerStorageRecord {
    return { totalHits: 0, timeToExpire: 0, isBlocked: false, timeToBlockExpire: 0 }
  }
}
