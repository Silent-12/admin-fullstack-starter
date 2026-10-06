-- ============================================================
-- 模板条目表 (template_items)
-- 说明：CRUD 参考模块 template-api 的数据表，字段与 TemplateItem 实体一一对应
-- 字符集：utf8mb4（支持 emoji 和特殊字符）
-- ============================================================

CREATE TABLE IF NOT EXISTS `template_items` (
  `id`          BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '主键 ID',
  `name`        VARCHAR(255) NOT NULL                 COMMENT '名称',
  `description` VARCHAR(500) DEFAULT NULL             COMMENT '描述',
  `status`      VARCHAR(50)  NOT NULL DEFAULT 'active' COMMENT '状态（active | inactive | archived）',
  `priority`    INT          NOT NULL DEFAULT 0       COMMENT '优先级（数值越大优先级越高）',
  `is_enabled`  TINYINT(1)   NOT NULL DEFAULT 1       COMMENT '是否启用',
  `created_at`  INT          NOT NULL                 COMMENT '创建时间（Unix 时间戳）',
  `updated_at`  INT          NOT NULL                 COMMENT '更新时间（Unix 时间戳）',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='模板条目表';
