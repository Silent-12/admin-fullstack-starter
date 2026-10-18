import { Injectable } from '@nestjs/common'
import type { OnApplicationBootstrap } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { ApiResourceService } from '../../api-resource/admin/api-resource.service.js'
import { initializeRbac, SEED_API_CODES } from '../../rbac/admin/initialize-rbac.js'

/**
 * 初始化后台权限基础资源
 * @description 启动时补齐内置管理员角色、系统菜单按钮与接口绑定，恢复内置角色全量授权；
 * 同时校验种子接口编码仍存在于实际路由，避免重命名后静默失去权限
 */
@Injectable()
export class AdminRbacBootstrapService implements OnApplicationBootstrap {
  constructor(
    private readonly source: DataSource,
    private readonly apiResources: ApiResourceService,
  ) {}

  /**
   * 补齐系统权限资源
   * @description 初始化幂等执行，失败时停止启动，避免接受不完整授权状态下的请求
   */
  async onApplicationBootstrap(): Promise<void> {
    await initializeRbac(this.source)
    for (const code of SEED_API_CODES) {
      if (this.apiResources.getDefinitionByCode(code)?.access !== 'permission') {
        throw new Error(`权限种子接口编码无效：${code}`)
      }
    }
  }
}
