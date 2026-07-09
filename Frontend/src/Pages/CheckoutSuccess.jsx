import React, { useEffect, useState, useRef } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { CheckCircleIcon, ArrowLeftIcon, EnvelopeIcon } from '@heroicons/react/24/outline';

const CheckoutSuccess = () => {
  const location = useLocation();
  const orderData = location.state || {};
  const [orderSaved, setOrderSaved] = useState(false);
  const [realOrderId, setRealOrderId] = useState(null);
  const [downloadCompleted, setDownloadCompleted] = useState(false);
  
  // Use useRef to prevent duplicate API calls
  const orderSaveAttempted = useRef(false);
  const downloadAttempted = useRef(false);
  const navigate = useNavigate();
  const [redirectCountdown, setRedirectCountdown] = useState(10);

  const {
    orderTotal = 0,
    orderItems = [],
    customerEmail = '',
    orderId = '',
    paymentIntentId = '',
    realPayment = false,
    aiPoolContribution = 0
  } = orderData;

  // Function to download actual files (only once)
  const downloadActualFiles = async (orderId) => {
    if (orderItems.length === 0 || downloadAttempted.current) {
      console.log('Download skipped - no items or already attempted');
      return;
    }

    downloadAttempted.current = true; // Prevent duplicate downloads
    
    try {
      console.log('📥 Starting automatic download of actual files...');
      
      let downloadCount = 0;
      
      // Try to download ZIP files for each product
      for (const item of orderItems) {
        try {
          console.log(`📥 Downloading: ${item.title}`);
          
          const response = await fetch(`http://localhost:8000/api/v1/orders/download-product-files/${item.id}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });

          if (response.ok) {
            const blob = await response.blob();
            
            // Create download link
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${item.title.replace(/[^a-zA-Z0-9]/g, '_')}_files.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            downloadCount++;
            console.log(`✅ Downloaded: ${item.title}`);
            
            // Add delay between downloads to prevent browser blocking
            await new Promise(resolve => setTimeout(resolve, 1000));
            
          } else {
            console.log(`⚠️ No files available for: ${item.title}`);
          }
          
        } catch (error) {
          console.error(`❌ Download failed for ${item.title}:`, error);
        }
      }
      
      setDownloadCompleted(true);
      console.log(`✅ Download process completed. ${downloadCount} files downloaded.`);
      
    } catch (error) {
      console.error('❌ Download process failed:', error);
    }
  };

  // Save order to database (only once)
  useEffect(() => {
    const saveOrderToDB = async () => {
      if (orderItems.length === 0 || orderSaved || orderSaveAttempted.current) {
        return;
      }
      
      orderSaveAttempted.current = true; // Prevent duplicate saves
      
      try {
        console.log('💾 Saving order to database...');
        
        const orderPayload = {
          order_number: `NZ-${Date.now()}`,
          customer_email: customerEmail,
          customer_name: customerEmail.split('@')[0] || 'Customer',
          payment_intent_id: paymentIntentId,
          items: orderItems.map(item => ({
            product_id: item.id || 'unknown',
            product_title: item.title || 'Unknown Product',
            product_name: item.title || 'Unknown Product',
            quantity: 1,
            price: item.price || 0
          })),
          total_amount: orderTotal,
          subtotal: orderTotal - (aiPoolContribution || 0),
          ai_pool_contribution: aiPoolContribution || 0,
          status: 'completed',
          payment_status: 'paid',
          billing_address: {
            first_name: customerEmail.split('@')[0] || 'Customer',
            last_name: 'User',
            email: customerEmail
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const response = await fetch('http://localhost:8000/api/v1/orders/save-order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`  }, 
          body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Order saved successfully:', result);
          setRealOrderId(result.order_id);
          setOrderSaved(true);
          
          // Automatically download files after order is saved (with delay)
          setTimeout(() => {
            downloadActualFiles(result.order_id);
          }, 2000); // 2 second delay
          
        } else {
          console.log('⚠️ Order save failed, but payment was successful');
        }
        
      } catch (error) {
        console.error('❌ Error saving order:', error);
      }
    };

    // Only run once when component mounts
    saveOrderToDB();
  }, []); // Empty dependency array to run only once

  // Auto redirect to orders page after successful purchase
useEffect(() => {
  if (orderSaved && downloadCompleted) {
    const timer = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/orders');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }
}, [orderSaved, downloadCompleted, navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-600">Your order has been processed successfully.</p>
          {orderSaved && (
            <p className="text-green-600 text-sm mt-2">✅ Order saved to database</p>
          )}
          {downloadCompleted && (
            <p className="text-blue-600 text-sm mt-1">📥 Files downloaded automatically</p>
          )}
        </div>

        {/* Order Details */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-medium">{realOrderId || `NZ-${Date.now()}`}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Email:</span>
              <span className="font-medium">{customerEmail}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-bold text-lg">${orderTotal.toFixed(2)}</span>
            </div>

            {realPayment && aiPoolContribution > 0 && (
              <div className="flex justify-between text-blue-600">
                <span>AI Token Pool Contribution (10%):</span>
                <span className="font-medium">${aiPoolContribution.toFixed(2)}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-gray-600">Payment ID:</span>
              <span className="font-mono text-sm">{paymentIntentId}</span>
            </div>
          </div>
        </div>

        {/* Items */}
        {orderItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Items Purchased</h3>
            <div className="space-y-2">
              {orderItems.map((item, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <span className="font-medium">{item.title}</span>
                  <span className="text-gray-600">${item.price?.toFixed(2) || '0.00'}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Download Status */}
        <div className="bg-green-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-green-900 mb-3">
            {downloadCompleted ? 'Files Downloaded Successfully' : 'Preparing Downloads...'}
          </h3>
          <p className="text-green-800 text-sm">
            {downloadCompleted 
              ? '✅ Your product files have been downloaded to your computer. Check your Downloads folder.'
              : '⏳ Your files are being prepared for download...'
            }
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 mr-2" />
              Check your email for download links and receipts
            </li>
            <li className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 mr-2" />
              Your files are available in your Downloads folder
            </li>
          </ul>
        </div>

        {/* Actions */}
 {/* Actions */}
<div className="flex flex-col sm:flex-row gap-4 justify-center">
  {orderSaved && downloadCompleted ? (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-4">
        Redirecting to your orders page in {redirectCountdown} seconds...
      </p>
      <button 
        onClick={() => navigate('/orders')}
        className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        View My Orders Now
      </button>
    </div>
  ) : (
    <>
      <Link 
        to="/products"
        className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        Continue Shopping
      </Link>
      
      <Link 
        to="/"
        className="flex items-center justify-center px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeftIcon className="h-5 w-5 mr-2" />
        Back to Home
      </Link>
    </>
  )}
</div>
      </div>
    </div>
  );
};

export default CheckoutSuccess;