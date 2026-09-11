USE edolas_db;

INSERT INTO site_settings (setting_key, setting_value, setting_group, is_public) VALUES
('server_name', 'EdolasSG', 'brand', TRUE),
('server_ip', 'play.edolassg.vn', 'connection', TRUE),
('bedrock_ip', 'play.edolassg.vn', 'connection', TRUE),
('bedrock_port', '19132', 'connection', TRUE),
('discord_url', 'https://discord.gg/edolassg', 'community', TRUE),
('maintenance_mode', 'false', 'system', TRUE)
ON DUPLICATE KEY UPDATE setting_key = VALUES(setting_key);

INSERT INTO users (username, display_name, role_name) VALUES
('edolas_admin', 'Edolas Admin', 'owner'),
('stonecrafter', 'StoneCrafter', 'builder'),
('skywanderer', 'SkyWanderer', 'player')
ON DUPLICATE KEY UPDATE display_name = VALUES(display_name);

INSERT INTO announcements (title, body, published_at) VALUES
('Mùa 3 của EdolasSG bắt đầu vào cuối tuần này', 'Reset một phần economy, mở thêm quest line và bản đồ hub mới.', '2026-08-11'),
('Nâng cấp anti-cheat và hệ thống log', 'Giảm false positive, tăng khả năng truy vết giao dịch và hành vi bất thường.', '2026-08-10')
ON DUPLICATE KEY UPDATE body = VALUES(body);

INSERT INTO game_modes (slug, name, summary, status) VALUES
('survival', 'Survival', 'Sinh tồn cân bằng với kinh tế, nghề nghiệp và bảo vệ khu dân cư.', 'active'),
('skyblock', 'Skyblock', 'Khởi đầu từ hòn đảo nhỏ, mở rộng tài nguyên và cạnh tranh theo mùa.', 'active'),
('creative', 'Creative', 'Xây dựng công trình, tổ chức showcase, và nhận xét sáng tạo từ cộng đồng.', 'active'),
('event-arena', 'Event Arena', 'Mini-game luân phiên, PvP, parkour và challenge đặc biệt theo dịp.', 'active')
ON DUPLICATE KEY UPDATE summary = VALUES(summary), status = VALUES(status);

INSERT INTO forum_categories (slug, title, description, sort_order) VALUES
('announcements', 'Thông báo', 'Cập nhật mùa, sự kiện, maintenance', 1),
('support', 'Support', 'Lỗi kết nối, báo bug, xử lý tài khoản', 2),
('community', 'Cộng đồng', 'Showcase, tuyển đội, giao lưu', 3),
('guide', 'Guide', 'Hướng dẫn chơi, farm, build, economy', 4)
ON DUPLICATE KEY UPDATE description = VALUES(description), sort_order = VALUES(sort_order);

INSERT INTO wiki_clusters (slug, name, description, accent, sort_order) VALUES
('bat-dau', 'Bắt đầu', 'Những hướng dẫn nền tảng dành cho thành viên mới.', 'cyan', 10),
('sinh-ton', 'Sinh tồn', 'Kinh tế, nghề nghiệp và hành trình Survival.', 'violet', 20),
('xay-dung', 'Xây dựng', 'Quy chuẩn và kỹ thuật dành cho builder.', 'sapphire', 30),
('ho-tro', 'Hỗ trợ', 'Kết nối, tài khoản và xử lý sự cố.', 'ice', 40)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), accent = VALUES(accent), sort_order = VALUES(sort_order);

INSERT INTO wiki_pages (cluster_id, slug, title, summary, body, section_name, is_published, sort_order) VALUES
((SELECT id FROM wiki_clusters WHERE slug = 'bat-dau'), 'bat-dau-nhanh', 'Bắt đầu nhanh', 'Cài resource pack, đăng nhập lần đầu, chọn mode phù hợp.', 'Hướng dẫn onboarding cho người mới với các bước kết nối, cài resource pack và lựa chọn chế độ chơi.', 'Bắt đầu', TRUE, 10),
((SELECT id FROM wiki_clusters WHERE slug = 'sinh-ton'), 'kinh-te-nghe', 'Kinh tế & nghề', 'Cách kiếm tiền, trade an toàn, và bảo toàn tài sản.', 'Chi tiết hệ thống kinh tế, nghề nghiệp, giao dịch và các nguyên tắc bảo toàn tài sản trong Survival.', 'Sinh tồn', TRUE, 10),
((SELECT id FROM wiki_clusters WHERE slug = 'xay-dung'), 'quy-dinh-build', 'Quy định build', 'Giới hạn chiều cao, vùng cấm, và nguyên tắc trang trí.', 'Quy chuẩn xây dựng dành cho khu dân cư, công trình cộng đồng và các khu vực được bảo vệ.', 'Xây dựng', TRUE, 10),
((SELECT id FROM wiki_clusters WHERE slug = 'ho-tro'), 'ho-tro-ky-thuat', 'Hỗ trợ kỹ thuật', 'Cách xử lý lag, lỗi connect, và whitelist sync.', 'Tài liệu xử lý các lỗi kết nối phổ biến, lag phía client và trạng thái đồng bộ whitelist.', 'Hỗ trợ', TRUE, 10)
ON DUPLICATE KEY UPDATE cluster_id = VALUES(cluster_id), summary = VALUES(summary), body = VALUES(body), section_name = VALUES(section_name), is_published = VALUES(is_published), sort_order = VALUES(sort_order);

INSERT INTO rules (code, title, summary, severity) VALUES
('EDO-01', 'Không phá hoại công trình', 'Cấm grief, phá block, lava trap hoặc can thiệp trái phép vào tài sản người khác.', 'Tối cao'),
('EDO-02', 'Tôn trọng cộng đồng', 'Không toxic, quấy rối, spam chat, hoặc công kích cá nhân trong game và forum.', 'Nặng'),
('EDO-03', 'Công bằng giao dịch', 'Không scam, mạo danh staff, hoặc lợi dụng bug để trục lợi kinh tế.', 'Tối cao'),
('EDO-04', 'Báo bug đúng kênh', 'Lỗi hệ thống phải báo trong forum hoặc ticket với ảnh/chứng cứ rõ ràng.', 'Nhắc nhở')
ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), severity = VALUES(severity);

INSERT INTO server_stats (stat_key, stat_value, stat_detail) VALUES
('online_today', '1,248', '+12% so với hôm qua'),
('topics_open', '486', 'Trao đổi, guide, support'),
('wiki_pages', '214', 'Hướng dẫn và luật server'),
('response_rate', '98%', 'Forum + ticket nội bộ')
ON DUPLICATE KEY UPDATE stat_value = VALUES(stat_value), stat_detail = VALUES(stat_detail);
