import { ClassSerializerInterceptor, Logger, ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory, Reflector } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { Response } from 'express'
import basicAuth from 'express-basic-auth'
import helmet, { type HelmetOptions } from 'helmet'
import { WinstonModule } from 'nest-winston'
import { knife4jSetup } from 'nestjs-knife4j-plus'
import { isAbsolute, join } from 'node:path'
import { AppModule } from './app.module.js'
import { DatabaseHealthService } from './common/database/database.health.service.js'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js'
import { DefaultHttpStatusInterceptor } from './common/interceptors/default-http-status.interceptor.js'
import { winstonConfig } from './common/logger/logger.config.js'

/**
 * 应用启动入口。
 * @description 创建 Express Nest 应用并注册安全、文档、静态资源和全局基础设施。
 * @returns 应用启动完成后的空结果
 */
async function main(): Promise<void> {
  // 初始化 Nest 应用实例（Express 平台），保留原始请求体供验签类接口使用。
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
    logger: WinstonModule.createLogger(winstonConfig),
  })
  app.set('trust proxy', true)

  const configService = app.get(ConfigService)
  const reflector = app.get(Reflector)
  const nodeEnv = configService.get<string>('app.nodeEnv')
  // 根据环境变量判断当前是否为非生产环境（开发或测试环境）。
  const isNonProductionEnv = nodeEnv === 'development' || nodeEnv === 'test'
  // 全局前缀只承载业务名称，接口版本由各 Controller 显式声明。
  const apiPrefix =
    configService
      .get<string>('app.apiPrefix')
      ?.trim()
      .replace(/^\/+|\/+$/g, '') || ''
  // 静态上传资源与 API 前缀保持一致。
  const staticPrefix = apiPrefix ? `/${apiPrefix}/uploads` : '/uploads'
  if (apiPrefix) app.setGlobalPrefix(apiPrefix)

  // 启用 Helmet；开发/测试环境关闭 HTTPS 升级头，避免局域网访问 Knife4j 被浏览器拦截。
  const helmetOptions: HelmetOptions = {
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    ...(isNonProductionEnv
      ? {
          contentSecurityPolicy: { directives: { upgradeInsecureRequests: null } },
          crossOriginOpenerPolicy: false,
          originAgentCluster: false,
        }
      : {}),
  }
  app.use(helmet(helmetOptions))
  // 开发/测试环境允许任意来源，部署时必须替换为实际来源。
  app.enableCors({
    origin: isNonProductionEnv ? true : ['https://www.example.com'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
  // 全局验证管道：仅接收 DTO 白名单字段并支持基础类型隐式转换。
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      // 允许非白名单中的参数
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      stopAtFirstError: true, // 遇到第一个验证错误时停止后续参数校验
    }),
  )
  // 全局异常过滤器与序列化拦截器统一 API 响应结构。
  app.useGlobalFilters(new AllExceptionsFilter())
  // 全局默认 HTTP 状态码拦截器
  app.useGlobalInterceptors(new DefaultHttpStatusInterceptor())
  // 全局序列化拦截器（自动转换 null 为 undefined）
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector))

  // 静态资源服务在所有环境启用，物理目录通过 UPLOAD_DIR 配置。
  const uploadDir = configService.get<string>('app.uploadDir') || 'uploads'
  app.useStaticAssets(isAbsolute(uploadDir) ? uploadDir : join(process.cwd(), uploadDir), {
    prefix: staticPrefix,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    immutable: true,
    setHeaders(response: Response): void {
      response.setHeader('X-Served-By', 'nest-static')
    },
  })

  // Knife4j 文档只在开发和测试环境注册。
  if (isNonProductionEnv) {
    configureKnife4j(app, configService, apiPrefix)
  }

  // MySQL 启用时启动失败即终止，避免应用在数据库不可用时接受请求。
  await app.get(DatabaseHealthService).checkConnection()
  const port = configService.get<number>('app.port') || 3000
  await app.listen(port)
  Logger.log(`Application is running at http://localhost:${port}${apiPrefix ? `/${apiPrefix}` : ''}`, 'Main')
  if (isNonProductionEnv) {
    Logger.log(`Knife4j document: http://localhost:${port}${apiPrefix ? `/${apiPrefix}` : ''}/doc.html`, 'Main')
  }
}

/**
 * 配置 Knife4j 接口文档。
 * @description 在开发和测试环境注册 OpenAPI JSON、Knife4j UI 与可选 Basic Auth 保护。
 * @param app Express Nest 应用
 * @param configService 配置服务
 * @param apiPrefix 规范化后的 API 前缀
 * @returns 无返回值
 */
function configureKnife4j(app: NestExpressApplication, configService: ConfigService, apiPrefix: string): void {
  if (configService.get<boolean>('app.knife4jAuthEnabled')) {
    const username = configService.get<string>('app.knife4jUsername')?.trim()
    const password = configService.get<string>('app.knife4jPassword')?.trim()
    if (!username || !password) throw new Error('KNIFE4J_USERNAME 和 KNIFE4J_PASSWORD 必须配置非空值')
    // 同时保护文档 HTML、OpenAPI JSON 与 Knife4j 依赖静态资源。
    const middleware = basicAuth({
      authorizer: (inputUsername: string, inputPassword: string) =>
        basicAuth.safeCompare(inputUsername, username) && basicAuth.safeCompare(inputPassword, password),
      challenge: true,
      realm: 'Knife4j',
    })
    for (const path of ['/doc.html', '/api-json', '/services.json', '/swagger-resources', '/webjars', '/assets']) {
      app.use(`${apiPrefix ? `/${apiPrefix}` : ''}${path}`, middleware)
    }
  }
  // OpenAPI 文档仍由 Nest Swagger 生成，Knife4j 仅替换交互界面。
  const documentConfig = new DocumentBuilder()
    .setTitle('Backend Template API')
    .setDescription('Backend Template API documentation')
    .setVersion('1.0')
    .build()
  const document = SwaggerModule.createDocument(app, documentConfig)
  SwaggerModule.setup('api', app, document, { useGlobalPrefix: true, ui: false, jsonDocumentUrl: 'api-json' })
  void knife4jSetup(app, [{ name: 'Backend Template', url: '/api-json' }], apiPrefix || undefined)
}

void main()
