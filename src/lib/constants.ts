import type {
  BookingStatus,
  ConsoleType,
  DayType,
  GameCategory,
  PaymentMethod,
  PaymentStatus,
  ScreenStatus,
  SessionStatus,
  UserRole,
} from "@/lib/types/database";

export const CAFE_NAME = process.env.NEXT_PUBLIC_CAFE_NAME || "USA GAMING";

export const BOOKING_TRACKER_KEY = "usa-gaming-booking-id";

export const INSTAGRAM_URL = "https://www.instagram.com/usa_gaming_arena/";
export const INSTAGRAM_HANDLE = "@usa_gaming_arena";

export const CAFE_GALLERY = [
  { src: "/cafe/02.jpg", alt: "Private PS5 room with red lighting" },
  { src: "/cafe/03.jpg", alt: "Friends playing on bean bags" },
  { src: "/cafe/01.jpg", alt: "USA Gaming Arena storefront" },
  { src: "/cafe/04.jpg", alt: "PS5 setup with DualSense controllers" },
  { src: "/cafe/05.jpg", alt: "Ghost of Yotei on PS5" },
  { src: "/cafe/06.jpg", alt: "Immersive LED gaming room" },
] as const;

/** Public menu prices — per player. Landing page uses these durations. */
export const PUBLIC_PRICING = [
  { duration_minutes: 30, price: 49, label: "30 Minutes" },
  { duration_minutes: 60, price: 89, label: "1 Hour" },
  { duration_minutes: 120, price: 149, label: "2 Hours" },
] as const;

export const GAME_COVERS: Record<string, string> = {
  "Call of Duty":
    "https://play-lh.googleusercontent.com/cKXlbU72_2wSXdjcD_zPWED3EVaaOQVqqHgiA9JoRQMprYen49arNUMTngcRc9UWLnv-ANT9gyQBDQpvAn61lg",
  "EA FC":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhTM5xhFqxFMTUdAng7WRk1VP593ePCRc1h263-ICWFIAfy_OJz6qCyjxn&s=10",
  F1: "https://play-lh.googleusercontent.com/u2qi5FiPxN0jkXx7qLwmtcvbZ0NKeYS4rzTOb83-w-_MHH71IFtPZ8wUPM2tDDDk5FRlV5pmJtGNG3T0o_uf",
  "Gran Turismo":
    "https://image.api.playstation.com/vulcan/ap/rnd/202202/2806/xreKEb65CYM6LKfzgiNLFKlV.png",
  "GTA V":
    "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSOf8J5VcB8Io-brsxFuHO9wWZyHt0eSkCnRWojakyfOA&s",
  "Mortal Kombat":
    "https://play-lh.googleusercontent.com/eq6L2G3aWNK6mptbjF-N0Ybobfm7QB6K3rr8qrUSEiz-d_XfL85gaO7fBg274rqcZn_IJFnGCX4VpeUBXtgeYBM",
  WWE: "https://image.api.playstation.com/vulcan/ap/rnd/202511/2716/a1a698c1912cbafeaec1744f804491492af00a1c359d5806.png",
  Tekken:
    "https://image.api.playstation.com/vulcan/ap/rnd/202212/2009/04S9doVJzhHa0OE8o8wax88S.png",
};

export function resolveGameCover(name: string, imageUrl?: string | null) {
  if (imageUrl) return imageUrl;
  const exact = GAME_COVERS[name];
  if (exact) return exact;
  const match = Object.entries(GAME_COVERS).find(([key]) =>
    name.toLowerCase().includes(key.toLowerCase())
  );
  return match?.[1] ?? null;
}

export const GAME_CATEGORIES: GameCategory[] = [
  "Sports",
  "Racing",
  "Fighting",
  "Action",
  "Adventure",
  "Co-op",
  "Multiplayer",
];

export const CONSOLE_TYPES: ConsoleType[] = ["PS5", "PS4", "Racing Sim", "Other"];

export const SCREEN_STATUSES: ScreenStatus[] = [
  "available",
  "reserved",
  "playing",
  "paused",
  "maintenance",
];

export const BOOKING_STATUSES: BookingStatus[] = [
  "pending",
  "confirmed",
  "cancelled",
  "completed",
  "no_show",
];

export const SESSION_STATUSES: SessionStatus[] = [
  "active",
  "paused",
  "completed",
  "cancelled",
];

export const PAYMENT_METHODS: PaymentMethod[] = ["cash", "upi", "card", "online"];

export const PAYMENT_STATUSES: PaymentStatus[] = [
  "pending",
  "paid",
  "refunded",
  "failed",
];

export const DAY_TYPES: DayType[] = ["weekday", "weekend", "all"];

/** Staff/session durations, including a 1-minute option for timer testing. */
export const DURATION_OPTIONS = [1, 30, 60, 120] as const;

/** Public booking menu — no test durations. */
export const PUBLIC_DURATION_OPTIONS = [30, 60, 120] as const;

export function durationLabel(minutes: number) {
  if (minutes === 1) return "1 minute";
  if (minutes === 30) return "30 minutes";
  if (minutes === 60) return "1 hour";
  if (minutes === 120) return "2 hours";
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} minutes`;
}

export const PLAYER_OPTIONS = [1, 2, 3, 4] as const;

export const ROLE_PERMISSIONS: Record<
  UserRole,
  readonly string[]
> = {
  owner: [
    "dashboard",
    "bookings",
    "screens",
    "games",
    "pricing",
    "customers",
    "earnings",
    "settings",
    "sessions",
  ],
  manager: [
    "dashboard",
    "bookings",
    "screens",
    "games",
    "customers",
    "earnings",
    "sessions",
    "settings",
  ],
  staff: ["dashboard", "bookings", "screens", "sessions"],
} as const;

export const ADMIN_NAV = [
  { title: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard", permission: "dashboard" },
  { title: "Bookings", href: "/admin/bookings", icon: "Calendar", permission: "bookings" },
  { title: "Screens", href: "/admin/screens", icon: "Monitor", permission: "screens" },
  { title: "Games", href: "/admin/games", icon: "Gamepad2", permission: "games" },
  { title: "Pricing", href: "/admin/pricing", icon: "IndianRupee", permission: "pricing" },
  { title: "Customers", href: "/admin/customers", icon: "Users", permission: "customers" },
  { title: "Earnings", href: "/admin/earnings", icon: "TrendingUp", permission: "earnings" },
  { title: "Settings", href: "/admin/settings", icon: "Settings", permission: "settings" },
] as const;
