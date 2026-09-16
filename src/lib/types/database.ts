export type UserRole = "owner" | "manager" | "staff";

export type ScreenStatus =
  | "available"
  | "reserved"
  | "playing"
  | "paused"
  | "maintenance";

export type GameCategory =
  | "Sports"
  | "Racing"
  | "Fighting"
  | "Action"
  | "Adventure"
  | "Co-op"
  | "Multiplayer";

export type DayType = "weekday" | "weekend" | "all";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type SessionStatus = "active" | "paused" | "completed" | "cancelled";

export type PaymentMethod = "cash" | "upi" | "card" | "online";

export type PaymentStatus = "pending" | "paid" | "refunded" | "failed";

export type ConsoleType = "PS5" | "PS4" | "Racing Sim" | "Other";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  created_at: string;
  updated_at: string;
}

export interface Screen {
  id: string;
  name: string;
  console_type: ConsoleType;
  display_name: string | null;
  status: ScreenStatus;
  hourly_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: GameCategory;
  min_players: number;
  max_players: number;
  multiplayer: boolean;
  local_multiplayer: boolean;
  online_multiplayer: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingRule {
  id: string;
  name: string;
  console_type: ConsoleType;
  duration_minutes: number;
  price: number;
  start_time: string | null;
  end_time: string | null;
  day_type: DayType;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  customer_id: string;
  screen_id: string | null;
  game_id: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  players: number;
  status: BookingStatus;
  notes: string | null;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  booking_id: string | null;
  customer_id: string;
  screen_id: string;
  game_id: string | null;
  started_at: string;
  ended_at: string | null;
  paused_at: string | null;
  total_paused_ms: number;
  duration_minutes: number | null;
  players: number;
  rate: number;
  total_amount: number | null;
  status: SessionStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  booking_id: string | null;
  session_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_reference: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface CafeSettings {
  id: string;
  cafe_name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  opening_time: string;
  closing_time: string;
  timezone: string;
  currency: string;
  upi_vpa: string | null;
  upi_payee_name: string | null;
  updated_at: string;
}

export interface BookingWithRelations extends Booking {
  customers: Customer | null;
  screens: Screen | null;
  games: Game | null;
  sessions?: Pick<Session, "id" | "status">[] | null;
}

export interface SessionWithRelations extends Session {
  customers: Customer | null;
  screens: Screen | null;
  games: Game | null;
  bookings: Booking | null;
}

export interface ScreenWithSession extends Screen {
  active_session?: SessionWithRelations | null;
  upcoming_booking?: BookingWithRelations | null;
}

type EmptyRelationships = [];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Profile>;
        Relationships: EmptyRelationships;
      };
      customers: {
        Row: Customer;
        Insert: {
          id?: string;
          name: string;
          mobile: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Customer, "id">>;
        Relationships: EmptyRelationships;
      };
      screens: {
        Row: Screen;
        Insert: {
          id?: string;
          name: string;
          console_type?: ConsoleType;
          display_name?: string | null;
          status?: ScreenStatus;
          hourly_rate?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Screen, "id">>;
        Relationships: EmptyRelationships;
      };
      games: {
        Row: Game;
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          category: GameCategory;
          min_players?: number;
          max_players?: number;
          multiplayer?: boolean;
          local_multiplayer?: boolean;
          online_multiplayer?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Game, "id">>;
        Relationships: EmptyRelationships;
      };
      pricing_rules: {
        Row: PricingRule;
        Insert: {
          id?: string;
          name: string;
          console_type?: ConsoleType;
          duration_minutes: number;
          price: number;
          start_time?: string | null;
          end_time?: string | null;
          day_type?: DayType;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<PricingRule, "id">>;
        Relationships: EmptyRelationships;
      };
      bookings: {
        Row: Booking;
        Insert: {
          id?: string;
          customer_id: string;
          screen_id?: string | null;
          game_id?: string | null;
          booking_date: string;
          start_time: string;
          end_time: string;
          duration_minutes: number;
          players?: number;
          status?: BookingStatus;
          notes?: string | null;
          total_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Booking, "id">>;
        Relationships: EmptyRelationships;
      };
      sessions: {
        Row: Session;
        Insert: {
          id?: string;
          booking_id?: string | null;
          customer_id: string;
          screen_id: string;
          game_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          paused_at?: string | null;
          total_paused_ms?: number;
          duration_minutes?: number | null;
          players?: number;
          rate?: number;
          total_amount?: number | null;
          status?: SessionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Omit<Session, "id">>;
        Relationships: EmptyRelationships;
      };
      payments: {
        Row: Payment;
        Insert: {
          id?: string;
          booking_id?: string | null;
          session_id?: string | null;
          amount: number;
          payment_method: PaymentMethod;
          payment_status?: PaymentStatus;
          transaction_reference?: string | null;
          paid_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Omit<Payment, "id">>;
        Relationships: EmptyRelationships;
      };
      cafe_settings: {
        Row: CafeSettings;
        Insert: {
          id?: string;
          cafe_name: string;
          address?: string | null;
          phone?: string | null;
          email?: string | null;
          opening_time?: string;
          closing_time?: string;
          timezone?: string;
          currency?: string;
          upi_vpa?: string | null;
          upi_payee_name?: string | null;
          updated_at?: string;
        };
        Update: Partial<Omit<CafeSettings, "id">>;
        Relationships: EmptyRelationships;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      user_role: UserRole;
      screen_status: ScreenStatus;
      game_category: GameCategory;
      day_type: DayType;
      booking_status: BookingStatus;
      session_status: SessionStatus;
      payment_method: PaymentMethod;
      payment_status: PaymentStatus;
      console_type: ConsoleType;
    };
    CompositeTypes: Record<string, never>;
  };
};
