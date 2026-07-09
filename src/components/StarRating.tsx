import React from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: 3 | 3.5 | 4 | 5;
}

export default function StarRating({ rating, maxStars = 5, size = 4 }: StarRatingProps) {
  const sizeClass = {
    3: 'h-3 w-3',
    3.5: 'h-3.5 w-3.5',
    4: 'h-4 w-4',
    5: 'h-5 w-5',
  }[size] || 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5" id="star-rating-container">
      {[...Array(maxStars)].map((_, index) => {
        const starValue = index + 1;
        const diff = rating - index;
        
        // Fully colored star
        if (diff >= 0.75) {
          return (
            <Star
              key={index}
              className={`${sizeClass} text-amber-400 fill-amber-400`}
              id={`star-${index}-full`}
            />
          );
        }
        // Half colored star (using Lucide style or opacity representation)
        if (diff >= 0.25) {
          return (
            <div key={index} className="relative inline-block" id={`star-${index}-half`}>
              {/* Background Gray Star */}
              <Star className={`${sizeClass} text-gray-200`} />
              {/* Overflow Half-Colored Star */}
              <div className="absolute inset-0 overflow-hidden w-1/2">
                <Star className={`${sizeClass} text-amber-400 fill-amber-400`} />
              </div>
            </div>
          );
        }
        // Empty star
        return (
          <Star
            key={index}
            className={`${sizeClass} text-gray-200`}
            id={`star-${index}-empty`}
          />
        );
      })}
    </div>
  );
}
