import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminUser } from './entities/admin-user.entity.js'
import { AdminAuthController } from './admin-auth.controller.js'
import { AdminAuthService } from './admin-auth.service.js'
import { AdminAuthGuard } from './admin-auth.guard.js'
import { LoginThrottleService } from './login-throttle.service.js'
import { PasswordService } from './password.service.js'
import { ApiResourceModule } from '../../api-resource/admin/api-resource.module.js'
import { RbacModule } from '../../rbac/admin/rbac.module.js'
import { AdminRbacBootstrapService } from './admin-rbac-bootstrap.service.js'

/**
 * 后台认证模块
 * @description 仅在 MySQL 条件化导入中注册，提供后台 JWT 认证能力并注册全局认证守卫
 */
@Module({
  imports: [
    ApiResourceModule,
    RbacModule,
    TypeOrmModule.forFeature([AdminUser]),
    // 签名与校验算法固定为 HS256，密钥取自环境变量 `JWT_SECRET`
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('app.jwtSecret'),
        signOptions: { algorithm: 'HS256' },
        verifyOptions: { algorithms: ['HS256'] },
      }),
    }),
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    PasswordService,
    LoginThrottleService,
    AdminRbacBootstrapService,
    { provide: APP_GUARD, useClass: AdminAuthGuard },
  ],
})
export class AdminAuthModule {}
