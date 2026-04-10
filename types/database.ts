export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          auth_user_id: string;
          full_name: string | null;
          email: string;
          role: "basic" | "editor" | "admin";
          is_active: boolean;
          must_change_password: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_user_id: string;
          full_name?: string | null;
          email: string;
          role?: "basic" | "editor" | "admin";
          is_active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_user_id?: string;
          full_name?: string | null;
          email?: string;
          role?: "basic" | "editor" | "admin";
          is_active?: boolean;
          must_change_password?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      support_messages: {
        Row: {
          id: string;
          user_email: string;
          user_name: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_email: string;
          user_name: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_email?: string;
          user_name?: string;
          message?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, unknown>;
    Functions: Record<string, unknown>;
    Enums: Record<string, unknown>;
  };
}
