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
      admin_audit_logs: {
        Row: {
          action: string
          actor_name: string
          actor_user_id: string | null
          after_changes: Json | null
          before_changes: Json | null
          created_at: string
          id: string
          metadata: Json
          module: string
          outcome: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_name: string
          actor_user_id?: string | null
          after_changes?: Json | null
          before_changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          module: string
          outcome?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_name?: string
          actor_user_id?: string | null
          after_changes?: Json | null
          before_changes?: Json | null
          created_at?: string
          id?: string
          metadata?: Json
          module?: string
          outcome?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          department: string
          designation: string | null
          display_name: string
          employee_code: string | null
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          department: string
          designation?: string | null
          display_name: string
          employee_code?: string | null
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          department?: string
          designation?: string | null
          display_name?: string
          employee_code?: string | null
          id?: string
          is_active?: boolean
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
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          link: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          link?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      retailer_registrations: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          auth_user_id: string | null
          payment_verification_notes: string | null
          payment_verified: boolean
          payment_verified_at: string | null
          payment_verified_by: string | null
          qc_notes: string | null
          qc_verified: boolean
          qc_verified_at: string | null
          qc_verified_by: string | null
          aadhaar_doc_path: string | null
          aadhaar_number: string | null
          account_number: string | null
          account_type: string | null
          address_type: string | null
          application_id: string
          bank_holder_name: string | null
          bank_name: string | null
          building_shop_no: string | null
          city: string | null
          created_at: string
          declaration_agreed: boolean
          district: string | null
          email: string
          email_verified: boolean
          first_name: string
          gram_panchayat: string | null
          hobli_name: string | null
          id: string
          ifsc: string | null
          landmark: string | null
          latitude: number | null
          longitude: number | null
          middle_name: string | null
          mobile: string
          mobile_verified: boolean
          pan_doc_path: string | null
          pan_number: string | null
          password_hash: string | null
          payer_account: string | null
          payer_bank: string | null
          payer_name: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_paid_on: string | null
          payment_remarks: string | null
          payment_screenshot_path: string | null
          payment_utr: string | null
          pincode: string | null
          police_verification_path: string | null
          post_office: string | null
          post_office_name: string | null
          registration_type: string
          rejection_reason: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string | null
          shop_name: string
          shop_photo_path: string | null
          state: string | null
          status: string
          street_area: string | null
          surname: string
          taluk: string | null
          transaction_id: string | null
          updated_at: string
          username: string | null
          village_name: string | null
          video_kyc_lat: number | null
          video_kyc_lng: number | null
          video_kyc_path: string | null
          ward_number: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          payment_verification_notes?: string | null
          payment_verified?: boolean
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          qc_notes?: string | null
          qc_verified?: boolean
          qc_verified_at?: string | null
          qc_verified_by?: string | null
          aadhaar_doc_path?: string | null
          aadhaar_number?: string | null
          account_number?: string | null
          account_type?: string | null
          address_type?: string | null
          application_id: string
          bank_holder_name?: string | null
          bank_name?: string | null
          building_shop_no?: string | null
          city?: string | null
          created_at?: string
          declaration_agreed?: boolean
          district?: string | null
          email: string
          email_verified?: boolean
          first_name: string
          gram_panchayat?: string | null
          hobli_name?: string | null
          id?: string
          ifsc?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          middle_name?: string | null
          mobile: string
          mobile_verified?: boolean
          pan_doc_path?: string | null
          pan_number?: string | null
          password_hash?: string | null
          payer_account?: string | null
          payer_bank?: string | null
          payer_name?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_paid_on?: string | null
          payment_remarks?: string | null
          payment_screenshot_path?: string | null
          payment_utr?: string | null
          pincode?: string | null
          police_verification_path?: string | null
          post_office?: string | null
          post_office_name?: string | null
          registration_type?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          shop_name: string
          shop_photo_path?: string | null
          state?: string | null
          status?: string
          street_area?: string | null
          surname: string
          taluk?: string | null
          transaction_id?: string | null
          updated_at?: string
          username?: string | null
          village_name?: string | null
          video_kyc_lat?: number | null
          video_kyc_lng?: number | null
          video_kyc_path?: string | null
          ward_number?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          auth_user_id?: string | null
          payment_verification_notes?: string | null
          payment_verified?: boolean
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          qc_notes?: string | null
          qc_verified?: boolean
          qc_verified_at?: string | null
          qc_verified_by?: string | null
          aadhaar_doc_path?: string | null
          aadhaar_number?: string | null
          account_number?: string | null
          account_type?: string | null
          address_type?: string | null
          application_id?: string
          bank_holder_name?: string | null
          bank_name?: string | null
          building_shop_no?: string | null
          city?: string | null
          created_at?: string
          declaration_agreed?: boolean
          district?: string | null
          email?: string
          email_verified?: boolean
          first_name?: string
          gram_panchayat?: string | null
          hobli_name?: string | null
          id?: string
          ifsc?: string | null
          landmark?: string | null
          latitude?: number | null
          longitude?: number | null
          middle_name?: string | null
          mobile?: string
          mobile_verified?: boolean
          pan_doc_path?: string | null
          pan_number?: string | null
          password_hash?: string | null
          payer_account?: string | null
          payer_bank?: string | null
          payer_name?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_paid_on?: string | null
          payment_remarks?: string | null
          payment_screenshot_path?: string | null
          payment_utr?: string | null
          pincode?: string | null
          police_verification_path?: string | null
          post_office?: string | null
          post_office_name?: string | null
          registration_type?: string
          rejection_reason?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          shop_name?: string
          shop_photo_path?: string | null
          state?: string | null
          status?: string
          street_area?: string | null
          surname?: string
          taluk?: string | null
          transaction_id?: string | null
          updated_at?: string
          username?: string | null
          village_name?: string | null
          video_kyc_lat?: number | null
          video_kyc_lng?: number | null
          video_kyc_path?: string | null
          ward_number?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      submit_retailer_registration: {
        Args: { payload: Json }
        Returns: Json
      }
      approve_retailer_registration: {
        Args: { reg_id: string }
        Returns: Json
      }
      verify_retailer_payment: {
        Args: { reg_id: string; received: boolean; notes?: string | null }
        Returns: Json
      }
      verify_retailer_qc: {
        Args: { reg_id: string; verified: boolean; notes?: string | null }
        Returns: Json
      }
      reject_retailer_registration: {
        Args: { reg_id: string; reason: string }
        Returns: Json
      }
      create_staff_account: {
        Args: { _email: string; _password: string; _name: string; _role: string; _department?: string | null }
        Returns: Json
      }
      notify_roles: {
        Args: {
          _roles: string[]; _type: string; _title: string; _body: string
          _link: string; _entity_type: string; _entity_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "hr_staff" | "manager" | "employee" | "admin"
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
      app_role: ["hr_staff", "manager", "employee", "admin"],
    },
  },
} as const
