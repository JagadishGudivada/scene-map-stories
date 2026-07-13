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
      affiliate_clicks: {
        Row: {
          created_at: string
          destination_url: string
          id: string
          location_name: string | null
          origin: string | null
          partner: string
          service: string
          spot_name: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          destination_url: string
          id?: string
          location_name?: string | null
          origin?: string | null
          partner: string
          service: string
          spot_name?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          destination_url?: string
          id?: string
          location_name?: string | null
          origin?: string | null
          partner?: string
          service?: string
          spot_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ai_cache: {
        Row: {
          cache_key: string
          created_at: string
          expires_at: string
          function_name: string
          id: string
          payload: Json
        }
        Insert: {
          cache_key: string
          created_at?: string
          expires_at: string
          function_name: string
          id?: string
          payload: Json
        }
        Update: {
          cache_key?: string
          created_at?: string
          expires_at?: string
          function_name?: string
          id?: string
          payload?: Json
        }
        Relationships: []
      }
      data_reports: {
        Row: {
          created_at: string
          current_value: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["report_entity"]
          field: string
          id: string
          reason: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          suggested_value: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_value?: string | null
          entity_id: string
          entity_type: Database["public"]["Enums"]["report_entity"]
          field: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          suggested_value?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_value?: string | null
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["report_entity"]
          field?: string
          id?: string
          reason?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          suggested_value?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      location_suggestions: {
        Row: {
          ai_notes: string | null
          created_at: string
          description: string | null
          id: string
          location_name: string
          status: Database["public"]["Enums"]["suggestion_status"]
          title_name: string
          title_slug: string
          updated_at: string
          user_id: string
          verified_label: string | null
          verified_lat: number | null
          verified_lng: number | null
        }
        Insert: {
          ai_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_name: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          title_name: string
          title_slug: string
          updated_at?: string
          user_id: string
          verified_label?: string | null
          verified_lat?: number | null
          verified_lng?: number | null
        }
        Update: {
          ai_notes?: string | null
          created_at?: string
          description?: string | null
          id?: string
          location_name?: string
          status?: Database["public"]["Enums"]["suggestion_status"]
          title_name?: string
          title_slug?: string
          updated_at?: string
          user_id?: string
          verified_label?: string | null
          verified_lat?: number | null
          verified_lng?: number | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          city: string | null
          confidence: number | null
          country: string | null
          created_at: string
          data: Json
          description: string | null
          enriched_at: string | null
          flag: string | null
          geo_verified: boolean
          hero_image_url: string | null
          id: string
          last_fetched_at: string
          lat: number | null
          lng: number | null
          name: string
          slug: string
          source: string | null
          updated_at: string
          verified: boolean
        }
        Insert: {
          city?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          enriched_at?: string | null
          flag?: string | null
          geo_verified?: boolean
          hero_image_url?: string | null
          id?: string
          last_fetched_at?: string
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          source?: string | null
          updated_at?: string
          verified?: boolean
        }
        Update: {
          city?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          enriched_at?: string | null
          flag?: string | null
          geo_verified?: boolean
          hero_image_url?: string | null
          id?: string
          last_fetched_at?: string
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          source?: string | null
          updated_at?: string
          verified?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          image_url: string | null
          location_slug: string | null
          spot_slug: string | null
          title_slug: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          image_url?: string | null
          location_slug?: string | null
          spot_slug?: string | null
          title_slug?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          location_slug?: string | null
          spot_slug?: string | null
          title_slug?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_public_passport: boolean
          location: string | null
          updated_at: string
          user_id: string
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public_passport?: boolean
          location?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_public_passport?: boolean
          location?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      saved_locations: {
        Row: {
          created_at: string
          id: string
          location_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          location_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          location_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_spots: {
        Row: {
          created_at: string
          id: string
          spot_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          spot_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          spot_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_titles: {
        Row: {
          created_at: string
          id: string
          title_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      spots: {
        Row: {
          address: string | null
          city: string | null
          confidence: number | null
          country: string | null
          created_at: string
          data: Json
          description: string | null
          enriched_at: string | null
          flag: string | null
          fun_facts: string[] | null
          geo_verified: boolean
          id: string
          image_url: string | null
          last_fetched_at: string
          lat: number | null
          lng: number | null
          name: string
          slug: string
          source: string | null
          updated_at: string
          verified: boolean
          visit_tips: string[] | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          enriched_at?: string | null
          flag?: string | null
          fun_facts?: string[] | null
          geo_verified?: boolean
          id?: string
          image_url?: string | null
          last_fetched_at?: string
          lat?: number | null
          lng?: number | null
          name: string
          slug: string
          source?: string | null
          updated_at?: string
          verified?: boolean
          visit_tips?: string[] | null
        }
        Update: {
          address?: string | null
          city?: string | null
          confidence?: number | null
          country?: string | null
          created_at?: string
          data?: Json
          description?: string | null
          enriched_at?: string | null
          flag?: string | null
          fun_facts?: string[] | null
          geo_verified?: boolean
          id?: string
          image_url?: string | null
          last_fetched_at?: string
          lat?: number | null
          lng?: number | null
          name?: string
          slug?: string
          source?: string | null
          updated_at?: string
          verified?: boolean
          visit_tips?: string[] | null
        }
        Relationships: []
      }
      title_spots: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["spot_role"]
          spot_id: string
          title_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["spot_role"]
          spot_id: string
          title_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["spot_role"]
          spot_id?: string
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "title_spots_spot_id_fkey"
            columns: ["spot_id"]
            isOneToOne: false
            referencedRelation: "spots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "title_spots_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "titles"
            referencedColumns: ["id"]
          },
        ]
      }
      titles: {
        Row: {
          backdrop_url: string | null
          confidence: number | null
          created_at: string
          data: Json
          enriched_at: string | null
          genres: string[] | null
          geo_verified: boolean
          id: string
          imdb_id: string | null
          last_fetched_at: string
          poster_url: string | null
          rating: number | null
          slug: string
          source: string | null
          synopsis: string | null
          title: string
          tmdb_id: number | null
          type: Database["public"]["Enums"]["media_type"]
          updated_at: string
          verified: boolean
          year: number | null
        }
        Insert: {
          backdrop_url?: string | null
          confidence?: number | null
          created_at?: string
          data?: Json
          enriched_at?: string | null
          genres?: string[] | null
          geo_verified?: boolean
          id?: string
          imdb_id?: string | null
          last_fetched_at?: string
          poster_url?: string | null
          rating?: number | null
          slug: string
          source?: string | null
          synopsis?: string | null
          title: string
          tmdb_id?: number | null
          type: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          verified?: boolean
          year?: number | null
        }
        Update: {
          backdrop_url?: string | null
          confidence?: number | null
          created_at?: string
          data?: Json
          enriched_at?: string | null
          genres?: string[] | null
          geo_verified?: boolean
          id?: string
          imdb_id?: string | null
          last_fetched_at?: string
          poster_url?: string | null
          rating?: number | null
          slug?: string
          source?: string | null
          synopsis?: string | null
          title?: string
          tmdb_id?: number | null
          type?: Database["public"]["Enums"]["media_type"]
          updated_at?: string
          verified?: boolean
          year?: number | null
        }
        Relationships: []
      }
      user_milestones: {
        Row: {
          id: string
          milestone: number
          shown_at: string
          user_id: string
        }
        Insert: {
          id?: string
          milestone: number
          shown_at?: string
          user_id: string
        }
        Update: {
          id?: string
          milestone?: number
          shown_at?: string
          user_id?: string
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
      visited_spots: {
        Row: {
          city: string
          country: string
          created_at: string
          id: string
          lat: number
          lng: number
          spot_name: string
          spot_slug: string
          type: string
          user_id: string
        }
        Insert: {
          city: string
          country: string
          created_at?: string
          id?: string
          lat: number
          lng: number
          spot_name: string
          spot_slug: string
          type: string
          user_id: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          id?: string
          lat?: number
          lng?: number
          spot_name?: string
          spot_slug?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      watched_titles: {
        Row: {
          created_at: string
          id: string
          title_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title_slug?: string
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
      is_passport_public: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      media_type: "Movie" | "Series" | "Book"
      notification_type:
        | "follow"
        | "like"
        | "comment"
        | "location_update"
        | "new_photo"
        | "system"
        | "welcome"
      report_entity: "title" | "location" | "spot"
      report_status: "pending" | "accepted" | "rejected"
      spot_role: "filming" | "setting"
      suggestion_status: "pending" | "verified" | "rejected"
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
      media_type: ["Movie", "Series", "Book"],
      notification_type: [
        "follow",
        "like",
        "comment",
        "location_update",
        "new_photo",
        "system",
        "welcome",
      ],
      report_entity: ["title", "location", "spot"],
      report_status: ["pending", "accepted", "rejected"],
      spot_role: ["filming", "setting"],
      suggestion_status: ["pending", "verified", "rejected"],
    },
  },
} as const
