import type { Announcement, ForumTopic, GameMode, NavItem, RuleItem, ServerStat, WikiCard } from "@/lib/types";

export const navItems: NavItem[] = [
  { href: "/#home", label: "Trang chủ" },
  { href: "/#about", label: "Giới thiệu" },
  { href: "/game-modes", label: "Chế độ chơi" },
  { href: "/store", label: "Nạp thẻ" },
  { href: "/forum", label: "Diễn đàn" },
  { href: "/wiki", label: "Wiki" },
  { href: "/discipline", label: "Kỷ luật" }
];

export const heroStats: ServerStat[] = [
  { label: "Người chơi online", value: "1,248", detail: "Cộng đồng hoạt động mỗi ngày" },
  { label: "Thành viên Discord", value: "18K+", detail: "Cùng trò chuyện và săn sự kiện" },
  { label: "Chế độ chơi", value: "04", detail: "Luôn có thế giới dành cho bạn" },
  { label: "Uptime", value: "99.9%", detail: "Máy chủ ổn định 24/7" }
];

export const gameModes: GameMode[] = [
  {
    slug: "survival",
    name: "Survival",
    summary: "Sinh tồn cân bằng với kinh tế, nghề nghiệp và bảo vệ khu dân cư.",
    players: "Đông người chơi",
    accent: "from-[#8B5CF6] to-[#38BDF8]",
    features: ["PE/PC", "Survival", "Kinh tế"],
    telemetry: { status: "offline", online: 0 }
  },
  {
    slug: "op-skyblock",
    name: "Skyblock",
    summary: "Khởi đầu từ một hòn đảo nhỏ, mở rộng tài nguyên và cạnh tranh theo mùa.",
    players: "Mùa mới",
    accent: "from-[#38BDF8] to-[#67E8F9]",
    features: ["PE/PC", "Skyblock", "Seasonal"],
    telemetry: { status: "offline", online: 0 }
  },
  {
    slug: "creative",
    name: "Creative",
    summary: "Xây dựng công trình, tổ chức showcase và chia sẻ ý tưởng với cộng đồng.",
    players: "Đang mở",
    accent: "from-[#8B5CF6] to-[#67E8F9]",
    features: ["PE/PC", "Creative", "Xây dựng"],
    telemetry: { status: "offline", online: 0 }
  },
  {
    slug: "event-arena",
    name: "Event Arena",
    summary: "Mini-game luân phiên, PvP, parkour và thử thách đặc biệt theo dịp.",
    players: "Cuối tuần",
    accent: "from-[#67E8F9] to-[#E0F2FE]",
    features: ["PE/PC", "Event", "PvP"],
    telemetry: { status: "offline", online: 0 }
  }
];

export const forumTopics: ForumTopic[] = [
  { title: "Tuyển staff cho mùa mới", category: "Thông báo", replies: 84, lastUpdate: "2 giờ trước" },
  { title: "Hướng dẫn farm emerald hiệu quả", category: "Guide", replies: 37, lastUpdate: "26 phút trước" },
  { title: "Tổng hợp showcase build cuối tuần", category: "Cộng đồng", replies: 121, lastUpdate: "4 giờ trước" },
  { title: "Báo cáo lỗi giao diện shop NPC", category: "Hỗ trợ", replies: 18, lastUpdate: "11 phút trước" }
];

export const wikiCards: WikiCard[] = [
  { title: "Bắt đầu nhanh", summary: "Cài resource pack, đăng nhập lần đầu và chọn mode phù hợp.", tag: "Onboarding" },
  { title: "Kinh tế & nghề", summary: "Cách kiếm tiền, giao dịch an toàn và bảo toàn tài sản.", tag: "Gameplay" },
  { title: "Quy định xây dựng", summary: "Giới hạn chiều cao, vùng cấm và nguyên tắc trang trí.", tag: "Quy chuẩn" },
  { title: "Hỗ trợ kỹ thuật", summary: "Cách xử lý lag, lỗi kết nối và whitelist sync.", tag: "Support" }
];

export const rules: RuleItem[] = [
  { code: "EDO-01", title: "Không phá hoại công trình", summary: "Cấm grief, phá block, lava trap hoặc can thiệp trái phép vào tài sản người khác.", severity: "Tối cao" },
  { code: "EDO-02", title: "Tôn trọng cộng đồng", summary: "Không toxic, quấy rối, spam chat hoặc công kích cá nhân trong game và diễn đàn.", severity: "Nặng" },
  { code: "EDO-03", title: "Công bằng giao dịch", summary: "Không scam, mạo danh staff hoặc lợi dụng lỗi để trục lợi kinh tế.", severity: "Tối cao" },
  { code: "EDO-04", title: "Báo lỗi đúng kênh", summary: "Lỗi hệ thống cần được báo trên diễn đàn hoặc ticket với bằng chứng rõ ràng.", severity: "Nhắc nhở" }
];

export const announcements: Announcement[] = [
  { title: "Mùa 3 của EdolasSG chính thức bắt đầu", body: "Bản đồ hub mới, quest line mới và hàng loạt phần thưởng đang chờ bạn khám phá.", date: "11/08/2026" },
  { title: "Nâng cấp anti-cheat và hệ thống log", body: "Giảm false positive, tăng khả năng truy vết giao dịch và hành vi bất thường.", date: "10/08/2026" }
];
