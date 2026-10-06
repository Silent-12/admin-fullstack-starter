import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AccessLog } from './entities/access-log.entity.js'
import { AccessLogService } from './access-log.service.js'

/**
 * 访问日志模块
 * @description 提供访问日志实体注册和服务，供全局使用
 */
@Module({
  imports: [TypeOrmModule.forFeature([AccessLog])],
  providers: [AccessLogService],
  exports: [AccessLogService],
})
export class AccessLogModule {}
