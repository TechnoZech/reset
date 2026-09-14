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

export const CAFE_NAME = process.env.NEXT_PUBLIC_CAFE_NAME || "RESET";

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

export const DURATION_OPTIONS = [30, 60, 90, 120] as const;

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
