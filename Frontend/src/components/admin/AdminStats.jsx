//AdminStats.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCardIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CogIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  BuildingLibraryIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../../services/Api';
import { useNotification } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';

const AITokenAdminDashboard = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useNotification();
  const { user, isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [setupValidation, setSetupValidation] = useState(null);
  
  // State for different sections
  const [dashboardData, setDashboardData] = useState(null);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [aiTokenSettings, setAiTokenSettings] = useState(null);
  const [transfers, setTransfers] = useState([]);
  const [stripeAccountStatus, setStripeAccountStatus] = useState(null);
  
  // Form states
  const [showAddBank, setShowAddBank] = useState(false);
  const [showStripeSetup, setShowStripeSetup] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [newBankAccount, setNewBankAccount] = useState({
    account_name: '',
    account_number: '',
    routing_number: '',
    bank_name: '',
    account_type: 'checking',
    is_primary: true
  });
  
  const [stripeSetupData, setStripeSetupData] = useState({
    email: user?.email || '',
    company_name: 'Nozama AI',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: ''
  });
  
const [settingsForm, setSettingsForm] = useState({
    ai_token_pool_percentage: 10,
    ai_token_pool_address: '',
    auto_convert_enabled: true,
    exchange_provider: 'coinbase',
    min_transfer_amount: 10,
    transfer_frequency: 'immediate',
    notification_email: user?.email || ''
  });

  // Check authentication and admin access
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (!user || (user.role !== 'admin' && !isAdmin())) {
      showError('Access Denied', 'You do not have permission to access this page');
      navigate('/dashboard');
      return;
    }

    loadData();
  }, [authLoading, isAuthenticated, user, navigate, showError, isAdmin]);

  // FIXED loadData function for AITokenAdminDashboard.jsx
// Replace the loadData function with this version:

// IN YOUR AdminStats.jsx file, REPLACE this function:

const loadData = async () => {
  setLoading(true);
  try {
    console.log('🔄 Loading AI Token dashboard data...');
    
    // Use Promise.allSettled for better error handling
    const [
      dashboardRes,
      banksRes,
      settingsRes,
      transfersRes,
      stripeStatusRes,
      validationRes
    ] = await Promise.allSettled([
      apiService.get('/ai-token-payments/admin/dashboard-no-auth?days=30'),
      apiService.get('/ai-token-payments/admin/bank-accounts-no-auth'),
      apiService.get('/ai-token-payments/admin/ai-token-settings-no-auth'),
      apiService.get('/ai-token-payments/admin/transfer-history-no-auth?limit=20'),
      apiService.get('/ai-token-payments/admin/stripe-account-status-no-auth'),
      apiService.post('/ai-token-payments/admin/validate-setup-no-auth', {})
    ]);

    // SAFE DATA EXTRACTION with fallbacks
    console.log('📊 Dashboard response:', dashboardRes);
    console.log('🏦 Banks response:', banksRes);
    console.log('⚙️ Settings response:', settingsRes);
    console.log('📈 Transfers response:', transfersRes);
    console.log('💳 Stripe status response:', stripeStatusRes);
    console.log('✅ Validation response:', validationRes);

    // Handle dashboard data safely
    const dashboardData = dashboardRes.status === 'fulfilled' ? 
      (dashboardRes.value?.data || dashboardRes.value || {}) : {};
    setDashboardData(dashboardData);
    
    // Handle bank accounts - API returns array directly
    const bankAccountsData = banksRes.status === 'fulfilled' ? 
      (Array.isArray(banksRes.value) ? banksRes.value : 
       Array.isArray(banksRes.value?.data) ? banksRes.value.data : []) : [];
    setBankAccounts(bankAccountsData);
    
    // Handle settings safely
    const settingsData = settingsRes.status === 'fulfilled' ? 
      (settingsRes.value?.data || settingsRes.value || {}) : {};
    setAiTokenSettings(settingsData);
    
    // Handle transfers - API returns array directly
    const transfersData = transfersRes.status === 'fulfilled' ? 
      (Array.isArray(transfersRes.value) ? transfersRes.value : 
       Array.isArray(transfersRes.value?.data) ? transfersRes.value.data : []) : [];
    setTransfers(transfersData);
    
    // Handle stripe status safely
    const stripeData = stripeStatusRes.status === 'fulfilled' ? 
      (stripeStatusRes.value?.data || stripeStatusRes.value || {}) : {};
    setStripeAccountStatus(stripeData);
    
    // Handle validation safely
    const validationData = validationRes.status === 'fulfilled' ? 
      (validationRes.value?.data || validationRes.value || {}) : {};
    setSetupValidation(validationData);
    
    // Update settings form safely
    if (settingsData && Object.keys(settingsData).length > 0) {
      setSettingsForm(prevForm => ({
        ...prevForm,
        ...settingsData
      }));
    }
    
    console.log('✅ All data loaded successfully');
    
  } catch (error) {
    console.error('❌ Error loading data:', error);
    showError('Error', `Failed to load dashboard data: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const handleStripeAccountSetup = async () => {
    try {
      const response = await apiService.post('/ai-token-payments/admin/setup-stripe-account', stripeSetupData);
      
      if (response.data.onboarding_url) {
        // Redirect to Stripe onboarding
        window.location.href = response.data.onboarding_url;
      }
    } catch (error) {
      showError('Setup Error', error.response?.data?.detail || 'Failed to setup Stripe account');
    }
  };

  const handleAddBankAccount = async () => {
    try {
      const response = await apiService.post('/ai-token-payments/admin/bank-accounts', newBankAccount);
      
      setBankAccounts([...bankAccounts, response.data]);
      setShowAddBank(false);
      resetBankForm();
      
      showSuccess('Success', 'Bank account added successfully and connected to Stripe');
      
      // Reload data to update verification status
      loadData();
      
    } catch (error) {
      showError('Error', error.response?.data?.detail || 'Failed to add bank account');
    }
  };

  const handleUpdateBankAccount = async (accountId, updates) => {
    try {
      const response = await apiService.put(`/ai-token-payments/admin/bank-accounts/${accountId}`, updates);
      setBankAccounts(bankAccounts.map(acc => 
        acc.id === accountId ? response.data : acc
      ));
      setEditingBank(null);
      showSuccess('Success', 'Bank account updated successfully');
    } catch (error) {
      showError('Error', 'Failed to update bank account');
    }
  };

  const handleDeleteBankAccount = async (accountId) => {
    if (!window.confirm('Are you sure you want to delete this bank account? This will also remove it from Stripe.')) return;
    
    try {
      await apiService.delete(`/ai-token-payments/admin/bank-accounts/${accountId}`);
      setBankAccounts(bankAccounts.filter(acc => acc.id !== accountId));
      showSuccess('Success', 'Bank account deleted successfully');
    } catch (error) {
      showError('Error', error.response?.data?.detail || 'Failed to delete bank account');
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await apiService.put('/ai-token-payments/admin/ai-token-settings', settingsForm);
      setAiTokenSettings(response.data);
      showSuccess('Success', 'AI Token Pool settings updated successfully');
      
      // Reload validation
      const validationRes = await apiService.post('/ai-token-payments/admin/validate-setup');
      setSetupValidation(validationRes.data);
    } catch (error) {
      showError('Error', 'Failed to update settings');
    }
  };

  const handleManualTransfer = async (paymentId) => {
    if (!window.confirm('Are you sure you want to trigger a manual AI token pool transfer?')) return;
    
    try {
      await apiService.post('/ai-token-payments/admin/trigger-manual-transfer', { payment_id: paymentId });
      showSuccess('Success', 'AI token pool transfer initiated successfully');
      loadData();
    } catch (error) {
      showError('Error', 'Failed to trigger transfer');
    }
  };

  const resetBankForm = () => {
    setNewBankAccount({
      account_name: '',
      account_number: '',
      routing_number: '',
      bank_name: '',
      account_type: 'checking',
      is_primary: true
    });
  };

  const tabs = [
    { id: 'overview', name: 'Revenue Overview', icon: ChartBarIcon },
    { id: 'setup', name: 'Setup & Configuration', icon: CogIcon },
    { id: 'bank-accounts', name: 'Bank Accounts', icon: BuildingLibraryIcon },
    { id: 'ai-settings', name: 'AI Token Pool', icon: BanknotesIcon },
    { id: 'transfers', name: 'Transfer History', icon: ArrowTrendingUpIcon }
  ];

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <ArrowPathIcon className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading AI Token Pool dashboard...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Token Pool Management</h1>
          <p className="text-gray-600 mt-2">
            Route ecommerce revenue to your AI token ecosystem via USDC blockchain transfers
          </p>
          
          {/* Setup Status Alert */}
          {setupValidation && !setupValidation.setup_complete && (
  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
    <div className="flex">
      <ExclamationTriangleIcon className="h-5 w-5 text-amber-400 mt-0.5 mr-3" />
      <div>
        <h3 className="text-sm font-medium text-amber-800">Setup Required</h3>
        <div className="mt-2 text-sm text-amber-700">
          {setupValidation.issues && setupValidation.issues.length > 0 && (
            <div>
              <p className="font-medium">Issues to resolve:</p>
              <ul className="list-disc list-inside mt-1">
                {setupValidation.issues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {setupValidation.warnings && setupValidation.warnings.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Warnings:</p>
              <ul className="list-disc list-inside mt-1">
                {setupValidation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
)}

          {/* Success Status */}
          {setupValidation && setupValidation.setup_complete && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex">
                <CheckIcon className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">✅ AI Token Pool Ready</h3>
                  <p className="mt-1 text-sm text-green-700">
                    Your system is configured and ready to automatically route revenue to your AI token pool!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-2 px-1 border-b-2 font-medium text-sm flex items-center
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Revenue Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Revenue (30d)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ${dashboardData.total_revenue?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <CurrencyDollarIcon className="h-12 w-12 text-green-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Payments</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{dashboardData.total_payments || 0}</p>
                  </div>
                  <CreditCardIcon className="h-12 w-12 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Sent to AI Pool (USD)</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      ${dashboardData.total_usd_sent_to_pool?.toFixed(2) || '0.00'}
                    </p>
                  </div>
                  <BanknotesIcon className="h-12 w-12 text-purple-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Pool Percentage</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {aiTokenSettings?.ai_token_pool_percentage || 10}%
                    </p>
                  </div>
                  <ArrowTrendingUpIcon className="h-12 w-12 text-orange-500" />
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent Payments</h3>
                </div>
                <div className="p-6">
                  {dashboardData.recent_payments && dashboardData.recent_payments.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.recent_payments.map((payment) => (
                        <div key={payment.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">${payment.amount.toFixed(2)}</p>
                            <p className="text-xs text-gray-500">{payment.customer_email}</p>
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              payment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {payment.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(payment.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent payments</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Recent AI Pool Transfers</h3>
                </div>
                <div className="p-6">
                  {dashboardData.recent_transfers && dashboardData.recent_transfers.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.recent_transfers.map((transfer) => (
                        <div key={transfer.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              ${transfer.amount_usd.toFixed(2)} → {transfer.amount_usdc.toFixed(4)} USDC
                            </p>
                            {transfer.tx_hash && (
                              <a 
                                href={`https://etherscan.io/tx/${transfer.tx_hash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                              >
                                <LinkIcon className="h-3 w-3 mr-1" />
                                View on Etherscan
                              </a>
                            )}
                          </div>
                          <div className="text-right">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              transfer.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {transfer.status}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(transfer.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-4">No recent transfers</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Setup & Configuration Tab */}
        {activeTab === 'setup' && (
          <div className="space-y-6">
            {/* Stripe Account Setup */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Stripe Connected Account</h2>
              
              {stripeAccountStatus && stripeAccountStatus.status === 'not_setup' ? (
                <div>
                  <p className="text-gray-600 mb-4">
                    Set up your Stripe connected account to accept customer payments and route revenue to your AI token pool.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={stripeSetupData.email}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                      <input
                        type="text"
                        value={stripeSetupData.company_name}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, company_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={stripeSetupData.phone}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                      <input
                        type="text"
                        value={stripeSetupData.address}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, address: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input
                        type="text"
                        value={stripeSetupData.city}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, city: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input
                        type="text"
                        value={stripeSetupData.state}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, state: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                      <input
                        type="text"
                        value={stripeSetupData.zip_code}
                        onChange={(e) => setStripeSetupData({...stripeSetupData, zip_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  
                  <button
                    onClick={handleStripeAccountSetup}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                  >
                    Set up Stripe Account
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Stripe Account Status</h3>
                    <p className="text-sm text-gray-600">Account ID: {stripeAccountStatus?.stripe_account_id}</p>
                  </div>
                  <div>
                    <span className={`px-3 py-1 text-sm rounded-full ${
                      stripeAccountStatus?.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {stripeAccountStatus?.status === 'active' ? '✅ Active' : '⏳ Setup Required'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* System Flow Diagram */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">How It Works</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-center">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <CreditCardIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">Customer Payment</h3>
                  <p className="text-xs text-gray-600">Visa, Mastercard, Amex via Stripe</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <BuildingLibraryIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">Bank Account</h3>
                  <p className="text-xs text-gray-600">Funds deposited to your bank</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowTrendingUpIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <BanknotesIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <h3 className="font-medium text-gray-900">AI Token Pool</h3>
                  <p className="text-xs text-gray-600">{aiTokenSettings?.ai_token_pool_percentage || 10}% → USDC → Blockchain</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bank Accounts Tab - Same as before but updated for Stripe integration */}
        {activeTab === 'bank-accounts' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Connected Bank Accounts</h2>
              <button
                onClick={() => setShowAddBank(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                disabled={!stripeAccountStatus || stripeAccountStatus.status !== 'active'}
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                Add Bank Account
              </button>
            </div>

            {!stripeAccountStatus || stripeAccountStatus.status !== 'active' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <ExclamationTriangleIcon className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-yellow-800 mb-2">Stripe Account Required</h3>
                <p className="text-yellow-700 mb-4">
                  Please complete your Stripe account setup before adding bank accounts.
                </p>
                <button
                  onClick={() => setActiveTab('setup')}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  Go to Setup
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{account.account_name}</h3>
                        <p className="text-sm text-gray-600">{account.bank_name}</p>
                        <p className="text-sm text-gray-600">****{account.account_number_last4}</p>
                        
                        <div className="mt-2 flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            account.is_primary 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {account.is_primary ? 'Primary' : 'Secondary'}
                          </span>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            account.is_verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {account.is_verified ? 'Verified by Stripe' : 'Pending Verification'}
                          </span>
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
                            {account.account_type}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingBank(account.id)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteBankAccount(account.id)}
                          className="p-2 text-red-400 hover:text-red-600"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {editingBank === account.id && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Account Name
                            </label>
                            <input
                              type="text"
                              value={account.account_name}
                              onChange={(e) => handleUpdateBankAccount(account.id, { account_name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Set as Primary
                            </label>
                            <button
                              onClick={() => handleUpdateBankAccount(account.id, { is_primary: !account.is_primary })}
                              className={`px-4 py-2 rounded-lg ${
                                account.is_primary 
                                  ? 'bg-blue-600 text-white' 
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {account.is_primary ? 'Primary Account' : 'Make Primary'}
                            </button>
                          </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => setEditingBank(null)}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add Bank Account Modal */}
            {showAddBank && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Bank Account to Stripe</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        value={newBankAccount.account_name}
                        onChange={(e) => setNewBankAccount({...newBankAccount, account_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Business Checking"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Routing Number * <span className="text-xs text-gray-500">(9 digits)</span>
                      </label>
                      <input
                        type="text"
                        value={newBankAccount.routing_number}
                        onChange={(e) => setNewBankAccount({...newBankAccount, routing_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="021000021"
                        maxLength="9"
                      />
                      <p className="text-xs text-gray-500 mt-1">We validate against real US bank routing numbers</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Number * <span className="text-xs text-gray-500">(4-17 digits)</span>
                      </label>
                      <input
                        type="text"
                        value={newBankAccount.account_number}
                        onChange={(e) => setNewBankAccount({...newBankAccount, account_number: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="1234567890"
                        maxLength="17"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Bank Name (auto-detected)
                      </label>
                      <input
                        type="text"
                        value={newBankAccount.bank_name}
                        onChange={(e) => setNewBankAccount({...newBankAccount, bank_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Will be auto-detected from routing number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Account Type *
                      </label>
                      <select
                        value={newBankAccount.account_type}
                        onChange={(e) => setNewBankAccount({...newBankAccount, account_type: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newBankAccount.is_primary}
                        onChange={(e) => setNewBankAccount({...newBankAccount, is_primary: e.target.checked})}
                        className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Set as primary account</span>
                    </label>

                    {/* Security Notice */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex">
                        <ShieldCheckIcon className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" />
                        <div className="text-xs text-blue-800">
                          <p className="font-medium">Stripe Security:</p>
                          <p>• Bank information is encrypted and stored securely by Stripe</p>
                          <p>• Account will be verified automatically by Stripe</p>
                          <p>• Only real bank accounts with valid routing numbers are accepted</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setShowAddBank(false);
                        resetBankForm();
                      }}
                      className="px-4 py-2 text-gray-700 hover:text-gray-900"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddBankAccount}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Add to Stripe
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* AI Token Pool Settings Tab */}
        {activeTab === 'ai-settings' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">AI Token Pool Configuration</h2>
            
            <div className="space-y-6">
              {/* Pool Percentage */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Revenue Percentage to AI Token Pool
                </label>
                <div className="flex items-center gap-4">
                  <select
                    value={settingsForm.ai_token_pool_percentage}
                    onChange={(e) => setSettingsForm({...settingsForm, ai_token_pool_percentage: parseFloat(e.target.value)})}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="5">5%</option>
                    <option value="10">10%</option>
                    <option value="15">15%</option>
                    <option value="20">20%</option>
                    <option value="25">25%</option>
                    <option value="30">30%</option>
                  </select>
                  <p className="text-sm text-gray-600">
                    {settingsForm.ai_token_pool_percentage}% of each payment will be converted to USDC and sent to your AI token pool
                  </p>
                </div>
              </div>

              {/* Pool Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Token Pool Contract Address
                </label>
                <input
                  type="text"
                  value={settingsForm.ai_token_pool_address}
                  onChange={(e) => setSettingsForm({...settingsForm, ai_token_pool_address: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0x742d35Cc4D23B2C7C5A7..."
                />
                <p className="text-xs text-gray-500 mt-1">Ethereum address where USDC will be sent</p>
              </div>

              {/* Auto Convert */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settingsForm.auto_convert_enabled}
                    onChange={(e) => setSettingsForm({...settingsForm, auto_convert_enabled: e.target.checked})}
                    className="mr-3 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Enable Automatic USD to USDC Conversion</span>
                    <p className="text-xs text-gray-500">Automatically convert USD to USDC via exchange API</p>
                  </div>
                </label>
              </div>

              {/* Exchange Provider */}
              {settingsForm.auto_convert_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exchange Provider
                  </label>
                  <select
                    value={settingsForm.exchange_provider}
                    onChange={(e) => setSettingsForm({...settingsForm, exchange_provider: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="coinbase">Coinbase</option>
                    <option value="binance">Binance</option>
                  </select>
                </div>
              )}

              {/* Transfer Settings */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Transfer Amount (USD)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.min_transfer_amount}
                    onChange={(e) => setSettingsForm({...settingsForm, min_transfer_amount: parseFloat(e.target.value)})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    step="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">Transfers below this amount will be batched</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Frequency
                  </label>
                  <select
                    value={settingsForm.transfer_frequency}
                    onChange={(e) => setSettingsForm({...settingsForm, transfer_frequency: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
              </div>

              {/* Notification Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={settingsForm.notification_email}
                  onChange={(e) => setSettingsForm({...settingsForm, notification_email: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="admin@nozama.ai"
                />
                <p className="text-xs text-gray-500 mt-1">Receive notifications about transfers and errors</p>
              </div>

              {/* Save Button */}
              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleUpdateSettings}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
                >
                  Save AI Token Pool Settings
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer History Tab */}
        {activeTab === 'transfers' && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">AI Token Pool Transfer History</h2>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transfer ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount (USD → USDC)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Blockchain TX
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {transfers && transfers.length > 0 ? transfers.map((transfer) => (
                    <tr key={transfer.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transfer.id ? transfer.id.slice(0, 8) : 'N/A'}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${transfer.amount_usd?.toFixed(2) || '0.00'} → {transfer.amount_usdc?.toFixed(4) || '0.0000'} USDC
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          transfer.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : transfer.status === 'processing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : transfer.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transfer.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.tx_hash ? (
                          <a 
                            href={`https://etherscan.io/tx/${transfer.tx_hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center"
                          >
                            <LinkIcon className="h-4 w-4 mr-1" />
                            {transfer.tx_hash ? transfer.tx_hash.slice(0, 10) : 'N/A'}...
                          </a>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transfer.payment_info?.customer_email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(transfer.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {transfer.status === 'failed' && transfer.payment_id && (
                          <button
                            onClick={() => handleManualTransfer(transfer.payment_id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            Retry Transfer
                          </button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No transfers found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Transfer Summary */}
            {dashboardData && (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-green-800">Total USD Sent</h3>
                  <p className="text-2xl font-bold text-green-900">
                    ${dashboardData.total_usd_sent_to_pool?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-purple-800">Total USDC Transferred</h3>
                  <p className="text-2xl font-bold text-purple-900">
                    {dashboardData.total_usdc_sent_to_pool?.toFixed(4) || '0.0000'} USDC
                  </p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-800">Total Transfers</h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {dashboardData.total_transfers || 0}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AITokenAdminDashboard;