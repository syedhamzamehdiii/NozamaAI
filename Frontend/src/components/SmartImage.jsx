
// 2. Create a smart Image component: src/components/SmartImage.jsx
import React, { useState } from 'react';
import { ImageUtils } from '../utils/imageUtils';

const SmartImage = ({ 
  src, 
  alt = "Product Image", 
  className = "", 
  fallbackClassName = "",
  showFallback = true,
  onLoad,
  onError,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Get the processed image URL
  const imageUrl = ImageUtils.getImageUrl(src);
  
  const handleImageLoad = (e) => {
    setLoading(false);
    setImageError(false);
    if (onLoad) onLoad(e);
  };
  
  const handleImageError = (e) => {
    console.warn('Image failed to load:', imageUrl);
    setLoading(false);
    setImageError(true);
    if (onError) onError(e);
  };
  
  // If no valid URL and we should show fallback
  if (!imageUrl || imageError) {
    if (!showFallback) return null;
    
    return (
      <div className={`bg-gray-800 flex items-center justify-center ${fallbackClassName || className}`}>
        <div className="text-center text-gray-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs">No Image</span>
        </div>
      </div>
    );
  }
  
  return (
    <img
      src={imageUrl}
      alt={alt}
      className={className}
      onLoad={handleImageLoad}
      onError={handleImageError}
      {...props}
    />
  );
};

export default SmartImage;