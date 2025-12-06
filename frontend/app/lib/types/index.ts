export interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  categoryName: Category["name"];
  price: number;
  originalPrice: number;
  stock: number;
  inStock: boolean;
  rating: number;
}
export interface Category {
  name: string;
  image: string;
  productCount: number;
}

export interface ProductDetail extends Product {
  features: string[];
  specs: Specs;
  category: Category;
}

type Specs = { [property: string]: string | number | boolean };
