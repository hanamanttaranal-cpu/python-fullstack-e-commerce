import React, { useState, useEffect } from 'react';
import { Star, X, ShoppingBag, MessageSquare, ShieldAlert } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, increment } from 'firebase/firestore';
import { Product, Review } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface ProductDetailModalProps {
  product: Product;
  user: FirebaseUser | null;
  onAddToCart: (p: Product) => void;
  onClose: () => void;
}

export default function ProductDetailModal({ product, user, onAddToCart, onClose }: ProductDetailModalProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  
  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load reviews in real-time from Firestore
  useEffect(() => {
    if (!product.id) return;
    
    setLoadingReviews(true);
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('productId', '==', product.id));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Review[] = [];
        snapshot.forEach((doc) => {
          list.push({ id: doc.id, ...doc.data() } as Review);
        });
        // Sort reviews by date descending
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setReviews(list);
        setLoadingReviews(false);
      },
      (error) => {
        // Handle error as mandated by Firebase Integration Skill
        try {
          handleFirestoreError(error, OperationType.GET, `reviews?productId=${product.id}`);
        } catch (e: any) {
          setErrorMsg("Could not load reviews. Please verify Firestore rules.");
          setLoadingReviews(false);
        }
      }
    );

    return () => unsubscribe();
  }, [product.id]);

  // Submit Review
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!comment.trim()) return;

    setSubmittingReview(true);
    setErrorMsg(null);

    const newReviewPayload = {
      productId: product.id,
      userId: user.uid,
      userName: user.displayName || 'Anonymous User',
      rating: Number(rating),
      comment: comment.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Save review to reviews collection
      const reviewsRef = collection(db, 'reviews');
      await addDoc(reviewsRef, newReviewPayload);

      // 2. Safely increment the review count and update rating in products collection
      const productRef = doc(db, 'products', product.id);
      
      // Calculate new cumulative rating average (client-side calculation for simple state)
      const currentReviewsCount = product.reviewCount || 0;
      const currentRating = product.rating || 0;
      const totalScore = currentRating * currentReviewsCount + rating;
      const newReviewsCount = currentReviewsCount + 1;
      const newAverageRating = Number((totalScore / newReviewsCount).toFixed(1));

      await updateDoc(productRef, {
        reviewCount: increment(1),
        rating: newAverageRating
      });

      // Reset form
      setComment('');
      setRating(5);
    } catch (error) {
      console.error('Error adding review:', error);
      try {
        handleFirestoreError(error, OperationType.CREATE, 'reviews');
      } catch (e: any) {
        setErrorMsg('Permission Denied: Ensure your email is verified and rules are deployed.');
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" id="product-detail-modal">
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        
        {/* Backdrop overlay */}
        <div 
          className="fixed inset-0 bg-gray-500/75 backdrop-blur-xs transition-opacity" 
          onClick={onClose}
          id="modal-backdrop"
        />

        {/* Modal content container */}
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-4xl flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden">
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors cursor-pointer"
            id="close-modal-btn"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Left Side: Product Image Display */}
          <div className="w-full md:w-1/2 bg-gray-50 flex items-center justify-center p-6 md:p-8 relative" id="modal-image-panel">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[300px] md:max-h-[450px] w-full object-contain rounded-xl"
            />
          </div>

          {/* Right Side: Product Details & Reviews Scroll Panel */}
          <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between max-h-[85vh] overflow-y-auto" id="modal-details-panel">
            
            <div id="product-details-content">
              {/* Category */}
              <span className="text-2xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                {product.category}
              </span>

              {/* Title */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-1 font-sans">
                {product.name}
              </h2>

              {/* Price & Rating Header */}
              <div className="mt-3 flex items-center justify-between border-b border-gray-100 pb-3">
                <span className="text-2xl font-extrabold text-gray-900 font-mono">
                  ${product.price.toFixed(2)}
                </span>
                
                <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-lg">
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-bold text-amber-700">{product.rating}</span>
                  <span className="text-2xs text-amber-600">({product.reviewCount})</span>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">
                  Description
                </h4>
                <p className="mt-1 text-sm text-gray-600 leading-relaxed font-sans">
                  {product.description}
                </p>
              </div>

              {/* Tech Specs Summary */}
              <div className="mt-4 grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <div>
                  <span className="text-[10px] text-gray-400 block font-mono">Stock Status</span>
                  <span className={`text-xs font-semibold ${isOutOfStock ? 'text-red-600' : 'text-emerald-600'}`}>
                    {isOutOfStock ? 'Out of Stock' : `${product.stock} units available`}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block font-mono">Delivery</span>
                  <span className="text-xs font-semibold text-gray-700">Free Express</span>
                </div>
              </div>

              {/* Reviews Section */}
              <div className="mt-6 border-t border-gray-100 pt-5">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 font-sans">
                    Customer Reviews ({reviews.length})
                  </h3>
                </div>

                {errorMsg && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">
                    <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Reviews List */}
                <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1" id="reviews-list">
                  {loadingReviews ? (
                    <div className="py-4 text-center text-xs text-gray-400 animate-pulse">
                      Loading real-time reviews...
                    </div>
                  ) : reviews.length === 0 ? (
                    <div className="py-4 text-center text-xs text-gray-400">
                      No reviews yet. Be the first to share your thoughts!
                    </div>
                  ) : (
                    reviews.map((rev) => (
                      <div key={rev.id} className="p-3 bg-gray-50/50 rounded-xl border border-gray-50 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-gray-800">{rev.userName}</span>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`h-3 w-3 ${i < rev.rating ? 'fill-current' : 'text-gray-200'}`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 font-sans mt-0.5">{rev.comment}</p>
                        <span className="text-[9px] text-gray-400 mt-1 block font-mono">
                          {new Date(rev.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Add Review Form */}
                <div className="mt-5 border-t border-gray-50 pt-4 bg-gray-50/30 p-3 rounded-xl">
                  {user ? (
                    <form onSubmit={handleSubmitReview} className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-700">Your Rating:</span>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className="text-amber-400 hover:scale-110 transition-transform cursor-pointer"
                            >
                              <Star className={`h-4.5 w-4.5 ${star <= rating ? 'fill-current' : 'text-gray-200'}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="relative">
                        <textarea
                          rows={2}
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Share your experience with this product..."
                          className="w-full text-xs rounded-lg border border-gray-200 p-2 text-gray-900 placeholder-gray-400 focus:outline-hidden focus:border-gray-900 focus:bg-white bg-white transition-all"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submittingReview || !comment.trim()}
                        className="w-full py-1.5 px-4 rounded-lg bg-gray-900 hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 text-white text-xs font-bold transition-colors shadow-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        {submittingReview ? 'Posting...' : 'Submit Review'}
                      </button>
                    </form>
                  ) : (
                    <div className="text-center p-3 text-xs text-gray-500">
                      Please <span className="font-bold text-gray-900">Sign In</span> above to write a product review.
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Bottom Add-To-Cart CTA Panel */}
            <div className="mt-6 pt-4 border-t border-gray-100" id="modal-cta-panel">
              <button
                disabled={isOutOfStock}
                onClick={() => {
                  onAddToCart(product);
                  onClose();
                }}
                className={`w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2.5 font-bold text-sm shadow-md cursor-pointer transition-all ${
                  isOutOfStock 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]'
                }`}
                id={`modal-add-to-cart-btn-${product.id}`}
              >
                <ShoppingBag className="h-4.5 w-4.5" />
                <span>{isOutOfStock ? 'Sold Out' : `Add To Shopping Bag — $${product.price.toFixed(2)}`}</span>
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
