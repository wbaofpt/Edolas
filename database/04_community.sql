USE edolas_db;

ALTER TABLE users
  ADD COLUMN bio VARCHAR(500) NULL AFTER avatar_url;

ALTER TABLE forum_topics
  ADD COLUMN views_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER replies_count,
  ADD COLUMN shares_count INT UNSIGNED NOT NULL DEFAULT 0 AFTER views_count,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER is_pinned;

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

ALTER TABLE wiki_pages
  ADD COLUMN cluster_id BIGINT UNSIGNED NULL AFTER id,
  ADD COLUMN author_id BIGINT UNSIGNED NULL AFTER cluster_id,
  ADD COLUMN is_published BOOLEAN NOT NULL DEFAULT TRUE AFTER body,
  ADD COLUMN sort_order INT NOT NULL DEFAULT 0 AFTER is_published,
  ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER sort_order,
  ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at,
  ADD KEY wiki_pages_cluster_id_index (cluster_id),
  ADD CONSTRAINT wiki_pages_cluster_fk FOREIGN KEY (cluster_id) REFERENCES wiki_clusters(id) ON DELETE SET NULL,
  ADD CONSTRAINT wiki_pages_author_fk FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO wiki_clusters (slug, name, description, accent, sort_order) VALUES
  ('bat-dau', 'Bắt đầu', 'Những hướng dẫn nền tảng dành cho thành viên mới.', 'cyan', 10),
  ('sinh-ton', 'Sinh tồn', 'Kinh tế, nghề nghiệp và hành trình Survival.', 'violet', 20),
  ('xay-dung', 'Xây dựng', 'Quy chuẩn và kỹ thuật dành cho builder.', 'sapphire', 30),
  ('ho-tro', 'Hỗ trợ', 'Kết nối, tài khoản và xử lý sự cố.', 'ice', 40)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  accent = VALUES(accent),
  sort_order = VALUES(sort_order);

UPDATE wiki_pages
SET cluster_id = CASE section_name
  WHEN 'Onboarding' THEN (SELECT id FROM wiki_clusters WHERE slug = 'bat-dau')
  WHEN 'Gameplay' THEN (SELECT id FROM wiki_clusters WHERE slug = 'sinh-ton')
  WHEN 'Quy chuẩn' THEN (SELECT id FROM wiki_clusters WHERE slug = 'xay-dung')
  ELSE (SELECT id FROM wiki_clusters WHERE slug = 'ho-tro')
END
WHERE cluster_id IS NULL;
