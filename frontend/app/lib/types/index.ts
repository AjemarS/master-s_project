export interface Product {
  id: number;
  name: string;
  description: string;
  image_url: string | null;
  category_name: string;
  category: number | Category;
  price: number;
  original_price: number;
  stock: number;
  in_stock: boolean;
  rating: number;
  features?: string[];
  specs?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface ProductDetail extends Product {
  features: string[];
  specs: Record<string, string | number | boolean>;
  category: Category;
}

export interface Category {
  id?: number;
  name: string;
  image: string;
  product_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  status?: string;
  banned?: boolean;
  createdAt: string;
  emailVerified?: boolean;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
  fields?: Record<string, string[]>;
}

export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}

export interface CartItemResponse {
  id: number;
  product: number;
  product_name: string;
  product_price: number;
  product_image: string | null;
  quantity: number;
  added_at: string;
}

export interface CartResponse {
  id: number;
  user_id: string;
  items: CartItemResponse[];
  total: number;
  item_count: number;
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: number;
  name: string;
  type: "warehouse" | "showroom";
  address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Stock {
  id: number;
  product_id: number;
  warehouse: number;
  warehouse_name: string;
  quantity: number;
  reserved: number;
  available: number;
  created_at?: string;
  updated_at?: string;
}

export interface StockMovement {
  id: number;
  product_id: number;
  from_warehouse: number | null;
  from_warehouse_name: string | null;
  to_warehouse: number | null;
  to_warehouse_name: string | null;
  quantity: number;
  type: string;
  reference_type: string;
  reference_id: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface GoodsReceiptItem {
  id?: number;
  product_id: number;
  quantity: number;
  cost_price: string;
}

export interface GoodsReceiptNote {
  id: number;
  supplier: number;
  supplier_name: string;
  warehouse: number;
  warehouse_name: string;
  receipt_date: string;
  reference_number: string;
  notes: string;
  created_by: string;
  items: GoodsReceiptItem[];
  total_amount: number;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: number;
  order_number: string;
  channel: "online" | "offline";
  status: "pending" | "shipped" | "delivered" | "cancelled";
  warehouse_id: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  total_amount: number;
  item_count: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface OrderDetail extends Order {
  notes: string;
  items: OrderItem[];
}

export interface OrderItem {
  id: number;
  order: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  cost_price: number;
  created_at: string;
}

export interface SalesReport {
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  by_channel: { channel: string; count: number; revenue: number }[];
}

export interface RevenueReport {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  order_count: number;
}
