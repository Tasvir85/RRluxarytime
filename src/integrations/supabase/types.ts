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
      generation_jobs: {
        Row: {
          actual_cost: number | null
          attempt: number
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          estimated_cost: number | null
          failed_at: string | null
          id: string
          input_images: Json
          job_number: number
          metadata: Json
          model_version_id: string | null
          progress: number
          project_id: string
          provider: string
          provider_job_id: string | null
          stage: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          id?: string
          input_images?: Json
          job_number: number
          metadata?: Json
          model_version_id?: string | null
          progress?: number
          project_id: string
          provider: string
          provider_job_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          actual_cost?: number | null
          attempt?: number
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          estimated_cost?: number | null
          failed_at?: string | null
          id?: string
          input_images?: Json
          job_number?: number
          metadata?: Json
          model_version_id?: string | null
          progress?: number
          project_id?: string
          provider?: string
          provider_job_id?: string | null
          stage?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_model_version_id_fkey"
            columns: ["model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      model_versions: {
        Row: {
          approved_at: string | null
          created_at: string
          filename: string | null
          id: string
          metadata: Json
          optimization: Json
          optimized_path: string | null
          optimized_size: number | null
          original_path: string | null
          original_size: number | null
          project_id: string
          provider: string | null
          quality: string | null
          source: string
          status: string
          thumbnails: Json
          updated_at: string
          user_id: string
          validation: Json
          version: number
        }
        Insert: {
          approved_at?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json
          optimization?: Json
          optimized_path?: string | null
          optimized_size?: number | null
          original_path?: string | null
          original_size?: number | null
          project_id: string
          provider?: string | null
          quality?: string | null
          source: string
          status?: string
          thumbnails?: Json
          updated_at?: string
          user_id?: string
          validation?: Json
          version: number
        }
        Update: {
          approved_at?: string | null
          created_at?: string
          filename?: string | null
          id?: string
          metadata?: Json
          optimization?: Json
          optimized_path?: string | null
          optimized_size?: number | null
          original_path?: string | null
          original_size?: number | null
          project_id?: string
          provider?: string | null
          quality?: string | null
          source?: string
          status?: string
          thumbnails?: Json
          updated_at?: string
          user_id?: string
          validation?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "model_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          analysis: Json
          created_at: string
          filename: string
          height: number | null
          id: string
          path: string
          project_id: string
          size: number
          slot: string
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          analysis?: Json
          created_at?: string
          filename: string
          height?: number | null
          id?: string
          path: string
          project_id: string
          size: number
          slot: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Update: {
          analysis?: Json
          created_at?: string
          filename?: string
          height?: number | null
          id?: string
          path?: string
          project_id?: string
          size?: number
          slot?: string
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          active_model_version_id: string | null
          brand_name: string
          category: string
          config: Json
          created_at: string
          description: string
          id: string
          model_filename: string | null
          model_path: string | null
          model_size: number | null
          model_source: string | null
          model_status: string
          model_url: string | null
          name: string
          product_name: string
          published_at: string | null
          slug: string
          status: string
          template: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_model_version_id?: string | null
          brand_name?: string
          category?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          model_filename?: string | null
          model_path?: string | null
          model_size?: number | null
          model_source?: string | null
          model_status?: string
          model_url?: string | null
          name: string
          product_name?: string
          published_at?: string | null
          slug: string
          status?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          active_model_version_id?: string | null
          brand_name?: string
          category?: string
          config?: Json
          created_at?: string
          description?: string
          id?: string
          model_filename?: string | null
          model_path?: string | null
          model_size?: number | null
          model_source?: string | null
          model_status?: string
          model_url?: string | null
          name?: string
          product_name?: string
          published_at?: string | null
          slug?: string
          status?: string
          template?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_active_model_version_id_fkey"
            columns: ["active_model_version_id"]
            isOneToOne: false
            referencedRelation: "model_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          actual_cost: number | null
          created_at: string
          duration_ms: number | null
          estimated_cost: number | null
          generation_type: string
          id: string
          job_id: string | null
          project_id: string | null
          provider: string
          status: string
          user_id: string
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          duration_ms?: number | null
          estimated_cost?: number | null
          generation_type: string
          id?: string
          job_id?: string | null
          project_id?: string | null
          provider: string
          status: string
          user_id: string
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          duration_ms?: number | null
          estimated_cost?: number | null
          generation_type?: string
          id?: string
          job_id?: string | null
          project_id?: string | null
          provider?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "generation_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    },
  },
} as const
