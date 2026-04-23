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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_tier_requests: {
        Row: {
          admin_notes: string | null
          created_at: string | null
          current_tier: string
          id: string
          reason: string
          receipt_url: string | null
          requested_tier: string
          status: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string | null
          current_tier: string
          id?: string
          reason: string
          receipt_url?: string | null
          requested_tier: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string | null
          current_tier?: string
          id?: string
          reason?: string
          receipt_url?: string | null
          requested_tier?: string
          status?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_tier_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_usage_logs: {
        Row: {
          created_at: string | null
          id: string
          task_name: string
          token_cost: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          task_name: string
          token_cost: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          task_name?: string
          token_cost?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_cgpa_records: {
        Row: {
          created_at: string | null
          drive_file_id: string | null
          drive_view_url: string | null
          hpnm: number | null
          id: string
          is_user_verified: boolean | null
          pnm: number | null
          scan_raw: string | null
          semester: number | null
          tahun: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          hpnm?: number | null
          id?: string
          is_user_verified?: boolean | null
          pnm?: number | null
          scan_raw?: string | null
          semester?: number | null
          tahun?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          hpnm?: number | null
          id?: string
          is_user_verified?: boolean | null
          pnm?: number | null
          scan_raw?: string | null
          semester?: number | null
          tahun?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "akademik_cgpa_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_files: {
        Row: {
          created_at: string | null
          description: string | null
          download_count: number | null
          drive_download_url: string | null
          drive_file_id: string | null
          drive_view_url: string | null
          file_name: string | null
          file_size: number | null
          file_size_bytes: number | null
          file_type: string | null
          folder_id: string | null
          id: string
          is_personal: boolean | null
          name: string
          owner_user_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_size_bytes?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_personal?: boolean | null
          name: string
          owner_user_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          download_count?: number | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          file_name?: string | null
          file_size?: number | null
          file_size_bytes?: number | null
          file_type?: string | null
          folder_id?: string | null
          id?: string
          is_personal?: boolean | null
          name?: string
          owner_user_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "akademik_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_files_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_files_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_folders: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          parent_id: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          parent_id?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_folders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "akademik_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_merit_config: {
        Row: {
          id: string
          jenis: string
          merit_value: number
          peringkat: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          jenis: string
          merit_value?: number
          peringkat: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          jenis?: string
          merit_value?: number
          peringkat?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_merit_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_pencapaian: {
        Row: {
          category_id: string | null
          created_at: string | null
          drive_download_url: string | null
          drive_file_id: string | null
          drive_view_url: string | null
          id: string
          jenis: string
          merit_auto: number | null
          merit_override: number | null
          nama_pencapaian: string
          notes: string | null
          penganjur: string | null
          peringkat: string
          rejection_reason: string | null
          status: string | null
          tarikh: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          id?: string
          jenis: string
          merit_auto?: number | null
          merit_override?: number | null
          nama_pencapaian: string
          notes?: string | null
          penganjur?: string | null
          peringkat: string
          rejection_reason?: string | null
          status?: string | null
          tarikh?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          drive_download_url?: string | null
          drive_file_id?: string | null
          drive_view_url?: string | null
          id?: string
          jenis?: string
          merit_auto?: number | null
          merit_override?: number | null
          nama_pencapaian?: string
          notes?: string | null
          penganjur?: string | null
          peringkat?: string
          rejection_reason?: string | null
          status?: string | null
          tarikh?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_pencapaian_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "akademik_sijil_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_pencapaian_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_pencapaian_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_qr_scans: {
        Row: {
          id: string
          merit_awarded: number
          scanned_at: string | null
          token_id: string
          user_id: string
        }
        Insert: {
          id?: string
          merit_awarded: number
          scanned_at?: string | null
          token_id: string
          user_id: string
        }
        Update: {
          id?: string
          merit_awarded?: number
          scanned_at?: string | null
          token_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "akademik_qr_scans_token_id_fkey"
            columns: ["token_id"]
            isOneToOne: false
            referencedRelation: "akademik_qr_tokens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_qr_scans_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_qr_tokens: {
        Row: {
          available_from: string | null
          available_until: string | null
          category: string | null
          cooldown_hours: number | null
          created_at: string | null
          created_by: string | null
          current_scans_total: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_scans_total: number | null
          merit_value: number
          source_unit: string | null
          time_zone: string | null
          title: string
          token: string | null
        }
        Insert: {
          available_from?: string | null
          available_until?: string | null
          category?: string | null
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          current_scans_total?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_scans_total?: number | null
          merit_value?: number
          source_unit?: string | null
          time_zone?: string | null
          title: string
          token?: string | null
        }
        Update: {
          available_from?: string | null
          available_until?: string | null
          category?: string | null
          cooldown_hours?: number | null
          created_at?: string | null
          created_by?: string | null
          current_scans_total?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_scans_total?: number | null
          merit_value?: number
          source_unit?: string | null
          time_zone?: string | null
          title?: string
          token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_qr_tokens_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_sijil_categories: {
        Row: {
          color: string | null
          created_at: string | null
          created_by: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          created_by?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "akademik_sijil_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      akademik_unlock_requests: {
        Row: {
          created_at: string
          id: string
          pencapaian_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_note: string | null
          status: string
          unlocked_until: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          pencapaian_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          unlocked_until?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          pencapaian_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_note?: string | null
          status?: string
          unlocked_until?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "akademik_unlock_requests_pencapaian_id_fkey"
            columns: ["pencapaian_id"]
            isOneToOne: false
            referencedRelation: "akademik_pencapaian"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_unlock_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "akademik_unlock_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asrama_recommendations: {
        Row: {
          created_at: string | null
          marked_by: string | null
          notes: string | null
          session: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          marked_by?: string | null
          notes?: string | null
          session?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asrama_recommendations_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asrama_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      asrama_unit_admins: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asrama_unit_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asrama_unit_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_cash_checkpoints: {
        Row: {
          business_id: string
          cash_amount: number
          checkpoint_date: string
          checkpoint_time: string
          created_at: string
          id: string
          label: string
          note: string | null
          recorded_by: string | null
        }
        Insert: {
          business_id: string
          cash_amount: number
          checkpoint_date?: string
          checkpoint_time?: string
          created_at?: string
          id?: string
          label?: string
          note?: string | null
          recorded_by?: string | null
        }
        Update: {
          business_id?: string
          cash_amount?: number
          checkpoint_date?: string
          checkpoint_time?: string
          created_at?: string
          id?: string
          label?: string
          note?: string | null
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_cash_checkpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_cash_checkpoints_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_expenses: {
        Row: {
          amount: number
          business_id: string
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          recorded_by: string | null
        }
        Insert: {
          amount: number
          business_id: string
          category?: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          recorded_by?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_expenses_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_expenses_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pos_assignments: {
        Row: {
          assigned_by: string | null
          business_id: string
          created_at: string
          id: string
          user_id: string
          valid_date: string
        }
        Insert: {
          assigned_by?: string | null
          business_id: string
          created_at?: string
          id?: string
          user_id: string
          valid_date?: string
        }
        Update: {
          assigned_by?: string | null
          business_id?: string
          created_at?: string
          id?: string
          user_id?: string
          valid_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_pos_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pos_assignments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pos_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_pos_logs: {
        Row: {
          action_type: Database["public"]["Enums"]["pos_log_action"]
          actor_id: string | null
          actor_name: string | null
          business_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          transaction_id: string | null
        }
        Insert: {
          action_type: Database["public"]["Enums"]["pos_log_action"]
          actor_id?: string | null
          actor_name?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_id?: string | null
        }
        Update: {
          action_type?: Database["public"]["Enums"]["pos_log_action"]
          actor_id?: string | null
          actor_name?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_pos_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pos_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_pos_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "business_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      business_products: {
        Row: {
          business_id: string
          category: string | null
          cost_items: Json | null
          cost_notes: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_available: boolean
          name: string
          polymart_location: string | null
          polymart_pickup_info: string | null
          polymart_published_at: string | null
          price: number
          publish_to_polymart: boolean | null
          stock_alert_threshold: number
          stock_quantity: number
          reserved_stock: number
          total_cost: number | null
        }
        Insert: {
          business_id: string
          category?: string | null
          cost_items?: Json | null
          cost_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name: string
          polymart_location?: string | null
          polymart_pickup_info?: string | null
          polymart_published_at?: string | null
          price?: number
          publish_to_polymart?: boolean | null
          stock_alert_threshold?: number
          stock_quantity?: number
          reserved_stock?: number
          total_cost?: number | null
        }
        Update: {
          business_id?: string
          category?: string | null
          cost_items?: Json | null
          cost_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          name?: string
          polymart_location?: string | null
          polymart_pickup_info?: string | null
          polymart_published_at?: string | null
          price?: number
          publish_to_polymart?: boolean | null
          stock_alert_threshold?: number
          stock_quantity?: number
          reserved_stock?: number
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_products_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      business_promotions: {
        Row: {
          business_id: string
          code: string
          created_at: string
          created_by: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_uses: number | null
          min_purchase: number
          name: string
          uses_count: number
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          business_id: string
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          name: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          business_id?: string
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          min_purchase?: number
          name?: string
          uses_count?: number
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_promotions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_sessions: {
        Row: {
          business_id: string | null
          closed_by: string | null
          closing_cash: number | null
          closing_notes: string | null
          closing_time: string | null
          created_at: string | null
          id: string
          net_profit: number | null
          opened_by: string | null
          opening_cash: number
          opening_notes: string | null
          opening_time: string | null
          session_date: string
          status: string | null
          total_expenses: number | null
          total_sales: number | null
        }
        Insert: {
          business_id?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          closing_time?: string | null
          created_at?: string | null
          id?: string
          net_profit?: number | null
          opened_by?: string | null
          opening_cash?: number
          opening_notes?: string | null
          opening_time?: string | null
          session_date: string
          status?: string | null
          total_expenses?: number | null
          total_sales?: number | null
        }
        Update: {
          business_id?: string | null
          closed_by?: string | null
          closing_cash?: number | null
          closing_notes?: string | null
          closing_time?: string | null
          created_at?: string | null
          id?: string
          net_profit?: number | null
          opened_by?: string | null
          opening_cash?: number
          opening_notes?: string | null
          opening_time?: string | null
          session_date?: string
          status?: string | null
          total_expenses?: number | null
          total_sales?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_shift_swaps: {
        Row: {
          business_id: string | null
          created_at: string | null
          id: string
          reason: string
          requested_by: string | null
          responded_at: string | null
          responded_by: string | null
          shift_id: string | null
          status: string | null
          swap_with: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          reason: string
          requested_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          shift_id?: string | null
          status?: string | null
          swap_with?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string | null
          id?: string
          reason?: string
          requested_by?: string | null
          responded_at?: string | null
          responded_by?: string | null
          shift_id?: string | null
          status?: string | null
          swap_with?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_shift_swaps_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shift_swaps_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shift_swaps_responded_by_fkey"
            columns: ["responded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shift_swaps_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "business_shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shift_swaps_swap_with_fkey"
            columns: ["swap_with"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_shifts: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          shift_date: string
          shift_hour: number
          status: string | null
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          shift_date: string
          shift_hour: number
          status?: string | null
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          shift_date?: string
          shift_hour?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_shifts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shifts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_shifts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_transactions: {
        Row: {
          business_id: string
          change_amount: number | null
          created_at: string
          customer_name: string | null
          customer_note: string | null
          discount_amount: number
          discount_note: string | null
          discount_type: Database["public"]["Enums"]["pos_discount_type"] | null
          id: string
          invoice_number: string
          items: Json
          payment_method: Database["public"]["Enums"]["pos_payment_method"]
          promotion_code: string | null
          promotion_id: string | null
          received_amount: number | null
          served_by: string | null
          status: Database["public"]["Enums"]["pos_transaction_status"]
          subtotal: number
          total_amount: number
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          business_id: string
          change_amount?: number | null
          created_at?: string
          customer_name?: string | null
          customer_note?: string | null
          discount_amount?: number
          discount_note?: string | null
          discount_type?:
            | Database["public"]["Enums"]["pos_discount_type"]
            | null
          id?: string
          invoice_number: string
          items?: Json
          payment_method?: Database["public"]["Enums"]["pos_payment_method"]
          promotion_code?: string | null
          promotion_id?: string | null
          received_amount?: number | null
          served_by?: string | null
          status?: Database["public"]["Enums"]["pos_transaction_status"]
          subtotal?: number
          total_amount?: number
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          business_id?: string
          change_amount?: number | null
          created_at?: string
          customer_name?: string | null
          customer_note?: string | null
          discount_amount?: number
          discount_note?: string | null
          discount_type?:
            | Database["public"]["Enums"]["pos_discount_type"]
            | null
          id?: string
          invoice_number?: string
          items?: Json
          payment_method?: Database["public"]["Enums"]["pos_payment_method"]
          promotion_code?: string | null
          promotion_id?: string | null
          received_amount?: number | null
          served_by?: string | null
          status?: Database["public"]["Enums"]["pos_transaction_status"]
          subtotal?: number
          total_amount?: number
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_transactions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "business_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_transactions_served_by_fkey"
            columns: ["served_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_transactions_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_activities: {
        Row: {
          budget: number | null
          club_id: string | null
          created_at: string
          description: string | null
          end_date: string | null
          exco_unit: string | null
          id: string
          image_urls: string[] | null
          is_archived: boolean | null
          location: string | null
          priority: string | null
          start_date: string | null
          status: string | null
          tindakan: string | null
          title: string
          user_id: string | null
        }
        Insert: {
          budget?: number | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          exco_unit?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean | null
          location?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tindakan?: string | null
          title: string
          user_id?: string | null
        }
        Update: {
          budget?: number | null
          club_id?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          exco_unit?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean | null
          location?: string | null
          priority?: string | null
          start_date?: string | null
          status?: string | null
          tindakan?: string | null
          title?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_activities_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_announcements: {
        Row: {
          club_id: string | null
          content: string
          created_at: string | null
          id: string
        }
        Insert: {
          club_id?: string | null
          content: string
          created_at?: string | null
          id?: string
        }
        Update: {
          club_id?: string | null
          content?: string
          created_at?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_committee: {
        Row: {
          category: string | null
          club_id: string | null
          created_at: string | null
          full_name: string
          id: string
          image_url: string | null
          order_index: number | null
          position_title: string
          student_id: string | null
        }
        Insert: {
          category?: string | null
          club_id?: string | null
          created_at?: string | null
          full_name: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          position_title: string
          student_id?: string | null
        }
        Update: {
          category?: string | null
          club_id?: string | null
          created_at?: string | null
          full_name?: string
          id?: string
          image_url?: string | null
          order_index?: number | null
          position_title?: string
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_committee_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_logs: {
        Row: {
          action_type: string | null
          actor_id: string | null
          actor_name: string | null
          club_id: string | null
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          action_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          club_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          action_type?: string | null
          actor_id?: string | null
          actor_name?: string | null
          club_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "club_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_logs_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          matrix_no: string
          name: string
          position: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          matrix_no: string
          name: string
          position: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          matrix_no?: string
          name?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_reports: {
        Row: {
          admin_feedback: string | null
          club_id: string | null
          created_at: string | null
          exco_unit: string | null
          file_name: string
          file_url: string
          id: string
          is_archived: boolean | null
          marked_file_url: string | null
          report_type: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string | null
          title: string | null
        }
        Insert: {
          admin_feedback?: string | null
          club_id?: string | null
          created_at?: string | null
          exco_unit?: string | null
          file_name: string
          file_url: string
          id?: string
          is_archived?: boolean | null
          marked_file_url?: string | null
          report_type: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          title?: string | null
        }
        Update: {
          admin_feedback?: string | null
          club_id?: string | null
          created_at?: string | null
          exco_unit?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_archived?: boolean | null
          marked_file_url?: string | null
          report_type?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "club_reports_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_reports_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tasks: {
        Row: {
          approval_status: string | null
          approved_by: string | null
          assigned_to: string | null
          club_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          is_archived: boolean | null
          merit_points: number | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string | null
          title: string
        }
        Insert: {
          approval_status?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          merit_points?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          title: string
        }
        Update: {
          approval_status?: string | null
          approved_by?: string | null
          assigned_to?: string | null
          club_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_archived?: boolean | null
          merit_points?: number | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_tasks_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tasks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          name: string
          president_id: string | null
          short_name: string
          theme_color: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          president_id?: string | null
          short_name: string
          theme_color?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          president_id?: string | null
          short_name?: string
          theme_color?: string | null
        }
        Relationships: []
      }
      jpp_exco_units: {
        Row: {
          code: string
          color: string
          created_at: string | null
          id: string
          is_active: boolean
          name: string
          short_name: string
          sort_order: number
        }
        Insert: {
          code: string
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          short_name: string
          sort_order?: number
        }
        Update: {
          code?: string
          color?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          short_name?: string
          sort_order?: number
        }
        Relationships: []
      }
      jpp_mt_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          mt_user_id: string
          unit: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          mt_user_id: string
          unit: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          mt_user_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "jpp_mt_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jpp_mt_assignments_mt_user_id_fkey"
            columns: ["mt_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      karnival_votes: {
        Row: {
          created_at: string | null
          id: string
          kelab_id: string
          kelab_name: string
          matric_no: string | null
          voter_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          kelab_id: string
          kelab_name: string
          matric_no?: string | null
          voter_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          kelab_id?: string
          kelab_name?: string
          matric_no?: string | null
          voter_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "karnival_votes_voter_id_fkey"
            columns: ["voter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          read_at: string | null
          target_role: string | null
          target_user_id: string | null
          ticket_id: string
          title: string
          type: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          target_role?: string | null
          target_user_id?: string | null
          ticket_id: string
          title: string
          type: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          read_at?: string | null
          target_role?: string | null
          target_user_id?: string | null
          ticket_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_notifications_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_notifications_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kebajikan_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_settings: {
        Row: {
          auto_reply_message: string
          data_retention_months: number
          email_escalation: boolean
          email_new_ticket: boolean
          email_reopen: boolean
          email_warning: boolean
          id: string
          sla_escalate_hours: number
          sla_warning_hours: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          auto_reply_message?: string
          data_retention_months?: number
          email_escalation?: boolean
          email_new_ticket?: boolean
          email_reopen?: boolean
          email_warning?: boolean
          id?: string
          sla_escalate_hours?: number
          sla_warning_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          auto_reply_message?: string
          data_retention_months?: number
          email_escalation?: boolean
          email_new_ticket?: boolean
          email_reopen?: boolean
          email_warning?: boolean
          id?: string
          sla_escalate_hours?: number
          sla_warning_hours?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_staff_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          note: string | null
          role: string
          staff_user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          role?: string
          staff_user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          role?: string
          staff_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_staff_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_staff_assignments_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_tags: {
        Row: {
          color: string
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          color: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_ticket_comments: {
        Row: {
          attachments: string[] | null
          author_id: string | null
          author_name: string
          author_role: string
          content: string
          created_at: string
          id: string
          is_delegation_note: boolean
          is_internal: boolean
          ticket_id: string
        }
        Insert: {
          attachments?: string[] | null
          author_id?: string | null
          author_name: string
          author_role?: string
          content: string
          created_at?: string
          id?: string
          is_delegation_note?: boolean
          is_internal?: boolean
          ticket_id: string
        }
        Update: {
          attachments?: string[] | null
          author_id?: string | null
          author_name?: string
          author_role?: string
          content?: string
          created_at?: string
          id?: string
          is_delegation_note?: boolean
          is_internal?: boolean
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_ticket_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kebajikan_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_ticket_status_log: {
        Row: {
          actor_id: string | null
          actor_name: string | null
          actor_role: string | null
          created_at: string
          id: string
          new_status: string
          note: string | null
          old_status: string | null
          ticket_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          new_status: string
          note?: string | null
          old_status?: string | null
          ticket_id: string
        }
        Update: {
          actor_id?: string | null
          actor_name?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          new_status?: string
          note?: string | null
          old_status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_ticket_status_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_ticket_status_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "kebajikan_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      kebajikan_tickets: {
        Row: {
          assigned_to: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          category: string
          class: string | null
          created_at: string
          delegated_to: string | null
          delegation_note: string | null
          description: string
          escalated_at: string | null
          form_data: Json
          full_name: string
          gender: string | null
          id: string
          image_urls: string[] | null
          matric_no: string | null
          phone: string | null
          priority: string
          rating: number | null
          rating_at: string | null
          rating_comment: string | null
          reopen_approved_by: string | null
          reopen_count: number
          reopen_reason: string | null
          reopen_requested_at: string | null
          resolution_note: string
          resolved_at: string | null
          resolved_by: string | null
          sla_deadline: string | null
          status: string
          submitter_id: string | null
          tags: string[] | null
          ticket_no: string
          title: string
          updated_at: string
          warning_sent_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category: string
          class?: string | null
          created_at?: string
          delegated_to?: string | null
          delegation_note?: string | null
          description: string
          escalated_at?: string | null
          form_data?: Json
          full_name: string
          gender?: string | null
          id?: string
          image_urls?: string[] | null
          matric_no?: string | null
          phone?: string | null
          priority?: string
          rating?: number | null
          rating_at?: string | null
          rating_comment?: string | null
          reopen_approved_by?: string | null
          reopen_count?: number
          reopen_reason?: string | null
          reopen_requested_at?: string | null
          resolution_note?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sla_deadline?: string | null
          status?: string
          submitter_id?: string | null
          tags?: string[] | null
          ticket_no: string
          title: string
          updated_at?: string
          warning_sent_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          category?: string
          class?: string | null
          created_at?: string
          delegated_to?: string | null
          delegation_note?: string | null
          description?: string
          escalated_at?: string | null
          form_data?: Json
          full_name?: string
          gender?: string | null
          id?: string
          image_urls?: string[] | null
          matric_no?: string | null
          phone?: string | null
          priority?: string
          rating?: number | null
          rating_at?: string | null
          rating_comment?: string | null
          reopen_approved_by?: string | null
          reopen_count?: number
          reopen_reason?: string | null
          reopen_requested_at?: string | null
          resolution_note?: string
          resolved_at?: string | null
          resolved_by?: string | null
          sla_deadline?: string | null
          status?: string
          submitter_id?: string | null
          tags?: string[] | null
          ticket_no?: string
          title?: string
          updated_at?: string
          warning_sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kebajikan_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_tickets_delegated_to_fkey"
            columns: ["delegated_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_tickets_reopen_approved_by_fkey"
            columns: ["reopen_approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_tickets_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kebajikan_tickets_submitter_id_fkey"
            columns: ["submitter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keusahawanan_businesses: {
        Row: {
          cash_session_enabled: boolean
          category_id: string | null
          created_at: string
          description: string | null
          id: string
          interview_date: string | null
          is_active: boolean | null
          is_shift_enabled: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          polymart_contact_method: string | null
          polymart_is_active: boolean | null
          promotions_enabled: boolean
          status: Database["public"]["Enums"]["keusahawanan_business_status"]
        }
        Insert: {
          cash_session_enabled?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          interview_date?: string | null
          is_active?: boolean | null
          is_shift_enabled?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          polymart_contact_method?: string | null
          polymart_is_active?: boolean | null
          promotions_enabled?: boolean
          status?: Database["public"]["Enums"]["keusahawanan_business_status"]
        }
        Update: {
          cash_session_enabled?: boolean
          category_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          interview_date?: string | null
          is_active?: boolean | null
          is_shift_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          polymart_contact_method?: string | null
          polymart_is_active?: boolean | null
          promotions_enabled?: boolean
          status?: Database["public"]["Enums"]["keusahawanan_business_status"]
        }
        Relationships: [
          {
            foreignKeyName: "keusahawanan_businesses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keusahawanan_businesses_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      keusahawanan_categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      keusahawanan_logs: {
        Row: {
          action_type: string
          actor_id: string | null
          business_id: string | null
          created_at: string | null
          description: string | null
          id: string
        }
        Insert: {
          action_type: string
          actor_id?: string | null
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Update: {
          action_type?: string
          actor_id?: string | null
          business_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keusahawanan_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keusahawanan_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      keusahawanan_program_registrations: {
        Row: {
          id: string
          program_id: string
          registered_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          program_id: string
          registered_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          program_id?: string
          registered_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keusahawanan_program_registrations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      keusahawanan_programs: {
        Row: {
          created_at: string | null
          created_by: string | null
          date_label: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          max_participants: number | null
          participants_count: number | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          venue: string | null
          visibility: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date_label?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          participants_count?: number | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          venue?: string | null
          visibility?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date_label?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          participants_count?: number | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          venue?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      keusahawanan_unit_admins: {
        Row: {
          assigned_by: string | null
          created_at: string
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "keusahawanan_unit_admins_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "keusahawanan_unit_admins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      merit_transactions: {
        Row: {
          actor_name: string | null
          club_id: string | null
          created_at: string | null
          id: string
          points: number | null
          reason: string | null
          reference_id: string | null
          source: string | null
          user_id: string | null
        }
        Insert: {
          actor_name?: string | null
          club_id?: string | null
          created_at?: string | null
          id?: string
          points?: number | null
          reason?: string | null
          reference_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Update: {
          actor_name?: string | null
          club_id?: string | null
          created_at?: string | null
          id?: string
          points?: number | null
          reason?: string | null
          reference_id?: string | null
          source?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merit_transactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merit_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_name: string | null
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string | null
          module: string
          reference_id: string | null
          target_role: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          actor_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          module?: string
          reference_id?: string | null
          target_role?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          actor_name?: string | null
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string | null
          module?: string
          reference_id?: string | null
          target_role?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polymart_ads: {
        Row: {
          clicks: number
          created_at: string
          created_by: string | null
          end_date: string | null
          id: string
          image_url: string
          link_url: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["polymart_ad_status"]
          title: string
          type: Database["public"]["Enums"]["polymart_ad_type"]
          updated_at: string
        }
        Insert: {
          clicks?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url: string
          link_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["polymart_ad_status"]
          title: string
          type?: Database["public"]["Enums"]["polymart_ad_type"]
          updated_at?: string
        }
        Update: {
          clicks?: number
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          id?: string
          image_url?: string
          link_url?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["polymart_ad_status"]
          title?: string
          type?: Database["public"]["Enums"]["polymart_ad_type"]
          updated_at?: string
        }
        Relationships: []
      }
      polymart_orders: {
        Row: {
          business_id: string | null
          buyer_id: string | null
          cancel_reason: string | null
          cancelled_at: string | null
          completed_at: string | null
          confirmed_at: string | null
          created_at: string | null
          id: string
          note: string | null
          pickup_time: string | null
          product_id: string | null
          quantity: number
          ready_at: string | null
          share_phone: boolean | null
          status: string | null
          total_price: number | null
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          business_id?: string | null
          buyer_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          pickup_time?: string | null
          product_id?: string | null
          quantity?: number
          ready_at?: string | null
          share_phone?: boolean | null
          status?: string | null
          total_price?: number | null
          unit_price: number
          updated_at?: string | null
        }
        Update: {
          business_id?: string | null
          buyer_id?: string | null
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_at?: string | null
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          note?: string | null
          pickup_time?: string | null
          product_id?: string | null
          quantity?: number
          ready_at?: string | null
          share_phone?: boolean | null
          status?: string | null
          total_price?: number | null
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polymart_orders_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
        ]
      }
      polymart_reports: {
        Row: {
          created_at: string | null
          id: string
          product_id: string | null
          reason: string
          reporter_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          reason: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string | null
          reason?: string
          reporter_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polymart_reports_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      polymart_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          order_id: string | null
          product_id: string | null
          rating: number
          reviewer_id: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating: number
          reviewer_id?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          product_id?: string | null
          rating?: number
          reviewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "polymart_reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "polymart_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "business_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "polymart_reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      portal_settings: {
        Row: {
          color: string
          exco_module: string
          id: string
          is_enabled: boolean | null
          label: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          color: string
          exco_module: string
          id?: string
          is_enabled?: boolean | null
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          color?: string
          exco_module?: string
          id?: string
          is_enabled?: boolean | null
          label?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "portal_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string | null
          ai_daily_usage: number | null
          ai_last_reset: string | null
          ai_status: string | null
          ai_tier_expiration: string | null
          ai_token_balance: number | null
          ai_token_last_reset: string | null
          avatar_url: string | null
          club_id: string | null
          created_at: string
          department: string | null
          email: string
          full_name: string | null
          id: string
          intake_period: number | null
          intake_year: number | null
          jabatan: string | null
          jpp_position: string | null
          jpp_unit: string | null
          matric_no: string | null
          merit: number | null
          merit_akademik: number
          merit_asrama: number
          merit_kelab: number
          phone: string | null
          programme_code: string | null
          role: string | null
          semester_override: number | null
          subscription_tier: string | null
        }
        Insert: {
          account_status?: string | null
          ai_daily_usage?: number | null
          ai_last_reset?: string | null
          ai_status?: string | null
          ai_tier_expiration?: string | null
          ai_token_balance?: number | null
          ai_token_last_reset?: string | null
          avatar_url?: string | null
          club_id?: string | null
          created_at?: string
          department?: string | null
          email: string
          full_name?: string | null
          id: string
          intake_period?: number | null
          intake_year?: number | null
          jabatan?: string | null
          jpp_position?: string | null
          jpp_unit?: string | null
          matric_no?: string | null
          merit?: number | null
          merit_akademik?: number
          merit_asrama?: number
          merit_kelab?: number
          phone?: string | null
          programme_code?: string | null
          role?: string | null
          semester_override?: number | null
          subscription_tier?: string | null
        }
        Update: {
          account_status?: string | null
          ai_daily_usage?: number | null
          ai_last_reset?: string | null
          ai_status?: string | null
          ai_tier_expiration?: string | null
          ai_token_balance?: number | null
          ai_token_last_reset?: string | null
          avatar_url?: string | null
          club_id?: string | null
          created_at?: string
          department?: string | null
          email?: string
          full_name?: string | null
          id?: string
          intake_period?: number | null
          intake_year?: number | null
          jabatan?: string | null
          jpp_position?: string | null
          jpp_unit?: string | null
          matric_no?: string | null
          merit?: number | null
          merit_akademik?: number
          merit_asrama?: number
          merit_kelab?: number
          phone?: string | null
          programme_code?: string | null
          role?: string | null
          semester_override?: number | null
          subscription_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          budget: number | null
          club_id: string | null
          created_at: string
          deskripsi: string | null
          id: string
          image_urls: string[] | null
          is_archived: boolean | null
          is_locked: boolean | null
          jpp_remarks: string | null
          location: string | null
          nama_program: string
          objektif: string | null
          pengarah_program: string | null
          status: Database["public"]["Enums"]["program_status"] | null
          tarikh_mula: string
          tarikh_tamat: string
          tindakan: string | null
          updated_at: string
          url_kertas_kerja: string | null
          url_post_mortem: string | null
          user_id: string | null
          version: number | null
        }
        Insert: {
          budget?: number | null
          club_id?: string | null
          created_at?: string
          deskripsi?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean | null
          is_locked?: boolean | null
          jpp_remarks?: string | null
          location?: string | null
          nama_program: string
          objektif?: string | null
          pengarah_program?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          tarikh_mula: string
          tarikh_tamat: string
          tindakan?: string | null
          updated_at?: string
          url_kertas_kerja?: string | null
          url_post_mortem?: string | null
          user_id?: string | null
          version?: number | null
        }
        Update: {
          budget?: number | null
          club_id?: string | null
          created_at?: string
          deskripsi?: string | null
          id?: string
          image_urls?: string[] | null
          is_archived?: boolean | null
          is_locked?: boolean | null
          jpp_remarks?: string | null
          location?: string | null
          nama_program?: string
          objektif?: string | null
          pengarah_program?: string | null
          status?: Database["public"]["Enums"]["program_status"] | null
          tarikh_mula?: string
          tarikh_tamat?: string
          tindakan?: string | null
          updated_at?: string
          url_kertas_kerja?: string | null
          url_post_mortem?: string | null
          user_id?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          device_hint: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          device_hint?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          device_hint?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      student_business_memberships: {
        Row: {
          business_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["keusahawanan_membership_role"]
          status: Database["public"]["Enums"]["keusahawanan_membership_status"]
          user_id: string
        }
        Insert: {
          business_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["keusahawanan_membership_role"]
          status?: Database["public"]["Enums"]["keusahawanan_membership_status"]
          user_id: string
        }
        Update: {
          business_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["keusahawanan_membership_role"]
          status?: Database["public"]["Enums"]["keusahawanan_membership_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_business_memberships_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "keusahawanan_businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_business_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_club_memberships: {
        Row: {
          account_status: string
          club_id: string
          created_at: string | null
          id: string
          is_primary: boolean
          joined_at: string | null
          role: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_status?: string
          club_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_status?: string
          club_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean
          joined_at?: string | null
          role?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_club_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      supsas_editions: {
        Row: {
          banner_url: string | null
          created_at: string
          edition_year: number
          end_date: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          start_date: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          edition_year: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          start_date?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          edition_year?: number
          end_date?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          start_date?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      supsas_fixtures: {
        Row: {
          bracket_position: number | null
          bracket_round: number | null
          created_at: string
          edition_id: string
          group_name: string | null
          id: string
          is_bye: boolean
          kontingen_a_id: string | null
          kontingen_b_id: string | null
          match_date: string | null
          match_number: number | null
          match_time: string | null
          next_match_id: string | null
          notes: string | null
          round: string | null
          score_a: string | null
          score_b: string | null
          sport_id: string
          status: string
          updated_at: string
          venue: string | null
          winner_id: string | null
        }
        Insert: {
          bracket_position?: number | null
          bracket_round?: number | null
          created_at?: string
          edition_id: string
          group_name?: string | null
          id?: string
          is_bye?: boolean
          kontingen_a_id?: string | null
          kontingen_b_id?: string | null
          match_date?: string | null
          match_number?: number | null
          match_time?: string | null
          next_match_id?: string | null
          notes?: string | null
          round?: string | null
          score_a?: string | null
          score_b?: string | null
          sport_id: string
          status?: string
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Update: {
          bracket_position?: number | null
          bracket_round?: number | null
          created_at?: string
          edition_id?: string
          group_name?: string | null
          id?: string
          is_bye?: boolean
          kontingen_a_id?: string | null
          kontingen_b_id?: string | null
          match_date?: string | null
          match_number?: number | null
          match_time?: string | null
          next_match_id?: string | null
          notes?: string | null
          round?: string | null
          score_a?: string | null
          score_b?: string | null
          sport_id?: string
          status?: string
          updated_at?: string
          venue?: string | null
          winner_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supsas_fixtures_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_fixtures_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_kontingen_a_id_fkey"
            columns: ["kontingen_a_id"]
            isOneToOne: false
            referencedRelation: "supsas_kontingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_kontingen_a_id_fkey"
            columns: ["kontingen_a_id"]
            isOneToOne: false
            referencedRelation: "supsas_medal_tally"
            referencedColumns: ["kontingen_id"]
          },
          {
            foreignKeyName: "supsas_fixtures_kontingen_b_id_fkey"
            columns: ["kontingen_b_id"]
            isOneToOne: false
            referencedRelation: "supsas_kontingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_kontingen_b_id_fkey"
            columns: ["kontingen_b_id"]
            isOneToOne: false
            referencedRelation: "supsas_medal_tally"
            referencedColumns: ["kontingen_id"]
          },
          {
            foreignKeyName: "supsas_fixtures_next_match_id_fkey"
            columns: ["next_match_id"]
            isOneToOne: false
            referencedRelation: "supsas_fixtures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "supsas_sports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "supsas_kontingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_fixtures_winner_id_fkey"
            columns: ["winner_id"]
            isOneToOne: false
            referencedRelation: "supsas_medal_tally"
            referencedColumns: ["kontingen_id"]
          },
        ]
      }
      supsas_kontingen: {
        Row: {
          color: string
          created_at: string
          edition_id: string
          id: string
          invite_code: string | null
          invite_used: boolean
          is_active: boolean
          leader_id: string | null
          logo_url: string | null
          name: string
          short_code: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          edition_id: string
          id?: string
          invite_code?: string | null
          invite_used?: boolean
          is_active?: boolean
          leader_id?: string | null
          logo_url?: string | null
          name: string
          short_code: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          edition_id?: string
          id?: string
          invite_code?: string | null
          invite_used?: boolean
          is_active?: boolean
          leader_id?: string | null
          logo_url?: string | null
          name?: string
          short_code?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supsas_kontingen_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_kontingen_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      supsas_participants: {
        Row: {
          created_at: string
          edition_id: string
          id: string
          is_confirmed: boolean
          jersey_number: number | null
          kontingen_id: string
          position: string | null
          profile_id: string
          sport_id: string
        }
        Insert: {
          created_at?: string
          edition_id: string
          id?: string
          is_confirmed?: boolean
          jersey_number?: number | null
          kontingen_id: string
          position?: string | null
          profile_id: string
          sport_id: string
        }
        Update: {
          created_at?: string
          edition_id?: string
          id?: string
          is_confirmed?: boolean
          jersey_number?: number | null
          kontingen_id?: string
          position?: string | null
          profile_id?: string
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supsas_participants_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_participants_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_participants_kontingen_id_fkey"
            columns: ["kontingen_id"]
            isOneToOne: false
            referencedRelation: "supsas_kontingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_participants_kontingen_id_fkey"
            columns: ["kontingen_id"]
            isOneToOne: false
            referencedRelation: "supsas_medal_tally"
            referencedColumns: ["kontingen_id"]
          },
          {
            foreignKeyName: "supsas_participants_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "supsas_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      supsas_results: {
        Row: {
          edition_id: string
          id: string
          kontingen_id: string
          medal: string | null
          notes: string | null
          position: number | null
          recorded_at: string
          recorded_by: string | null
          sport_id: string
        }
        Insert: {
          edition_id: string
          id?: string
          kontingen_id: string
          medal?: string | null
          notes?: string | null
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          sport_id: string
        }
        Update: {
          edition_id?: string
          id?: string
          kontingen_id?: string
          medal?: string | null
          notes?: string | null
          position?: number | null
          recorded_at?: string
          recorded_by?: string | null
          sport_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supsas_results_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_results_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_results_kontingen_id_fkey"
            columns: ["kontingen_id"]
            isOneToOne: false
            referencedRelation: "supsas_kontingen"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supsas_results_kontingen_id_fkey"
            columns: ["kontingen_id"]
            isOneToOne: false
            referencedRelation: "supsas_medal_tally"
            referencedColumns: ["kontingen_id"]
          },
          {
            foreignKeyName: "supsas_results_sport_id_fkey"
            columns: ["sport_id"]
            isOneToOne: false
            referencedRelation: "supsas_sports"
            referencedColumns: ["id"]
          },
        ]
      }
      supsas_sports: {
        Row: {
          category: string
          created_at: string
          edition_id: string
          format: string
          gender: string
          icon: string
          id: string
          is_active: boolean
          max_per_team: number
          name: string
          sort_order: number
          updated_at: string
          venue: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          edition_id: string
          format?: string
          gender?: string
          icon?: string
          id?: string
          is_active?: boolean
          max_per_team?: number
          name: string
          sort_order?: number
          updated_at?: string
          venue?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          edition_id?: string
          format?: string
          gender?: string
          icon?: string
          id?: string
          is_active?: boolean
          max_per_team?: number
          name?: string
          sort_order?: number
          updated_at?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supsas_sports_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_sports_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          action_url: string | null
          content_body: string
          created_at: string
          created_by: string | null
          form_schema: Json | null
          icon_type: string | null
          id: string
          image_url: string | null
          is_active: boolean
          priority: string
          target_audience: string
          title: string
        }
        Insert: {
          action_url?: string | null
          content_body: string
          created_at?: string
          created_by?: string | null
          form_schema?: Json | null
          icon_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority: string
          target_audience: string
          title: string
        }
        Update: {
          action_url?: string | null
          content_body?: string
          created_at?: string
          created_by?: string | null
          form_schema?: Json | null
          icon_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          priority?: string
          target_audience?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value?: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      takwim_holidays: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          nama_cuti: string
          tarikh_mula: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama_cuti: string
          tarikh_mula: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          nama_cuti?: string
          tarikh_mula?: string
        }
        Relationships: []
      }
      task_feedback: {
        Row: {
          content: string
          created_at: string | null
          from_id: string | null
          id: string
          task_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          from_id?: string | null
          id?: string
          task_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          from_id?: string | null
          id?: string
          task_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_feedback_from_id_fkey"
            columns: ["from_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_feedback_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "club_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_submissions: {
        Row: {
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          notes: string | null
          task_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          notes?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          notes?: string | null
          task_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "task_submissions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "club_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_announcement_responses: {
        Row: {
          announcement_id: string
          created_at: string
          form_data: Json | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          created_at?: string
          form_data?: Json | null
          id?: string
          status: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          created_at?: string
          form_data?: Json | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_announcement_responses_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "system_announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_announcement_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_exco_access: {
        Row: {
          exco_module: string
          granted_at: string | null
          granted_by: string | null
          id: string
          is_active: boolean | null
          role: string
          user_id: string
        }
        Insert: {
          exco_module: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role: string
          user_id: string
        }
        Update: {
          exco_module?: string
          granted_at?: string | null
          granted_by?: string | null
          id?: string
          is_active?: boolean | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_exco_access_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_exco_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      kebajikan_public_stats: {
        Row: {
          avg_rating: number | null
          avg_resolution_hours: number | null
          resolution_rate: number | null
          this_month_received: number | null
          this_month_resolved: number | null
          total_active: number | null
          total_resolved: number | null
          total_tickets: number | null
        }
        Relationships: []
      }
      supsas_edition_stats: {
        Row: {
          completed_fixtures: number | null
          edition_id: string | null
          edition_name: string | null
          edition_year: number | null
          is_active: boolean | null
          live_fixtures: number | null
          total_fixtures: number | null
          total_kontingen: number | null
          total_results: number | null
          total_sports: number | null
        }
        Relationships: []
      }
      supsas_medal_tally: {
        Row: {
          bronze: number | null
          color: string | null
          edition_id: string | null
          gold: number | null
          kontingen_id: string | null
          logo_url: string | null
          name: string | null
          short_code: string | null
          silver: number | null
          total_medals: number | null
        }
        Relationships: [
          {
            foreignKeyName: "supsas_kontingen_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_edition_stats"
            referencedColumns: ["edition_id"]
          },
          {
            foreignKeyName: "supsas_kontingen_edition_id_fkey"
            columns: ["edition_id"]
            isOneToOne: false
            referencedRelation: "supsas_editions"
            referencedColumns: ["id"]
          },
        ]
      }
      v_hpnm_by_jabatan: {
        Row: {
          avg_hpnm: number | null
          avg_pnm: number | null
          cemerlang_count: number | null
          gagal_count: number | null
          jabatan: string | null
          kepujian_count: number | null
          lulus_count: number | null
          program: string | null
          student_count: number | null
        }
        Relationships: []
      }
      v_merit_by_jabatan: {
        Row: {
          bulan: string | null
          jabatan: string | null
          source: string | null
          student_count: number | null
          total_points: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_group_winners: { Args: { p_sport_id: string }; Returns: Json }
      advance_sf_winners: { Args: { p_sport_id: string }; Returns: Json }
      approve_all_pending_memberships: {
        Args: { p_club_id: string }
        Returns: number
      }
      assign_jpp_member: {
        Args: {
          p_jpp_position: string
          p_jpp_unit: string
          p_target_id: string
        }
        Returns: undefined
      }
      auto_clean_rejected_reports: { Args: never; Returns: undefined }
      can_change_role: {
        Args: { actor_id: string; new_role: string; target_id: string }
        Returns: boolean
      }
      change_member_role: {
        Args: {
          p_actor_id: string
          p_club_id: string
          p_new_role: string
          p_target_id: string
        }
        Returns: undefined
      }
      check_ai_tokens: { Args: { task_name?: string }; Returns: Json }
      check_system_setting: { Args: { setting_key: string }; Returns: boolean }
      cleanup_old_notifications: { Args: never; Returns: undefined }
      cleanup_orphan_supsas_fixtures: { Args: never; Returns: number }
      decrement_product_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: undefined
      }
      delete_own_user: { Args: never; Returns: undefined }
      get_dashboard_data: {
        Args: { p_club_id: string; p_is_member?: boolean; p_user_id: string }
        Returns: Json
      }
      get_kebajikan_category_stats: {
        Args: never
        Returns: {
          category: string
          percentage: number
          resolved: number
          total: number
        }[]
      }
      get_kebajikan_monthly_stats: {
        Args: { months_back?: number }
        Returns: {
          avg_hours: number
          month_date: string
          month_label: string
          received: number
          resolved: number
        }[]
      }
      get_kebajikan_recent_ratings: {
        Args: { limit_count?: number }
        Returns: {
          category: string
          rating: number
          rating_at: string
          rating_comment: string
        }[]
      }
      get_my_club_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_my_votes: {
        Args: never
        Returns: {
          created_at: string
          kelab_id: string
          kelab_name: string
        }[]
      }
      get_storage_stats: {
        Args: never
        Returns: {
          limit_mb: number
          total_mb: number
        }[]
      }
      get_user_approved_club_ids: { Args: { p_uid: string }; Returns: string[] }
      get_user_club_ids: { Args: { p_user_id: string }; Returns: string[] }
      get_vote_counts: {
        Args: never
        Returns: {
          kelab_id: string
          kelab_name: string
          total_votes: number
        }[]
      }
      has_business_shift_access: { Args: { b_id: string }; Returns: boolean }
      has_keusahawanan_gerai_access: { Args: never; Returns: boolean }
      has_voted_for: { Args: { p_kelab_id: string }; Returns: boolean }
      increment_merit: {
        Args: { delta: number; target_user_id: string }
        Returns: undefined
      }
      increment_merit_by_source: {
        Args: { p_delta: number; p_src: string; p_uid: string }
        Returns: undefined
      }
      increment_product_stock: {
        Args: { p_product_id: string; p_qty: number }
        Returns: undefined
      }
      is_club_leader: {
        Args: { p_club_id: string; p_uid: string }
        Returns: boolean
      }
      is_club_president: {
        Args: { p_club_id: string; p_uid: string }
        Returns: boolean
      }
      is_gerai_member: { Args: never; Returns: boolean }
      is_jpp_admin: { Args: { p_uid: string }; Returns: boolean }
      is_kebajikan_pegawai: { Args: never; Returns: boolean }
      is_kebajikan_staff: { Args: never; Returns: boolean }
      request_leave_club: {
        Args: { p_club_id: string; p_is_primary: boolean }
        Returns: boolean
      }
      rpc_pembersihan_akaun_lama: { Args: never; Returns: number }
      rpc_pembubaran_kohort: { Args: never; Returns: undefined }
      rpc_pembubaran_kohort_kelab: {
        Args: { target_club_id: string }
        Returns: undefined
      }
      spend_ai_tokens: { Args: { task_name: string }; Returns: Json }
      supsas_claim_invite_code: {
        Args: { p_invite_code: string }
        Returns: Json
      }
      supsas_revoke_leader: {
        Args: { p_kontingen_id: string }
        Returns: boolean
      }
      toggle_jpp_role: { Args: { p_target_id: string }; Returns: string }
      track_ai_flash_usage: { Args: { action?: string }; Returns: Json }
      track_ai_pro_usage: { Args: { action?: string }; Returns: Json }
      track_ai_usage: { Args: never; Returns: string }
      transfer_business_ownership: {
        Args: { p_business_id: string; p_new_owner_id: string }
        Returns: boolean
      }
      update_jpp_member_profile: {
        Args: {
          p_jpp_position: string
          p_jpp_unit: string
          p_target_id: string
        }
        Returns: undefined
      }
      update_user_ai_tier: {
        Args: { new_tier: string; target_user_id: string }
        Returns: undefined
      }
      verify_staff_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      keusahawanan_business_status: "PENDING_INTERVIEW" | "ACTIVE" | "REJECTED"
      keusahawanan_membership_role: "OWNER" | "MEMBER"
      keusahawanan_membership_status: "PENDING" | "ACTIVE" | "REJECTED"
      polymart_ad_status: "DRAFT" | "ACTIVE" | "INACTIVE"
      polymart_ad_type: "INTERNAL" | "EXTERNAL"
      pos_discount_type: "FIXED" | "PERCENT"
      pos_log_action:
        | "TRANSACTION_CREATE"
        | "TRANSACTION_VOID"
        | "PRODUCT_ADD"
        | "PRODUCT_EDIT"
        | "PRODUCT_DELETE"
        | "STOCK_EDIT"
        | "POS_ASSIGNED"
        | "STAFF_APPROVED"
        | "STAFF_REMOVED"
        | "SETTINGS_UPDATED"
        | "EXPENSE_ADD"
        | "EXPENSE_DELETE"
        | "PROMO_CREATE"
        | "PROMO_USED"
        | "PROMO_TOGGLE"
        | "CASH_CHECKPOINT"
      pos_payment_method: "CASH" | "QR" | "TRANSFER" | "POLYMART"
      pos_transaction_status: "COMPLETED" | "VOIDED"
      program_status:
        | "DRAFT"
        | "PENDING_APPROVAL"
        | "CONFIRMED"
        | "IN_PROGRESS"
        | "PENDING_POSTMORTEM"
        | "COMPLETED"
        | "ARCHIVED"
        | "REQUEST_UNLOCK"
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
      keusahawanan_business_status: ["PENDING_INTERVIEW", "ACTIVE", "REJECTED"],
      keusahawanan_membership_role: ["OWNER", "MEMBER"],
      keusahawanan_membership_status: ["PENDING", "ACTIVE", "REJECTED"],
      polymart_ad_status: ["DRAFT", "ACTIVE", "INACTIVE"],
      polymart_ad_type: ["INTERNAL", "EXTERNAL"],
      pos_discount_type: ["FIXED", "PERCENT"],
      pos_log_action: [
        "TRANSACTION_CREATE",
        "TRANSACTION_VOID",
        "PRODUCT_ADD",
        "PRODUCT_EDIT",
        "PRODUCT_DELETE",
        "STOCK_EDIT",
        "POS_ASSIGNED",
        "STAFF_APPROVED",
        "STAFF_REMOVED",
        "SETTINGS_UPDATED",
        "EXPENSE_ADD",
        "EXPENSE_DELETE",
        "PROMO_CREATE",
        "PROMO_USED",
        "PROMO_TOGGLE",
        "CASH_CHECKPOINT",
      ],
      pos_payment_method: ["CASH", "QR", "TRANSFER", "POLYMART"],
      pos_transaction_status: ["COMPLETED", "VOIDED"],
      program_status: [
        "DRAFT",
        "PENDING_APPROVAL",
        "CONFIRMED",
        "IN_PROGRESS",
        "PENDING_POSTMORTEM",
        "COMPLETED",
        "ARCHIVED",
        "REQUEST_UNLOCK",
      ],
    },
  },
} as const
