import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

/** scrypt 参数：N=2^17、r=8、p=1，maxmem 限制为 256 MB */
const OPTIONS = { N: 2 ** 17, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }

/**
 * 密码服务
 * @description 使用固定强度的异步 scrypt 存储明文密码，不记录明文；明文密码统一由调用方传入，服务本身不生成密码
 */
@Injectable()
export class PasswordService {
  /**
   * 生成密码哈希
   * @description 为密码生成独立随机盐并派生 scrypt 哈希，同一密码每次生成的结果均不同
   * @param password 明文密码
   * @returns 编码后的哈希字符串，包含算法参数、盐与派生结果
   */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex')
    const key = await this.derive(password, salt)
    return `scrypt$131072$8$1$${salt}$${key.toString('hex')}`
  }

  /**
   * 校验密码
   * @description 解析编码哈希后重新派生并做恒定时间比较；未知用户同样执行一次等价计算，以减少账号枚举差异
   * @param password 待校验明文密码
   * @param encoded 已存储的编码哈希，缺省或格式非法时按校验失败处理
   * @returns 是否匹配
   */
  async verify(password: string, encoded?: string): Promise<boolean> {
    const parts = encoded?.split('$')
    const valid =
      parts?.length === 6 &&
      parts[0] === 'scrypt' &&
      parts[1] === '131072' &&
      parts[2] === '8' &&
      parts[3] === '1' &&
      /^[a-f0-9]{32}$/.test(parts[4] ?? '') &&
      /^[a-f0-9]{128}$/.test(parts[5] ?? '')
    const key = await this.derive(password, valid ? parts[4]! : '00000000000000000000000000000000')
    const expected = valid ? Buffer.from(parts[5]!, 'hex') : Buffer.alloc(64)
    return timingSafeEqual(key, expected) && valid === true
  }

  private derive(password: string, salt: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      scrypt(password, salt, 64, OPTIONS, (error, key) => {
        if (error) reject(error)
        else resolve(key)
      })
    })
  }
}
