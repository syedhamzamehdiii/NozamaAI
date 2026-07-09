import React, { useState, useEffect } from 'react';
import { AlertCircle, DollarSign, Clock, CreditCard, X, CheckCircle } from 'lucide-react';

const SellerPaymentNotification = ({ onClose }) => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    // Check if user has seen this notification before
    const hasSeenNotification = localStorage.getItem('seller_payment_notification_seen');
    if (!hasSeenNotification) {
      setShowPopup(true);
    }
  }, []);

  const handleClose = () => {
    setShowPopup(false);
    // Mark as seen so it doesn't show again for this user
    localStorage.setItem('seller_payment_notification_seen', 'true');
    if (onClose) onClose();
  };

  const handleRemindLater = () => {
    setShowPopup(false);
    // Set a timestamp to show again after 7 days
    const remindDate = new Date();
    remindDate.setDate(remindDate.getDate() + 7);
    localStorage.setItem('seller_payment_remind_date', remindDate.toISOString());
    if (onClose) onClose();
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Important Payment Information</h2>
                <p className="text-blue-100 text-sm">Please read carefully - Required for all sellers</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-white hover:text-gray-200 transition-colors p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Welcome Message */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-blue-900 font-semibold">Welcome to Nozama.ai Seller Dashboard!</h3>
                <p className="text-blue-800 text-sm mt-1">
                  Thank you for joining our AI marketplace. Here's everything you need to know about payments and earnings.
                </p>
              </div>
            </div>
          </div>

          {/* Payment Schedule */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-green-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-white">Payment Schedule</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <div>
                  <p className="text-gray-200 font-medium">Customer Purchase</p>
                  <p className="text-gray-400 text-sm">When someone buys your product, payment is processed instantly</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-yellow-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <div>
                  <p className="text-gray-200 font-medium">15-Day Hold Period</p>
                  <p className="text-gray-400 text-sm">Your earnings are held for 15 days to ensure product quality and handle any issues</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <div>
                  <p className="text-gray-200 font-medium">Payment Released</p>
                  <p className="text-gray-400 text-sm">After 15 days, your earnings are transferred to your bank account</p>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Fee */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-yellow-900">Platform Fee Structure</h3>
            </div>
            <div className="space-y-3">
              <div className="bg-white border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-900 font-medium">Platform Commission</span>
                  <span className="text-xl font-bold text-yellow-600">10%</span>
                </div>
                <p className="text-yellow-800 text-sm">
                  We deduct 10% from each sale to cover platform maintenance, payment processing, hosting, and customer support.
                </p>
              </div>
              <div className="bg-green-100 border border-green-200 rounded-lg p-4">
                <h4 className="text-green-900 font-medium mb-2">What You Get:</h4>
                <ul className="text-green-800 text-sm space-y-1">
                  <li>• Global marketplace exposure</li>
                  <li>• Secure payment processing</li>
                  <li>• Customer support handling</li>
                  <li>• Marketing and promotion</li>
                  <li>• Analytics and reporting tools</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Example Calculation */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Example</h3>
            <div className="bg-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-gray-400 text-sm">Product Price</p>
                  <p className="text-2xl font-bold text-green-400">$100</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Platform Fee (10%)</p>
                  <p className="text-2xl font-bold text-red-400">-$10</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Your Earnings</p>
                  <p className="text-2xl font-bold text-blue-400">$90</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bank Details Reminder */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start space-x-3">
              <div className="bg-red-100 p-2 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Action Required: Add Bank Details</h3>
                <p className="text-red-800 mb-3">
                  To receive your earnings, you must add your bank account details in your account settings.
                </p>
                <div className="space-y-2">
                  <p className="text-red-700 text-sm font-medium">Required Information:</p>
                  <ul className="text-red-700 text-sm space-y-1 ml-4">
                    <li>• Bank Account Number</li>
                    <li>• Bank Routing Number</li>
                    <li>• Account Holder Name</li>
                    <li>• Bank Address</li>
                  </ul>
                </div>
                <button className="mt-3 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-medium">
                  Go to Account Settings
                </button>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-white mb-4">Important Notes</h3>
            <div className="space-y-3 text-gray-300 text-sm">
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>Payments are processed on business days only (Monday-Friday)</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>International transfers may take 3-5 additional business days</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>You'll receive email notifications for all transactions and payouts</p>
              </div>
              <div className="flex items-start space-x-2">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 flex-shrink-0"></span>
                <p>Refunds (if any) will be deducted from your next payout</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-gray-800 border-t border-gray-700 p-6 rounded-b-xl">
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <button
              onClick={handleRemindLater}
              className="px-6 py-2 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Remind Me Later
            </button>
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              I Understand
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-3 text-center">
            This message will not be shown again once dismissed. You can always find this information in our Seller FAQ.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SellerPaymentNotification;