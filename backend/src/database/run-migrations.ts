import { config } from 'dotenv'
import { readdir, readFile } from 'fs/promises'
import { createConnection, type RowDataPacket } from 'mysql2/promise'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/database/migrations')

/**
 * 解析迁移文件名中的版本号
 * @description 取 `V{序号}__` 中的序号，用于按数值而非字典序排序：`Array.prototype.sort()` 的默认
 * 字典序会把 `V10__…` 排在 `V2__…` 之前，而迁移命名不要求补零，出现第 10 个迁移时会静默乱序执行，
 * `schema_migrations` 也会记录错误的应用顺序。
 * @param filename 迁移文件名
 * @returns 版本号；文件名不匹配 `V{序号}__` 时为 null
 */
function parseMigrationVersion(filename: string): number | null {
  const version = /^V(\d+)__/.exec(filename)?.[1]
  if (version === undefined) {
    return null
  }
  return parseInt(version, 10)
}

/**
 * 按版本号数值升序比较迁移文件名
 * @description 两侧都能解析出版本号且不相等时按数值比较；其余情况（含无法解析的文件名）回退到
 * localeCompare，保证比较结果确定且可复现。
 * @param left 迁移文件名
 * @param right 迁移文件名
 * @returns 负数表示 left 在前，正数表示 right 在前
 */
function compareMigrations(left: string, right: string): number {
  const leftVersion = parseMigrationVersion(left)
  const rightVersion = parseMigrationVersion(right)
  if (leftVersion !== null && rightVersion !== null && leftVersion !== rightVersion) {
    return leftVersion - rightVersion
  }
  return left.localeCompare(right)
}

/**
 * 执行尚未应用的 SQL 迁移
 * @description 按文件名中的版本号数值升序执行 src/database/migrations 下的 .sql 文件，已执行的文件
 * 记录在 schema_migrations 表中，重复执行不会重复应用。单个迁移文件只能包含一条语句（连接使用
 * multipleStatements: false，多语句会报 ER_PARSE_ERROR 1064），需要多条语句时拆分为多个迁移文件。
 * 注意 MySQL 的 DDL 语句无法回滚，单个文件执行失败时需人工确认后修复。
 * @returns 无返回值；全部成功以退出码 0 结束，任一失败或未找到迁移文件时以退出码 1 结束
 */
async function runMigrations(): Promise<void> {
  const connection = await createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_DATABASE || 'demo',
    multipleStatements: false,
  })

  try {
    await connection.query(
      'CREATE TABLE IF NOT EXISTS `schema_migrations` (' +
        "`filename` VARCHAR(255) NOT NULL COMMENT '迁移文件名'," +
        "`applied_at` INT NOT NULL COMMENT '应用时间（Unix 时间戳）'," +
        'PRIMARY KEY (`filename`)' +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='迁移执行记录表'",
    )

    const [rows] = await connection.query<RowDataPacket[]>('SELECT `filename` FROM `schema_migrations`')
    const applied = new Set(rows.map((row) => String(row.filename)))

    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort(compareMigrations)

    if (files.length === 0) {
      console.warn(`[migration] 未找到任何迁移文件，请确认执行目录正确：${MIGRATIONS_DIR}`)
      process.exitCode = 1
      return
    }

    for (const file of files) {
      if (applied.has(file)) {
        console.warn(`[migration] 跳过（已应用）：${file}`)
        continue
      }
      const sql = await readFile(resolve(MIGRATIONS_DIR, file), 'utf8')
      console.warn(`[migration] 执行：${file}`)
      await connection.query(sql)
      await connection.query('INSERT INTO `schema_migrations` (`filename`, `applied_at`) VALUES (?, ?)', [
        file,
        Math.floor(Date.now() / 1000),
      ])
    }

    console.warn(`[migration] 完成，共 ${files.length} 个迁移文件`)
  } finally {
    await connection.end()
  }
}

runMigrations().catch((error: unknown) => {
  console.error('[migration] 执行失败：', error)
  // 使用 exitCode 而非 process.exit()：Windows 管道下强制退出可能截断尚未刷出的诊断输出
  process.exitCode = 1
})
