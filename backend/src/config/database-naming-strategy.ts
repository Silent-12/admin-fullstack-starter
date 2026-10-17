import type { NamingStrategyInterface } from 'typeorm'
import { DefaultNamingStrategy } from 'typeorm'
import { snakeCase } from 'typeorm/util/StringUtils.js'

/**
 * 蛇形命名策略
 * @description 自动将驼峰命名转换为下划线命名，用于数据库表和字段名
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  /**
   * 将实体类名转换为表名
   * @description 显式自定义表名优先，否则将实体类名转为蛇形
   * @param entityName 实体类名
   * @param customName 自定义表名（如果有）
   * @returns 转换后的表名
   */
  tableName(entityName: string, customName: string): string {
    return customName || snakeCase(entityName)
  }

  /**
   * 将属性名转换为列名
   * @description 嵌入前缀与列名以 `_` 连接后转蛇形，显式自定义列名优先于属性名
   * @param propertyName 属性名（驼峰）
   * @param customName 自定义列名（如果有）
   * @param embeddedPrefixes 嵌入前缀
   * @returns 转换后的列名
   */
  columnName(propertyName: string, customName: string, embeddedPrefixes: string[]): string {
    return snakeCase(embeddedPrefixes.join('_')) + (customName || snakeCase(propertyName))
  }

  /**
   * 将属性名转换为关系列名
   * @description 关系属性名直接转为蛇形列名
   * @param propertyName 关系属性名
   * @returns 转换后的关系列名
   */
  relationName(propertyName: string): string {
    return snakeCase(propertyName)
  }

  /**
   * 将属性名转换为外键列名
   * @description 按表名与关联列名生成蛇形外键名，固定追加 `_fk` 后缀
   * @param tableName 表名
   * @param columnNames 列名数组
   * @returns 转换后的外键列名
   */
  foreignKeyName(tableName: string, columnNames: string[]): string {
    const columnPart = columnNames.join('_')
    return snakeCase(`${tableName}_${columnPart}_fk`)
  }

  /**
   * 将属性名转换为索引名
   * @description 按表名与索引列名生成蛇形索引名，固定追加 `_idx` 后缀
   * @param tableName 表名
   * @param columns 列名数组
   * @returns 转换后的索引名
   */
  indexName(tableName: string, columns: string[]): string {
    return snakeCase(`${tableName}_${columns.join('_')}_idx`)
  }

  /**
   * 将属性名转换为唯一约束名
   * @description 按表名与约束列名生成蛇形唯一约束名，固定追加 `_unique` 后缀
   * @param tableName 表名
   * @param columns 列名数组
   * @returns 转换后的唯一约束名
   */
  uniqueConstraintName(tableName: string, columns: string[]): string {
    return snakeCase(`${tableName}_${columns.join('_')}_unique`)
  }
}
