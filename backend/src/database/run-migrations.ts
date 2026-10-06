import { config } from 'dotenv'
import { readdir, readFile } from 'fs/promises'
import { createConnection, type RowDataPacket } from 'mysql2/promise'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env') })
config({ path: resolve(process.cwd(), '.env.local'), override: true })

const MIGRATIONS_DIR = resolve(process.cwd(), 'src/database/migrations')

/**
 * 执行尚未应用的 SQL 迁移
 * @description 按文件名升序执行 src/database/migrations 下的 .sql 文件，已执行的文件记录在
 * schema_migrations 表中，重复执行不会重复应用。注意 MySQL 的 DDL 语句无法回滚，
 * 单个文件执行失败时需人工确认后修复。
 * @returns 无返回值；全部成功以退出码 0 结束，任一失败以退出码 1 结束
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

    const files = (await readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith('.sql')).sort()

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
  process.exit(1)
})
