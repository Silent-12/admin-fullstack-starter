import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ThrottlerGuard, ThrottlerModule, ThrottlerStorage } from '@nestjs/throttler'
import { config } from 'dotenv'
import { join, resolve } from 'path'
import appConfig from './config/app.config.js'
import databaseConfig from './config/database.config.js'
import redisConfig from './config/redis.config.js'
import { SnakeNamingStrategy } from './config/database-naming-strategy.js'
import { DatabaseHealthService } from './common/database/database.health.service.js'
import { LoggingMiddleware } from './common/middleware/logging.middleware.js'
import { MissingRouteThrottleMiddleware } from './common/middleware/missing-route-throttle.middleware.js'
import { RedisModule } from './common/redis/redis.module.js'
import { RedisThrottlerStorageService } from './common/throttle/redis-throttler-storage.service.js'
import { THROTTLE_POLICY } from './common/constants/throttle.constant.js'
import { getIpThrottleTracker } from './common/utils/throttle-tracker.util.js'
import { generateUserApiThrottleKey, shouldSkipUserApiThrottle } from './common/utils/throttle-request.util.js'
import { AccessLogModule } from './modules/access-log/access-log.module.js'
import { TemplateApiModule } from './modules/template-api/template-api.module.js'
import { HealthController } from './health/health.controller.js'
import { DatabaseConfig } from './common/types/database.js'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

const isMysqlEnabled = process.env.MYSQL_ENABLED === 'true'

/**
 * TypeORM 数据库连接模块工厂
 * @description 仅 MYSQL_ENABLED 为 true 时创建 TypeORM 根连接配置
 */
const typeOrmRootModule = isMysqlEnabled
  ? TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database') as DatabaseConfig
        return {
          type: 'mysql',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          synchronize: dbConfig.synchronize,
          logging: dbConfig.logging,
          entities: [join(process.cwd(), 'dist', '**', '*.entity{.ts,.js}')],
          extra: dbConfig.extra,
          namingStrategy: new SnakeNamingStrategy(),
        }
      },
      inject: [ConfigService],
    })
  : null

/**
 * 应用根模块
 * 负责配置和导入全局模块，注册控制器和服务提供者
 */
@Module({
  imports: [
    /**
     * 配置模块
     * 加载环境变量和配置文件，提供全局配置服务
     */
    ConfigModule.forRoot({
      isGlobal: true, // 设置为全局模块，其他模块无需再次导入
      envFilePath: ['.env', '.env.local'], // 环境变量文件路径，按优先级加载
      load: [appConfig, databaseConfig, redisConfig], // 加载自定义配置对象
      cache: true, // 启用配置缓存，提升性能
    }),
    /**
     * 限流模块
     * 防止 API 被滥用，限制请求频率
     */
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: THROTTLE_POLICY.USER_API_WINDOW_MS,
            limit: THROTTLE_POLICY.USER_API_LIMIT,
            blockDuration: THROTTLE_POLICY.USER_API_BLOCK_SECONDS * 1000,
          },
        ],
        getTracker: getIpThrottleTracker,
        generateKey: generateUserApiThrottleKey,
        skipIf: (context: Parameters<typeof shouldSkipUserApiThrottle>[0]) =>
          !(configService.get<boolean>('app.throttleEnabled') ?? false) || shouldSkipUserApiThrottle(context),
        errorMessage: THROTTLE_POLICY.MESSAGE,
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    /**
     * 数据库相关模块（条件化导入）
     * 仅 MYSQL_ENABLED 为 true 时启用，所有依赖 TypeORM 的模块必须在此条件内导入，
     * 否则在 MYSQL_ENABLED=false 时，Repository 无法注入 DataSource 会导致启动失败
     */
    ...(isMysqlEnabled && typeOrmRootModule ? [typeOrmRootModule] : []),
    ...(isMysqlEnabled
      ? [
          /**
           * 访问日志模块
           * 注册 AccessLog 实体和 AccessLogService，提供 HTTP 请求日志持久化能力
           */
          AccessLogModule,
          /**
           * 模板 API 模块
           * 提供标准 CRUD 模板，后续新增业务模块可复制此目录改名为新模块使用
           * 后续新增的数据库业务模块应添加在此数组内
           */
          TemplateApiModule,
        ]
      : []),
  ],
  controllers: [HealthController], // 注册应用控制器
  providers: [
    DatabaseHealthService,
    RedisThrottlerStorageService,
    { provide: ThrottlerStorage, useExisting: RedisThrottlerStorageService },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  /**
   * 配置中间件
   * @description 按环境开关注册访问日志与未知路由限流中间件。
   * @param consumer 中间件消费者
   * @returns 无返回值
   */
  configure(consumer: MiddlewareConsumer): void {
    const httpLogEnabled = process.env.HTTP_LOG_ENABLED === 'true'
    const mysqlEnabled = process.env.MYSQL_ENABLED === 'true'
    const throttleEnabled = process.env.THROTTLE_ENABLED === 'true'
    if (httpLogEnabled && mysqlEnabled) {
      consumer.apply(LoggingMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL })
    }
    if (throttleEnabled) {
      consumer.apply(MissingRouteThrottleMiddleware).forRoutes({ path: '*path', method: RequestMethod.ALL })
    }
  }
}
