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
      activity_log: {
        Row: {
          action: string
          actor_id: string | null
          actor_name: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_name?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          last_seen_at: string | null
          role: string
          site_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          last_seen_at?: string | null
          role?: string
          site_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          last_seen_at?: string | null
          role?: string
          site_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      applied_cms_migrations: {
        Row: {
          applied_at: string
          duration_ms: number | null
          id: string
          kind: string
          migration_id: string
          order_index: number
          site_id: string
          version: string
        }
        Insert: {
          applied_at?: string
          duration_ms?: number | null
          id?: string
          kind: string
          migration_id: string
          order_index: number
          site_id: string
          version: string
        }
        Update: {
          applied_at?: string
          duration_ms?: number | null
          id?: string
          kind?: string
          migration_id?: string
          order_index?: number
          site_id?: string
          version?: string
        }
        Relationships: []
      }
      authors: {
        Row: {
          archive_enabled: boolean
          bio: string | null
          created_at: string
          email: string | null
          id: string
          job_title: string | null
          name: string
          parent_user_id: string | null
          profile_image_url: string | null
          schema_json: Json
          seo: Json
          slug: string
          social: Json
          updated_at: string
        }
        Insert: {
          archive_enabled?: boolean
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          name: string
          parent_user_id?: string | null
          profile_image_url?: string | null
          schema_json?: Json
          seo?: Json
          slug: string
          social?: Json
          updated_at?: string
        }
        Update: {
          archive_enabled?: boolean
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          job_title?: string | null
          name?: string
          parent_user_id?: string | null
          profile_image_url?: string | null
          schema_json?: Json
          seo?: Json
          slug?: string
          social?: Json
          updated_at?: string
        }
        Relationships: []
      }
      child_installations: {
        Row: {
          auto_upgrade: boolean
          child_shim_version: string | null
          created_at: string
          current_version: string | null
          github_default_branch: string
          github_repo: string | null
          id: string
          install_kind: string
          install_pr_number: number | null
          install_pr_state: string | null
          install_pr_url: string | null
          install_release_tag: string | null
          last_error: string | null
          last_seen_at: string | null
          mode: string
          registration_token: string | null
          site_id: string
          site_name: string | null
          site_url: string | null
          target_version: string | null
          update_pr_number: number | null
          update_pr_state: string | null
          update_pr_url: string | null
          updated_at: string
          upgrade_state: string
        }
        Insert: {
          auto_upgrade?: boolean
          child_shim_version?: string | null
          created_at?: string
          current_version?: string | null
          github_default_branch?: string
          github_repo?: string | null
          id?: string
          install_kind?: string
          install_pr_number?: number | null
          install_pr_state?: string | null
          install_pr_url?: string | null
          install_release_tag?: string | null
          last_error?: string | null
          last_seen_at?: string | null
          mode?: string
          registration_token?: string | null
          site_id: string
          site_name?: string | null
          site_url?: string | null
          target_version?: string | null
          update_pr_number?: number | null
          update_pr_state?: string | null
          update_pr_url?: string | null
          updated_at?: string
          upgrade_state?: string
        }
        Update: {
          auto_upgrade?: boolean
          child_shim_version?: string | null
          created_at?: string
          current_version?: string | null
          github_default_branch?: string
          github_repo?: string | null
          id?: string
          install_kind?: string
          install_pr_number?: number | null
          install_pr_state?: string | null
          install_pr_url?: string | null
          install_release_tag?: string | null
          last_error?: string | null
          last_seen_at?: string | null
          mode?: string
          registration_token?: string | null
          site_id?: string
          site_name?: string | null
          site_url?: string | null
          target_version?: string | null
          update_pr_number?: number | null
          update_pr_state?: string | null
          update_pr_url?: string | null
          updated_at?: string
          upgrade_state?: string
        }
        Relationships: []
      }
      child_upgrade_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          from_version: string | null
          id: string
          site_id: string
          snapshot: Json | null
          status: string
          to_version: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          from_version?: string | null
          id?: string
          site_id: string
          snapshot?: Json | null
          status: string
          to_version: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          from_version?: string | null
          id?: string
          site_id?: string
          snapshot?: Json | null
          status?: string
          to_version?: string
        }
        Relationships: []
      }
      cloud_component_installs: {
        Row: {
          auto_sync: boolean
          created_at: string
          id: string
          installed_version: number
          kind: string
          last_synced_at: string
          local_id: string | null
          site_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          auto_sync?: boolean
          created_at?: string
          id?: string
          installed_version: number
          kind: string
          last_synced_at?: string
          local_id?: string | null
          site_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          auto_sync?: boolean
          created_at?: string
          id?: string
          installed_version?: number
          kind?: string
          last_synced_at?: string
          local_id?: string | null
          site_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      cloud_component_reviews: {
        Row: {
          action: string
          component_id: string
          created_at: string
          id: string
          notes: string | null
          reviewer_id: string | null
        }
        Insert: {
          action: string
          component_id: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Update: {
          action?: string
          component_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cloud_component_reviews_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "cloud_components"
            referencedColumns: ["id"]
          },
        ]
      }
      cloud_components: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          kind: string
          metadata: Json
          name: string
          payload: Json
          preview_url: string | null
          publisher_id: string | null
          publisher_site_id: string | null
          recalled: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          slug: string
          status: string
          submitted_at: string
          thumbnail_url: string | null
          updated_at: string
          version: number
          visibility: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind: string
          metadata?: Json
          name: string
          payload?: Json
          preview_url?: string | null
          publisher_id?: string | null
          publisher_site_id?: string | null
          recalled?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug: string
          status?: string
          submitted_at?: string
          thumbnail_url?: string | null
          updated_at?: string
          version?: number
          visibility?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          kind?: string
          metadata?: Json
          name?: string
          payload?: Json
          preview_url?: string | null
          publisher_id?: string | null
          publisher_site_id?: string | null
          recalled?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          slug?: string
          status?: string
          submitted_at?: string
          thumbnail_url?: string | null
          updated_at?: string
          version?: number
          visibility?: string
        }
        Relationships: []
      }
      cms_api_registry: {
        Row: {
          api_key: string
          base_url: string | null
          config: Json
          created_at: string
          description: string | null
          id: string
          last_check_at: string | null
          last_check_status: string | null
          last_error: string | null
          name: string
          scope: string
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          base_url?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_check_at?: string | null
          last_check_status?: string | null
          last_error?: string | null
          name: string
          scope?: string
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          base_url?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          id?: string
          last_check_at?: string | null
          last_check_status?: string | null
          last_error?: string | null
          name?: string
          scope?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_github_connections: {
        Row: {
          branch: string
          created_at: string
          enabled: boolean
          id: string
          last_checked_at: string | null
          last_release_sha: string | null
          last_release_tag: string | null
          notes: string | null
          pat: string | null
          repo: string
          site_id: string | null
          updated_at: string
          visibility: string
          workflow_filename: string | null
        }
        Insert: {
          branch?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          last_release_sha?: string | null
          last_release_tag?: string | null
          notes?: string | null
          pat?: string | null
          repo: string
          site_id?: string | null
          updated_at?: string
          visibility?: string
          workflow_filename?: string | null
        }
        Update: {
          branch?: string
          created_at?: string
          enabled?: boolean
          id?: string
          last_checked_at?: string | null
          last_release_sha?: string | null
          last_release_tag?: string | null
          notes?: string | null
          pat?: string | null
          repo?: string
          site_id?: string | null
          updated_at?: string
          visibility?: string
          workflow_filename?: string | null
        }
        Relationships: []
      }
      cms_install_prs: {
        Row: {
          branch_name: string
          created_at: string
          error: string | null
          from_version: string | null
          github_repo: string
          id: string
          manifest_sha: string | null
          pr_kind: string
          pr_number: number | null
          pr_url: string | null
          release_tag: string
          site_id: string
          state: string
          target_version: string
          updated_at: string
        }
        Insert: {
          branch_name: string
          created_at?: string
          error?: string | null
          from_version?: string | null
          github_repo: string
          id?: string
          manifest_sha?: string | null
          pr_kind: string
          pr_number?: number | null
          pr_url?: string | null
          release_tag: string
          site_id: string
          state?: string
          target_version: string
          updated_at?: string
        }
        Update: {
          branch_name?: string
          created_at?: string
          error?: string | null
          from_version?: string | null
          github_repo?: string
          id?: string
          manifest_sha?: string | null
          pr_kind?: string
          pr_number?: number | null
          pr_url?: string | null
          release_tag?: string
          site_id?: string
          state?: string
          target_version?: string
          updated_at?: string
        }
        Relationships: []
      }
      cms_migration_manifest: {
        Row: {
          created_at: string
          description: string | null
          down_payload: string | null
          id: string
          kind: string
          migration_id: string | null
          order_index: number
          payload: string
          reversible: boolean
          version: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          down_payload?: string | null
          id?: string
          kind: string
          migration_id?: string | null
          order_index?: number
          payload?: string
          reversible?: boolean
          version: string
        }
        Update: {
          created_at?: string
          description?: string | null
          down_payload?: string | null
          id?: string
          kind?: string
          migration_id?: string | null
          order_index?: number
          payload?: string
          reversible?: boolean
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "cms_migration_manifest_version_fkey"
            columns: ["version"]
            isOneToOne: false
            referencedRelation: "cms_releases"
            referencedColumns: ["version"]
          },
        ]
      }
      cms_releases: {
        Row: {
          bundle_css_url: string | null
          bundle_sha256: string | null
          bundle_size: number | null
          bundle_url: string | null
          changelog: string | null
          created_at: string
          id: string
          is_latest: boolean
          manifest: Json
          min_compatible_child_version: string | null
          package_format: string
          package_sha256: string | null
          package_size: number | null
          package_url: string | null
          payload_canonical: string | null
          payload_hash: string | null
          published_at: string
          recalled: boolean
          release_tag: string | null
          sdk_url: string | null
          signature: string | null
          signed_at: string | null
          signing_key_id: string | null
          updated_at: string
          version: string
        }
        Insert: {
          bundle_css_url?: string | null
          bundle_sha256?: string | null
          bundle_size?: number | null
          bundle_url?: string | null
          changelog?: string | null
          created_at?: string
          id?: string
          is_latest?: boolean
          manifest?: Json
          min_compatible_child_version?: string | null
          package_format?: string
          package_sha256?: string | null
          package_size?: number | null
          package_url?: string | null
          payload_canonical?: string | null
          payload_hash?: string | null
          published_at?: string
          recalled?: boolean
          release_tag?: string | null
          sdk_url?: string | null
          signature?: string | null
          signed_at?: string | null
          signing_key_id?: string | null
          updated_at?: string
          version: string
        }
        Update: {
          bundle_css_url?: string | null
          bundle_sha256?: string | null
          bundle_size?: number | null
          bundle_url?: string | null
          changelog?: string | null
          created_at?: string
          id?: string
          is_latest?: boolean
          manifest?: Json
          min_compatible_child_version?: string | null
          package_format?: string
          package_sha256?: string | null
          package_size?: number | null
          package_url?: string | null
          payload_canonical?: string | null
          payload_hash?: string | null
          published_at?: string
          recalled?: boolean
          release_tag?: string | null
          sdk_url?: string | null
          signature?: string | null
          signed_at?: string | null
          signing_key_id?: string | null
          updated_at?: string
          version?: string
        }
        Relationships: []
      }
      cms_signing_keys: {
        Row: {
          algorithm: string
          created_at: string
          id: string
          is_active: boolean
          key_id: string
          notes: string | null
          public_key: string
          revoked_at: string | null
          updated_at: string
        }
        Insert: {
          algorithm?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_id: string
          notes?: string | null
          public_key: string
          revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          algorithm?: string
          created_at?: string
          id?: string
          is_active?: boolean
          key_id?: string
          notes?: string | null
          public_key?: string
          revoked_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cpt_entries: {
        Row: {
          author_id: string | null
          cpt_slug: string
          created_at: string
          data: Json
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          cpt_slug: string
          created_at?: string
          data?: Json
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          cpt_slug?: string
          created_at?: string
          data?: Json
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpt_entries_cpt_slug_fkey"
            columns: ["cpt_slug"]
            isOneToOne: false
            referencedRelation: "custom_post_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      custom_fields: {
        Row: {
          cpt_slug: string
          created_at: string
          field_key: string
          field_type: string
          id: string
          label: string
          position: number
          required: boolean
          settings: Json
          updated_at: string
        }
        Insert: {
          cpt_slug: string
          created_at?: string
          field_key: string
          field_type?: string
          id?: string
          label: string
          position?: number
          required?: boolean
          settings?: Json
          updated_at?: string
        }
        Update: {
          cpt_slug?: string
          created_at?: string
          field_key?: string
          field_type?: string
          id?: string
          label?: string
          position?: number
          required?: boolean
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_fields_cpt_slug_fkey"
            columns: ["cpt_slug"]
            isOneToOne: false
            referencedRelation: "custom_post_types"
            referencedColumns: ["slug"]
          },
        ]
      }
      custom_post_types: {
        Row: {
          created_at: string
          has_archive: boolean
          icon: string | null
          id: string
          is_public: boolean
          label: string
          plural_label: string
          settings: Json
          slug: string
          supports: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          has_archive?: boolean
          icon?: string | null
          id?: string
          is_public?: boolean
          label: string
          plural_label: string
          settings?: Json
          slug: string
          supports?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          has_archive?: boolean
          icon?: string | null
          id?: string
          is_public?: boolean
          label?: string
          plural_label?: string
          settings?: Json
          slug?: string
          supports?: Json
          updated_at?: string
        }
        Relationships: []
      }
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
      entry_field_values: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: string
          field_key: string
          id: string
          site_id: string | null
          updated_at: string
          value: Json | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: string
          field_key: string
          id?: string
          site_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: string
          field_key?: string
          id?: string
          site_id?: string | null
          updated_at?: string
          value?: Json | null
        }
        Relationships: []
      }
      entry_terms: {
        Row: {
          created_at: string
          entry_id: string
          entry_type: string
          id: string
          term_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          entry_type: string
          id?: string
          term_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          entry_type?: string
          id?: string
          term_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_terms_term_id_fkey"
            columns: ["term_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_definitions: {
        Row: {
          created_at: string
          email_to: string | null
          fields: Json
          id: string
          name: string
          redirect_url: string | null
          settings: Json
          site_id: string | null
          slug: string
          submit_action: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          email_to?: string | null
          fields?: Json
          id?: string
          name: string
          redirect_url?: string | null
          settings?: Json
          site_id?: string | null
          slug: string
          submit_action?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          email_to?: string | null
          fields?: Json
          id?: string
          name?: string
          redirect_url?: string | null
          settings?: Json
          site_id?: string | null
          slug?: string
          submit_action?: string
          updated_at?: string
          version?: number
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
      leads: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          metadata: Json
          name: string
          notes: string | null
          phone: string | null
          source: string
          source_url: string | null
          status: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          metadata?: Json
          name: string
          notes?: string | null
          phone?: string | null
          source?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          metadata?: Json
          name?: string
          notes?: string | null
          phone?: string | null
          source?: string
          source_url?: string | null
          status?: string
          tags?: string[]
          updated_at?: string
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
      media_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          site_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          site_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          site_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_library: {
        Row: {
          alt_text: string | null
          created_at: string
          file_name: string | null
          file_size: number | null
          file_url: string
          height: number | null
          id: string
          mime_type: string | null
          site_id: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url: string
          height?: number | null
          id?: string
          mime_type?: string | null
          site_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          file_name?: string | null
          file_size?: number | null
          file_url?: string
          height?: number | null
          id?: string
          mime_type?: string | null
          site_id?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      media_meta: {
        Row: {
          alt_text: string | null
          caption: string | null
          created_at: string
          description: string | null
          file_name: string | null
          folder: string | null
          height: number | null
          id: string
          media_url: string
          mime_type: string | null
          site_id: string | null
          size_bytes: number | null
          source: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          media_url: string
          mime_type?: string | null
          site_id?: string | null
          size_bytes?: number | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_text?: string | null
          caption?: string | null
          created_at?: string
          description?: string | null
          file_name?: string | null
          folder?: string | null
          height?: number | null
          id?: string
          media_url?: string
          mime_type?: string | null
          site_id?: string | null
          size_bytes?: number | null
          source?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          width?: number | null
        }
        Relationships: []
      }
      orphan_edits: {
        Row: {
          created_at: string
          fp: string
          id: string
          patch: Json
          path: string | null
          site_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fp: string
          id?: string
          patch?: Json
          path?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fp?: string
          id?: string
          patch?: Json
          path?: string | null
          site_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      page_block_versions: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          outline: Json
          page_block_id: string | null
          path: string
          seo: Json
          site_id: string | null
          target: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          outline?: Json
          page_block_id?: string | null
          path: string
          seo?: Json
          site_id?: string | null
          target?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          outline?: Json
          page_block_id?: string | null
          path?: string
          seo?: Json
          site_id?: string | null
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_block_versions_page_block_id_fkey"
            columns: ["page_block_id"]
            isOneToOne: false
            referencedRelation: "page_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          blocks: Json
          created_at: string
          id: string
          path: string
          seo: Json
          site_id: string | null
          source: string
          target: string
          updated_at: string
        }
        Insert: {
          blocks?: Json
          created_at?: string
          id?: string
          path: string
          seo?: Json
          site_id?: string | null
          source?: string
          target?: string
          updated_at?: string
        }
        Update: {
          blocks?: Json
          created_at?: string
          id?: string
          path?: string
          seo?: Json
          site_id?: string | null
          source?: string
          target?: string
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
      page_view_events: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      parent_site_mirror: {
        Row: {
          created_at: string
          fetched_at: string
          id: string
          kind: string
          payload: Json
          site_id: string
          source_etag: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fetched_at?: string
          id?: string
          kind: string
          payload?: Json
          site_id: string
          source_etag?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fetched_at?: string
          id?: string
          kind?: string
          payload?: Json
          site_id?: string
          source_etag?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      post_seo: {
        Row: {
          author_id: string | null
          canonical_url: string | null
          created_at: string
          extra: Json
          focus_keyword: string | null
          id: string
          last_score: number | null
          parent_post_id: string | null
          pillar: boolean
          post_id: string
          robots: Json
          schema_json: Json
          scope: string
          secondary_keywords: string[] | null
          seo_description: string | null
          seo_title: string | null
          slug: string | null
          social: Json
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          canonical_url?: string | null
          created_at?: string
          extra?: Json
          focus_keyword?: string | null
          id?: string
          last_score?: number | null
          parent_post_id?: string | null
          pillar?: boolean
          post_id: string
          robots?: Json
          schema_json?: Json
          scope: string
          secondary_keywords?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          social?: Json
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          canonical_url?: string | null
          created_at?: string
          extra?: Json
          focus_keyword?: string | null
          id?: string
          last_score?: number | null
          parent_post_id?: string | null
          pillar?: boolean
          post_id?: string
          robots?: Json
          schema_json?: Json
          scope?: string
          secondary_keywords?: string[] | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string | null
          social?: Json
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author: string | null
          body: string | null
          canonical_url: string | null
          categories: Json | null
          created_at: string
          elementor_data: Json | null
          excerpt: string | null
          featured_image_alt: string | null
          featured_image_url: string | null
          id: string
          meta_description: string | null
          meta_title: string | null
          parent_id: string | null
          publish_date: string | null
          published_at: string | null
          render_mode: string | null
          site_id: string | null
          slug: string
          status: string
          tags: Json | null
          template: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          author?: string | null
          body?: string | null
          canonical_url?: string | null
          categories?: Json | null
          created_at?: string
          elementor_data?: Json | null
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          render_mode?: string | null
          site_id?: string | null
          slug?: string
          status?: string
          tags?: Json | null
          template?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string | null
          canonical_url?: string | null
          categories?: Json | null
          created_at?: string
          elementor_data?: Json | null
          excerpt?: string | null
          featured_image_alt?: string | null
          featured_image_url?: string | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          parent_id?: string | null
          publish_date?: string | null
          published_at?: string | null
          render_mode?: string | null
          site_id?: string | null
          slug?: string
          status?: string
          tags?: Json | null
          template?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      redirects: {
        Row: {
          created_at: string
          enabled: boolean
          from_path: string
          hits: number
          id: string
          last_hit_at: string | null
          match_type: string
          notes: string | null
          status_code: number
          to_url: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          from_path: string
          hits?: number
          id?: string
          last_hit_at?: string | null
          match_type?: string
          notes?: string | null
          status_code?: number
          to_url: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          from_path?: string
          hits?: number
          id?: string
          last_hit_at?: string | null
          match_type?: string
          notes?: string | null
          status_code?: number
          to_url?: string
          updated_at?: string
        }
        Relationships: []
      }
      revisions: {
        Row: {
          author_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          note: string | null
          snapshot: Json
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          note?: string | null
          snapshot: Json
        }
        Update: {
          author_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          note?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      section_templates: {
        Row: {
          blocks: Json
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          review_notes: string | null
          reviewed_at: string | null
          site_id: string | null
          source: string
          status: string
          submitted_at: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          blocks?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          review_notes?: string | null
          reviewed_at?: string | null
          site_id?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          blocks?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          review_notes?: string | null
          reviewed_at?: string | null
          site_id?: string | null
          source?: string
          status?: string
          submitted_at?: string | null
          thumbnail_url?: string | null
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
      seo_scores: {
        Row: {
          aeo_score: number
          created_at: string
          description: string | null
          details: Json | null
          geo_score: number
          id: string
          key: string
          last_scanned_at: string
          scope: string
          seo_score: number
          title: string | null
          total_score: number
          updated_at: string
          url: string
        }
        Insert: {
          aeo_score?: number
          created_at?: string
          description?: string | null
          details?: Json | null
          geo_score?: number
          id?: string
          key: string
          last_scanned_at?: string
          scope: string
          seo_score?: number
          title?: string | null
          total_score?: number
          updated_at?: string
          url: string
        }
        Update: {
          aeo_score?: number
          created_at?: string
          description?: string | null
          details?: Json | null
          geo_score?: number
          id?: string
          key?: string
          last_scanned_at?: string
          scope?: string
          seo_score?: number
          title?: string | null
          total_score?: number
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      seo_settings: {
        Row: {
          base_url: string | null
          default_focus_keyword: string | null
          default_meta_description: string | null
          default_title_suffix: string | null
          id: string
          organization_logo: string | null
          organization_name: string | null
          social_image: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          base_url?: string | null
          default_focus_keyword?: string | null
          default_meta_description?: string | null
          default_title_suffix?: string | null
          id?: string
          organization_logo?: string | null
          organization_name?: string | null
          social_image?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          base_url?: string | null
          default_focus_keyword?: string | null
          default_meta_description?: string | null
          default_title_suffix?: string | null
          id?: string
          organization_logo?: string | null
          organization_name?: string | null
          social_image?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          brand_accent: string | null
          brand_primary: string | null
          created_at: string
          default_meta_description: string | null
          default_meta_title: string | null
          default_og_image: string | null
          email_from_address: string | null
          email_from_name: string | null
          email_provider: string | null
          email_reply_to: string | null
          email_smtp: Json | null
          extras: Json
          facebook_app_id: string | null
          facebook_pixel_id: string | null
          favicon_url: string | null
          google_analytics_id: string | null
          google_tag_manager_id: string | null
          id: string
          logo_dark_url: string | null
          logo_url: string | null
          perf_image_cdn: boolean | null
          perf_lazy_images: boolean | null
          perf_minify: boolean | null
          perf_preconnect: string[] | null
          plausible_domain: string | null
          sec_csp: string | null
          sec_force_https: boolean | null
          sec_hsts: boolean | null
          sec_referrer_policy: string | null
          site_id: string
          site_name: string | null
          tagline: string | null
          twitter_handle: string | null
          updated_at: string
        }
        Insert: {
          brand_accent?: string | null
          brand_primary?: string | null
          created_at?: string
          default_meta_description?: string | null
          default_meta_title?: string | null
          default_og_image?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_smtp?: Json | null
          extras?: Json
          facebook_app_id?: string | null
          facebook_pixel_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          perf_image_cdn?: boolean | null
          perf_lazy_images?: boolean | null
          perf_minify?: boolean | null
          perf_preconnect?: string[] | null
          plausible_domain?: string | null
          sec_csp?: string | null
          sec_force_https?: boolean | null
          sec_hsts?: boolean | null
          sec_referrer_policy?: string | null
          site_id: string
          site_name?: string | null
          tagline?: string | null
          twitter_handle?: string | null
          updated_at?: string
        }
        Update: {
          brand_accent?: string | null
          brand_primary?: string | null
          created_at?: string
          default_meta_description?: string | null
          default_meta_title?: string | null
          default_og_image?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          email_provider?: string | null
          email_reply_to?: string | null
          email_smtp?: Json | null
          extras?: Json
          facebook_app_id?: string | null
          facebook_pixel_id?: string | null
          favicon_url?: string | null
          google_analytics_id?: string | null
          google_tag_manager_id?: string | null
          id?: string
          logo_dark_url?: string | null
          logo_url?: string | null
          perf_image_cdn?: boolean | null
          perf_lazy_images?: boolean | null
          perf_minify?: boolean | null
          perf_preconnect?: string[] | null
          plausible_domain?: string | null
          sec_csp?: string | null
          sec_force_https?: boolean | null
          sec_hsts?: boolean | null
          sec_referrer_policy?: string | null
          site_id?: string
          site_name?: string | null
          tagline?: string | null
          twitter_handle?: string | null
          updated_at?: string
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
      taxonomies: {
        Row: {
          applies_to: string[]
          created_at: string
          description: string | null
          hierarchical: boolean
          id: string
          label_singular: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          applies_to?: string[]
          created_at?: string
          description?: string | null
          hierarchical?: boolean
          id?: string
          label_singular: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          applies_to?: string[]
          created_at?: string
          description?: string | null
          hierarchical?: boolean
          id?: string
          label_singular?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      taxonomy_terms: {
        Row: {
          archive_template_id: string | null
          canonical_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          og_image: string | null
          parent_id: string | null
          position: number
          schema_json: Json | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          taxonomy_id: string
          updated_at: string
        }
        Insert: {
          archive_template_id?: string | null
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          og_image?: string | null
          parent_id?: string | null
          position?: number
          schema_json?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          taxonomy_id: string
          updated_at?: string
        }
        Update: {
          archive_template_id?: string | null
          canonical_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          og_image?: string | null
          parent_id?: string | null
          position?: number
          schema_json?: Json | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          taxonomy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "taxonomy_terms_archive_template_id_fkey"
            columns: ["archive_template_id"]
            isOneToOne: false
            referencedRelation: "theme_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "taxonomy_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "taxonomy_terms_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "taxonomies"
            referencedColumns: ["id"]
          },
        ]
      }
      template_assignments: {
        Row: {
          created_at: string
          id: string
          kind: string
          priority: number
          scope: string
          target: string
          template_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          priority?: number
          scope: string
          target: string
          template_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          priority?: number
          scope?: string
          target?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "theme_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      theme_sections: {
        Row: {
          blocks: Json
          category: string
          created_at: string
          description: string | null
          design_tokens: Json
          id: string
          is_global: boolean
          name: string
          parent_section_id: string | null
          site_id: string | null
          slug: string
          source: string
          updated_at: string
          variants: Json
          version: number
        }
        Insert: {
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          design_tokens?: Json
          id?: string
          is_global?: boolean
          name: string
          parent_section_id?: string | null
          site_id?: string | null
          slug: string
          source?: string
          updated_at?: string
          variants?: Json
          version?: number
        }
        Update: {
          blocks?: Json
          category?: string
          created_at?: string
          description?: string | null
          design_tokens?: Json
          id?: string
          is_global?: boolean
          name?: string
          parent_section_id?: string | null
          site_id?: string | null
          slug?: string
          source?: string
          updated_at?: string
          variants?: Json
          version?: number
        }
        Relationships: []
      }
      theme_templates: {
        Row: {
          blocks: Json
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          kind: string
          name: string
          preview_url: string | null
          site_id: string | null
          slug: string
          source: string
          updated_at: string
          version: number
        }
        Insert: {
          blocks?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name: string
          preview_url?: string | null
          site_id?: string | null
          slug: string
          source?: string
          updated_at?: string
          version?: number
        }
        Update: {
          blocks?: Json
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          kind?: string
          name?: string
          preview_url?: string | null
          site_id?: string | null
          slug?: string
          source?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      theme_tokens: {
        Row: {
          breakpoints: Json
          colors: Json
          created_at: string
          id: string
          site_id: string | null
          spacing: Json
          typography: Json
          updated_at: string
        }
        Insert: {
          breakpoints?: Json
          colors?: Json
          created_at?: string
          id?: string
          site_id?: string | null
          spacing?: Json
          typography?: Json
          updated_at?: string
        }
        Update: {
          breakpoints?: Json
          colors?: Json
          created_at?: string
          id?: string
          site_id?: string | null
          spacing?: Json
          typography?: Json
          updated_at?: string
        }
        Relationships: []
      }
      user_table_prefs: {
        Row: {
          id: string
          key: string
          prefs: Json
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          prefs?: Json
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          prefs?: Json
          updated_at?: string
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
      cms_semver_key: { Args: { _version: string }; Returns: number[] }
      exec_cms_migration: {
        Args: {
          _current_version?: string
          _kind: string
          _migration_id: string
          _order_index: number
          _payload: string
          _signature_verified: boolean
          _site_id: string
          _version: string
        }
        Returns: Json
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
