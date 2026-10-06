import { Global, Module } from '@nestjs/common'
import { RedisService } from './redis.service.js'

/**
 * Redis 全局模块。
 * @description 提供全局 Redis 服务，所有模块都可以直接使用。
 */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
