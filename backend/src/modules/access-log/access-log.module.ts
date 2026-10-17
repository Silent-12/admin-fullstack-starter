import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccessLog } from './entities/access-log.entity.js'
import { AccessLogService } from './access-log.service.js'

/**
 * 访问日志模块
 * @description 注册访问日志实体与服务，供全局请求日志中间件使用
 */
@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
