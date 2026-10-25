import 'reflect-metadata'
import assert from 'node:assert/strict'
import { readdir } from 'node:fs/promises'
import { test } from 'node:test'
import { DataSource, getMetadataArgsStorage } from 'typeorm'
import { SnakeNamingStrategy } from '../dist/config/database-naming-strategy.js'

async function loadEntities() {
  const files = await readdir(new URL('../src/', import.meta.url), { recursive: true })
  const values = []
  for (const file of files.filter((name) => name.endsWith('.entity.ts'))) {
    const exports = await import(new URL(`../dist/${file.replace(/\.ts$/, '.js')}`, import.meta.url))
    values.push(...Object.values(exports))
  }
  // 实体装饰器完成后才能区分实体类与审计基类等普通导出。
  const targets = new Set(getMetadataArgsStorage().tables.map((table) => table.target))
  return values.filter((value) => typeof value === 'function' && targets.has(value))
}

test('所有实体的 MySQL 表与物理字段均声明注释，权限码和路径声明唯一索引', async () => {
  const entities = await loadEntities()
  assert.ok(entities.length > 0)
  // 只构建映射元数据，不连接数据库；同步生成的外键列同样纳入注释检查。
  const source = new DataSource({ type: 'mysql', database: 'schema_test', entities, namingStrategy: new SnakeNamingStrategy() })
  await source.buildMetadatas()
  assert.equal(source.entityMetadatas.length, entities.length)
  for (const metadata of source.entityMetadatas) {
    assert.ok(metadata.comment?.trim(), `${metadata.tableName} 缺少 MySQL 表注释`)
    for (const column of metadata.columns) {
      assert.ok(column.comment?.trim(), `${metadata.tableName}.${column.databaseName} 缺少 MySQL 字段注释`)
    }
  }
  const resource = source.entityMetadatas.find((metadata) => metadata.tableName === 'admin_permission_resource')
  for (const property of ['permission', 'path']) {
    assert.ok(resource.indices.some((index) => index.isUnique && index.columns.length === 1 && index.columns[0].propertyName === property))
    assert.equal(resource.findColumnWithPropertyName(property).isNullable, true, '未配置值必须允许使用 null')
  }
})

test('RBAC 相关表统一具备审计字段、布尔列使用 tinyint unsigned 的 is_ 命名并保留唯一索引', async () => {
  const entities = await loadEntities()
  const source = new DataSource({ type: 'mysql', database: 'schema_test', entities, namingStrategy: new SnakeNamingStrategy() })
  await source.buildMetadatas()
  const metadataOf = (tableName) => {
    const metadata = source.entityMetadatas.find((item) => item.tableName === tableName)
    assert.ok(metadata, `缺少 ${tableName} 实体映射`)
    return metadata
  }
  // 内置用户、RBAC 五张表与接口清单表都必须带审计与软删除字段。
  const auditedTables = [
    'admin_user',
    'admin_role',
    'admin_permission_resource',
    'admin_user_role',
    'admin_role_resource',
    'admin_resource_api',
    'admin_api_resource',
  ]
  const standardTables = new Set(auditedTables)
  for (const tableName of auditedTables) {
    const metadata = metadataOf(tableName)
    for (const [property, databaseName] of [
      ['createTime', 'create_time'],
      ['updateTime', 'update_time'],
      ['createdBy', 'created_by'],
      ['updatedBy', 'updated_by'],
      ['isDeleted', 'is_deleted'],
    ]) {
      const column = metadata.findColumnWithPropertyName(property)
      assert.ok(column, `${tableName} 缺少审计字段 ${property}`)
      assert.equal(column.databaseName, databaseName, `${tableName}.${property} 列名不符合 snake_case 约定`)
      assert.equal(column.isNullable, false, `${tableName}.${databaseName} 不允许为空`)
    }
    const deleted = metadata.findColumnWithPropertyName('isDeleted')
    assert.equal(deleted.type, 'tinyint', `${tableName}.is_deleted 必须使用 tinyint`)
    assert.equal(deleted.unsigned, true, `${tableName}.is_deleted 必须为 unsigned`)
  }
  // 布尔属性保持布尔语义，数据库列必须是 tinyint unsigned 的 is_xxx。
  const booleanColumns = {
    admin_user: { enabled: 'is_enabled' },
    admin_role: { enabled: 'is_enabled', isBuiltin: 'is_builtin' },
    admin_permission_resource: { enabled: 'is_enabled', hidden: 'is_hidden', keepAlive: 'is_keep_alive' },
  }
  for (const [tableName, expected] of Object.entries(booleanColumns)) {
    const metadata = metadataOf(tableName)
    for (const [property, databaseName] of Object.entries(expected)) {
      const column = metadata.findColumnWithPropertyName(property)
      assert.ok(column, `${tableName} 缺少布尔字段 ${property}`)
      assert.equal(column.databaseName, databaseName)
      assert.equal(column.type, 'tinyint')
      assert.equal(column.unsigned, true)
      assert.match(column.comment, /0否，1是/)
    }
  }
  for (const metadata of source.entityMetadatas.filter((item) => standardTables.has(item.tableName))) {
    for (const column of metadata.columns.filter((item) => item.databaseName.startsWith('is_'))) {
      assert.equal(column.type, 'tinyint', `${metadata.tableName}.${column.databaseName} 布尔列必须使用 tinyint`)
      assert.equal(column.unsigned, true, `${metadata.tableName}.${column.databaseName} 布尔列必须为 unsigned`)
    }
  }
  // 内置管理员不再维护独立保护列，统一由 created_by='system' 推导。
  assert.equal(metadataOf('admin_user').findColumnWithPropertyName('isDeletable'), undefined)
  assert.match(String(metadataOf('admin_user').findColumnWithPropertyName('createdBy').default), /system/)
  assert.equal(metadataOf('admin_api_resource').findColumnWithPropertyName('aliases'), undefined)
  // 唯一索引仍由数据库兜底，软删除删除时由业务层释放唯一值。
  const uniqueIndexes = {
    admin_user: ['username'],
    admin_role: ['code'],
    admin_permission_resource: ['name', 'path', 'permission'],
  }
  for (const [tableName, properties] of Object.entries(uniqueIndexes)) {
    const metadata = metadataOf(tableName)
    for (const property of properties) {
      assert.ok(
        metadata.indices.some((index) => index.isUnique && index.columns.length === 1 && index.columns[0].propertyName === property),
        `${tableName}.${property} 缺少单列唯一索引`,
      )
    }
  }
})
