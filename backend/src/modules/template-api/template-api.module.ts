import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TemplateItem } from './entities/template-item.entity.js'
import { TemplateApiService } from './template-api.service.js'
import { TemplateApiController } from './template-api.controller.js'

/**
 * 模板 API 模块
 * @description 提供模板条目的完整 CRUD 能力，可供后续复制改名为新业务模块使用
 */
@Module({
  imports: [TypeOrmModule.forFeature([TemplateItem])],
  controllers: [TemplateApiController],
  providers: [TemplateApiService],
  exports: [TemplateApiService],
})
export class TemplateApiModule {}
