export interface Product {
  id: number;
  slug: string;
  name: string;
  name_uk?: string;
  name_en?: string;
  description: string;
  description_uk?: string;
  description_en?: string;
  image_url: string | null;
  category_name: string;
  category: number | Category;
  price: number;
  price_usd?: number;
  original_price: number;
  original_price_usd?: number;
  stock: number;
  in_stock: boolean;
  rating: number;
  brand?: string;
  color?: string;
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
  name_uk?: string;
  name_en?: string;
  parent?: number | null;
  image: string;
  image_url?: string | null;
  product_count: number;
  children?: Category[];
  created_at?: string;
  updated_at?: string;
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
  product_stock: number;
  quantity: number;
  created_at: string;
}

export interface CartResponse {
  id: number;
  user_id: string | null;
  session_id: string | null;
  items: CartItemResponse[];
  subtotal: number;
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
  cost_price: string | number;
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
  status: "unpaid" | "paid" | "delivering" | "delivered" | "completed" | "cancelled";
  payment_status: "unpaid" | "paid" | "refunded";
  warehouse_id: number | null;
  delivery_method: "pickup" | "nova_poshta" | "courier" | "";
  shipping_city: string;
  shipping_address: string;
  shipping_cost: number;
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
  stripe_session_id: string;
  stripe_payment_intent_id: string;
  paid_at: string | null;
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

export interface SalesKpis {
  total_orders: number;
  total_quantity: number;
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percent: number;
  average_order_value: number;
  cancelled_orders: number;
  cancellation_rate: number;
}

export interface SalesReport extends SalesKpis {
  /** Same-length period right before from..to; null unless both dates are set */
  previous: SalesKpis | null;
  by_channel: { channel: string; count: number; revenue: number }[];
}

export type SalesGroup = "day" | "week" | "month";

export interface SalesSeries {
  group: SalesGroup;
  daily: { date: string; revenue: number; orders: number }[];
}

export type TopProductsSort = "revenue" | "quantity" | "margin";

export interface TopProduct {
  product_id: number;
  product_name: string;
  quantity: number;
  orders: number;
  revenue: number;
  margin: number;
  margin_percent: number;
  revenue_share: number;
}

export interface RevenueReport {
  total_revenue: number;
  total_cost: number;
  gross_margin: number;
  margin_percent: number;
  order_count: number;
}

export type AbcClass = "A" | "B" | "C";

export interface AbcProduct extends TopProduct {
  abc_class: AbcClass;
  cumulative_share: number;
}

export interface AbcReport {
  classes: Record<AbcClass, { products: number; revenue: number; revenue_share: number }>;
  products: AbcProduct[];
}

export interface StockHealthRow {
  product_id: number;
  on_hand: number;
  reserved: number;
  stock_value: number;
  units_sold: number;
  units_written_off: number;
  avg_daily_sales: number;
  /** null when the product did not sell in the window */
  days_of_cover: number | null;
  turnover: number | null;
  last_sale_at: string | null;
  dead: boolean;
}

export interface StockAnalytics {
  days: number;
  summary: {
    stock_value: number;
    units_on_hand: number;
    units_sold: number;
    turnover: number | null;
    dead_products: number;
    dead_stock_value: number;
    dead_stock_share: number;
    low_cover_products: number;
  };
  products: StockHealthRow[];
}

export interface FulfillmentReport {
  channel: "online" | "offline";
  orders: number;
  funnel: { stage: string; count: number }[];
  payment_conversion: number;
  cancelled: { total: number; by_stage: Record<string, number>; unknown_stage: number };
  durations: { from: string; to: string; count: number; avg_hours: number | null; median_hours: number | null }[];
}

export interface SupplierStats {
  supplier_id: number;
  supplier_name: string;
  total_items: number;
  total_value: number;
  delivery_count: number;
  last_delivery: string;
}

export interface ActivityEvent {
  id: number;
  event_type: "create" | "update" | "delete" | "info";
  message: string;
  entity_type: string;
  entity_id: string;
  user_name: string;
  user_email: string;
  created_at: string;
}
