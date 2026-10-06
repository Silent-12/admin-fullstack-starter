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

    // 访问日志 - 按日切分
    new DailyRotateFile({
      filename: 'logs/access/access.%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'info',
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
