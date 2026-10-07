import { utilities as nestWinstonModuleUtilities } from 'nest-winston'
import * as winston from 'winston'
import DailyRotateFile = require('winston-daily-rotate-file')

/**
 * Winston 日志配置
 * @description 配置日志级别、格式和输出目标
 */
export const winstonConfig: winston.LoggerOptions = {
  levels: winston.config.npm.levels,
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf((info) => {
      const timestamp = (info.timestamp as string) ?? 'unknown'
      const level = info.level ?? 'unknown'
      const message = (info.message as string) ?? ''
      return `${timestamp} ${level}: ${message}`
    }),
  ),
  transports: [
    // 控制台输出
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        nestWinstonModuleUtilities.format.nestLike('NestApp', {
          colors: true,
          prettyPrint: true,
        }),
      ),
    }),

    // 错误日志 - 按日切分
    new DailyRotateFile({
      filename: 'logs/error/error.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf((info) => {
          const timestamp = (info.timestamp as string) ?? 'unknown'
          const level = info.level ?? 'unknown'
          const message = (info.message as string) ?? ''
          return `${timestamp} ${level}: ${message}`
        }),
      ),
    }),

    // 注意：此处不再配置「访问日志」文件输出。HTTP 访问记录由 LoggingMiddleware 经
    // AccessLogService 写入数据库的 access_logs 表，不经过 Winston；原先的 logs/access/
    // 未设任何过滤，与 logs/combined/ 逐行重复，故移除。若将来确需文件形式的访问日志，
    // 请在 LoggingMiddleware 中显式向该 transport 写入，而不是仅恢复本段配置。

    // 综合日志 - 按日切分
    new DailyRotateFile({
      filename: 'logs/combined/combined.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf((info) => {
          const timestamp = (info.timestamp as string) ?? 'unknown'
          const level = info.level ?? 'unknown'
          const message = (info.message as string) ?? ''
          return `${timestamp} ${level}: ${message}`
        }),
      ),
    }),
  ],
}
