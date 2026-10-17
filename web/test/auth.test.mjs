import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFile } from 'node:fs/promises'
import ts from 'typescript'

// 直接编译被测纯函数，不引入额外测试框架或浏览器存储模拟。
const source = await readFile(new URL('../src/utils/navigation/login.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext }
})
globalThis.window = { location: { origin: 'http://localhost:3006' } }
const { getLoginRedirect } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`
)

test('保留正常站内路径、查询参数与 hash', () => {
  assert.equal(
    getLoginRedirect('/example/dashboard/console?tab=one#details'),
    '/example/dashboard/console?tab=one#details'
  )
})

test('拒绝外站、编码绕过、反斜杠、控制字符与登录循环', () => {
  for (const value of [
    undefined,
    ['//evil.example'],
    'https://evil.example',
    '//evil.example',
    '/%2fevil.example',
    '/\\evil.example',
    '/%5cevil.example',
    '/auth/login',
    '/auth/login?redirect=/',
    '/auth/%6cogin',
    '/test\npath',
    '/%00test',
    '/%zz'
  ]) {
    assert.equal(getLoginRedirect(value), '/')
  }
})
