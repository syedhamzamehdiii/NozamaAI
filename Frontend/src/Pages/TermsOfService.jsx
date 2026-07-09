import React, { useState, useEffect } from 'react';
import { ChevronUp, Mail, Phone, MapPin, Calendar, FileText, ShoppingCart, Users, Shield, Gavel, AlertTriangle, Globe, CreditCard, Zap } from 'lucide-react';

const TermsOfService = () => {
  const [activeSection, setActiveSection] = useState('');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 300);
      
      // Update active section based on scroll position
      const sections = document.querySelectorAll('[data-section]');
      let current = '';
      
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= 100 && rect.bottom >= 100) {
          current = section.getAttribute('data-section');
        }
      });
      
      if (current !== activeSection) {
        setActiveSection(current);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeSection]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const tableOfContents = [
    { id: 'acceptance', title: 'Acceptance of Terms', icon: <FileText className="w-4 h-4" /> },
    { id: 'service-description', title: 'Service Description', icon: <Zap className="w-4 h-4" /> },
    { id: 'user-accounts', title: 'User Accounts', icon: <Users className="w-4 h-4" /> },
    { id: 'marketplace-rules', title: 'Marketplace Rules', icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'payment-terms', title: 'Payment Terms', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'intellectual-property', title: 'Intellectual Property', icon: <Shield className="w-4 h-4" /> },
    { id: 'prohibited-uses', title: 'Prohibited Uses', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'dispute-resolution', title: 'Dispute Resolution', icon: <Gavel className="w-4 h-4" /> },
    { id: 'contact', title: 'Contact Information', icon: <Mail className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Gavel className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Terms and Conditions</h1>
              <p className="text-gray-600 mt-1">Effective Date: August 8, 2025 | Last Updated: August 8, 2025</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Table of Contents - Sticky Sidebar */}
          <div className="hidden lg:block w-80 flex-shrink-0">
            <div className="sticky top-8">
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h2>
                <nav className="space-y-2">
                  {tableOfContents.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === item.id
                          ? 'bg-purple-50 text-purple-700 border-l-4 border-purple-500'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      <span className="text-sm font-medium">{item.title}</span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 max-w-4xl">
            <div className="bg-white rounded-xl shadow-sm border">
              <div className="p-8">
                
                {/* Acceptance of Terms */}
                <section id="acceptance" data-section="acceptance" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Acceptance of Terms</h2>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      Welcome to <strong>Nozama.ai</strong> ("we," "our," or "us"). These Terms and Conditions ("Terms") govern your use of the Nozama.ai website and marketplace platform (the "Service") operated by PGE - Pangea Global Enterprises.
                    </p>
                    <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
                      <p className="text-purple-800 font-medium">
                        By accessing or using our Service, you agree to be bound by these Terms. If you disagree with any part of these terms, then you may not access the Service.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Service Description */}
                <section id="service-description" data-section="service-description" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Description of Service</h2>
                  </div>
                  
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
                    <p className="text-gray-700 mb-6">Nozama.ai is an AI tools and data marketplace where users can:</p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <ShoppingCart className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">Browse & Purchase</span>
                        </div>
                        <p className="text-gray-600 text-sm">AI tools, scripts, datasets, and ML modules</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">Sell Products</span>
                        </div>
                        <p className="text-gray-600 text-sm">AI-related products and services</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">AI-Powered Features</span>
                        </div>
                        <p className="text-gray-600 text-sm">Search and recommendations</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border border-blue-200">
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span className="font-medium text-gray-900">Community</span>
                        </div>
                        <p className="text-gray-600 text-sm">Track orders and participate in forums</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* User Accounts */}
                <section id="user-accounts" data-section="user-accounts" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">User Accounts</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-green-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-green-900 mb-4">Account Creation</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-green-800">You must create an account to access certain features</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-green-800">You must provide accurate, current, and complete information</span>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-green-800">You are responsible for maintaining the security of your account</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-green-800">You must be <strong>at least 18 years old</strong> to create an account</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
                      <h3 className="text-lg font-semibold text-yellow-900 mb-3">Account Responsibilities</h3>
                      <ul className="space-y-2 text-yellow-800">
                        <li>• You are responsible for all activities under your account</li>
                        <li>• You must notify us immediately of any unauthorized use</li>
                        <li>• We reserve the right to suspend or terminate accounts that violate these Terms</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Marketplace Rules */}
                <section id="marketplace-rules" data-section="marketplace-rules" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <ShoppingCart className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Marketplace Rules</h2>
                  </div>
                  
                  <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <span className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 text-sm font-bold">B</span>
                        </span>
                        <span>For Buyers</span>
                      </h3>
                      <div className="space-y-3">
                        <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                          <p className="text-blue-800 font-medium">All purchases are final unless otherwise specified</p>
                        </div>
                        <ul className="space-y-2 text-gray-700 text-sm">
                          <li>• Digital products are delivered instantly upon successful payment</li>
                          <li>• You may not resell, redistribute, or share purchased products without permission</li>
                          <li>• <strong>Refunds available within 30 days</strong> if products don't meet described specifications</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                        <span className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-green-600 text-sm font-bold">S</span>
                        </span>
                        <span>For Sellers</span>
                      </h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• Products must be original or properly licensed</li>
                        <li>• Product descriptions must be accurate and complete</li>
                        <li>• No malicious code, viruses, or harmful content</li>
                        <li>• Compliance with all applicable laws and regulations</li>
                        <li>• We reserve the right to remove products that violate these Terms</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Content Standards</h3>
                    <p className="text-red-800 mb-3">All content must:</p>
                    <div className="grid md:grid-cols-2 gap-3">
                      <ul className="space-y-1 text-red-700 text-sm">
                        <li>• Be lawful and not infringe on third-party rights</li>
                        <li>• Not contain malware, viruses, or harmful code</li>
                      </ul>
                      <ul className="space-y-1 text-red-700 text-sm">
                        <li>• Not promote illegal activities or discrimination</li>
                        <li>• Comply with export control laws and regulations</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Payment Terms */}
                <section id="payment-terms" data-section="payment-terms" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <CreditCard className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Payment Terms</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-indigo-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-indigo-900 mb-4">Pricing and Payment</h3>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium text-indigo-900 mb-2">Accepted Currencies & Methods</h4>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                              <span className="text-indigo-800 text-sm">All prices displayed in USD</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                              <span className="text-indigo-800 text-sm">Payments processed through Stripe</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="w-2 h-2 bg-indigo-600 rounded-full"></span>
                              <span className="text-indigo-800 text-sm">Major credit cards, PayPal, Apple Pay, Google Pay</span>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-medium text-indigo-900 mb-2">Pricing Policy</h4>
                          <p className="text-indigo-800 text-sm">Prices may change without notice, but won't affect pending orders</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Taxes</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                          <li>• Prices may not include applicable taxes</li>
                          <li>• You are responsible for applicable sales tax, VAT, or other taxes</li>
                          <li>• Tax calculations based on billing address and local regulations</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Refunds</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                          <li>• Refunds available within <strong>30 days</strong> of purchase</li>
                          <li>• Must demonstrate product defects or misrepresentation</li>
                          <li>• Processing time: 5-10 business days</li>
                          <li>• Refunds issued to original payment method</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Intellectual Property */}
                <section id="intellectual-property" data-section="intellectual-property" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Intellectual Property</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-teal-900 mb-4">Platform Content</h3>
                      <ul className="space-y-2 text-teal-800 text-sm">
                        <li>• Nozama.ai platform, design, and features are our property</li>
                        <li>• Protected by copyright, trademark, and other laws</li>
                        <li>• You may not copy, modify, or distribute our content without permission</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">User Content</h3>
                      <ul className="space-y-2 text-blue-800 text-sm">
                        <li>• You retain ownership of content you upload</li>
                        <li>• You grant us license to use, display, and distribute your content</li>
                        <li>• You represent that you own or have rights to all content you provide</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">Third-Party Content</h3>
                      <ul className="space-y-2 text-purple-800 text-sm">
                        <li>• Products sold by third parties remain their property</li>
                        <li>• License terms specified by individual sellers apply</li>
                        <li>• We don't claim ownership of third-party products</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Privacy and Data Protection */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Privacy and Data Protection</h2>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Data Collection</h3>
                        <ul className="space-y-2 text-blue-800 text-sm">
                          <li>• We collect information as described in our Privacy Policy</li>
                          <li>• Essential for providing services and processing transactions</li>
                          <li>• Used for analytics, recommendations, and service improvement</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Data Security</h3>
                        <ul className="space-y-2 text-blue-800 text-sm">
                          <li>• We implement industry-standard security measures</li>
                          <li>• No guarantee of absolute security</li>
                          <li>• Notify users of data breaches as required by law</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* AI and Machine Learning */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">AI and Machine Learning</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-purple-900 mb-4">AI Features</h3>
                      <ul className="space-y-2 text-purple-800 text-sm">
                        <li>• AI-powered search and recommendations provided "as is"</li>
                        <li>• No guarantee of accuracy or completeness</li>
                        <li>• Continuously improved based on user data and feedback</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Data Usage</h3>
                      <ul className="space-y-2 text-green-800 text-sm">
                        <li>• Purchase history and behavior used to improve recommendations</li>
                        <li>• Aggregated, anonymized data used for analytics</li>
                        <li>• Option to opt-out of certain data collection</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Prohibited Uses */}
                <section id="prohibited-uses" data-section="prohibited-uses" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Prohibited Uses</h2>
                  </div>
                  
                  <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">You may not use our Service to:</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2 text-red-800 text-sm">
                        <li>• Violate any laws or regulations</li>
                        <li>• Infringe on intellectual property rights</li>
                        <li>• Upload malicious code or harmful content</li>
                        <li>• Engage in fraudulent or deceptive practices</li>
                      </ul>
                      <ul className="space-y-2 text-red-800 text-sm">
                        <li>• Harass, abuse, or harm other users</li>
                        <li>• Circumvent security measures</li>
                        <li>• Use automated systems to access the platform without permission</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Termination */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Termination</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">By You</h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• You may terminate your account at any time</li>
                        <li>• Contact customer support for account deletion</li>
                        <li>• Purchased products remain accessible for 90 days after termination</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">By Us</h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• We may suspend or terminate accounts for Terms violations</li>
                        <li>• We may discontinue the Service with 30 days notice</li>
                        <li>• No refund obligation upon termination for cause</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Disclaimers and Limitations */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Disclaimers and Limitations</h2>
                  <div className="space-y-6">
                    <div className="bg-yellow-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-yellow-900 mb-4">Service "As Is"</h3>
                      <ul className="space-y-2 text-yellow-800">
                        <li>• Service provided "as is" without warranties</li>
                        <li>• No guarantee of uninterrupted or error-free operation</li>
                        <li>• Third-party products sold without our warranty</li>
                      </ul>
                    </div>

                    <div className="bg-orange-50 border-l-4 border-orange-500 p-6 rounded-r-lg">
                      <h3 className="text-lg font-semibold text-orange-900 mb-4">Limitation of Liability</h3>
                      <ul className="space-y-2 text-orange-800 text-sm">
                        <li>• Our liability limited to the maximum extent permitted by law</li>
                        <li>• Not liable for indirect, incidental, or consequential damages</li>
                        <li>• Total liability not to exceed amount paid for the specific transaction</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Indemnification */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Indemnification</h2>
                  <div className="bg-gray-100 rounded-lg p-6">
                    <p className="text-gray-800 mb-4">
                      You agree to indemnify and hold harmless Nozama.ai, its affiliates, officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• Your use of the Service</li>
                        <li>• Your violation of these Terms</li>
                      </ul>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• Your infringement of third-party rights</li>
                        <li>• Content you submit or transmit</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Dispute Resolution */}
                <section id="dispute-resolution" data-section="dispute-resolution" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Gavel className="w-5 h-5 text-amber-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Dispute Resolution</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-amber-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-amber-900 mb-4">Governing Law</h3>
                      <ul className="space-y-2 text-amber-800">
                        <li>• These Terms governed by laws of the State of California, USA</li>
                        <li>• Disputes resolved in courts of California</li>
                        <li>• Federal courts have jurisdiction over intellectual property claims</li>
                      </ul>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Arbitration</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                          <li>• Disputes resolved through binding arbitration (except small claims)</li>
                          <li>• American Arbitration Association rules apply</li>
                          <li>• One arbitrator, location in California or remote</li>
                        </ul>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Class Action Waiver</h3>
                        <ul className="space-y-2 text-gray-700 text-sm">
                          <li>• You waive the right to participate in class action lawsuits</li>
                          <li>• Disputes resolved individually through arbitration</li>
                          <li>• Opt-out right available within 30 days of account creation</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* International Users */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">International Users</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">Compliance</h3>
                      <ul className="space-y-2 text-blue-800 text-sm">
                        <li>• Users outside the USA must comply with local laws</li>
                        <li>• Export control laws may restrict certain products</li>
                        <li>• Some features may not be available in all jurisdictions</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">Currency and Taxes</h3>
                      <ul className="space-y-2 text-green-800 text-sm">
                        <li>• All transactions in USD</li>
                        <li>• Currency conversion fees may apply</li>
                        <li>• Local taxes and duties are your responsibility</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Updates to Terms */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Updates to Terms</h2>
                  <div className="bg-purple-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900 mb-4">Modifications</h3>
                        <ul className="space-y-2 text-purple-800 text-sm">
                          <li>• We may update these Terms at any time</li>
                          <li>• Material changes will be notified via email or platform notice</li>
                          <li>• Continued use constitutes acceptance of updated Terms</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900 mb-4">Notice Period</h3>
                        <ul className="space-y-2 text-purple-800 text-sm">
                          <li>• 30 days notice for material changes</li>
                          <li>• Immediate effect for legal compliance or security updates</li>
                          <li>• Right to terminate account if you disagree with changes</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Force Majeure */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Force Majeure</h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <p className="text-gray-800 mb-4">
                      We're not liable for delays or failures due to circumstances beyond our reasonable control, including:
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-sm font-medium text-gray-900">Natural Disasters</div>
                        <div className="text-xs text-gray-600 mt-1">Earthquakes, floods, storms</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-sm font-medium text-gray-900">Government Actions</div>
                        <div className="text-xs text-gray-600 mt-1">Laws, regulations, sanctions</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-sm font-medium text-gray-900">Internet Outages</div>
                        <div className="text-xs text-gray-600 mt-1">Network failures, cyber attacks</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-sm font-medium text-gray-900">Service Failures</div>
                        <div className="text-xs text-gray-600 mt-1">Third-party provider issues</div>
                      </div>
                      <div className="text-center p-3 bg-white rounded-lg border">
                        <div className="text-sm font-medium text-gray-900">Health Emergencies</div>
                        <div className="text-xs text-gray-600 mt-1">Pandemic, quarantine measures</div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Severability */}
                <section className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Severability</h2>
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                    <p className="text-blue-800">
                      If any provision of these Terms is found unenforceable, the remaining provisions will remain in full force and effect. Invalid provisions will be modified to achieve the intended economic effect.
                    </p>
                  </div>
                </section>

                {/* Entire Agreement */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Entire Agreement</h2>
                  <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                    <p className="text-green-800">
                      These Terms, along with our Privacy Policy, constitute the entire agreement between you and Nozama.ai regarding use of the Service. They supersede all prior agreements and understandings.
                    </p>
                  </div>
                </section>

                {/* Contact Information */}
                <section id="contact" data-section="contact" className="mb-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      <Mail className="w-5 h-5 text-teal-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Contact Information</h2>
                  </div>
                  
                  <div className="space-y-6">
                    <p className="text-gray-600">For questions about these Terms, contact us:</p>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 text-center">General Inquiries</h3>
                        <div className="space-y-4">
                          <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Mail className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-gray-600 text-sm mb-2">Email</p>
                            <a href="mailto:hamzaakahloon903@gmail.com" className="text-blue-600 hover:text-blue-800 font-medium">hamzaakahloon903@gmail.com</a>
                          </div>
                          
                          <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                              <Phone className="w-6 h-6 text-green-600" />
                            </div>
                            <p className="text-gray-600 text-sm mb-2">Phone</p>
                            <a href="tel:+14253718502" className="text-green-600 hover:text-green-800 font-medium">+1 425-371-8502</a>
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white border rounded-lg p-6">
                        <h3 className="font-semibold text-gray-900 mb-4 text-center">Legal Department</h3>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Gavel className="w-6 h-6 text-purple-600" />
                          </div>
                          <div className="space-y-2">
                            <div>
                              <p className="text-gray-600 text-sm">Legal Email</p>
                              <a href="mailto:legal@nozama.ai" className="text-purple-600 hover:text-purple-800 font-medium">legal@nozama.ai</a>
                            </div>
                            <div>
                              <p className="text-gray-600 text-sm">Response Time</p>
                              <span className="text-gray-800 font-medium">5-7 business days</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="flex items-start space-x-3">
                        <MapPin className="w-5 h-5 text-gray-600 mt-1 flex-shrink-0" />
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">Business Address</h4>
                          <p className="text-gray-700">
                            PGE - Pangea Global Enterprises<br />
                            Sector Commercial Area Sector C<br />
                            Bahria Town, Lahore, Pakistan
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer Acknowledgment */}
                <section className="border-t pt-8">
                  <div className="bg-gray-900 text-white rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Terms Acknowledgment</h2>
                    <p className="text-gray-300 mb-6">
                      By using <strong>Nozama.ai</strong>, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Effective Date</div>
                          <div className="text-xs text-gray-400">August 8, 2025</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Last Updated</div>
                          <div className="text-xs text-gray-400">August 8, 2025</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Version</div>
                          <div className="text-xs text-gray-400">1.0</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default TermsOfService;