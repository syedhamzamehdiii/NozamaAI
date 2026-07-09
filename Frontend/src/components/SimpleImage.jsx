// Create: src/components/SimpleImage.jsx

import React, { useState } from 'react';

const SimpleImage = ({ src, alt, className, fallbackClassName }) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Simple URL construction
  const getImageUrl = (rawSrc) => {
    if (!rawSrc) return null;
    
    console.log('🖼️ Processing image:', rawSrc);
    
    let url;
    if (typeof rawSrc === 'string') {
      if (rawSrc.startsWith('http')) {
        url = rawSrc;
      } else if (rawSrc.startsWith('/uploads/')) {
        url = `http://localhost:8000${rawSrc}`;
      } else {
        url = `http://localhost:8000/uploads/${rawSrc}`;
      }
    } else {
      return null;
    }
    
    console.log('🔗 Final URL:', url);
    return url;
  };
  
  const imageUrl = getImageUrl(src);
  
  const handleLoad = () => {
    console.log('✅ Image loaded successfully:', imageUrl);
    setLoading(false);
    setError(false);
  };
  
  const handleError = (e) => {
    console.log('❌ Image failed to load:', imageUrl);
    console.log('❌ Error event:', e);
    setLoading(false);
    setError(true);
  };
  
  if (!imageUrl || error) {
    return (
      <div className={fallbackClassName || className} style={{ 
        backgroundColor: '#1f2937', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#9ca3af'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>📷</div>
          <div style={{ fontSize: '12px' }}>No Image</div>
        </div>
      </div>
    );
  }
  
  return (
    <>
      {loading && (
        <div className={className} style={{ 
          backgroundColor: '#e5e7eb', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          <div>Loading...</div>
        </div>
      )}
      <img
        src={imageUrl}
        alt={alt}
        className={loading ? 'hidden' : className}
        onLoad={handleLoad}
        onError={handleError}
        style={loading ? { display: 'none' } : {}}
      />
    </>
  );
};

export default SimpleImage;