import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiResourceModule } from '../../api-resource/admin/api-resource.module.js'
import { AdminUser } from '../../auth/admin/entities/admin-user.entity.js'
import { PasswordService } from '../../auth/admin/password.service.js'
import { RBAC_ENTITIES } from './rbac.entities.js'
import { AdminAuthorizationService } from './services/admin-authorization.service.js'
import { AdminResourceService } from './services/admin-resource.service.js'
import { AdminRoleService } from './services/admin-role.service.js'
import { AdminUserService } from './services/admin-user.service.js'
import { RbacStoreService } from './services/rbac-store.service.js'
import { RbacService } from './rbac.service.js'
import { UsersController, RolesController, MenusController } from './rbac.controller.js'

/**
 * 后台权限模块
 * @description 管理用户、角色、权限资源与实时授权，按领域注册服务并只对外导出 `RbacService` 门面
 */
@Module({
  imports: [ApiResourceModule, TypeOrmModule.forFeature([AdminUser, ...RBAC_ENTITIES])],
  controllers: [UsersController, RolesController, MenusController],
  providers: [
    RbacStoreService,
    AdminUserService,
    AdminRoleService,
    AdminResourceService,
    AdminAuthorizationService,
    RbacService,
    PasswordService,
  ],
  exports: [RbacService, TypeOrmModule],
})
export class RbacModule {}
