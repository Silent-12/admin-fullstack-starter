import { Transform } from 'class-transformer'
import { IsString, Length, Matches } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

/**
 * 登录参数
 * @description 使用原始输入检查类型，避免全局隐式转换将数字或数组变成字符串
 */
export class LoginDto {
  // 仅对字符串输入去除首尾空格并转小写，非字符串保留原值交给校验器报错
  @ApiProperty({ description: '用户名，小写字母开头并可带数字后缀', example: 'admin', maxLength: 64 })
  @Transform(({ obj }: { obj: Record<string, unknown> }) =>
    typeof obj.userName === 'string' ? obj.userName.trim().toLowerCase() : obj.userName,
  )
  @IsString({ message: '用户名必须为字符串' })
  @Length(1, 64, { message: '用户名长度必须为1至64位' })
  @Matches(/^[a-z][a-z0-9]{0,63}$/, { message: '用户名须以小写字母开头且仅含小写字母或数字' })
  userName!: string

  // 直接取原始值，避免全局隐式转换改写密码
  @ApiProperty({ description: '密码，原样校验，不去除空格', maxLength: 128 })
  @Transform(({ obj }: { obj: Record<string, unknown> }) => obj.password)
  @IsString({ message: '密码必须为字符串' })
  @Length(1, 128, { message: '密码长度必须为1至128位' })
  password!: string
}
