export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  rating: number;
  reviewCount: number;
  stock: number;
  featured: boolean;
}

export interface CartItem {
  id: string; // Product ID
  product: Product;
  quantity: number;
}

export interface Cart {
  userId: string;
  items: { productId: string; quantity: number }[];
  updatedAt: Date;
}

export interface ShippingAddress {
  fullName: string;
  addressLine1: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface Order {
  id?: string;
  userId: string;
  items: {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  shippingAddress: ShippingAddress;
  paymentMethod: string;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled';
  createdAt: string; // ISO or date-time
}

export interface Review {
  id?: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface Rating {
  id?: string;
  productId: string;
  userId: string;
  rating: number;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  createdAt: string;
}

export interface Newsletter {
  id?: string;
  email: string;
  createdAt: string;
}
