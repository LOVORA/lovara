export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      conversations: {
        Row: {
          id: string;
          user_id: string;
          character_slug: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_slug: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_slug?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      messages: {
        Row: {
          id: string;
          conversation_id: string;
          role: "assistant" | "user" | "system";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: "assistant" | "user" | "system";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: "assistant" | "user" | "system";
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      profiles: {
        Row: {
          id: string;
          email: string | null;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      custom_characters: {
        Row: {
          id: string;
          user_id: string;
          slug: string;
          name: string;
          archetype: string;
          headline: string;
          description: string;
          greeting: string;
          preview_message: string;
          backstory: string;
          tags: string[];
          trait_badges: Json;
          scenario: Json;
          metadata: Json;
          payload: Json;
          avatar_image_id: string | null;
          primary_reference_image_id: string | null;
          primary_image_url: string | null;
          image_status: string;
          image_visibility: string;
          image_prompt_version: number;
          image_last_generated_at: string | null;
          image_generation_enabled: boolean;
          style_type: "realistic" | "anime" | null;
          consistency_status: "draft" | "locked" | "ready";
          base_generation_id: string | null;
          builder_mode: "preset" | "custom_prompt" | null;
          prompt_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          slug: string;
          name: string;
          archetype: string;
          headline: string;
          description: string;
          greeting: string;
          preview_message: string;
          backstory: string;
          tags?: string[];
          trait_badges?: Json;
          scenario?: Json;
          metadata?: Json;
          payload?: Json;
          avatar_image_id?: string | null;
          primary_reference_image_id?: string | null;
          primary_image_url?: string | null;
          image_status?: string;
          image_visibility?: string;
          image_prompt_version?: number;
          image_last_generated_at?: string | null;
          image_generation_enabled?: boolean;
          style_type?: "realistic" | "anime" | null;
          consistency_status?: "draft" | "locked" | "ready";
          base_generation_id?: string | null;
          builder_mode?: "preset" | "custom_prompt" | null;
          prompt_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          slug?: string;
          name?: string;
          archetype?: string;
          headline?: string;
          description?: string;
          greeting?: string;
          preview_message?: string;
          backstory?: string;
          tags?: string[];
          trait_badges?: Json;
          scenario?: Json;
          metadata?: Json;
          payload?: Json;
          avatar_image_id?: string | null;
          primary_reference_image_id?: string | null;
          primary_image_url?: string | null;
          image_status?: string;
          image_visibility?: string;
          image_prompt_version?: number;
          image_last_generated_at?: string | null;
          image_generation_enabled?: boolean;
          style_type?: "realistic" | "anime" | null;
          consistency_status?: "draft" | "locked" | "ready";
          base_generation_id?: string | null;
          builder_mode?: "preset" | "custom_prompt" | null;
          prompt_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      custom_conversations: {
        Row: {
          id: string;
          user_id: string;
          custom_character_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          custom_character_id: string;
          title: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          custom_character_id?: string;
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };

      custom_messages: {
        Row: {
          id: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          user_id: string;
          role: "user" | "assistant";
          content: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          user_id?: string;
          role?: "user" | "assistant";
          content?: string;
          created_at?: string;
        };
        Relationships: [];
      };

      character_images: {
        Row: {
          id: string;
          user_id: string;
          character_id: string;
          job_id: string | null;
          kind: string;
          source: string;
          visibility: string;
          storage_bucket: string | null;
          storage_path: string | null;
          public_url: string | null;
          width: number | null;
          height: number | null;
          mime_type: string | null;
          file_size_bytes: number | null;
          seed: number | null;
          steps: number | null;
          cfg_scale: number | null;
          sampler: string | null;
          model: string | null;
          workflow_name: string | null;
          prompt_version: number;
          prompt_input: Json;
          resolved_prompt: string | null;
          negative_prompt: string | null;
          is_primary: boolean;
          sort_order: number;
          is_adult_only: boolean;
          subject_declared_18_plus: boolean;
          consent_confirmed: boolean;
          depicts_real_person: boolean;
          depicts_public_figure: boolean;
          moderation_status: "pending" | "approved" | "blocked";
          moderation_notes: string | null;
          image_type: "avatar" | "reference" | "variation" | "gallery" | null;
          variant_kind:
            | "base"
            | "outfit"
            | "selfie"
            | "pose"
            | "location"
            | "full_body"
            | null;
          is_reference: boolean;
          model_used: string | null;
          provider_used: string | null;
          prompt_snapshot: string | null;
          negative_prompt_snapshot: string | null;
          feedback_type: "like_reference" | "reject_result" | "prefer_this_style" | null;
          is_liked_reference: boolean;
          reference_rank: number | null;
          quality_score: number | null;
          quality_flags: Json;
          judge_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          character_id: string;
          job_id?: string | null;
          kind?: string;
          source?: string;
          visibility?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          seed?: number | null;
          steps?: number | null;
          cfg_scale?: number | null;
          sampler?: string | null;
          model?: string | null;
          workflow_name?: string | null;
          prompt_version?: number;
          prompt_input?: Json;
          resolved_prompt?: string | null;
          negative_prompt?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          is_adult_only?: boolean;
          subject_declared_18_plus?: boolean;
          consent_confirmed?: boolean;
          depicts_real_person?: boolean;
          depicts_public_figure?: boolean;
          moderation_status?: "pending" | "approved" | "blocked";
          moderation_notes?: string | null;
          image_type?: "avatar" | "reference" | "variation" | "gallery" | null;
          variant_kind?:
            | "base"
            | "outfit"
            | "selfie"
            | "pose"
            | "location"
            | "full_body"
            | null;
          is_reference?: boolean;
          model_used?: string | null;
          provider_used?: string | null;
          prompt_snapshot?: string | null;
          negative_prompt_snapshot?: string | null;
          feedback_type?: "like_reference" | "reject_result" | "prefer_this_style" | null;
          is_liked_reference?: boolean;
          reference_rank?: number | null;
          quality_score?: number | null;
          quality_flags?: Json;
          judge_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          character_id?: string;
          job_id?: string | null;
          kind?: string;
          source?: string;
          visibility?: string;
          storage_bucket?: string | null;
          storage_path?: string | null;
          public_url?: string | null;
          width?: number | null;
          height?: number | null;
          mime_type?: string | null;
          file_size_bytes?: number | null;
          seed?: number | null;
          steps?: number | null;
          cfg_scale?: number | null;
          sampler?: string | null;
          model?: string | null;
          workflow_name?: string | null;
          prompt_version?: number;
          prompt_input?: Json;
          resolved_prompt?: string | null;
          negative_prompt?: string | null;
          is_primary?: boolean;
          sort_order?: number;
          is_adult_only?: boolean;
          subject_declared_18_plus?: boolean;
          consent_confirmed?: boolean;
          depicts_real_person?: boolean;
          depicts_public_figure?: boolean;
          moderation_status?: "pending" | "approved" | "blocked";
          moderation_notes?: string | null;
          image_type?: "avatar" | "reference" | "variation" | "gallery" | null;
          variant_kind?:
            | "base"
            | "outfit"
            | "selfie"
            | "pose"
            | "location"
            | "full_body"
            | null;
          is_reference?: boolean;
          model_used?: string | null;
          provider_used?: string | null;
          prompt_snapshot?: string | null;
          negative_prompt_snapshot?: string | null;
          feedback_type?: "like_reference" | "reject_result" | "prefer_this_style" | null;
          is_liked_reference?: boolean;
          reference_rank?: number | null;
          quality_score?: number | null;
          quality_flags?: Json;
          judge_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };

    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
