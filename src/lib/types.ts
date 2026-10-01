import type { Database } from "@/integrations/supabase/types";

export type Product = Database["public"]["Tables"]["products"]["Row"];
export type Order = Database["public"]["Tables"]["orders"]["Row"];
export type OrderItem = Database["public"]["Tables"]["order_items"]["Row"];
export type Payment = Database["public"]["Tables"]["payments"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type ProductStatus = Database["public"]["Enums"]["product_status"];
export type OrderStatus = Database["public"]["Enums"]["order_status"];
export type PaymentType = Database["public"]["Enums"]["payment_type"];

export interface CartItem {
  product: Product;
  quantity: number;
}
