import React from 'react';
import { Star, ShoppingBag, Eye } from 'lucide-react';
import { Product } from '../types';

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (p: Product) => void;
  onViewDetails: (p: Product) => void;
}

export default function ProductCard({ product, onAddToCart, onViewDetails }: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <div 
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xs hover:shadow-md hover:border-gray-200 transition-all duration-300"
      id={`product-card-${product.id}`}
    >
      {/* Product Image Stage */}
      <div className="relative aspect-square overflow-hidden bg-gray-50" id={`product-card-image-stage-${product.id}`}>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5" id={`product-card-badges-${product.id}`}>
          {product.featured && (
            <span className="inline-flex items-center rounded-md bg-gray-900/90 backdrop-blur-xs px-2.5 py-1 text-2xs font-bold text-white uppercase tracking-wider">
              Featured
            </span>
          )}
          {isOutOfStock ? (
            <span className="inline-flex items-center rounded-md bg-red-600/90 backdrop-blur-xs px-2.5 py-1 text-2xs font-bold text-white uppercase tracking-wider">
              Sold Out
            </span>
          ) : isLowStock ? (
            <span className="inline-flex items-center rounded-md bg-amber-500/90 backdrop-blur-xs px-2.5 py-1 text-2xs font-bold text-white uppercase tracking-wider animate-pulse">
              Only {product.stock} Left
            </span>
          ) : null}
        </div>

        {/* Floating Quick Action Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
          <button
            onClick={() => onViewDetails(product)}
            className="p-3 bg-white hover:bg-gray-100 text-gray-900 rounded-full shadow-md transition-all scale-90 group-hover:scale-100 duration-300"
            title="View Details"
            id={`quick-view-btn-${product.id}`}
          >
            <Eye className="h-5 w-5" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={() => onAddToCart(product)}
              className="p-3 bg-gray-900 hover:bg-gray-800 text-white rounded-full shadow-md transition-all scale-90 group-hover:scale-100 duration-300"
              title="Add to Cart"
              id={`quick-add-btn-${product.id}`}
            >
              <ShoppingBag className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Product Information Body */}
      <div className="flex flex-1 flex-col p-4" id={`product-card-info-body-${product.id}`}>
        <p className="text-2xs font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono">
          {product.category}
        </p>
        
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-gray-700 cursor-pointer line-clamp-1 flex-1 font-sans" onClick={() => onViewDetails(product)}>
          {product.name}
        </h3>

        {/* Rating and Reviews */}
        <div className="mt-2 flex items-center gap-1.5" id={`product-rating-row-${product.id}`}>
          <div className="flex items-center text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
          </div>
          <span className="text-xs font-semibold text-gray-700">{product.rating}</span>
          <span className="text-[10px] text-gray-400">({product.reviewCount} reviews)</span>
        </div>

        {/* Pricing / CTA Section */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50" id={`product-price-row-${product.id}`}>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400">Price</span>
            <span className="text-base font-bold text-gray-900 font-mono">
              ${product.price.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => onViewDetails(product)}
            className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer"
            id={`view-btn-${product.id}`}
          >
            Details
          </button>
        </div>
      </div>
    </div>
  );
}
