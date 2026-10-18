import { Body, Controller, Delete, Get, Header, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { AdminApi } from '../../../common/auth/admin-api.decorator.js'
import { ApiResponseDto } from '../../../common/dto/api-response.dto.js'
import type { AdminAuthRequest } from '../../../types/admin-auth.js'
import {
  CreateResourceDto,
  CreateRoleDto,
  CreateUserDto,
  RbacQueryDto,
  ResetPasswordDto,
  RoleResourcesDto,
  UpdateResourceDto,
  UpdateRoleDto,
  UpdateUserDto,
} from './dto/rbac.dto.js'
import { RbacService } from './rbac.service.js'

/**
 * 用户管理控制器
 * @description 统一返回最小业务字段与空写入结果，管理动作由启用角色显式绑定的资源授权控制
 */
@ApiTags('用户管理')
@ApiBearerAuth()
@Controller('v1/admin/users')
export class UsersController {
  constructor(private readonly rbac: RbacService) {}

  /**
   * 分页查询用户
   * @description 返回经过字段筛选的业务结果
   * @param query 分页与筛选参数
   * @returns 统一响应，数据为查询结果
   */
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '分页查询用户' })
  @AdminApi({ code: 'system.users.list', module: '系统管理', feature: '用户管理', action: '分页查询用户' })
  async list(@Query() query: RbacQueryDto): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['listUsers']>>>> {
    return ApiResponseDto.success(await this.rbac.listUsers(query))
  }

  /**
   * 查询用户详情
   * @description 返回经过字段筛选的业务结果
   * @param id 业务对象 UUID
   * @returns 统一响应，数据为查询结果
   */
  @Get(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询用户详情' })
  @AdminApi({ code: 'system.users.detail', module: '系统管理', feature: '用户管理', action: '查询用户详情' })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['getUser']>>>> {
    return ApiResponseDto.success(await this.rbac.getUser(id))
  }

  /**
   * 创建用户
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '创建用户' })
  @AdminApi({ code: 'system.users.create', module: '系统管理', feature: '用户管理', action: '创建用户' })
  async create(@Body() dto: CreateUserDto, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.createUser(dto, request.adminUser.id, request.adminAuthorization)
    return ApiResponseDto.success(null)
  }

  /**
   * 更新用户
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Patch(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '更新用户' })
  @AdminApi({ code: 'system.users.update', module: '系统管理', feature: '用户管理', action: '更新用户' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.rbac.updateUser(id, dto, request.adminUser.id, request.adminAuthorization)
    return ApiResponseDto.success(null)
  }

  /**
   * 删除用户
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Delete(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '删除用户' })
  @AdminApi({ code: 'system.users.delete', module: '系统管理', feature: '用户管理', action: '删除用户' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.deleteUser(id, request.adminUser.id)
    return ApiResponseDto.success(null)
  }

  /**
   * 重置用户密码
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Post(':id/reset-password')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '重置用户密码' })
  @AdminApi({ code: 'system.users.password.reset', module: '系统管理', feature: '用户管理', action: '重置用户密码' })
  async passwordReset(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.rbac.resetPassword(id, dto.password, request.adminUser.id)
    return ApiResponseDto.success(null)
  }
}

/**
 * 角色管理控制器
 * @description 统一返回最小业务字段与空写入结果，管理动作由启用角色显式绑定的资源授权控制
 */
@ApiTags('角色管理')
@ApiBearerAuth()
@Controller('v1/admin/roles')
export class RolesController {
  constructor(private readonly rbac: RbacService) {}

  /**
   * 分页查询角色
   * @description 返回经过字段筛选的业务结果
   * @param query 分页与筛选参数
   * @returns 统一响应，数据为查询结果
   */
  @Get()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '分页查询角色' })
  @AdminApi({ code: 'system.roles.list', module: '系统管理', feature: '角色管理', action: '分页查询角色' })
  async list(@Query() query: RbacQueryDto): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['listRoles']>>>> {
    return ApiResponseDto.success(await this.rbac.listRoles(query))
  }

  /**
   * 查询角色选项
   * @description 返回经过字段筛选的业务结果
   * @returns 统一响应，数据为查询结果
   */
  @Get('options')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询角色选项' })
  @AdminApi({ code: 'system.roles.options', module: '系统管理', feature: '角色管理', action: '查询角色选项' })
  async options(@Req() request: AdminAuthRequest): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['roleOptions']>>>> {
    return ApiResponseDto.success(await this.rbac.roleOptions(request.adminAuthorization))
  }

  /**
   * 查询角色详情
   * @description 返回经过字段筛选的业务结果
   * @param id 业务对象 UUID
   * @returns 统一响应，数据为查询结果
   */
  @Get(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询角色详情' })
  @AdminApi({ code: 'system.roles.detail', module: '系统管理', feature: '角色管理', action: '查询角色详情' })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['getRole']>>>> {
    return ApiResponseDto.success(await this.rbac.getRole(id))
  }

  /**
   * 创建角色
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '创建角色' })
  @AdminApi({ code: 'system.roles.create', module: '系统管理', feature: '角色管理', action: '创建角色' })
  async create(@Body() dto: CreateRoleDto, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.createRole(dto, request.adminUser.id)
    return ApiResponseDto.success(null)
  }

  /**
   * 更新角色
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Patch(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '更新角色' })
  @AdminApi({ code: 'system.roles.update', module: '系统管理', feature: '角色管理', action: '更新角色' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.rbac.updateRole(id, dto, request.adminUser.id)
    return ApiResponseDto.success(null)
  }

  /**
   * 删除角色
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Delete(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '删除角色' })
  @AdminApi({ code: 'system.roles.delete', module: '系统管理', feature: '角色管理', action: '删除角色' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.deleteRole(id, request.adminUser.id)
    return ApiResponseDto.success(null)
  }

  /**
   * 查询角色资源授权
   * @description 返回经过字段筛选的业务结果
   * @param id 业务对象 UUID
   * @returns 统一响应，数据为查询结果
   */
  @Get(':id/resources')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询角色资源授权' })
  @AdminApi({ code: 'system.roles.resources.read', module: '系统管理', feature: '角色管理', action: '查询角色资源授权' })
  async resourcesRead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['getRoleResources']>>>> {
    return ApiResponseDto.success(await this.rbac.getRoleResources(id))
  }

  /**
   * 分配角色资源
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Put(':id/resources')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '分配角色资源' })
  @AdminApi({ code: 'system.roles.resources.assign', module: '系统管理', feature: '角色管理', action: '分配角色资源' })
  async resourcesAssign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RoleResourcesDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.rbac.setRoleResources(id, dto.resourceIds, request.adminUser.id, request.adminAuthorization)
    return ApiResponseDto.success(null)
  }
}

/**
 * 菜单管理控制器
 * @description 统一返回最小业务字段与空写入结果，管理动作由启用角色显式绑定的资源授权控制
 */
@ApiTags('菜单管理')
@ApiBearerAuth()
@Controller('v1/admin/menus')
export class MenusController {
  constructor(private readonly rbac: RbacService) {}

  /**
   * 查询权限资源树
   * @description 返回经过字段筛选的业务结果
   * @returns 统一响应，数据为查询结果
   */
  @Get('tree')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询权限资源树' })
  @AdminApi({ code: 'system.menus.tree', module: '系统管理', feature: '菜单管理', action: '查询权限资源树' })
  async tree(): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['resourceTree']>>>> {
    return ApiResponseDto.success(await this.rbac.resourceTree())
  }

  /**
   * 查询权限资源详情
   * @description 返回经过字段筛选的业务结果
   * @param id 业务对象 UUID
   * @returns 统一响应，数据为查询结果
   */
  @Get(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '查询权限资源详情' })
  @AdminApi({ code: 'system.menus.detail', module: '系统管理', feature: '菜单管理', action: '查询权限资源详情' })
  async detail(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponseDto<Awaited<ReturnType<RbacService['getResource']>>>> {
    return ApiResponseDto.success(await this.rbac.getResource(id))
  }

  /**
   * 创建权限资源
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Post()
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '创建权限资源' })
  @AdminApi({ code: 'system.menus.create', module: '系统管理', feature: '菜单管理', action: '创建权限资源' })
  async create(@Body() dto: CreateResourceDto, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.createResource(dto, request.adminUser.id, request.adminAuthorization)
    return ApiResponseDto.success(null)
  }

  /**
   * 更新权限资源
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param dto 已校验的请求参数
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Patch(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '更新权限资源' })
  @AdminApi({ code: 'system.menus.update', module: '系统管理', feature: '菜单管理', action: '更新权限资源' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
    @Req() request: AdminAuthRequest,
  ): Promise<ApiResponseDto<null>> {
    await this.rbac.updateResource(id, dto, request.adminUser.id, request.adminAuthorization)
    return ApiResponseDto.success(null)
  }

  /**
   * 删除权限资源
   * @description 在事务中执行变更，成功响应的数据为 null
   * @param id 业务对象 UUID
   * @param request 当前已认证请求
   * @returns 统一响应，数据为 null
   */
  @Delete(':id')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: '删除权限资源' })
  @AdminApi({ code: 'system.menus.delete', module: '系统管理', feature: '菜单管理', action: '删除权限资源' })
  async delete(@Param('id', ParseUUIDPipe) id: string, @Req() request: AdminAuthRequest): Promise<ApiResponseDto<null>> {
    await this.rbac.deleteResource(id, request.adminUser.id)
    return ApiResponseDto.success(null)
  }
}
