import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'admin' | 'employee'
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: 'admin' | 'employee'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'admin' | 'employee'
          created_at?: string
        }
      }
      products: {
        Row: {
          id: string
          barcode: string
          name: string
          photo_url: string | null
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          barcode: string
          name: string
          photo_url?: string | null
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          barcode?: string
          name?: string
          photo_url?: string | null
          created_at?: string
          created_by?: string
        }
      }
      dlc_entries: {
        Row: {
          id: string
          product_id: string
          quantity: number
          dlc_date: string
          alert_days_before: number
          status: 'active' | 'alerted' | 'processed'
          created_at: string
          created_by: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          dlc_date: string
          alert_days_before?: number
          status?: 'active' | 'alerted' | 'processed'
          created_at?: string
          created_by: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          dlc_date?: string
          alert_days_before?: number
          status?: 'active' | 'alerted' | 'processed'
          created_at?: string
          created_by?: string
        }
      }
      dlc_actions: {
        Row: {
          id: string
          dlc_entry_id: string
          action_type: 'sold' | 'price_reduction' | 'other'
          action_details: string | null
          processed_at: string
          processed_by: string
        }
        Insert: {
          id?: string
          dlc_entry_id: string
          action_type: 'sold' | 'price_reduction' | 'other'
          action_details?: string | null
          processed_at?: string
          processed_by: string
        }
        Update: {
          id?: string
          dlc_entry_id?: string
          action_type?: 'sold' | 'price_reduction' | 'other'
          action_details?: string | null
          processed_at?: string
          processed_by?: string
        }
      }
      cash_counts: {
        Row: {
          id: string
          count_date: string
          z_report_photo_url: string | null
          bills_500: number
          bills_200: number
          bills_100: number
          bills_50: number
          bills_20: number
          bills_10: number
          bills_5: number
          coins_2: number
          coins_1: number
          coins_050: number
          coins_020: number
          coins_010: number
          coins_005: number
          coins_002: number
          coins_001: number
          total_cash: number
          previous_float: number
          difference: number
          new_float: number
          created_at: string
          created_by: string
        }
      }
      manual_count_products: {
        Row: {
          id: string
          name: string
          category: string
          unit: string
          min_stock_alert: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          category?: string
          unit?: string
          min_stock_alert?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          unit?: string
          min_stock_alert?: number
          is_active?: boolean
          created_at?: string
        }
      }
      manual_counts: {
        Row: {
          id: string
          product_id: string
          quantity_in_store: number
          quantity_in_storage: number
          total_quantity: number
          count_date: string
          counted_by: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity_in_store?: number
          quantity_in_storage?: number
          count_date?: string
          counted_by: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          assigned_to: string | null
          status: 'pending' | 'in_progress' | 'completed'
          priority: 'low' | 'medium' | 'high'
          due_date: string | null
          created_at: string
          created_by: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          assigned_to?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          created_at?: string
          created_by: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          assigned_to?: string | null
          status?: 'pending' | 'in_progress' | 'completed'
          priority?: 'low' | 'medium' | 'high'
          due_date?: string | null
          created_at?: string
          created_by?: string
          completed_at?: string | null
        }
      }
      messages: {
        Row: {
          id: string
          content: string
          sent_by: string
          sent_to: string | null
          task_id: string | null
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          content: string
          sent_by: string
          sent_to?: string | null
          task_id?: string | null
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          content?: string
          sent_by?: string
          sent_to?: string | null
          task_id?: string | null
          is_read?: boolean
          created_at?: string
        }
      }
    }
  }
}
