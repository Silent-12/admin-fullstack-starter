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
   * @description 统一追加可选上下文前缀后交由 Winston 输出 error 级别日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  error(message: string, context?: string): void {
    this.logger.error(`${context || ''} - ${message}`)
  }

  /**
   * 记录警告日志
   * @description 统一追加可选上下文前缀后交由 Winston 输出 warn 级别日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  warn(message: string, context?: string): void {
    this.logger.warn(`${context || ''} - ${message}`)
  }

  /**
   * 记录信息日志
   * @description 统一追加可选上下文前缀后输出 info 级别日志
   * @param message 日志消息
   * @param context 上下文信息
   */
  log(message: string, context?: string): void {
    this.logger.log('info', `${context || ''} - ${message}`)
  }

  /**
   * 记录调试日志
   * @description 输出 debug 级别日志；Winston 实例未提供该方法时静默跳过
   * @param message 日志消息
   * @param context 上下文信息
   */
  debug(message: string, context?: string): void {
    this.logger.debug?.(`${context || ''} - ${message}`)
  }

  /**
   * 记录 verbose 日志
   * @description 输出 verbose 级别日志；Winston 实例未提供该方法时静默跳过
   * @param message 日志消息
   * @param context 上下文信息
   */
  verbose(message: string, context?: string): void {
    this.logger.verbose?.(`${context || ''} - ${message}`)
  }
}
