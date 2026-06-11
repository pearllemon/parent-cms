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
      elementor_site_settings: {
        Row: {
          created_at: string
          id: string
          settings: Json
          source_id: string | null
          theme: Json
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          settings?: Json
          source_id?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          settings?: Json
          source_id?: string | null
          theme?: Json
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      elementor_templates: {
        Row: {
          created_at: string
          data: Json
          id: string
          imported_by: string | null
          kind: string
          location: string | null
          settings: Json
          slug: string | null
          source: string
          source_id: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          imported_by?: string | null
          kind?: string
          location?: string | null
          settings?: Json
          slug?: string | null
          source?: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          imported_by?: string | null
          kind?: string
          location?: string | null
          settings?: Json
          slug?: string | null
          source?: string
          source_id?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      image_assets: {
        Row: {
          alt_text: string | null
          attempts: number
          bytes_optimized: number | null
          bytes_original: number | null
          created_at: string
          error: string | null
          format: string | null
          height: number | null
          id: string
          job_id: string | null
          last_attempt_at: string | null
          mime_type: string | null
          public_url: string | null
          replaced_at: string | null
          seo_slug: string | null
          source_url: string
          status: string
          storage_path: string | null
          title: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          attempts?: number
          bytes_optimized?: number | null
          bytes_original?: number | null
          created_at?: string
          error?: string | null
          format?: string | null
          height?: number | null
          id?: string
          job_id?: string | null
          last_attempt_at?: string | null
          mime_type?: string | null
          public_url?: string | null
          replaced_at?: string | null
          seo_slug?: string | null
          source_url: string
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          attempts?: number
          bytes_optimized?: number | null
          bytes_original?: number | null
          created_at?: string
          error?: string | null
          format?: string | null
          height?: number | null
          id?: string
          job_id?: string | null
          last_attempt_at?: string | null
          mime_type?: string | null
          public_url?: string | null
          replaced_at?: string | null
          seo_slug?: string | null
          source_url?: string
          status?: string
          storage_path?: string | null
          title?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "image_assets_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "image_import_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      image_import_jobs: {
        Row: {
          created_at: string
          created_by: string | null
          current_url: string | null
          failed: number
          finished_at: string | null
          id: string
          log: string | null
          processed: number
          replacements: number
          skipped: number
          started_at: string | null
          status: string
          succeeded: number
          total: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_url?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          log?: string | null
          processed?: number
          replacements?: number
          skipped?: number
          started_at?: string | null
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_url?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          log?: string | null
          processed?: number
          replacements?: number
          skipped?: number
          started_at?: string | null
          status?: string
          succeeded?: number
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      import_history: {
        Row: {
          created_at: string
          error_sample: string | null
          failed_count: number
          file_name: string | null
          file_size_bytes: number | null
          id: string
          imported_by: string | null
          inserted_count: number
          parsed_count: number
          site_id: string
          source: string
          status: string
        }
        Insert: {
          created_at?: string
          error_sample?: string | null
          failed_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          imported_by?: string | null
          inserted_count?: number
          parsed_count?: number
          site_id: string
          source?: string
          status?: string
        }
        Update: {
          created_at?: string
          error_sample?: string | null
          failed_count?: number
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          imported_by?: string | null
          inserted_count?: number
          parsed_count?: number
          site_id?: string
          source?: string
          status?: string
        }
        Relationships: []
      }
      imported_posts: {
        Row: {
          body: string | null
          canonical_url: string | null
          created_at: string
          elementor_data: Json | null
          excerpt: string | null
          featured_image_url: string | null
          id: string
          imported_by: string | null
          meta_description: string | null
          meta_title: string | null
          publish_date: string | null
          raw: Json | null
          render_mode: string
          site_id: string
          slug: string
          source: string
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          body?: string | null
          canonical_url?: string | null
          created_at?: string
          elementor_data?: Json | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          imported_by?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publish_date?: string | null
          raw?: Json | null
          render_mode?: string
          site_id: string
          slug: string
          source?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          body?: string | null
          canonical_url?: string | null
          created_at?: string
          elementor_data?: Json | null
          excerpt?: string | null
          featured_image_url?: string | null
          id?: string
          imported_by?: string | null
          meta_description?: string | null
          meta_title?: string | null
          publish_date?: string | null
          raw?: Json | null
          render_mode?: string
          site_id?: string
          slug?: string
          source?: string
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_links: {
        Row: {
          anchor_text: string | null
          created_at: string
          id: string
          is_external: boolean
          source_type: string | null
          source_url: string
          target_url: string
        }
        Insert: {
          anchor_text?: string | null
          created_at?: string
          id?: string
          is_external?: boolean
          source_type?: string | null
          source_url: string
          target_url: string
        }
        Update: {
          anchor_text?: string | null
          created_at?: string
          id?: string
          is_external?: boolean
          source_type?: string | null
          source_url?: string
          target_url?: string
        }
        Relationships: []
      }
      link_suggestions: {
        Row: {
          anchor_text: string
          created_at: string
          id: string
          reason: string | null
          score: number
          source_url: string
          status: string
          target_url: string
          updated_at: string
        }
        Insert: {
          anchor_text: string
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          source_url: string
          status?: string
          target_url: string
          updated_at?: string
        }
        Update: {
          anchor_text?: string
          created_at?: string
          id?: string
          reason?: string | null
          score?: number
          source_url?: string
          status?: string
          target_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_schemas: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          note: string | null
          page_url: string
          schema_json: Json
          schema_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          page_url: string
          schema_json: Json
          schema_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          note?: string | null
          page_url?: string
          schema_json?: Json
          schema_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_file_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          file_type: string
          id: string
          note: string | null
          settings: Json
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          file_type: string
          id?: string
          note?: string | null
          settings?: Json
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          file_type?: string
          id?: string
          note?: string | null
          settings?: Json
        }
        Relationships: []
      }
      seo_files: {
        Row: {
          auto_enabled: boolean
          file_type: string
          last_generated_at: string | null
          manual_content: string | null
          settings: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_enabled?: boolean
          file_type: string
          last_generated_at?: string | null
          manual_content?: string | null
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_enabled?: boolean
          file_type?: string
          last_generated_at?: string | null
          manual_content?: string | null
          settings?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      sync_conflicts: {
        Row: {
          created_at: string
          id: string
          local_snapshot: Json | null
          parent_snapshot: Json | null
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          resource_id: string
          resource_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          local_snapshot?: Json | null
          parent_snapshot?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id: string
          resource_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          local_snapshot?: Json | null
          parent_snapshot?: Json | null
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          resource_id?: string
          resource_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_events: {
        Row: {
          action: string
          created_at: string
          direction: string
          error_message: string | null
          id: string
          latency_ms: number | null
          payload: Json | null
          resource_id: string | null
          resource_type: string
          status: string
          triggered_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          resource_id?: string | null
          resource_type: string
          status?: string
          triggered_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          direction?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          payload?: Json | null
          resource_id?: string | null
          resource_type?: string
          status?: string
          triggered_by?: string | null
        }
        Relationships: []
      }
      sync_health: {
        Row: {
          avg_latency_ms: number | null
          consecutive_failures: number
          id: string
          last_failure_at: string | null
          last_success_at: string | null
          resource_type: string
          status: string
          updated_at: string
        }
        Insert: {
          avg_latency_ms?: number | null
          consecutive_failures?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          resource_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          avg_latency_ms?: number | null
          consecutive_failures?: number
          id?: string
          last_failure_at?: string | null
          last_success_at?: string | null
          resource_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_queue: {
        Row: {
          created_at: string
          decision_at: string | null
          decision_by: string | null
          decision_note: string | null
          id: string
          payload: Json
          resource_id: string | null
          resource_type: string
          scheduled_for: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          id?: string
          payload: Json
          resource_id?: string | null
          resource_type: string
          scheduled_for?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_at?: string | null
          decision_by?: string | null
          decision_note?: string | null
          id?: string
          payload?: Json
          resource_id?: string | null
          resource_type?: string
          scheduled_for?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sync_settings: {
        Row: {
          auto_accept: boolean
          created_at: string
          direction: string
          enabled: boolean
          id: string
          notes: string | null
          resource_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_accept?: boolean
          created_at?: string
          direction?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          resource_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_accept?: boolean
          created_at?: string
          direction?: string
          enabled?: boolean
          id?: string
          notes?: string | null
          resource_type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_image_asset_replacements: {
        Args: { _job_id?: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
