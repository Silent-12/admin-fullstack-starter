import { Inject, Injectable } from '@nestjs/common'
import { WINSTON_MODULE_NEST_PROVIDER, WinstonLogger } from 'nest-winston'

/**
 * 日志服务
 * @description 封装 Winston 日志功能，提供统一的日志接口
 */
@Injectable()
export class LoggerService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: WinstonLogger,
  ) {}

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  error(message: string, context?: string): void {
    this.logger.error(`${context || ''} - ${message}`)
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  warn(message: string, context?: string): void {
    this.logger.warn(`${context || ''} - ${message}`)
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  log(message: string, context?: string): void {
    this.logger.log('info', `${context || ''} - ${message}`)
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  debug(message: string, context?: string): void {
    this.logger.debug?.(`${context || ''} - ${message}`)
  }

  /**
   * 记录 verbose 日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose?.(`${context || ''} - ${message}`)
  }
}
