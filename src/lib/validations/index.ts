import { z } from "zod";
import {
  DURATION_OPTIONS,
  GAME_CATEGORIES,
  PLAYER_OPTIONS,
} from "@/lib/constants";
import type { GameCategory } from "@/lib/types/database";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const guestBookingSchema = z.object({
  name: z.string().min(2, "Name is required").max(80),
  mobile: z
    .string()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  players: z.coerce.number().refine((n) => (PLAYER_OPTIONS as readonly number[]).includes(n), {
    message: "Select 1–4 players",
  }),
  booking_date: z.string().min(1, "Select a date"),
  start_time: z.string().min(1, "Select a time"),
  duration_minutes: z.coerce.number().int().positive(),
  game_id: z.string().uuid("Select a game"),
  notes: z.string().max(500).optional(),
});

export const startSessionSchema = z.object({
  screen_id: z.string().uuid(),
  customer_mode: z.enum(["existing", "new", "walkin"]),
  customer_id: z.string().uuid().optional(),
  customer_name: z.string().min(2).max(80).optional(),
  customer_mobile: z
    .string()
    .regex(/^[6-9]\d{9}$|^0000000000$/)
    .optional(),
  players: z.coerce.number().int().min(1).max(4),
  game_id: z.string().uuid().optional().nullable(),
  duration_minutes: z.coerce
    .number()
    .refine((n) => (DURATION_OPTIONS as readonly number[]).includes(n)),
  payment_method: z.enum(["cash", "upi", "card", "online"]),
  booking_id: z.string().uuid().optional(),
});

export const endSessionSchema = z.object({
  session_id: z.string().uuid(),
  payment_method: z.enum(["cash", "upi", "card", "online"]).optional(),
});

export const screenSchema = z.object({
  name: z.string().min(2).max(40),
  console_type: z.enum(["PS5", "PS4", "Racing Sim", "Other"]),
  display_name: z.string().max(60).optional().nullable(),
  hourly_rate: z.coerce.number().min(0),
  status: z
    .enum(["available", "reserved", "playing", "paused", "maintenance"])
    .optional(),
  is_active: z.boolean().optional(),
});

export const gameSchema = z
  .object({
    name: z.string().min(1).max(80),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().optional().nullable().or(z.literal("")),
    category: z.enum(GAME_CATEGORIES as [GameCategory, ...GameCategory[]]),
    min_players: z.coerce.number().int().min(1).max(8),
    max_players: z.coerce.number().int().min(1).max(8),
    multiplayer: z.boolean(),
    local_multiplayer: z.boolean(),
    online_multiplayer: z.boolean(),
    is_active: z.boolean().optional(),
  })
  .refine((d) => d.max_players >= d.min_players, {
    message: "Max players must be ≥ min players",
    path: ["max_players"],
  });

export const pricingRuleSchema = z.object({
  name: z.string().min(1).max(80),
  console_type: z.enum(["PS5", "PS4", "Racing Sim", "Other"]),
  duration_minutes: z.coerce.number().int().positive(),
  price: z.coerce.number().min(0),
  start_time: z.string().optional().nullable(),
  end_time: z.string().optional().nullable(),
  day_type: z.enum(["weekday", "weekend", "all"]),
  is_active: z.boolean().optional(),
});

export const bookingStatusSchema = z.object({
  booking_id: z.string().uuid(),
  status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
});

export const rescheduleBookingSchema = z.object({
  booking_id: z.string().uuid(),
  booking_date: z.string().min(1),
  start_time: z.string().min(1),
  duration_minutes: z.coerce.number().int().positive(),
  screen_id: z.string().uuid().optional().nullable(),
});

export const cafeSettingsSchema = z.object({
  cafe_name: z.string().min(1).max(80),
  address: z.string().max(300).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  opening_time: z.string().min(1),
  closing_time: z.string().min(1),
  timezone: z.string().min(1),
  currency: z.string().min(1).max(8),
});

export type GuestBookingInput = z.infer<typeof guestBookingSchema>;
export type StartSessionInput = z.infer<typeof startSessionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
