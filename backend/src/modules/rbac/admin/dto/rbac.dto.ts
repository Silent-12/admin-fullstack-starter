import { ApiProperty, ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger'
import { Transform } from 'class-transformer'
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Max,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator'
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto.js'

/**
 * 权限管理分页筛选
 * @description 共用关键字与启用状态筛选，布尔查询值只接受 true 和 false
 */
export class RbacQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '名称或编码关键字' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.keyword)
  keyword?: string

  @ApiPropertyOptional({ description: '是否启用' })
  @IsOptional()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => (obj.enabled === 'true' ? true : obj.enabled === 'false' ? false : obj.enabled))
  @IsBoolean()
  enabled?: boolean
}

/**
 * 创建角色参数
 * @description 内置标记由服务器固定，不能由客户端指定
 */
export class CreateRoleDto {
  @ApiProperty({ description: '唯一角色编码，创建后不可变' })
  @Matches(/^[a-z][a-z0-9_]{1,63}$/)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.code)
  code!: string

  @ApiProperty({ description: '角色名称' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.name)
  name!: string

  @ApiPropertyOptional({ description: '角色说明' })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @MaxLength(255)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.description)
  description?: string

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.enabled)
  enabled!: boolean
}

/**
 * 更新角色参数
 * @description 不接受编码与内置标记
 */
export class UpdateRoleDto extends PartialType(OmitType(CreateRoleDto, ['code'] as const), { skipNullProperties: false }) {}

/**
 * 用户角色绑定参数
 * @description 创建与更新用户时携带的完整角色集合，空数组表示不绑定任何角色，元素必须唯一
 */
export class UserRolesDto {
  @ApiProperty({ description: '角色 UUID 列表', type: [String] })
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.roleIds)
  roleIds!: string[]
}

/**
 * 角色资源授权参数
 * @description 显式选中的资源集合，父资源不会隐式授予子资源
 */
export class RoleResourcesDto {
  @ApiProperty({ description: '资源 UUID 列表', type: [String] })
  @IsArray()
  @ArrayMaxSize(5000)
  @ArrayUnique()
  @IsUUID('4', { each: true })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.resourceIds)
  resourceIds!: string[]
}

/**
 * 创建后台用户
 * @description 账户只接受小写字母用户名，密码仅用于生成哈希
 */
export class CreateUserDto extends UserRolesDto {
  @ApiProperty({ description: '用户名，小写字母开头并可带数字后缀；重名时服务端自动追加序号' })
  @Matches(/^[a-z]{1,64}$/)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.username)
  username!: string

  @ApiProperty({ description: '姓名' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.name)
  name!: string

  @ApiPropertyOptional({ description: '手机号，null 清空', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.phone)
  phone?: string | null

  @ApiPropertyOptional({ description: '邮箱，null 清空', nullable: true })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.email)
  email?: string | null

  @ApiPropertyOptional({ description: '头像地址，null 清空', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.avatar)
  avatar?: string | null

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.enabled)
  enabled!: boolean

  @ApiProperty({ description: '初始密码，至少12位', writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.password)
  password!: string
}

/**
 * 更新后台用户
 * @description 用户名不可变，角色与资料在同一事务中变更
 */
export class UpdateUserDto extends PartialType(OmitType(CreateUserDto, ['username', 'password'] as const), { skipNullProperties: false }) {}

/**
 * 重置用户密码
 * @description 重置时同时撤销该用户的全部旧令牌
 */
export class ResetPasswordDto {
  @ApiProperty({ description: '新密码，至少12位', writeOnly: true })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.password)
  password!: string
}

/**
 * 创建权限资源
 * @description 页面、目录与按钮共用层级结构；接口绑定只能引用当前可分配接口
 */
export class CreateResourceDto {
  @ApiPropertyOptional({ description: '父资源 UUID，null 表示根节点', nullable: true })
  @IsOptional()
  @IsUUID('4')
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.parentId)
  parentId?: string | null

  @ApiProperty({ description: '资源类型', enum: ['directory', 'menu', 'button'] })
  @IsIn(['directory', 'menu', 'button'])
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.type)
  type!: 'directory' | 'menu' | 'button'

  @ApiProperty({ description: '资源标题' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.title)
  title!: string

  @ApiPropertyOptional({ description: '唯一前端路由名称', nullable: true })
  @IsOptional()
  @Matches(/^[A-Za-z][A-Za-z0-9_]*$/)
  @MaxLength(64)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.name)
  name?: string | null

  @ApiPropertyOptional({ description: '全局唯一的前端路由路径，不区分大小写；按钮为空', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.path)
  path?: string | null

  @ApiPropertyOptional({ description: '前端组件标识', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.component)
  component?: string | null

  @ApiPropertyOptional({ description: '菜单图标', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.icon)
  icon?: string | null

  @ApiPropertyOptional({ description: '全局唯一的界面权限编码', nullable: true })
  @IsOptional()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_.:-]*$/)
  @MaxLength(128)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.permission)
  permission?: string | null

  @ApiProperty({ description: '是否启用' })
  @IsBoolean()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.enabled)
  enabled!: boolean

  @ApiPropertyOptional({ description: '同级排序值', default: 0 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsInt()
  @Min(-2147483648)
  @Max(2147483647)
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.sort)
  sort?: number

  @ApiPropertyOptional({ description: '是否隐藏导航', default: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.hidden)
  hidden?: boolean

  @ApiPropertyOptional({ description: '是否缓存页面', default: false })
  @ValidateIf((_object, value) => value !== undefined)
  @IsBoolean()
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.keepAlive)
  keepAlive?: boolean

  @ApiPropertyOptional({ description: '绑定的可分配接口编码；空数组清空绑定', type: [String] })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayUnique()
  @IsString({ each: true })
  @MaxLength(128, { each: true })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.apiCodes)
  apiCodes?: string[]
}

/**
 * 更新权限资源
 * @description 省略字段保持原值，显式 null 清空可空字段
 */
export class UpdateResourceDto extends PartialType(CreateResourceDto, { skipNullProperties: false }) {}
