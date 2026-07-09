import React from 'react';
import { Star, ShoppingBag, Eye } from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import StarRating from './StarRating';

interface ProductCardProps {
  key?: string;
  product: Product;
  onAddToCart: (p: Product) => void;
  onViewDetails: (p: Product) => void;
  isComparing?: boolean;
  onToggleCompare?: (p: Product) => void;
}

export default function ProductCard({
  product,
  onAddToCart,
  onViewDetails,
  isComparing = false,
  onToggleCompare,
}: ProductCardProps) {
  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 5;

  return (
    <motion.div 
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-850 bg-white dark:bg-gray-900 shadow-xs hover:shadow-lg dark:hover:shadow-black/40 hover:border-gray-200 dark:hover:border-gray-700 transition-colors duration-300"
      id={`product-card-${product.id}`}
      whileHover={{ 
        y: -6, 
        scale: 1.01,
        transition: { duration: 0.25, ease: 'easeOut' } 
      }}
      whileTap={{ scale: 0.99 }}
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Product Image Stage */}
      <div className="relative aspect-square overflow-hidden bg-gray-50 dark:bg-gray-950" id={`product-card-image-stage-${product.id}`}>
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
          loading="lazy"
        />

        {/* Compare Toggle Overlay */}
        {onToggleCompare && (
          <div className="absolute top-3 right-3 z-10" id={`product-compare-toggle-container-${product.id}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleCompare(product);
              }}
              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 shadow-xs border cursor-pointer ${
                isComparing
                  ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600'
                  : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs text-gray-700 dark:text-gray-200 border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800 hover:text-gray-950 dark:hover:text-white'
              }`}
              id={`product-compare-btn-${product.id}`}
            >
              {isComparing ? 'Comparing' : '+ Compare'}
            </button>
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5" id={`product-card-badges-${product.id}`}>
          {product.featured && (
            <span className="inline-flex items-center rounded-md bg-gray-900/90 dark:bg-gray-100/90 backdrop-blur-xs px-2.5 py-1 text-2xs font-bold text-white dark:text-gray-900 uppercase tracking-wider">
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
            className="p-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white rounded-full shadow-md transition-all scale-90 group-hover:scale-100 duration-300 cursor-pointer"
            title="View Details"
            id={`quick-view-btn-${product.id}`}
          >
            <Eye className="h-5 w-5" />
          </button>
          {!isOutOfStock && (
            <button
              onClick={() => onAddToCart(product)}
              className="p-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-full shadow-md transition-all scale-90 group-hover:scale-100 duration-300 cursor-pointer"
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
        <p className="text-2xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1 font-mono">
          {product.category}
        </p>
        
        <h3 className="text-sm font-bold text-gray-900 dark:text-white group-hover:text-gray-700 dark:group-hover:text-gray-200 cursor-pointer line-clamp-1 flex-1 font-sans" onClick={() => onViewDetails(product)}>
          {product.name}
        </h3>

        {/* Rating and Reviews */}
        <div className="mt-2 flex items-center gap-1.5" id={`product-rating-row-${product.id}`}>
          <StarRating rating={product.rating} size={3.5} />
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 ml-1">{product.rating.toFixed(1)}</span>
          <span className="text-[10px] text-gray-400 dark:text-gray-500">({product.reviewCount} reviews)</span>
        </div>

        {/* Pricing / CTA Section */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-800" id={`product-price-row-${product.id}`}>
          <div className="flex flex-col">
            <span className="text-xs text-gray-400 dark:text-gray-500">Price</span>
            <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
              ${product.price.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => onViewDetails(product)}
            className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-bold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors cursor-pointer"
            id={`view-btn-${product.id}`}
          >
            Details
          </button>
        </div>
      </div>
    </motion.div>
  );
}
