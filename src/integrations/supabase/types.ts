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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      advisors: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_values: Json | null
          old_values: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      labor_references: {
        Row: {
          active: boolean
          created_at: string
          default_hours: number | null
          id: string
          is_favorite: boolean
          keywords: string[] | null
          labor_type_default: Database["public"]["Enums"]["labor_type"]
          name: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_hours?: number | null
          id?: string
          is_favorite?: boolean
          keywords?: string[] | null
          labor_type_default?: Database["public"]["Enums"]["labor_type"]
          name: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_hours?: number | null
          id?: string
          is_favorite?: boolean
          keywords?: string[] | null
          labor_type_default?: Database["public"]["Enums"]["labor_type"]
          name?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pay_period_closeouts: {
        Row: {
          breakdowns: Json
          closed_at: string
          id: string
          period_end: string
          period_start: string
          proof_pack_url: string | null
          range_type: string
          ro_ids: string[]
          ro_snapshot: Json
          totals: Json
          user_id: string
        }
        Insert: {
          breakdowns?: Json
          closed_at?: string
          id?: string
          period_end: string
          period_start: string
          proof_pack_url?: string | null
          range_type?: string
          ro_ids?: string[]
          ro_snapshot?: Json
          totals?: Json
          user_id: string
        }
        Update: {
          breakdowns?: Json
          closed_at?: string
          id?: string
          period_end?: string
          period_start?: string
          proof_pack_url?: string | null
          range_type?: string
          ro_ids?: string[]
          ro_snapshot?: Json
          totals?: Json
          user_id?: string
        }
        Relationships: []
      }
      pro_overrides: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ro_flags: {
        Row: {
          cleared_at: string | null
          created_at: string
          flag_type: Database["public"]["Enums"]["flag_type"]
          id: string
          note: string | null
          ro_id: string
          ro_line_id: string | null
          user_id: string
        }
        Insert: {
          cleared_at?: string | null
          created_at?: string
          flag_type?: Database["public"]["Enums"]["flag_type"]
          id?: string
          note?: string | null
          ro_id: string
          ro_line_id?: string | null
          user_id: string
        }
        Update: {
          cleared_at?: string | null
          created_at?: string
          flag_type?: Database["public"]["Enums"]["flag_type"]
          id?: string
          note?: string | null
          ro_id?: string
          ro_line_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ro_flags_ro_id_fkey"
            columns: ["ro_id"]
            isOneToOne: false
            referencedRelation: "ros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ro_flags_ro_line_id_fkey"
            columns: ["ro_line_id"]
            isOneToOne: false
            referencedRelation: "ro_lines"
            referencedColumns: ["id"]
          },
        ]
      }
      ro_lines: {
        Row: {
          created_at: string
          description: string
          hours_paid: number
          id: string
          is_tbd: boolean
          labor_type: Database["public"]["Enums"]["labor_type"]
          line_no: number
          line_vehicle_make: string | null
          line_vehicle_model: string | null
          line_vehicle_trim: string | null
          line_vehicle_year: number | null
          match_confidence: number | null
          matched_reference_id: string | null
          notes: string | null
          ro_id: string
          updated_at: string
          user_id: string
          vehicle_override: boolean
        }
        Insert: {
          created_at?: string
          description?: string
          hours_paid?: number
          id?: string
          is_tbd?: boolean
          labor_type?: Database["public"]["Enums"]["labor_type"]
          line_no?: number
          line_vehicle_make?: string | null
          line_vehicle_model?: string | null
          line_vehicle_trim?: string | null
          line_vehicle_year?: number | null
          match_confidence?: number | null
          matched_reference_id?: string | null
          notes?: string | null
          ro_id: string
          updated_at?: string
          user_id: string
          vehicle_override?: boolean
        }
        Update: {
          created_at?: string
          description?: string
          hours_paid?: number
          id?: string
          is_tbd?: boolean
          labor_type?: Database["public"]["Enums"]["labor_type"]
          line_no?: number
          line_vehicle_make?: string | null
          line_vehicle_model?: string | null
          line_vehicle_trim?: string | null
          line_vehicle_year?: number | null
          match_confidence?: number | null
          matched_reference_id?: string | null
          notes?: string | null
          ro_id?: string
          updated_at?: string
          user_id?: string
          vehicle_override?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "ro_lines_ro_id_fkey"
            columns: ["ro_id"]
            isOneToOne: false
            referencedRelation: "ros"
            referencedColumns: ["id"]
          },
        ]
      }
      ro_photos: {
        Row: {
          created_at: string
          id: string
          ro_id: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ro_id: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ro_id?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ro_photos_ro_id_fkey"
            columns: ["ro_id"]
            isOneToOne: false
            referencedRelation: "ros"
            referencedColumns: ["id"]
          },
        ]
      }
      ro_templates: {
        Row: {
          created_at: string
          field_map_json: Json | null
          id: string
          name: string
          sample_photo_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          field_map_json?: Json | null
          id?: string
          name: string
          sample_photo_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          field_map_json?: Json | null
          id?: string
          name?: string
          sample_photo_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ros: {
        Row: {
          advisor_id: string | null
          advisor_name: string
          created_at: string
          customer_name: string | null
          date: string
          id: string
          mileage: string | null
          notes: string | null
          paid_date: string | null
          ro_number: string
          status: Database["public"]["Enums"]["ro_status"]
          updated_at: string
          user_id: string
          vehicle_make: string | null
          vehicle_model: string | null
          vehicle_trim: string | null
          vehicle_vin: string | null
          vehicle_year: number | null
        }
        Insert: {
          advisor_id?: string | null
          advisor_name?: string
          created_at?: string
          customer_name?: string | null
          date?: string
          id?: string
          mileage?: string | null
          notes?: string | null
          paid_date?: string | null
          ro_number: string
          status?: Database["public"]["Enums"]["ro_status"]
          updated_at?: string
          user_id: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Update: {
          advisor_id?: string | null
          advisor_name?: string
          created_at?: string
          customer_name?: string | null
          date?: string
          id?: string
          mileage?: string | null
          notes?: string | null
          paid_date?: string | null
          ro_number?: string
          status?: Database["public"]["Enums"]["ro_status"]
          updated_at?: string
          user_id?: string
          vehicle_make?: string | null
          vehicle_model?: string | null
          vehicle_trim?: string | null
          vehicle_vin?: string | null
          vehicle_year?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          default_summary_range: string
          default_template_id: string | null
          flag_inbox_date_range: string | null
          flag_inbox_types: Database["public"]["Enums"]["flag_type"][] | null
          hide_totals: boolean | null
          id: string
          keyword_autofill: boolean
          pay_period_end_dates: number[] | null
          pay_period_type: string
          show_scan_confidence: boolean | null
          show_vehicle_chips: boolean | null
          spreadsheet_density: string | null
          spreadsheet_view_mode: string | null
          theme: string | null
          updated_at: string
          user_id: string
          week_start_day: number
        }
        Insert: {
          created_at?: string
          default_summary_range?: string
          default_template_id?: string | null
          flag_inbox_date_range?: string | null
          flag_inbox_types?: Database["public"]["Enums"]["flag_type"][] | null
          hide_totals?: boolean | null
          id?: string
          keyword_autofill?: boolean
          pay_period_end_dates?: number[] | null
          pay_period_type?: string
          show_scan_confidence?: boolean | null
          show_vehicle_chips?: boolean | null
          spreadsheet_density?: string | null
          spreadsheet_view_mode?: string | null
          theme?: string | null
          updated_at?: string
          user_id: string
          week_start_day?: number
        }
        Update: {
          created_at?: string
          default_summary_range?: string
          default_template_id?: string | null
          flag_inbox_date_range?: string | null
          flag_inbox_types?: Database["public"]["Enums"]["flag_type"][] | null
          hide_totals?: boolean | null
          id?: string
          keyword_autofill?: boolean
          pay_period_end_dates?: number[] | null
          pay_period_type?: string
          show_scan_confidence?: boolean | null
          show_vehicle_chips?: boolean | null
          spreadsheet_density?: string | null
          spreadsheet_view_mode?: string | null
          theme?: string | null
          updated_at?: string
          user_id?: string
          week_start_day?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_default_template_id_fkey"
            columns: ["default_template_id"]
            isOneToOne: false
            referencedRelation: "ro_templates"
            referencedColumns: ["id"]
          },
        ]
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
      owns_ro: { Args: { _ro_id: string; _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      flag_type:
        | "needs_time"
        | "questionable"
        | "waiting"
        | "advisor_question"
        | "other"
      labor_type: "warranty" | "customer-pay" | "internal"
      ro_status: "draft" | "complete"
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
      app_role: ["admin", "user"],
      flag_type: [
        "needs_time",
        "questionable",
        "waiting",
        "advisor_question",
        "other",
      ],
      labor_type: ["warranty", "customer-pay", "internal"],
      ro_status: ["draft", "complete"],
    },
  },
} as const
