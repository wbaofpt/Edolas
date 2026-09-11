USE edolas_db;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  role_name VARCHAR(30) NOT NULL DEFAULT 'player',
  account_status VARCHAR(20) NOT NULL DEFAULT 'active',
  locked_at TIMESTAMP NULL,
  locked_by BIGINT UNSIGNED NULL,
  lock_reason VARCHAR(300) NULL,
  disabled_until TIMESTAMP NULL,
  disabled_forever BOOLEAN NOT NULL DEFAULT FALSE,
  disabled_by BIGINT UNSIGNED NULL,
  disabled_reason VARCHAR(300) NULL,
  owner_slot TINYINT GENERATED ALWAYS AS (CASE WHEN role_name = 'owner' THEN 1 ELSE NULL END) STORED,
  avatar_url VARCHAR(255) DEFAULT NULL,
  bio VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY users_owner_slot_unique (owner_slot)
);

CREATE TABLE IF NOT EXISTS announcements (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  published_at DATE NOT NULL
  ,deleted_at TIMESTAMP NULL, deleted_by BIGINT UNSIGNED NULL, purge_after TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS game_modes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  summary TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  banner_path VARCHAR(255) NULL,
  tags_json JSON NULL
  ,deleted_at TIMESTAMP NULL, deleted_by BIGINT UNSIGNED NULL, purge_after TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS forum_categories (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(60) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS forum_topics (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  category_id BIGINT UNSIGNED NOT NULL,
  author_id BIGINT UNSIGNED DEFAULT NULL,
  title VARCHAR(200) NOT NULL,
  content MEDIUMTEXT NOT NULL,
  replies_count INT NOT NULL DEFAULT 0,
  views_count INT UNSIGNED NOT NULL DEFAULT 0,
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by BIGINT UNSIGNED NULL,
  purge_after TIMESTAMP NULL,
  CONSTRAINT fk_forum_topics_category FOREIGN KEY (category_id) REFERENCES forum_categories(id) ON DELETE CASCADE,
  CONSTRAINT fk_forum_topics_author FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id BIGINT UNSIGNED NOT NULL,
  followed_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (follower_id, followed_id),
  KEY user_follows_followed_id_index (followed_id),
  CONSTRAINT user_follows_not_self CHECK (follower_id <> followed_id),
  CONSTRAINT user_follows_follower_fk FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_follows_followed_fk FOREIGN KEY (followed_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_topic_likes (
  topic_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (topic_id, user_id),
  KEY forum_topic_likes_user_id_index (user_id),
  CONSTRAINT forum_topic_likes_topic_fk FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
  CONSTRAINT forum_topic_likes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_comments (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  topic_id BIGINT UNSIGNED NOT NULL,
  parent_id BIGINT UNSIGNED NULL,
  author_id BIGINT UNSIGNED NOT NULL,
  content TEXT NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY forum_comments_topic_index (topic_id, created_at),
  CONSTRAINT forum_comments_topic_fk FOREIGN KEY (topic_id) REFERENCES forum_topics(id) ON DELETE CASCADE,
  CONSTRAINT forum_comments_parent_fk FOREIGN KEY (parent_id) REFERENCES forum_comments(id) ON DELETE CASCADE,
  CONSTRAINT forum_comments_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_comment_likes (
  comment_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comment_id, user_id),
  CONSTRAINT forum_comment_likes_comment_fk FOREIGN KEY (comment_id) REFERENCES forum_comments(id) ON DELETE CASCADE,
  CONSTRAINT forum_comment_likes_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS wiki_clusters (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  slug VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(300) NOT NULL,
  accent VARCHAR(20) NOT NULL DEFAULT 'cyan',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS wiki_pages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  cluster_id BIGINT UNSIGNED DEFAULT NULL,
  author_id BIGINT UNSIGNED DEFAULT NULL,
  slug VARCHAR(80) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  body MEDIUMTEXT NOT NULL,
  section_name VARCHAR(80) NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by BIGINT UNSIGNED NULL,
  purge_after TIMESTAMP NULL,
  KEY wiki_pages_cluster_id_index (cluster_id),
  CONSTRAINT wiki_pages_cluster_fk FOREIGN KEY (cluster_id) REFERENCES wiki_clusters(id) ON DELETE SET NULL,
  CONSTRAINT wiki_pages_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wiki_media (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  page_id BIGINT UNSIGNED NULL,
  uploader_id BIGINT UNSIGNED NULL,
  media_type ENUM('image', 'gif', 'video') NOT NULL,
  path VARCHAR(255) NOT NULL UNIQUE,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  size_bytes BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  deleted_by BIGINT UNSIGNED NULL,
  purge_after TIMESTAMP NULL,
  KEY wiki_media_page_id_index (page_id),
  KEY wiki_media_uploader_id_index (uploader_id),
  CONSTRAINT wiki_media_page_fk FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  CONSTRAINT wiki_media_uploader_fk FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS wiki_page_readers (
  page_id BIGINT UNSIGNED NOT NULL,
  reader_hash CHAR(64) NOT NULL,
  user_id BIGINT UNSIGNED NULL,
  open_count INT UNSIGNED NOT NULL DEFAULT 1,
  first_opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_opened_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_heartbeat TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (page_id, reader_hash),
  KEY wiki_page_readers_heartbeat_index (page_id, last_heartbeat),
  KEY wiki_page_readers_user_id_index (user_id),
  CONSTRAINT wiki_page_readers_page_fk FOREIGN KEY (page_id) REFERENCES wiki_pages(id) ON DELETE CASCADE,
  CONSTRAINT wiki_page_readers_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS rules (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL UNIQUE,
  title VARCHAR(160) NOT NULL,
  summary TEXT NOT NULL,
  severity ENUM('Tối cao', 'Nặng', 'Nhắc nhở') NOT NULL DEFAULT 'Nhắc nhở'
  ,deleted_at TIMESTAMP NULL, deleted_by BIGINT UNSIGNED NULL, purge_after TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS server_stats (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  stat_key VARCHAR(60) NOT NULL UNIQUE,
  stat_value VARCHAR(80) NOT NULL,
  stat_detail VARCHAR(160) NOT NULL,
  deleted_at TIMESTAMP NULL,
  deleted_by BIGINT UNSIGNED NULL,
  purge_after TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS site_settings (
  setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
  setting_value TEXT NOT NULL,
  setting_group VARCHAR(40) NOT NULL DEFAULT 'general',
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  updated_by BIGINT UNSIGNED NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY site_settings_group_index (setting_group),
  CONSTRAINT site_settings_updated_by_fk FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  actor_id BIGINT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  target_type VARCHAR(40) NOT NULL,
  target_id VARCHAR(80) NULL,
  summary VARCHAR(300) NOT NULL,
  metadata JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY admin_audit_actor_index (actor_id),
  KEY admin_audit_created_index (created_at),
  KEY admin_audit_target_index (target_type, target_id),
  CONSTRAINT admin_audit_actor_fk FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
);
