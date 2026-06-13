export interface Product {
  id: number;
  name: string;
  description: string;
  image: string | null;
  categoryName: string;
  category: number | Category;
  price: number;
  originalPrice: number;
  stock: number;
  inStock: boolean;
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
  name: string;
  image: string;
  productCount: number;
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
