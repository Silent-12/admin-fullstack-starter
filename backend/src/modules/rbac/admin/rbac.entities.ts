import { AdminRole } from './entities/admin-role.entity.js'
import { AdminPermissionResource } from './entities/admin-permission-resource.entity.js'
import { AdminUserRole } from './entities/admin-user-role.entity.js'
import { AdminRoleResource } from './entities/admin-role-resource.entity.js'
import { AdminResourceApi } from './entities/admin-resource-api.entity.js'

/** RBAC 关联实体，供模块与管理员初始化命令复用 */
export const RBAC_ENTITIES = [AdminRole, AdminPermissionResource, AdminUserRole, AdminRoleResource, AdminResourceApi]
