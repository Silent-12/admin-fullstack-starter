/**
 * 内置数据初始化异常
 * @description 标识可安全展示给运维人员的初始化失败原因；数据库原始异常不得使用该类型，避免 SQL、连接地址与凭证进入终端
 */
export class AdminInitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AdminInitError'
  }
}
