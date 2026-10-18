import { Module } from '@nestjs/common'
import { DiscoveryModule } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AdminApiResource } from './entities/admin-api-resource.entity.js'
import { ApiResourceController } from './api-resource.controller.js'
import { ApiResourceService } from './api-resource.service.js'

/**
 * 接口清单模块
 * @description 从实际路由登记接口策略并保存展示配置，为 RBAC 提供接口定义与绑定校验
 */
@Module({
  imports: [DiscoveryModule, TypeOrmModule.forFeature([AdminApiResource])],
  controllers: [ApiResourceController],
  providers: [ApiResourceService],
  exports: [ApiResourceService, TypeOrmModule],
})
export class ApiResourceModule {}
