export type NavItem = {
  href: string;
  label: string;
};

export type ServerStat = {
  label: string;
  value: string;
  detail: string;
};

export type GameMode = {
  slug: string;
  name: string;
  summary: string;
  players: string;
  accent: string;
  features: string[];
  bannerPath?: string | null;
  telemetry: {
    status: "online" | "offline";
    online: number;
  };
};

export type ForumTopic = {
  title: string;
  category: string;
  replies: number;
  lastUpdate: string;
};

export type WikiCard = {
  title: string;
  summary: string;
  tag: string;
};

export type RuleItem = {
  code: string;
  title: string;
  summary: string;
  severity: "Tối cao" | "Nặng" | "Nhắc nhở";
};

export type Announcement = {
  title: string;
  body: string;
  date: string;
};
