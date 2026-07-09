export const ImageUtils = {
  getImageUrl: (imageData) => {
    if (!imageData) return null;
    
    let rawUrl = null;
    
    if (typeof imageData === 'string') {
      rawUrl = imageData;
    } else if (typeof imageData === 'object' && imageData !== null) {
      rawUrl = imageData.url || imageData.file_url || imageData.path || imageData.src;
    }
    
    if (!rawUrl || rawUrl.trim() === '') return null;
    
    // Skip placeholder URLs
    if (rawUrl.includes('placeholder') || rawUrl.includes('via.placeholder')) {
      return null;
    }
    
    // FIX: Handle Windows backslashes in URLs
    let cleanUrl = rawUrl.replace(/\\/g, '/');
    
    // If it's already a complete URL, use it
    if (cleanUrl.startsWith('http://') || cleanUrl.startsWith('https://')) {
      return cleanUrl;
    }
    
    // Handle different path formats
    if (cleanUrl.startsWith('/uploads/')) {
      return `http://localhost:8000${cleanUrl}`;
    }
    
    if (cleanUrl.startsWith('uploads/')) {
      return `http://localhost:8000/${cleanUrl}`;
    }
    
    // Default: assume it's in uploads directory
    const finalPath = cleanUrl.startsWith('/') ? cleanUrl.substring(1) : cleanUrl;
    return `http://localhost:8000/uploads/${finalPath}`;
  }
};