import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import { 
  CreditCardIcon, 
  LockClosedIcon, 
  CheckIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  PhoneIcon,
  UserIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { apiService } from '../services/Api';

// Initialize Stripe - replace with your publishable key
// Use import.meta.env for Vite instead of process.env
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key_here');

// Card element options
const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#374151',
      fontFamily: '"Inter", system-ui, sans-serif',
      fontSmoothing: 'antialiased',
      fontSize: '16px',
      '::placeholder': {
        color: '#9CA3AF'
      }
    },
    invalid: {
      color: '#EF4444',
      iconColor: '#EF4444'
    }
  }
};

const CheckoutForm = () => {
  const navigate = useNavigate();
  const stripe = useStripe();
  const elements = useElements();
  const { items: cartItems, clearCart } = useCart();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [formData, setFormData] = useState({
    // Contact Information
    email: user?.email || '',
    confirmEmail: user?.email || '',
    phone: user?.phone || '',
    
    // Billing Information
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    company: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US',
    
    // Additional Options
    agreeTerms: false,
    subscribeNewsletter: true
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [cardError, setCardError] = useState(null);

  // Calculate totals
  const subtotal = cartItems?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
  const total = subtotal; // Add tax, shipping, etc. as needed
  const totalInCents = Math.round(total * 100);

  // Create payment intent when reaching payment step
  useEffect(() => {
    if (currentStep === 3 && !clientSecret && cartItems.length > 0) {
      createPaymentIntent();
    }
  }, [currentStep]);

// REPLACE the createPaymentIntent function in your Checkout.jsx with this:

// Also update your createPaymentIntent function to handle real responses:
const createPaymentIntent = async () => {
  try {
    console.log('💳 Creating REAL Stripe payment intent...');
    console.log('📝 Order details:', {
      amount: totalInCents,
      email: formData.email,
      items: cartItems.length
    });
    
    const response = await apiService.post('/payments/create-payment-intent', {
      amount: totalInCents,
      currency: 'usd',
      customer_email: formData.email,
      order_id: `order_${Date.now()}`,
      items: cartItems.map(item => ({
        id: item.id,
        title: item.title,
        price: item.price,
        quantity: item.quantity
      }))
    });

    console.log('✅ Stripe payment intent response:', response);

    // Handle response structure
    let clientSecret, paymentIntentId;
    
    if (response.data) {
      clientSecret = response.data.client_secret;
      paymentIntentId = response.data.payment_intent_id;
    } else {
      clientSecret = response.client_secret;
      paymentIntentId = response.payment_intent_id;
    }

    console.log('🔑 Real Stripe client secret received');
    console.log('🆔 Payment intent ID:', paymentIntentId);

    if (!clientSecret) {
      throw new Error('No client_secret received from Stripe');
    }

    // Verify this is a real Stripe client secret (should start with 'pi_')
    if (!clientSecret.includes('pi_')) {
      console.warn('⚠️ This might not be a real Stripe client secret');
    }

    setClientSecret(clientSecret);
    setPaymentIntentId(paymentIntentId);
    
  } catch (error) {
    console.error('❌ Error creating payment intent:', error);
    showError('Payment Setup Failed', 'Failed to initialize payment. Please refresh and try again.');
  }
};

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.confirmEmail) newErrors.confirmEmail = 'Please confirm your email';
      if (formData.email !== formData.confirmEmail) newErrors.confirmEmail = 'Emails do not match';
      if (!formData.phone) newErrors.phone = 'Phone number is required';
    }

    if (step === 2) {
      if (!formData.firstName) newErrors.firstName = 'First name is required';
      if (!formData.lastName) newErrors.lastName = 'Last name is required';
      if (!formData.address) newErrors.address = 'Address is required';
      if (!formData.city) newErrors.city = 'City is required';
      if (!formData.state) newErrors.state = 'State is required';
      if (!formData.zipCode) newErrors.zipCode = 'ZIP code is required';
    }

    if (step === 3) {
      if (!formData.agreeTerms) newErrors.agreeTerms = 'You must agree to the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };


// REPLACE your handleSubmit function in Checkout.jsx with this REAL Stripe version:

const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!stripe || !elements || !validateStep(3)) {
    return;
  }

  setIsProcessing(true);
  setCardError(null);

  try {
    console.log('💳 Processing REAL Stripe payment...');
    console.log('🔑 Client Secret:', clientSecret);
    console.log('💰 Amount:', `$${total.toFixed(2)}`);

    // REAL Stripe payment processing - no more mock detection
    const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement),
        billing_details: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          phone: formData.phone,
          address: {
            line1: formData.address,
            city: formData.city,
            state: formData.state,
            postal_code: formData.zipCode,
            country: formData.country
          }
        }
      }
    });

    if (error) {
      // Real Stripe validation errors
      console.error('❌ Stripe payment error:', error);
      setCardError(error.message);
      showError('Payment Failed', error.message);
      
      // Show specific error messages for different error types
      if (error.type === 'card_error') {
        if (error.code === 'card_declined') {
          showError('Card Declined', 'Your card was declined. Please try a different payment method.');
        } else if (error.code === 'incorrect_cvc') {
          showError('Invalid CVC', 'Your card\'s security code is incorrect.');
        } else if (error.code === 'expired_card') {
          showError('Expired Card', 'Your card has expired. Please use a different card.');
        } else if (error.code === 'insufficient_funds') {
          showError('Insufficient Funds', 'Your card has insufficient funds.');
        } else {
          showError('Card Error', error.message);
        }
      } else {
        showError('Payment Failed', error.message);
      }
      
    } else if (paymentIntent.status === 'succeeded') {
      console.log('✅ Stripe payment succeeded!');
      console.log('💰 Amount charged:', `$${paymentIntent.amount / 100}`);
      
      try {
        // Confirm payment on backend
        console.log('🔄 Confirming payment on backend...');
        const confirmResponse = await apiService.post(`/payments/confirm-payment/${paymentIntent.id}`);
        console.log('✅ Backend confirmation:', confirmResponse);
        
        // Clear cart
        clearCart();
        
        // Show success with AI token info
        const aiPoolAmount = (paymentIntent.amount / 100) * 0.1; // 10%
        showSuccess(
          'Payment Successful!', 
          `Your payment of $${(paymentIntent.amount / 100).toFixed(2)} was processed. $${aiPoolAmount.toFixed(2)} has been sent to the AI token pool!`
        );
        
        // Redirect to success page
        navigate('/checkout/success', {
          state: {
            orderTotal:Number(paymentIntent.amount) / 100,
            orderItems: cartItems,
            customerEmail: formData.email,
            orderId: paymentIntent.metadata?.order_id || `NZ-${Date.now()}`,
            paymentIntentId: paymentIntent.id,
            realPayment: true,
            aiPoolContribution: aiPoolAmount
          }
        });
        
      } catch (backendError) {
        console.error('⚠️ Backend confirmation failed:', backendError);
        // Still show success since Stripe payment succeeded
        showSuccess('Payment Processed', 'Your payment was successful, but there was an issue with our backend. Our support team will contact you.');
        
        navigate('/checkout/success', {
          state: {
            orderTotal: paymentIntent.amount / 100,
            orderItems: cartItems,
            customerEmail: formData.email,
            orderId: paymentIntent.metadata?.order_id || `NZ-${Date.now()}`,
            paymentIntentId: paymentIntent.id,
            realPayment: true,
            backendError: true
          }
        });
      }
      
    } else {
      // Payment requires additional action (3D Secure, etc.)
      console.log('⚠️ Payment requires additional action:', paymentIntent.status);
      showError('Payment Incomplete', `Payment status: ${paymentIntent.status}. Please contact support if this persists.`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected payment error:', error);
    showError('Payment Failed', 'An unexpected error occurred. Please try again or contact support.');
  } finally {
    setIsProcessing(false);
  }
};

  const steps = [
    { id: 1, name: 'Contact', description: 'Contact Information' },
    { id: 2, name: 'Billing', description: 'Billing Address' },
    { id: 3, name: 'Payment', description: 'Payment Details' }
  ];

  // Show loading or redirect if cart is empty
  if (!cartItems || cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some items to your cart before checking out.</p>
          <Link 
            to="/products"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Secure Checkout</h1>
            <p className="text-gray-600 mt-2">Complete your purchase securely</p>
          </div>
          <Link 
            to="/cart"
            className="flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-1" />
            Back to Cart
          </Link>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  currentStep >= step.id 
                    ? 'bg-blue-600 border-blue-600 text-white' 
                    : 'border-gray-300 text-gray-500'
                }`}>
                  {currentStep > step.id ? (
                    <CheckIcon className="h-6 w-6" />
                  ) : (
                    <span>{step.id}</span>
                  )}
                </div>
                <div className="ml-3">
                  <p className={`text-sm font-medium ${
                    currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">{step.description}</p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-8 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Contact Information */}
              {currentStep === 1 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Contact Information</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.email ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="Enter your email address"
                        />
                      </div>
                      {errors.email && (
                        <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confirm Email Address *
                      </label>
                      <input
                        type="email"
                        name="confirmEmail"
                        value={formData.confirmEmail}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.confirmEmail ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Confirm your email address"
                      />
                      {errors.confirmEmail && (
                        <p className="mt-1 text-sm text-red-600">{errors.confirmEmail}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.phone ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                      {errors.phone && (
                        <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Billing Information */}
              {currentStep === 2 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Billing Address</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        First Name *
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.firstName ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="John"
                      />
                      {errors.firstName && (
                        <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.lastName ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Doe"
                      />
                      {errors.lastName && (
                        <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Company (Optional)
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Your company name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address *
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.address ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="123 Main Street"
                      />
                      {errors.address && (
                        <p className="mt-1 text-sm text-red-600">{errors.address}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.city ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="New York"
                      />
                      {errors.city && (
                        <p className="mt-1 text-sm text-red-600">{errors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State *
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.state ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select State</option>
                        <option value="CA">California</option>
                        <option value="NY">New York</option>
                        <option value="TX">Texas</option>
                        <option value="FL">Florida</option>
                        <option value="IL">Illinois</option>
                        <option value="PA">Pennsylvania</option>
                        <option value="OH">Ohio</option>
                        <option value="GA">Georgia</option>
                        <option value="NC">North Carolina</option>
                        <option value="MI">Michigan</option>
                      </select>
                      {errors.state && (
                        <p className="mt-1 text-sm text-red-600">{errors.state}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        name="zipCode"
                        value={formData.zipCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          errors.zipCode ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="10001"
                      />
                      {errors.zipCode && (
                        <p className="mt-1 text-sm text-red-600">{errors.zipCode}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Country *
                      </label>
                      <select
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="US">United States</option>
                        <option value="CA">Canada</option>
                        <option value="UK">United Kingdom</option>
                        <option value="AU">Australia</option>
                        <option value="DE">Germany</option>
                        <option value="FR">France</option>
                        <option value="JP">Japan</option>
                        <option value="IN">India</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Payment Information */}
              {currentStep === 3 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Information</h2>
                  
                  <div className="space-y-6">
                    {/* Payment Methods */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-4">
                        Payment Method
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="border-2 border-blue-600 rounded-lg p-4 bg-blue-50">
                          <div className="flex items-center justify-center">
                            <CreditCardIcon className="h-8 w-8 text-blue-600" />
                          </div>
                          <p className="text-center text-sm font-medium text-blue-600 mt-2">Credit/Debit Card</p>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-4 opacity-50">
                          <div className="flex items-center justify-center">
                            <span className="text-2xl">🍎</span>
                          </div>
                          <p className="text-center text-sm font-medium text-gray-500 mt-2">Apple Pay</p>
                          <p className="text-center text-xs text-gray-400">Coming Soon</p>
                        </div>
                        <div className="border border-gray-300 rounded-lg p-4 opacity-50">
                          <div className="flex items-center justify-center">
                            <span className="text-2xl">G</span>
                          </div>
                          <p className="text-center text-sm font-medium text-gray-500 mt-2">Google Pay</p>
                          <p className="text-center text-xs text-gray-400">Coming Soon</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Details */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Information *
                      </label>
                      <div className="border border-gray-300 rounded-lg p-4 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500">
                        <CardElement options={CARD_ELEMENT_OPTIONS} />
                      </div>
                      {cardError && (
                        <p className="mt-2 text-sm text-red-600">{cardError}</p>
                      )}
                    </div>

                    {/* Checkboxes */}
                    <div className="space-y-4">
                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="subscribeNewsletter"
                          checked={formData.subscribeNewsletter}
                          onChange={handleInputChange}
                          className="mt-1 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Subscribe to our newsletter for AI tool updates and exclusive offers
                        </span>
                      </label>

                      <label className="flex items-start">
                        <input
                          type="checkbox"
                          name="agreeTerms"
                          checked={formData.agreeTerms}
                          onChange={handleInputChange}
                          className="mt-1 mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          I agree to the{' '}
                          <Link to="/terms" className="text-blue-600 hover:text-blue-700">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link to="/privacy" className="text-blue-600 hover:text-blue-700">
                            Privacy Policy
                          </Link>
                          *
                        </span>
                      </label>
                      {errors.agreeTerms && (
                        <p className="text-sm text-red-600">{errors.agreeTerms}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={prevStep}
                  className={`px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors ${
                    currentStep === 1 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={currentStep === 1}
                >
                  Previous
                </button>

                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isProcessing || !stripe}
                    className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        Processing...
                      </>
                    ) : (
                      <>
                        <LockClosedIcon className="h-5 w-5 mr-2" />
                        Complete Purchase (${total.toFixed(2)})
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 sticky top-8">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Order Summary</h2>
                <p className="text-sm text-gray-500 mt-1">{cartItems.length} items</p>
              </div>
              
              <div className="p-6">
                {/* Items */}
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center space-x-4">
                      <img 
                        src={item.image || '/api/placeholder/80/60'}
                        alt={item.title}
                        className="w-16 h-12 object-cover rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{item.title}</h3>
                        <p className="text-xs text-gray-500">by {item.seller || 'Unknown Seller'}</p>
                        <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Processing Fee</span>
                    <span className="text-gray-900">Free</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200">
                    <span className="text-gray-900">Total</span>
                    <span className="text-gray-900">${total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Security Features */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <ShieldCheckIcon className="h-5 w-5 text-green-500 mr-2" />
                      SSL Encrypted Checkout
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                      Instant Download Access
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                      30-Day Money Back Guarantee
                    </div>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500 text-center mb-3">Secured by:</p>
                  <div className="flex justify-center space-x-4 opacity-60">
                    <div className="text-sm font-bold">STRIPE</div>
                    <div className="text-sm font-bold">SSL</div>
                    <div className="text-sm font-bold">PCI-DSS</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-lg p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                Our support team is available 24/7 to assist you with your purchase.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <EnvelopeIcon className="h-4 w-4 mr-2" />
                  support@nozama.ai
                </div>
                <div className="flex items-center text-gray-600">
                  <PhoneIcon className="h-4 w-4 mr-2" />
                  1-800-NOZAMA-1
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main component wrapped with Stripe Elements
const Checkout = () => {
  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm />
    </Elements>
  );
};

export default Checkout;