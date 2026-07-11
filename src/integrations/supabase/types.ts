export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          action: Database["public"]["Enums"]["delivery_action"]
          command: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          order_id: string
          status: Database["public"]["Enums"]["delivery_status"]
          target: string | null
          type: Database["public"]["Enums"]["delivery_type"]
        }
        Insert: {
          action: Database["public"]["Enums"]["delivery_action"]
          command?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["delivery_status"]
          target?: string | null
          type: Database["public"]["Enums"]["delivery_type"]
        }
        Update: {
          action?: Database["public"]["Enums"]["delivery_action"]
          command?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["delivery_status"]
          target?: string | null
          type?: Database["public"]["Enums"]["delivery_type"]
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          activated_at: string | null
          amount_paid: number | null
          created_at: string
          currency: string | null
          discord_id: string | null
          expires_at: string | null
          id: string
          package_id: string
          status: Database["public"]["Enums"]["order_status"]
          steam_id: string | null
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          discord_id?: string | null
          expires_at?: string | null
          id?: string
          package_id: string
          status?: Database["public"]["Enums"]["order_status"]
          steam_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          activated_at?: string | null
          amount_paid?: number | null
          created_at?: string
          currency?: string | null
          discord_id?: string | null
          expires_at?: string | null
          id?: string
          package_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          steam_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          discord_role_key: string | null
          duration_days: number | null
          features: Json
          id: string
          image_url: string | null
          name: string
          price_eur: number
          rust_command_add: string | null
          rust_command_remove: string | null
          short_description: string | null
          slug: string
          sort_order: number
          tier: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          discord_role_key?: string | null
          duration_days?: number | null
          features?: Json
          id?: string
          image_url?: string | null
          name: string
          price_eur: number
          rust_command_add?: string | null
          rust_command_remove?: string | null
          short_description?: string | null
          slug: string
          sort_order?: number
          tier?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          discord_role_key?: string | null
          duration_days?: number | null
          features?: Json
          id?: string
          image_url?: string | null
          name?: string
          price_eur?: number
          rust_command_add?: string | null
          rust_command_remove?: string | null
          short_description?: string | null
          slug?: string
          sort_order?: number
          tier?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          discord_id: string | null
          discord_username: string | null
          email: string | null
          id: string
          steam_id: string | null
          steam_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email?: string | null
          id: string
          steam_id?: string | null
          steam_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_id?: string | null
          discord_username?: string | null
          email?: string | null
          id?: string
          steam_id?: string | null
          steam_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      delivery_action: "add" | "remove"
      delivery_status: "pending" | "success" | "failed"
      delivery_type: "rust_command" | "discord_role"
      order_status:
        | "pending"
        | "paid"
        | "active"
        | "expired"
        | "refunded"
        | "chargeback"
        | "failed"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      delivery_action: ["add", "remove"],
      delivery_status: ["pending", "success", "failed"],
      delivery_type: ["rust_command", "discord_role"],
      order_status: [
        "pending",
        "paid",
        "active",
        "expired",
        "refunded",
        "chargeback",
        "failed",
      ],
    },
  },
} as const
