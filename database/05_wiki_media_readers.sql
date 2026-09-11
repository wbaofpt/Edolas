USE edolas_db;

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

