import { Module } from '@nestjs/common'
import { WinstonModule } from 'nest-winston'
import { winstonConfig } from './logger.config.js'
import { LoggerService } from './logger.service.js'

/**
 * 日志模块
 * @description 提供全局可用的 Winston 日志服务
 */
@Module({
  imports: [WinstonModule.forRoot(winstonConfig)],
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
