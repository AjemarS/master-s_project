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
  rating:  number;
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

// Paginated API response
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Standardized API error
export interface ApiError {
  message: string;
  status?: number;
  details?: unknown;
  fields?: Record<string, string[]>;
}

// Standardized API response wrapper
export interface ApiResult<T> {
  data?: T;
  error?: ApiError;
}

// Cart types
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