import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Redis from 'ioredis'

/**
 * ioredis 客户端类型别名
 * @description 收敛 ioredis 默认导出类型，避免在服务内重复书写命名空间路径
 */
type RedisClient = Redis.default

/**
 * Redis 服务
 * @description 封装 ioredis 连接与基础键值操作，由 `REDIS_ENABLED` 控制是否启用；Redis 不可用时按各方法约定降级
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  // ioredis 客户端实例，未启用或连接失败时为空
  private client: RedisClient | null = null
  // 是否启用 Redis
  private enabled = false

  constructor(private readonly configService: ConfigService) {}

  /**
   * 初始化 Redis 连接
   * @description 开关未启用时直接跳过；启用时建立连接并执行一次 ping 健康检查，失败则抛出错误终止启动
   * @throws Error 连接或健康检查失败时抛出
   */
  async onModuleInit(): Promise<void> {
    this.enabled = (this.configService.get('redis.enabled') as boolean) === true

    if (!this.enabled) {
      this.logger.log('Redis is disabled, skipping connection')
      return
    }

    try {
      const redisConfig = this.configService.get('redis') as {
        host: string
        port: number
        password: string | undefined
        db: number
      }
      this.logger.log(`Connecting to Redis at ${redisConfig.host}:${redisConfig.port}`)

      this.client = new Redis.default({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password || undefined,
        db: redisConfig.db,
        // 最多重试 3 次，之后停止重连，避免 Redis 故障时无限阻塞启动。
        retryStrategy: (times: number) => {
          if (times > 3) {
            return null
          }
          return Math.min(times * 1000, 3000)
        },
      })

      this.client.on('error', (error: Error) => {
        this.logger.error('❌ Redis connection error:', error.message)
      })

      this.client.on('connect', () => {
        this.logger.log('Redis connected successfully')
      })

      await this.client.ping()
      this.logger.log('Redis health check passed')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error('❌ Redis connection failed:', errorMessage)
      throw new Error(`Failed to connect to Redis: ${errorMessage}`)
    }
  }

  /**
   * 关闭 Redis 连接
   * @description 模块销毁时主动 quit，确保连接正常释放
   */
  async onModuleDestroy(): Promise<void> {
    if (this.client) {
      await this.client.quit()
      this.logger.log('Redis connection closed')
    }
  }

  /**
   * 获取 Redis 客户端实例
   * @description 供限流存储等能力直接复用同一连接；Redis 未启用或未连接时返回 null
   * @returns Redis 客户端或 null
   */
  getClient(): RedisClient | null {
    return this.client
  }

  /**
   * 检查 Redis 是否已启用并连接
   * @description 仅在开关启用且 ioredis 状态为 ready 时视为可用
   * @returns 是否可用
   */
  isAvailable(): boolean {
    return this.enabled && this.client?.status === 'ready'
  }

  /**
   * 获取 Redis 连通性状态
   * @description Redis 启用后以 ioredis ready 状态判断连接是否可用
   * @returns Redis 是否已启用及是否可用
   */
  getStatus(): { enabled: boolean; available: boolean } {
    return { enabled: this.enabled, available: this.isAvailable() }
  }

  /**
   * 设置键值对
   * @description 提供 TTL 时使用 SETEX 原子写入过期时间；Redis 不可用或写入失败时返回 false
   * @param key 键名
   * @param value 值
   * @param ttl 过期时间，单位秒；省略时永久有效
   * @returns 是否写入成功
   */
  async set(key: string, value: string, ttl?: number): Promise<boolean> {
    if (!this.client) {
      return false
    }

    try {
      if (ttl) {
        await this.client.setex(key, ttl, value)
      } else {
        await this.client.set(key, value)
      }
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`❌ Redis SET failed: ${key}`, errorMessage)
      return false
    }
  }

  /**
   * 仅在键不存在时写入 Redis
   * @description 使用 NX 与 EX 原子语义创建短期业务锁；Redis 不可用时降级放行
   * @param key Redis 键
   * @param value Redis 值
   * @param ttl 过期时间，单位秒
   * @returns 是否成功写入或 Redis 不可用时的降级结果
   */
  async setIfAbsent(key: string, value: string, ttl: number): Promise<boolean> {
    if (!this.client) return true
    try {
      return (await this.client.set(key, value, 'EX', ttl, 'NX')) === 'OK'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`Redis SET NX failed: ${key}`, errorMessage)
      return true
    }
  }

  /**
   * 获取键值
   * @description Redis 不可用或读取失败时返回 null，由调用方按缓存未命中处理
   * @param key 键名
   * @returns 键值或 null
   */
  async get(key: string): Promise<string | null> {
    if (!this.client) {
      return null
    }

    try {
      return await this.client.get(key)
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`❌ Redis GET failed: ${key}`, errorMessage)
      return null
    }
  }

  /**
   * 删除键
   * @description Redis 不可用或删除失败时返回 false，并记录警告或错误日志
   * @param key 键名
   * @returns 是否删除成功
   */
  async del(key: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('❌ Redis client is not available, cannot delete key')
      return false
    }

    try {
      await this.client.del(key)
      return true
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.logger.error(`❌ Redis DEL failed: ${key}`, errorMessage)
      return false
    }
  }
}
