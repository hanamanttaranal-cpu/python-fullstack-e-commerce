import React, { useState } from 'react';
import { X, Check, ArrowRight, Star, ShoppingCart, Info, Award, DollarSign } from 'lucide-react';
import { Product } from '../types';
import StarRating from './StarRating';

interface ProductCompareProps {
  comparedProducts: Product[];
  onRemoveFromCompare: (product: Product) => void;
  onClearCompare: () => void;
  onAddToCart: (product: Product) => void;
}

export default function ProductCompare({
  comparedProducts,
  onRemoveFromCompare,
  onClearCompare,
  onAddToCart,
}: ProductCompareProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (comparedProducts.length === 0) return null;

  // Find min/max values to highlight differences
  const prices = comparedProducts.map((p) => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  const ratings = comparedProducts.map((p) => p.rating);
  const maxRating = Math.max(...ratings);
  const minRating = Math.min(...ratings);

  const descriptions = comparedProducts.map((p) => p.description || '');
  const longestDescriptionLength = Math.max(...descriptions.map((d) => d.length));

  // Determine if there are differences
  const hasPriceDiff = new Set(prices).size > 1;
  const hasRatingDiff = new Set(ratings).size > 1;
  const hasDescriptionDiff = new Set(descriptions).size > 1;

  return (
    <>
      {/* Sticky Bottom Comparison Bar */}
      <div
        className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-850 shadow-2xl z-40 transition-transform transform duration-300"
        id="compare-sticky-bar"
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
            <p className="text-xs font-bold text-gray-900 dark:text-white font-sans">
              Compare Products ({comparedProducts.length}/3)
            </p>
            <div className="hidden md:flex items-center gap-2">
              {comparedProducts.map((product) => (
                <div
                  key={product.id}
                  className="relative group h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-950 flex-shrink-0"
                  id={`compare-thumbnail-${product.id}`}
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <button
                    onClick={() => onRemoveFromCompare(product)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600 transition-colors shadow-xs cursor-pointer"
                    title={`Remove ${product.name}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClearCompare}
              className="text-xs font-mono text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors uppercase tracking-wider cursor-pointer"
              id="clear-compare-btn"
            >
              Clear
            </button>
            <button
              onClick={() => setIsOpen(true)}
              disabled={comparedProducts.length < 1}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-2 text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              id="open-compare-btn"
            >
              <span>Compare Now</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Detailed Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" id="compare-modal">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Container */}
          <div className="flex min-h-screen items-center justify-center p-4">
            <div
              className="relative w-full max-w-5xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col transition-all duration-300 animate-in fade-in zoom-in-95 duration-200"
              id="compare-modal-content"
            >
              {/* Modal Header */}
              <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 dark:text-white font-sans">
                    Product Comparison View
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Side-by-side analysis of your selected items. Highlighted differences show relative pros and cons.
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Table / Grid Body */}
              <div className="overflow-x-auto p-6">
                <table className="w-full min-w-[600px] border-collapse text-left text-sm text-gray-500 dark:text-gray-450">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="py-4 px-3 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono w-1/4">
                        Attributes
                      </th>
                      {comparedProducts.map((product) => (
                        <th
                          key={product.id}
                          className="py-4 px-4 w-1/4 align-top"
                          id={`compare-header-${product.id}`}
                        >
                          <div className="flex flex-col gap-2">
                            <div className="relative aspect-square w-24 h-24 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50 dark:bg-gray-950 mb-2">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="h-full w-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider font-mono">
                              {product.category}
                            </span>
                            <h4 className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm line-clamp-2">
                              {product.name}
                            </h4>
                          </div>
                        </th>
                      ))}
                      {/* Empty columns for layout if < 3 products compared */}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <th key={`empty-th-${idx}`} className="py-4 px-4 w-1/4" />
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Price Row */}
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                      <td className="py-4 px-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider font-mono">
                        Price
                      </td>
                      {comparedProducts.map((product) => {
                        const isCheapest = product.price === minPrice;
                        const isMostExpensive = product.price === maxPrice;
                        return (
                          <td key={product.id} className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <span className="text-base font-bold text-gray-900 dark:text-white font-mono">
                                ${product.price.toFixed(2)}
                              </span>
                              {hasPriceDiff && isCheapest && (
                                <span className="inline-flex self-start items-center gap-1 rounded-md bg-green-50 dark:bg-green-950/20 px-1.5 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-400 uppercase tracking-wider border border-green-100 dark:border-green-900/30">
                                  <DollarSign className="h-2.5 w-2.5" /> Best Price
                                </span>
                              )}
                              {hasPriceDiff && isMostExpensive && (
                                <span className="inline-flex self-start items-center gap-1 rounded-md bg-gray-50 dark:bg-gray-950/20 px-1.5 py-0.5 text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider border border-gray-200 dark:border-gray-800">
                                  Premium Choice
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <td key={`empty-price-${idx}`} className="py-4 px-4" />
                      ))}
                    </tr>

                    {/* Rating Row */}
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                      <td className="py-4 px-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider font-mono">
                        Rating
                      </td>
                      {comparedProducts.map((product) => {
                        const isHighest = product.rating === maxRating;
                        return (
                          <td key={product.id} className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1">
                                <StarRating rating={product.rating} size={3.5} />
                                <span className="text-xs font-bold text-gray-900 dark:text-white ml-1">
                                  {product.rating.toFixed(1)}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                ({product.reviewCount} reviews)
                              </span>
                              {hasRatingDiff && isHighest && (
                                <span className="inline-flex self-start items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider border border-amber-100 dark:border-amber-900/30">
                                  <Award className="h-2.5 w-2.5" /> Highest Rated
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <td key={`empty-rating-${idx}`} className="py-4 px-4" />
                      ))}
                    </tr>

                    {/* Stock status Row */}
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                      <td className="py-4 px-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider font-mono">
                        Availability
                      </td>
                      {comparedProducts.map((product) => {
                        const isOutOfStock = product.stock <= 0;
                        const isLowStock = product.stock > 0 && product.stock <= 5;
                        return (
                          <td key={product.id} className="py-4 px-4 text-xs font-medium">
                            {isOutOfStock ? (
                              <span className="text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">Out of Stock</span>
                            ) : isLowStock ? (
                              <span className="text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">Low Stock ({product.stock})</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">In Stock ({product.stock})</span>
                            )}
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <td key={`empty-stock-${idx}`} className="py-4 px-4" />
                      ))}
                    </tr>

                    {/* Description Row */}
                    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-950/30 transition-colors">
                      <td className="py-4 px-3 font-semibold text-gray-900 dark:text-white text-xs uppercase tracking-wider font-mono align-top">
                        Description
                      </td>
                      {comparedProducts.map((product) => {
                        const isLongestDesc = (product.description || '').length === longestDescriptionLength;
                        return (
                          <td key={product.id} className="py-4 px-4 align-top">
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-6">
                              {product.description || 'No description available.'}
                            </p>
                            {hasDescriptionDiff && isLongestDesc && (
                              <span className="inline-flex mt-2 items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/20 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider border border-blue-100 dark:border-blue-900/30">
                                <Info className="h-2.5 w-2.5" /> Most Detailed Specs
                              </span>
                            )}
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <td key={`empty-desc-${idx}`} className="py-4 px-4" />
                      ))}
                    </tr>

                    {/* Actions Row */}
                    <tr>
                      <td className="py-6 px-3" />
                      {comparedProducts.map((product) => {
                        const isOutOfStock = product.stock <= 0;
                        return (
                          <td key={product.id} className="py-6 px-4">
                            <div className="flex flex-col gap-2">
                              <button
                                onClick={() => onAddToCart(product)}
                                disabled={isOutOfStock}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-2 text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                              >
                                <ShoppingCart className="h-3.5 w-3.5" />
                                <span>Add to Cart</span>
                              </button>
                              <button
                                onClick={() => onRemoveFromCompare(product)}
                                className="w-full text-center text-2xs font-mono text-red-500 hover:text-red-700 uppercase tracking-wider cursor-pointer"
                              >
                                Remove comparison
                              </button>
                            </div>
                          </td>
                        );
                      })}
                      {Array.from({ length: 3 - comparedProducts.length }).map((_, idx) => (
                        <td key={`empty-actions-${idx}`} className="py-6 px-4" />
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Modal Footer */}
              <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50 px-6 py-4 flex items-center justify-between text-2xs text-gray-400 dark:text-gray-550 font-mono">
                <span>Maximum 3 products allowed for accurate side-by-side analysis.</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-2 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 hover:text-gray-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  Close Comparison
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
