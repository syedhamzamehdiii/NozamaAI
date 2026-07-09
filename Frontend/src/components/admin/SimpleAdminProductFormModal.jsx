// src/components/admin/SimpleAdminProductFormModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  DocumentArrowUpIcon, 
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';
import { simpleAdminApi } from '../../services/SimpleAdminApi';

const SimpleAdminProductFormModal = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editingProduct = null 
}) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    short_description: '',
    category: 'Natural Language Processing',
    price: 0,
    original_price: 0,
    tags: [],
    version: '1.0.0',
    license_type: 'commercial',
    requirements: [],
    features: [],
    use_cases: []
  });

  const [files, setFiles] = useState({
    images: [],
    demo_video: null,
    files: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const categories = [
    'Natural Language Processing',
    'Computer Vision', 
    'Machine Learning',
    'Deep Learning',
    'Data Science',
    'Robotics',
    'Chatbots & Conversational AI',
    'Image Processing',
    'Text Analysis',
    'Predictive Analytics',
    'Automation Tools',
    'Other'
  ];

  const licenseTypes = [
    { value: 'commercial', label: 'Commercial License' },
    { value: 'personal', label: 'Personal Use Only' },
    { value: 'open_source', label: 'Open Source' },
    { value: 'enterprise', label: 'Enterprise License' }
  ];

  // Initialize form data when editing
  useEffect(() => {
    if (editingProduct) {
      setFormData({
        title: editingProduct.title || '',
        description: editingProduct.description || '',
        short_description: editingProduct.short_description || '',
        category: editingProduct.category || 'Natural Language Processing',
        price: editingProduct.price || 0,
        original_price: editingProduct.original_price || 0,
        tags: editingProduct.tags || [],
        version: editingProduct.version || '1.0.0',
        license_type: editingProduct.license_type || 'commercial',
        requirements: editingProduct.requirements || [],
        features: editingProduct.features || [],
        use_cases: editingProduct.use_cases || []
      });
    } else {
      // Reset form for new product
      setFormData({
        title: '',
        description: '',
        short_description: '',
        category: 'Natural Language Processing',
        price: 0,
        original_price: 0,
        tags: [],
        version: '1.0.0',
        license_type: 'commercial',
        requirements: [],
        features: [],
        use_cases: []
      });
    }
    
    // Reset files when modal opens/closes
    setFiles({
      images: [],
      demo_video: null,
      files: []
    });
    
    setError('');
    setSuccess('');
  }, [editingProduct, isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user starts typing
  };

  const handleArrayFieldChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayField = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayField = (field, index) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const handleTagInput = (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      e.preventDefault();
      const newTag = e.target.value.trim();
      if (!formData.tags.includes(newTag) && formData.tags.length < 10) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.target.value = '';
    }
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleFileChange = (type, selectedFiles) => {
    const fileArray = Array.from(selectedFiles);
    
    // Validate file types and sizes
    if (type === 'images') {
      const validImages = fileArray.filter(file => {
        const isValidType = file.type.startsWith('image/');
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
        return isValidType && isValidSize;
      });
      
      if (validImages.length !== fileArray.length) {
        setError('Some images were skipped (invalid type or too large)');
      }
      
      setFiles(prev => ({
        ...prev,
        [type]: validImages.slice(0, 4) // Max 4 images
      }));
    } else if (type === 'demo_video') {
      const file = fileArray[0];
      if (file) {
        const isValidType = file.type.startsWith('video/');
        const isValidSize = file.size <= 100 * 1024 * 1024; // 100MB
        
        if (isValidType && isValidSize) {
          setFiles(prev => ({
            ...prev,
            [type]: file
          }));
        } else {
          setError('Video must be a valid video file and under 100MB');
        }
      }
    } else if (type === 'files') {
      const validFiles = fileArray.filter(file => {
        const isZip = file.name.toLowerCase().endsWith('.zip');
        const isValidSize = file.size <= 500 * 1024 * 1024; // 500MB
        return isZip && isValidSize;
      });
      
      if (validFiles.length !== fileArray.length) {
        setError('Some files were skipped (must be ZIP files under 500MB)');
      }
      
      setFiles(prev => ({
        ...prev,
        [type]: validFiles
      }));
    }
  };

  const validateForm = () => {
    const errors = [];

    if (!formData.title.trim()) errors.push('Product title is required');
    if (!formData.short_description.trim()) errors.push('Short description is required');
    if (!formData.description.trim()) errors.push('Full description is required');
    if (formData.price <= 0) errors.push('Price must be greater than 0');
    if (formData.title.length > 100) errors.push('Title must be less than 100 characters');
    if (formData.short_description.length > 200) errors.push('Short description must be less than 200 characters');
    if (formData.description.length > 2000) errors.push('Description must be less than 2000 characters');

    return errors;
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  console.log('🔄 Form submit triggered');
  
  setLoading(true);
  setError('');
  setSuccess('');

  try {
    // Enhanced validation with detailed logging
    console.log('📋 Current form data:', formData);
    
    const validationErrors = validateForm();
    console.log('🔍 Validation errors:', validationErrors);
    
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    // Check if simpleAdminApi is available
    console.log('🔌 Checking simpleAdminApi:', {
      apiExists: !!simpleAdminApi,
      createMethodExists: !!simpleAdminApi?.createMyProduct,
      createFormDataExists: !!simpleAdminApi?.createFormData,
      currentUser: simpleAdminApi?.getCurrentUser?.()
    });

    // Log file information
    console.log('📁 File information:', {
      images: files.images.length,
      demo_video: !!files.demo_video,
      files: files.files.length,
      imageDetails: files.images.map(f => ({ name: f.name, size: f.size, type: f.type }))
    });

    // Create FormData with detailed logging
    console.log('📦 Creating FormData...');
    const submitData = simpleAdminApi.createFormData(formData, files);
    
    // Log FormData contents (for debugging)
    console.log('📋 FormData entries:');
    for (let [key, value] of submitData.entries()) {
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes)`);
      } else {
        console.log(`${key}: ${value}`);
      }
    }

    let response;
    if (editingProduct) {
      console.log('✏️ Updating existing product:', editingProduct.id);
      response = await simpleAdminApi.updateMyProduct(editingProduct.id, submitData);
      setSuccess('✅ Product updated successfully and resubmitted for review!');
    } else {
      console.log('➕ Creating new product...');
      response = await simpleAdminApi.createMyProduct(submitData);
      setSuccess('✅ Product created successfully and submitted for review!');
    }

    console.log('✅ API Response:', response);
    
    // Wait to show success message
    setTimeout(() => {
      if (onSuccess) {
        console.log('🎉 Calling onSuccess callback');
        onSuccess(response);
      }
      console.log('🚪 Closing modal');
      onClose();
    }, 1500);
    
  } catch (error) {
    console.error('❌ Form submission error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      response: error.response
    });
    
    // More detailed error message
    let errorMessage = 'Failed to save product. ';
    
    if (error.message.includes('Network')) {
      errorMessage += 'Check your internet connection.';
    } else if (error.message.includes('404')) {
      errorMessage += 'API endpoint not found. Check backend server.';
    } else if (error.message.includes('403') || error.message.includes('401')) {
      errorMessage += 'Authentication failed. Please login again.';
    } else if (error.message.includes('413')) {
      errorMessage += 'Files too large. Reduce file sizes.';
    } else {
      errorMessage += error.message || 'Unknown error occurred.';
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
    console.log('🏁 Form submission completed');
  }
};

  const handleClose = () => {
    if (!loading) {
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative bg-gray-900 border border-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-900 border-b border-gray-800 p-6 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[#DAA425]">
                {editingProduct ? 'Edit My Product' : 'Create New Product'}
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {editingProduct 
                  ? 'Update your product details. Changes will require Super Admin approval.' 
                  : 'Create a new AI tool for review by Super Admin.'}
              </p>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="text-gray-400 hover:text-white transition-colors duration-300 disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircleIcon className="w-5 h-5 text-green-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-green-300">{success}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-900 bg-opacity-20 border border-red-400 rounded-lg p-4">
              <div className="flex items-start">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-400 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Product Title * <span className="text-xs text-gray-400">({formData.title.length}/100)</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                placeholder="Enter your AI tool name"
                maxLength={100}
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                required
                disabled={loading}
              >
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Price (USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="9999"
                value={formData.price}
                onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                placeholder="29.99"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Original Price (USD) <span className="text-xs text-gray-400">(optional, for discounts)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="9999"
                value={formData.original_price}
                onChange={(e) => handleInputChange('original_price', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                placeholder="49.99"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Version
              </label>
              <input
                type="text"
                value={formData.version}
                onChange={(e) => handleInputChange('version', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                placeholder="1.0.0"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                License Type
              </label>
              <select
                value={formData.license_type}
                onChange={(e) => handleInputChange('license_type', e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                disabled={loading}
              >
                {licenseTypes.map(license => (
                  <option key={license.value} value={license.value}>{license.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Descriptions */}
          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              Short Description * <span className="text-xs text-gray-400">({formData.short_description.length}/200)</span>
            </label>
            <textarea
              rows={3}
              value={formData.short_description}
              onChange={(e) => handleInputChange('short_description', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
              placeholder="Brief description of your AI tool (will appear in product cards)"
              maxLength={200}
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              Full Description * <span className="text-xs text-gray-400">({formData.description.length}/2000)</span>
            </label>
            <textarea
              rows={6}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
              placeholder="Detailed description of your AI tool, its capabilities, and how it works..."
              maxLength={2000}
              required
              disabled={loading}
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              Tags <span className="text-xs text-gray-400">(Press Enter to add, max 10)</span>
            </label>
            <input
              type="text"
              placeholder="Type a tag and press Enter"
              onKeyDown={handleTagInput}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
              disabled={loading || formData.tags.length >= 10}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-3 py-1 bg-[#DAA425] bg-opacity-20 text-[#DAA425] rounded-full text-sm">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-[#DAA425] hover:text-[#DAA740]"
                    disabled={loading}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              Key Features <span className="text-xs text-gray-400">(What makes your tool special?)</span>
            </label>
            {formData.features.map((feature, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={feature}
                  onChange={(e) => handleArrayFieldChange('features', index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                  placeholder="Describe a key feature"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('features', index)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('features')}
              className="text-[#DAA425] hover:text-[#DAA740] text-sm disabled:opacity-50"
              disabled={loading}
            >
              + Add Feature
            </button>
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              System Requirements <span className="text-xs text-gray-400">(Technical requirements to use your tool)</span>
            </label>
            {formData.requirements.map((requirement, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={requirement}
                  onChange={(e) => handleArrayFieldChange('requirements', index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                  placeholder="e.g., Python 3.8+, 4GB RAM, etc."
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('requirements', index)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('requirements')}
              className="text-[#DAA425] hover:text-[#DAA740] text-sm disabled:opacity-50"
              disabled={loading}
            >
              + Add Requirement
            </button>
          </div>

          {/* Use Cases */}
          <div>
            <label className="block text-sm font-medium text-[#DAA425] mb-2">
              Use Cases <span className="text-xs text-gray-400">(How can people use your tool?)</span>
            </label>
            {formData.use_cases.map((useCase, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={useCase}
                  onChange={(e) => handleArrayFieldChange('use_cases', index, e.target.value)}
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425]"
                  placeholder="Describe a practical use case"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => removeArrayField('use_cases', index)}
                  className="px-3 py-2 text-red-400 hover:text-red-300 disabled:opacity-50"
                  disabled={loading}
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayField('use_cases')}
              className="text-[#DAA425] hover:text-[#DAA740] text-sm disabled:opacity-50"
              disabled={loading}
            >
              + Add Use Case
            </button>
          </div>

          {/* File Uploads */}
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-[#DAA425]">File Uploads</h4>
            
            {/* Images */}
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Product Images <span className="text-xs text-gray-400">(Max 4 images, 10MB each)</span>
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                <DocumentArrowUpIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileChange('images', e.target.files)}
                  className="hidden"
                  id="images-upload"
                  disabled={loading}
                />
                <label 
                  htmlFor="images-upload" 
                  className={`cursor-pointer text-[#DAA425] hover:text-[#DAA740] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Click to upload product images
                </label>
                <p className="text-xs text-gray-500 mt-1">PNG, JPG, WebP supported</p>
                {files.images.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">{files.images.length} image(s) selected:</p>
                    <div className="text-xs text-gray-400">
                      {files.images.map((file, index) => (
                        <div key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Demo Video */}
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Demo Video <span className="text-xs text-gray-400">(Optional, max 100MB)</span>
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => handleFileChange('demo_video', e.target.files)}
                  className="hidden"
                  id="video-upload"
                  disabled={loading}
                />
                <label 
                  htmlFor="video-upload" 
                  className={`cursor-pointer text-[#DAA425] hover:text-[#DAA740] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Click to upload demo video
                </label>
                <p className="text-xs text-gray-500 mt-1">MP4, MOV, AVI supported</p>
                {files.demo_video && (
                  <p className="text-sm text-gray-300 mt-2">
                    {files.demo_video.name} ({(files.demo_video.size / 1024 / 1024).toFixed(1)}MB)
                  </p>
                )}
              </div>
            </div>

            {/* Product Files */}
            <div>
              <label className="block text-sm font-medium text-[#DAA425] mb-2">
                Product Files <span className="text-xs text-gray-400">(ZIP files only, max 500MB each)</span>
              </label>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-gray-500 transition-colors">
                <input
                  type="file"
                  multiple
                  accept=".zip"
                  onChange={(e) => handleFileChange('files', e.target.files)}
                  className="hidden"
                  id="files-upload"
                  disabled={loading}
                />
                <label 
                  htmlFor="files-upload" 
                  className={`cursor-pointer text-[#DAA425] hover:text-[#DAA740] ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  Click to upload ZIP files
                </label>
                <p className="text-xs text-gray-500 mt-1">Only ZIP files are accepted</p>
                {files.files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-300">{files.files.length} file(s) selected:</p>
                    <div className="text-xs text-gray-400">
                      {files.files.map((file, index) => (
                        <div key={index}>{file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="p-4 bg-yellow-900 bg-opacity-20 border border-yellow-400 rounded-lg">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-yellow-400 mb-1">Simple Admin Guidelines</p>
                <ul className="text-xs text-yellow-300 space-y-1">
                  <li>• All products require Super Admin approval before going live</li>
                  <li>• Products will be set to "pending" status automatically</li>
                  <li>• You can only edit your own products with 'pending' status</li>
                  <li>• Editing approved/rejected products will reset them to 'pending'</li>
                  <li>• High-quality images and detailed descriptions improve approval chances</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <button
              className="px-6 py-2 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-800 transition-all duration-300 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.title || !formData.short_description || !formData.description || formData.price <= 0}
              className="px-6 py-2 bg-[#DAA425] hover:bg-[#DAA740] text-black rounded-lg transition-all duration-300 font-medium disabled:opacity-50 flex items-center"
            >
              {loading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
              )}
              {loading 
                ? 'Saving...' 
                : (editingProduct ? 'Update Product' : 'Create Product')
              }
            </button>
          </div>

          {/* Form Validation Info */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>Required fields: Title, Short Description, Full Description, Price {'>'} 0</p>
            <p>File limits: Images (4 max, 10MB each), Video (100MB), ZIP files (500MB each)</p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SimpleAdminProductFormModal;