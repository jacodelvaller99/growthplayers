export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
          protocol_start_date: string | null;
          purpose: string | null;
          identity: string | null;
          non_negotiables: string[] | null;
          daily_reminder: string | null;
          sovereign_score: number | null;
          streak: number | null;
          tier: string | null;
          total_days: number | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          protocol_start_date?: string | null;
          purpose?: string | null;
          identity?: string | null;
          non_negotiables?: string[] | null;
          daily_reminder?: string | null;
          sovereign_score?: number | null;
          streak?: number | null;
          tier?: string | null;
          total_days?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          protocol_start_date?: string | null;
          purpose?: string | null;
          identity?: string | null;
          non_negotiables?: string[] | null;
          daily_reminder?: string | null;
          sovereign_score?: number | null;
          streak?: number | null;
          tier?: string | null;
          total_days?: number | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      daily_checkins: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          energy: number | null;
          clarity: number | null;
          stress: number | null;
          sleep: number | null;
          system_need: string | null;
          sovereign_score: number | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          energy?: number | null;
          clarity?: number | null;
          stress?: number | null;
          sleep?: number | null;
          system_need?: string | null;
          sovereign_score?: number | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          energy?: number | null;
          clarity?: number | null;
          stress?: number | null;
          sleep?: number | null;
          system_need?: string | null;
          sovereign_score?: number | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      lesson_tasks: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          lesson_title: string | null;
          module_id: string | null;
          responses: Json | null;
          completed_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          lesson_title?: string | null;
          module_id?: string | null;
          responses?: Json | null;
          completed_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          lesson_title?: string | null;
          module_id?: string | null;
          responses?: Json | null;
          completed_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      completed_lessons: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          module_id: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          module_id: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          module_id?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      mentor_messages: {
        Row: {
          id: string;
          user_id: string;
          role: string;
          content: string;
          module_context: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: string;
          content: string;
          module_context?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          role?: string;
          content?: string;
          module_context?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          entry_type: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          entry_type?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          entry_type?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      wellness_sessions: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          session_name: string | null;
          duration_seconds: number | null;
          frequency_hz: number | null;
          background_track: string | null;
          completed_at: string | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          session_name?: string | null;
          duration_seconds?: number | null;
          frequency_hz?: number | null;
          background_track?: string | null;
          completed_at?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          session_name?: string | null;
          duration_seconds?: number | null;
          frequency_hz?: number | null;
          background_track?: string | null;
          completed_at?: string | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      user_progress: {
        Row: {
          user_id: string | null;
          name: string | null;
          sovereign_score: number | null;
          streak: number | null;
          tier: string | null;
          total_days: number | null;
          protocol_start_date: string | null;
          total_lessons_done: number | null;
          total_tasks_done: number | null;
          last_checkin_date: string | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
