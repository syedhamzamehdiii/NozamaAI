// frontend/src/components/admin/SimpleAdminProductCreate.jsx
// This component shows PRODUCT CREATION FORM for Simple Admins

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline';
import SimpleAdminProductFormModal from './SimpleAdminProductFormModal';

const SimpleAdminProductCreate = () => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(true); // Auto-open modal
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Handle modal close - redirect back to products
  const handleModalClose = () => {
    setShowModal(false);
    navigate('/simple-admin/products');
  };

  // Handle successful product creation
  const handleModalSuccess = (response) => {
    console.log('✅ Product created successfully:', response);
    setSuccess('✅ Product created successfully and submitted for review!');
    
    // Wait a moment then redirect
    setTimeout(() => {
      navigate('/simple-admin/products');
    }, 2000);
  };

  // If modal is closed, show a fallback page
  if (!showModal) {
    return (
      <div className="min-h-screen bg-black text-white p-4 md:p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/simple-admin/products')}
              className="text-[#DAA425] hover:text-[#DAA740] transition-colors"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
            <h1 className="text-2xl lg:text-3xl font-bold text-[#DAA425]">Create New Product</h1>
          </div>

          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-gray-300 mb-4">Create Your AI Tool</h3>
            <p className="text-gray-500 mb-6">
              Fill out the form to create a new AI tool that will be submitted for Super Admin review.
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="bg-[#DAA425] hover:bg-[#DAA740] text-black px-6 py-3 rounded-lg transition-all duration-300 font-medium"
            >
              Open Creation Form
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Success Message */}
      {success && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4">
            <div className="flex items-start">
              <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-green-300">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Creation Modal */}
      <SimpleAdminProductFormModal 
        isOpen={showModal}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        editingProduct={null} // This is for creating, not editing
      />
    </div>
  );
};

export default SimpleAdminProductCreate;