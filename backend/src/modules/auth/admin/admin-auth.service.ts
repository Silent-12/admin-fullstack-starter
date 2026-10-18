import { HttpStatus, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { randomUUID } from 'node:crypto'
import { ConfigService } from '@nestjs/config'
import { getDefaultErrorMessage } from '../../../common/utils/error-message.util.js'
import { AdminUser } from './entities/admin-user.entity.js'
import { PasswordService } from './password.service.js'
import type { AdminTokenClaims } from '../../../types/admin-auth.js'
import type { LoginDto } from './dto/login.dto.js'

/**
 * 后台认证服务
 * @description 每次请求从数据库验证用户状态与令牌版本；最近登录 `token` 仅供记录
 */
@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name)

  constructor(
    @InjectRepository(AdminUser) private readonly users: Repository<AdminUser>,
    private readonly passwords: PasswordService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * 用户登录
   * @description 校验凭证并原子记录本次成功登录，写入完成后才返回令牌；数据库故障收敛为通用不可用提示
   * @param dto 登录参数
   * @param ip 客户端 IP
   * @returns 访问令牌与过期时间（Unix 秒）
   */
  async login(dto: LoginDto, ip: string): Promise<{ accessToken: string; expiresAt: number }> {
    const user = await this.database(() =>
      this.users
        .createQueryBuilder('user')
        .addSelect('user.passwordHash')
        .where('user.username = :username AND user.isDeleted = 0 AND user.enabled = :enabled', { username: dto.userName, enabled: true })
        .getOne(),
    )
    if (!(await this.passwords.verify(dto.password, user?.passwordHash)) || !user) {
      throw new UnauthorizedException('用户名或密码错误')
    }
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = now + this.config.getOrThrow<number>('app.jwtExpiresSeconds')
    const accessToken = await this.jwt.signAsync({ sub: user.id, ver: user.tokenVersion, jti: randomUUID(), iat: now, exp: expiresAt })
    const result = await this.database(() =>
      this.users
        .createQueryBuilder()
        .update(AdminUser)
        .set({ token: accessToken, lastLoginTime: now, lastLoginIp: ip, updateTime: now })
        .where('id = :id AND token_version = :version AND password_hash = :hash AND is_deleted = 0 AND is_enabled = :enabled', {
          id: user.id,
          version: user.tokenVersion,
          hash: user.passwordHash,
          enabled: true,
        })
        .execute(),
    )
    if (result.affected !== 1) throw new UnauthorizedException('登录状态已变化，请重新登录')
    return { accessToken, expiresAt }
  }

  /**
   * 校验访问令牌
   * @description 验证 JWT 签名与声明后，再按用户、令牌版本与删除标记检查数据库状态
   * @param token Bearer 访问令牌
   * @returns 当前用户实体与令牌声明
   */
  async authenticate(token: string): Promise<{ user: AdminUser; claims: AdminTokenClaims }> {
    let claims: AdminTokenClaims
    try {
      claims = await this.jwt.verifyAsync<AdminTokenClaims>(token, { algorithms: ['HS256'] })
      if (
        typeof claims.sub !== 'string' ||
        !/^[a-f0-9-]{36}$/.test(claims.sub) ||
        !Number.isSafeInteger(claims.ver) ||
        claims.ver < 1 ||
        typeof claims.jti !== 'string' ||
        !Number.isSafeInteger(claims.iat) ||
        !Number.isSafeInteger(claims.exp) ||
        claims.exp <= claims.iat
      )
        throw new Error('Invalid claims')
    } catch {
      throw new UnauthorizedException('登录已失效，请重新登录')
    }
    const user = await this.database(() =>
      this.users.findOne({ where: { id: claims.sub, isDeleted: 0, enabled: true, tokenVersion: claims.ver } }),
    )
    if (!user) throw new UnauthorizedException('登录已失效，请重新登录')
    return { user, claims }
  }

  /**
   * 用户全端登出
   * @description 仅撤销当前已验证的令牌版本，保留最近登录时间与 IP 供审计
   * @param userId 用户 UUID
   * @param version 当前令牌版本
   */
  async logout(userId: string, version: number): Promise<void> {
    const result = await this.database(() =>
      this.users
        .createQueryBuilder()
        .update(AdminUser)
        .set({ tokenVersion: () => 'token_version + 1', token: null, updateTime: Math.floor(Date.now() / 1000) })
        .where('id = :id AND token_version = :version AND is_deleted = 0', { id: userId, version })
        .execute(),
    )
    if (result.affected !== 1) throw new UnauthorizedException('登录已失效，请重新登录')
  }

  private async database<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation()
    } catch {
      // 不记录 QueryFailedError：其中可能包含参数内的原始 token。
      this.logger.error('认证数据库操作失败')
      throw new ServiceUnavailableException(getDefaultErrorMessage(HttpStatus.SERVICE_UNAVAILABLE))
    }
  }
}
