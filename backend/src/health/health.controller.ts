import { Controller, Get } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { DatabaseHealthService } from '../common/database/database.health.service.js'
import { ApiResponseDto } from '../common/dto/api-response.dto.js'
import { RedisService } from '../common/redis/redis.service.js'
import type { HealthResponse } from '../types/health.js'

/**
 * 健康检查控制器
 * @description 提供 /health 端点，用于检查服务运行状态
 */
@ApiTags('健康检查')
@Controller('v1/health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly databaseHealthService: DatabaseHealthService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 查询服务健康状态。
   * @description 生产环境仅暴露存活状态，其他环境额外返回运行信息与基础设施连通性。
   * @returns 统一健康状态响应
   */
  @Get()
  @ApiOperation({ summary: '查询服务健康状态' })
  @ApiResponse({ status: 200, description: '服务运行正常' })
  check(): ApiResponseDto<HealthResponse> {
    if (this.configService.get<string>('app.nodeEnv') === 'production') {
      return ApiResponseDto.success({ status: 'ok' }, '查询成功')
    }
    return ApiResponseDto.success(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        services: {
          mysql: this.databaseHealthService.getStatus(),
          redis: this.redisService.getStatus(),
        },
      },
      '查询成功',
    )
  }
}
