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
      b2b_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["b2b_account_type"]
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          company_name: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          phone: string | null
          status: Database["public"]["Enums"]["b2b_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["b2b_account_type"]
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["b2b_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["b2b_account_type"]
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          status?: Database["public"]["Enums"]["b2b_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      b2b_clients: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          company_name: string
          contact_name: string | null
          created_at: string
          document: string | null
          email: string | null
          id: string
          phone: string | null
          rep_account_id: string
          updated_at: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_name: string
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          rep_account_id: string
          updated_at?: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          company_name?: string
          contact_name?: string | null
          created_at?: string
          document?: string | null
          email?: string | null
          id?: string
          phone?: string | null
          rep_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_clients_rep_account_id_fkey"
            columns: ["rep_account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_code: string | null
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_code?: string | null
          product_id?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_code?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "b2b_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "b2b_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          id: string
          notes: string | null
          payment_term_id: string
          payment_term_snapshot: string
          rep_account_id: string
          status: Database["public"]["Enums"]["b2b_order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_term_id: string
          payment_term_snapshot: string
          rep_account_id: string
          status?: Database["public"]["Enums"]["b2b_order_status"]
          total?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_term_id?: string
          payment_term_snapshot?: string
          rep_account_id?: string
          status?: Database["public"]["Enums"]["b2b_order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2b_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "b2b_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_orders_payment_term_id_fkey"
            columns: ["payment_term_id"]
            isOneToOne: false
            referencedRelation: "b2b_payment_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2b_orders_rep_account_id_fkey"
            columns: ["rep_account_id"]
            isOneToOne: false
            referencedRelation: "b2b_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      b2b_payment_terms: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          installment_days: number[]
          name: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          installment_days?: number[]
          name: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          installment_days?: number[]
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      bling_auth: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          id: number
          last_sync_at: string | null
          last_sync_summary: Json | null
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          last_sync_at?: string | null
          last_sync_summary?: Json | null
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          id?: number
          last_sync_at?: string | null
          last_sync_summary?: Json | null
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      coupon_products: {
        Row: {
          coupon_id: string
          created_at: string
          id: string
          product_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          id?: string
          product_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_products_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          min_order_value: number | null
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          min_order_value?: number | null
          used_count?: number
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          is_preorder: boolean
          order_id: string
          preorder_estimated_delivery: string | null
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_preorder?: boolean
          order_id: string
          preorder_estimated_delivery?: string | null
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          is_preorder?: boolean
          order_id?: string
          preorder_estimated_delivery?: string | null
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_parts: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          method: string
          mp_init_point: string | null
          mp_payment_id: string | null
          mp_preference_id: string | null
          order_id: string
          paid_at: string | null
          part_index: number
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          method: string
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_id: string
          paid_at?: string | null
          part_index: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          method?: string
          mp_init_point?: string | null
          mp_payment_id?: string | null
          mp_preference_id?: string | null
          order_id?: string
          paid_at?: string | null
          part_index?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_parts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          b2b_account_id: string | null
          coupon_id: string | null
          created_at: string
          customer_cpf: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount_amount: number | null
          has_preorder_items: boolean
          id: string
          is_b2b: boolean
          payment_mode: string
          placed_by_rep_id: string | null
          shipping_city: string | null
          shipping_complement: string | null
          shipping_neighborhood: string | null
          shipping_number: string | null
          shipping_state: string | null
          shipping_street: string | null
          shipping_zip: string | null
          split_config: Json | null
          status: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          b2b_account_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          has_preorder_items?: boolean
          id?: string
          is_b2b?: boolean
          payment_mode?: string
          placed_by_rep_id?: string | null
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          split_config?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total: number
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          b2b_account_id?: string | null
          coupon_id?: string | null
          created_at?: string
          customer_cpf?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount_amount?: number | null
          has_preorder_items?: boolean
          id?: string
          is_b2b?: boolean
          payment_mode?: string
          placed_by_rep_id?: string | null
          shipping_city?: string | null
          shipping_complement?: string | null
          shipping_neighborhood?: string | null
          shipping_number?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          shipping_zip?: string | null
          split_config?: Json | null
          status?: Database["public"]["Enums"]["order_status"]
          total?: number
          tracking_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      page_views: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          path: string
          product_id: string | null
          referrer: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          path: string
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          path?: string
          product_id?: string | null
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          capture_method: string | null
          created_at: string
          gateway: string
          id: string
          infinitypay_id: string | null
          infinitypay_link: string | null
          metadata: Json | null
          mp_preference_id: string | null
          order_id: string
          paid_at: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          receipt_url: string | null
          slug: string | null
          status: string
          transaction_nsu: string | null
        }
        Insert: {
          amount: number
          capture_method?: string | null
          created_at?: string
          gateway?: string
          id?: string
          infinitypay_id?: string | null
          infinitypay_link?: string | null
          metadata?: Json | null
          mp_preference_id?: string | null
          order_id: string
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          receipt_url?: string | null
          slug?: string | null
          status?: string
          transaction_nsu?: string | null
        }
        Update: {
          amount?: number
          capture_method?: string | null
          created_at?: string
          gateway?: string
          id?: string
          infinitypay_id?: string | null
          infinitypay_link?: string | null
          metadata?: Json | null
          mp_preference_id?: string | null
          order_id?: string
          paid_at?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          receipt_url?: string | null
          slug?: string | null
          status?: string
          transaction_nsu?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          created_at: string
          id: string
          image_url: string
          position: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          position?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          position?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_wholesale_prices: {
        Row: {
          created_at: string
          id: string
          min_quantity: number
          price: number
          product_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          min_quantity?: number
          price: number
          product_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          min_quantity?: number
          price?: number
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_wholesale_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          active: boolean
          bling_code: string | null
          category: string | null
          created_at: string
          description: string | null
          electronics_tag: string | null
          id: string
          image_url: string | null
          name: string
          preorder_estimated_delivery: string | null
          price: number
          price_b2b: number | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          stock_synced_at: string | null
          updated_at: string
          uses_plek_technology: boolean
          video_url: string | null
        }
        Insert: {
          active?: boolean
          bling_code?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          electronics_tag?: string | null
          id?: string
          image_url?: string | null
          name: string
          preorder_estimated_delivery?: string | null
          price: number
          price_b2b?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          stock_synced_at?: string | null
          updated_at?: string
          uses_plek_technology?: boolean
          video_url?: string | null
        }
        Update: {
          active?: boolean
          bling_code?: string | null
          category?: string | null
          created_at?: string
          description?: string | null
          electronics_tag?: string | null
          id?: string
          image_url?: string | null
          name?: string
          preorder_estimated_delivery?: string | null
          price?: number
          price_b2b?: number | null
          status?: Database["public"]["Enums"]["product_status"]
          stock_quantity?: number
          stock_synced_at?: string | null
          updated_at?: string
          uses_plek_technology?: boolean
          video_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cpf: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cpf?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_b2b_representative: {
        Args: {
          _company_name: string
          _document?: string
          _email: string
          _phone?: string
        }
        Returns: string
      }
      admin_list_products: {
        Args: never
        Returns: {
          active: boolean
          bling_code: string | null
          category: string | null
          created_at: string
          description: string | null
          electronics_tag: string | null
          id: string
          image_url: string | null
          name: string
          preorder_estimated_delivery: string | null
          price: number
          price_b2b: number | null
          status: Database["public"]["Enums"]["product_status"]
          stock_quantity: number
          stock_synced_at: string | null
          updated_at: string
          uses_plek_technology: boolean
          video_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "products"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      create_b2b_order: {
        Args: {
          _client_id: string
          _items: Json
          _notes: string
          _payment_term_id: string
        }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_b2b_catalog: {
        Args: never
        Returns: {
          active: boolean
          bling_code: string
          category: string
          description: string
          id: string
          image_url: string
          name: string
          price_b2b: number
          stock_quantity: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_usage: {
        Args: { coupon_id: string }
        Returns: undefined
      }
      is_approved_b2b: { Args: { _user_id: string }; Returns: boolean }
      is_approved_representative: {
        Args: { _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      owns_b2b_account: {
        Args: { _account_id: string; _user_id: string }
        Returns: boolean
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      review_b2b_order: {
        Args: { _approve: boolean; _order_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      b2b_account_type: "lojista" | "representante"
      b2b_order_status:
        | "aguardando_aprovacao"
        | "aprovado"
        | "recusado"
        | "cancelado"
      b2b_status: "pendente" | "aprovado" | "recusado"
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending_payment"
        | "paid"
        | "partial_paid"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
      payment_type: "full" | "preorder_deposit" | "preorder_balance"
      product_status: "in_stock" | "preorder" | "unavailable"
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
      app_role: ["admin", "moderator", "user"],
      b2b_account_type: ["lojista", "representante"],
      b2b_order_status: [
        "aguardando_aprovacao",
        "aprovado",
        "recusado",
        "cancelado",
      ],
      b2b_status: ["pendente", "aprovado", "recusado"],
      discount_type: ["percentage", "fixed"],
      order_status: [
        "pending_payment",
        "paid",
        "partial_paid",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
      ],
      payment_type: ["full", "preorder_deposit", "preorder_balance"],
      product_status: ["in_stock", "preorder", "unavailable"],
    },
  },
} as const
