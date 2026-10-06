-- ============================================================
-- 访问日志表 (access_logs)
-- 说明：记录所有 HTTP 请求的访问信息，用于生产环境请求审计与性能分析
-- 字符集：utf8mb4（支持 emoji 和特殊字符）
-- ============================================================

CREATE TABLE IF NOT EXISTS `access_logs` (
  `id`              BIGINT       NOT NULL AUTO_INCREMENT  COMMENT '主键',
  `trace_id`        VARCHAR(255) NOT NULL                 COMMENT '请求链路追踪 ID',
  `method`          VARCHAR(255) NOT NULL                 COMMENT 'HTTP 方法 (GET/POST/PUT/DELETE 等)',
  `url`             VARCHAR(255) NOT NULL                 COMMENT '请求路径（含 query 参数）',
  `status_code`     INT          NOT NULL                 COMMENT 'HTTP 响应状态码',
  `duration`        INT          NOT NULL                 COMMENT '请求处理耗时（毫秒）',
  `ip`              VARCHAR(255) NOT NULL                 COMMENT '客户端 IP 地址（兼容 IPv6）',
  `source`          TINYINT      NOT NULL DEFAULT 1       COMMENT '请求来源：1=用户端 2=后台管理 3=外部回调/系统接口',
  `user_agent`      VARCHAR(255) DEFAULT NULL             COMMENT '客户端 User-Agent',
  `referer`         VARCHAR(255) DEFAULT NULL             COMMENT '请求来源 Referer',
  `request_body`    LONGTEXT     DEFAULT NULL             COMMENT '请求体 JSON 字符串（脱敏后）',
  `response_body`   LONGTEXT     DEFAULT NULL             COMMENT '响应体 JSON 字符串（可选）',
  `created_at`      INT          NOT NULL                 COMMENT '记录时间（10 位 Unix 时间戳）',
  PRIMARY KEY (`id`),
  INDEX `idx_created_at`    (`created_at`),
  INDEX `idx_status_code`   (`status_code`),
  INDEX `idx_trace_id`      (`trace_id`),
  INDEX `idx_source_created_at` (`source`, `created_at`),
  INDEX `idx_ip_created_at` (`ip`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='HTTP 请求访问日志表';
