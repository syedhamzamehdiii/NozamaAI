// STEP 3: Create a simple test component to isolate the issue
// Create: src/components/ImageTest.jsx

import React, { useState, useEffect } from 'react';

const ImageTest = () => {
  const [testResults, setTestResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const runTests = async () => {
      const results = {};
      
      // Test 1: Check if backend is responding
      try {
        const response = await fetch('http://localhost:8000/debug/check-uploads');
        const data = await response.json();
        results.backendFiles = data;
      } catch (error) {
        results.backendError = error.message;
      }
      
      // Test 2: Check if a product has images
      try {
        const response = await fetch('http://localhost:8000/api/v1/products/');
        const data = await response.json();
        results.firstProduct = data.products?.[0] || null;
      } catch (error) {
        results.productError = error.message;
      }
      
      setTestResults(results);
      setLoading(false);
    };
    
    runTests();
  }, []);

  if (loading) return <div>Running image tests...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace', backgroundColor: '#f5f5f5' }}>
      <h2>🔍 Image Debug Test Results</h2>
      
      {/* Backend Files Test */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>📁 Backend Files Check</h3>
        {testResults.backendFiles ? (
          <div>
            <p>✅ Uploads directory exists: {testResults.backendFiles.uploads_exists ? 'YES' : 'NO'}</p>
            <p>📍 Path: {testResults.backendFiles.uploads_path}</p>
            <p>📄 Files found: {testResults.backendFiles.files.length}</p>
            {testResults.backendFiles.files.slice(0, 3).map((file, index) => (
              <div key={index} style={{ marginLeft: '20px', padding: '5px', backgroundColor: '#e8e8e8' }}>
                <p><strong>File:</strong> {file.filename}</p>
                <p><strong>URL:</strong> {file.url}</p>
                <p><strong>Exists:</strong> {file.exists ? '✅' : '❌'}</p>
                <img 
                  src={file.url} 
                  alt="Test" 
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  onLoad={() => console.log('✅ Image loaded:', file.url)}
                  onError={() => console.log('❌ Image failed:', file.url)}
                />
              </div>
            ))}
          </div>
        ) : (
          <p>❌ Backend error: {testResults.backendError}</p>
        )}
      </div>
      
      {/* Product Images Test */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>🛍️ Product Images Check</h3>
        {testResults.firstProduct ? (
          <div>
            <p><strong>Product:</strong> {testResults.firstProduct.title}</p>
            <p><strong>Images in DB:</strong> {JSON.stringify(testResults.firstProduct.images)}</p>
            {testResults.firstProduct.images && testResults.firstProduct.images.map((img, index) => (
              <div key={index} style={{ marginLeft: '20px', padding: '5px', backgroundColor: '#e8e8e8' }}>
                <p><strong>Image {index + 1}:</strong> {typeof img === 'string' ? img : JSON.stringify(img)}</p>
                <p><strong>Constructed URL:</strong> {
                  typeof img === 'string' 
                    ? (img.startsWith('http') ? img : `http://localhost:8000${img}`)
                    : 'Cannot construct URL'
                }</p>
                <img 
                  src={typeof img === 'string' 
                    ? (img.startsWith('http') ? img : `http://localhost:8000${img}`)
                    : ''
                  } 
                  alt={`Product ${index + 1}`}
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                  onLoad={() => console.log('✅ Product image loaded')}
                  onError={() => console.log('❌ Product image failed')}
                />
              </div>
            ))}
          </div>
        ) : (
          <p>❌ Product error: {testResults.productError}</p>
        )}
      </div>
      
      {/* Manual URL Tests */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h3>🔗 Manual URL Tests</h3>
        <p>Test these URLs directly in your browser:</p>
        <ul>
          <li><a href="http://localhost:8000/uploads/" target="_blank">http://localhost:8000/uploads/</a> (Should show directory listing)</li>
          <li><a href="http://localhost:8000/debug/check-uploads" target="_blank">http://localhost:8000/debug/check-uploads</a> (Debug endpoint)</li>
          <li><a href="http://localhost:8000/api/v1/products/" target="_blank">http://localhost:8000/api/v1/products/</a> (Products API)</li>
        </ul>
      </div>
      
      {/* Console Instructions */}
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc', backgroundColor: '#fff3cd' }}>
        <h3>🔧 What to check in browser console:</h3>
        <ol>
          <li>Open Developer Tools (F12)</li>
          <li>Go to Console tab</li>
          <li>Look for image load/error messages</li>
          <li>Go to Network tab and refresh page</li>
          <li>Look for failed image requests (red entries)</li>
          <li>Click on failed requests to see the exact error</li>
        </ol>
      </div>
    </div>
  );
};

export default ImageTest;