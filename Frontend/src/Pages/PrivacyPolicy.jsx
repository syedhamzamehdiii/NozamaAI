import React, { useState, useEffect } from 'react';
import { ChevronUp, Mail, Phone, MapPin, Calendar, Shield, Eye, Lock, Users, Globe, FileText, AlertCircle } from 'lucide-react';

const PrivacyPolicy = () => {
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
    { id: 'introduction', title: 'Introduction', icon: <FileText className="w-4 h-4" /> },
    { id: 'information-collection', title: 'Information We Collect', icon: <Eye className="w-4 h-4" /> },
    { id: 'information-use', title: 'How We Use Your Information', icon: <Users className="w-4 h-4" /> },
    { id: 'information-sharing', title: 'Information Sharing', icon: <Globe className="w-4 h-4" /> },
    { id: 'data-security', title: 'Data Security', icon: <Shield className="w-4 h-4" /> },
    { id: 'privacy-rights', title: 'Your Privacy Rights', icon: <Lock className="w-4 h-4" /> },
    { id: 'cookies', title: 'Cookies & Tracking', icon: <AlertCircle className="w-4 h-4" /> },
    { id: 'contact', title: 'Contact Information', icon: <Mail className="w-4 h-4" /> }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
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
                          ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-500'
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
                
                {/* Introduction */}
                <section id="introduction" data-section="introduction" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Introduction</h2>
                  </div>
                  <div className="prose prose-gray max-w-none">
                    <p className="text-lg text-gray-700 leading-relaxed mb-4">
                      PGE - Pangea Global Enterprises ("we," "our," or "us") operates <strong>Nozama.ai</strong>, an AI tools and data marketplace. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
                    </p>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                      <p className="text-blue-800 font-medium">
                        By using Nozama.ai, you consent to the data practices described in this Privacy Policy.
                      </p>
                    </div>
                  </div>
                </section>

                {/* Information We Collect */}
                <section id="information-collection" data-section="information-collection" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <Eye className="w-5 h-5 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Information We Collect</h2>
                  </div>
                  
                  <div className="space-y-8">
                    <div className="bg-gray-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Personal Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                          <p className="text-gray-600 text-sm">Name, email address, phone number, billing address</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2">Payment Information</h4>
                          <p className="text-gray-600 text-sm">Credit card details (processed securely by Stripe)</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2">Profile Information</h4>
                          <p className="text-gray-600 text-sm">Profile picture, bio, seller verification documents</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg border">
                          <h4 className="font-medium text-gray-900 mb-2">Communication</h4>
                          <p className="text-gray-600 text-sm">Messages, support tickets, forum posts, reviews</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">Automatically Collected Information</h3>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Usage Data</h4>
                          <p className="text-gray-600 text-sm mb-4">Pages visited, time spent, click patterns, search queries</p>
                          
                          <h4 className="font-medium text-gray-900 mb-2">Device Information</h4>
                          <p className="text-gray-600 text-sm">IP address, browser type, operating system, device type</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">Location Data</h4>
                          <p className="text-gray-600 text-sm mb-4">General location based on IP address (city/country level)</p>
                          
                          <h4 className="font-medium text-gray-900 mb-2">Cookies and Tracking</h4>
                          <p className="text-gray-600 text-sm">Analytics, preferences, session management</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-4">AI and Analytics Data</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span><strong>Purchase History:</strong> Products bought, download history, transaction details</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span><strong>Behavioral Data:</strong> Search patterns, product views, recommendations clicked</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span><strong>Performance Metrics:</strong> Platform usage, feature adoption, error reports</span>
                        </li>
                        <li className="flex items-start space-x-2">
                          <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                          <span><strong>Machine Learning Data:</strong> Aggregated patterns for AI model training</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* How We Use Your Information */}
                <section id="information-use" data-section="information-use" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">How We Use Your Information</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Core Services</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Process transactions and deliver products</li>
                        <li>• Create and manage user accounts</li>
                        <li>• Provide customer support</li>
                        <li>• Send order confirmations and receipts</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Improvement</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• AI-Powered Features: Search recommendations, personalized suggestions</li>
                        <li>• Analytics: Understand user behavior and improve platform performance</li>
                        <li>• Product Development: Develop new features based on usage patterns</li>
                        <li>• Quality Assurance: Monitor for fraud, abuse, and platform security</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Communication</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Transactional Emails: Order confirmations, download links, receipts</li>
                        <li>• Marketing Communications: Product updates, promotions (with consent)</li>
                        <li>• Support Communications: Response to inquiries and issues</li>
                        <li>• Platform Notifications: Account alerts, security notifications</li>
                      </ul>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Legal and Compliance</h3>
                      <ul className="space-y-2 text-gray-700">
                        <li>• Comply with legal obligations and regulations</li>
                        <li>• Enforce Terms and Conditions</li>
                        <li>• Protect against fraud and unauthorized access</li>
                        <li>• Respond to legal requests and court orders</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Information Sharing */}
                <section id="information-sharing" data-section="information-sharing" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <Globe className="w-5 h-5 text-red-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Information Sharing and Disclosure</h2>
                  </div>
                  
                  <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg mb-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-2">We DO NOT Sell Personal Information</h3>
                    <p className="text-green-700">We do not sell, rent, or trade your personal information to third parties for marketing purposes.</p>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Service Providers</h3>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-900">Payment Processing</div>
                          <div className="text-xs text-gray-600 mt-1">Stripe for secure transactions</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-900">Email Services</div>
                          <div className="text-xs text-gray-600 mt-1">SendGrid/Mailgun</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-900">Analytics</div>
                          <div className="text-xs text-gray-600 mt-1">PostHog/Mixpanel</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-900">Cloud Services</div>
                          <div className="text-xs text-gray-600 mt-1">AWS/MongoDB</div>
                        </div>
                        <div className="text-center p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm font-medium text-gray-900">Support Tools</div>
                          <div className="text-xs text-gray-600 mt-1">Customer service platforms</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Data Security */}
                <section id="data-security" data-section="data-security" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Data Security</h2>
                  </div>
                  
                  <div className="bg-indigo-50 rounded-lg p-6 mb-6">
                    <h3 className="text-lg font-semibold text-indigo-900 mb-4">Security Measures</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Lock className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-indigo-900">Encryption</span>
                        </div>
                        <p className="text-indigo-700 text-sm mb-4">Data encrypted in transit (TLS/SSL) and at rest</p>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <Users className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-indigo-900">Access Controls</span>
                        </div>
                        <p className="text-indigo-700 text-sm">Limited access on need-to-know basis</p>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <Shield className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-indigo-900">Authentication</span>
                        </div>
                        <p className="text-indigo-700 text-sm mb-4">Multi-factor authentication for admin accounts</p>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span className="font-medium text-indigo-900">Monitoring</span>
                        </div>
                        <p className="text-indigo-700 text-sm">24/7 security monitoring and threat detection</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-yellow-800 mb-2">Data Breach Protocol</h4>
                    <p className="text-yellow-700 text-sm">
                      In case of a data breach, we'll notify affected users within 72 hours, provide details about what information was affected, offer guidance on protective measures, and report to relevant authorities as required by law.
                    </p>
                  </div>
                </section>

                {/* Privacy Rights */}
                <section id="privacy-rights" data-section="privacy-rights" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Lock className="w-5 h-5 text-purple-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Your Privacy Rights</h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">General Rights</h3>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900">Access and Portability</h4>
                          <p className="text-gray-600 text-sm">Access your personal information and download your data in portable format</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Correction and Updates</h4>
                          <p className="text-gray-600 text-sm">Update your profile information and correct inaccurate personal data</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Deletion Rights</h4>
                          <p className="text-gray-600 text-sm">Request deletion of your account and associated data</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Opt-Out Rights</h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• Marketing Emails: Unsubscribe links in all marketing emails</li>
                        <li>• Data Analytics: Opt-out of behavioral tracking (may limit functionality)</li>
                        <li>• Personalization: Disable AI-powered recommendations</li>
                        <li>• Third-Party Sharing: Opt-out of data sharing with partners</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mt-8 grid md:grid-cols-2 gap-6">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-blue-900 mb-4">California Privacy Rights (CCPA)</h3>
                      <ul className="space-y-2 text-blue-800 text-sm">
                        <li>• Right to know what personal information is collected</li>
                        <li>• Right to delete personal information</li>
                        <li>• Right to opt-out of sale of personal information</li>
                        <li>• Right to non-discrimination for exercising privacy rights</li>
                      </ul>
                    </div>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-green-900 mb-4">European Privacy Rights (GDPR)</h3>
                      <ul className="space-y-2 text-green-800 text-sm">
                        <li>• Right to data portability</li>
                        <li>• Right to restrict processing</li>
                        <li>• Right to object to processing</li>
                        <li>• Right to withdraw consent</li>
                        <li>• Right to lodge complaints with supervisory authorities</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Cookies */}
                <section id="cookies" data-section="cookies" className="mb-12">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-yellow-100 p-2 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">Cookies and Tracking Technologies</h2>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Types of Cookies</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-lg border text-center">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-green-600 font-bold text-sm">E</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">Essential</h4>
                        <p className="text-gray-600 text-xs">Required for platform functionality</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border text-center">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-blue-600 font-bold text-sm">A</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">Analytics</h4>
                        <p className="text-gray-600 text-xs">Track usage patterns</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border text-center">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-purple-600 font-bold text-sm">P</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">Personalization</h4>
                        <p className="text-gray-600 text-xs">Remember preferences</p>
                      </div>
                      <div className="bg-white p-4 rounded-lg border text-center">
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          <span className="text-orange-600 font-bold text-sm">M</span>
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">Marketing</h4>
                        <p className="text-gray-600 text-xs">Deliver relevant ads</p>
                      </div>
                    </div>
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
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Privacy Questions</h3>
                      <p className="text-gray-600 text-sm mb-3">For privacy-related questions or concerns</p>
                      <a href="mailto:privacy@nozama.ai" className="text-blue-600 hover:text-blue-800 font-medium">privacy@nozama.ai</a>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Phone className="w-6 h-6 text-green-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Phone Support</h3>
                      <p className="text-gray-600 text-sm mb-3">Call us for urgent privacy matters</p>
                      <a href="tel:+14253718502" className="text-green-600 hover:text-green-800 font-medium">+1 425-371-8502</a>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-6 h-6 text-purple-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 mb-2">Address</h3>
                      <p className="text-gray-600 text-sm">PGE - Pangea Global Enterprises<br />
                      Sector Commercial Area Sector C<br />
                      Bahria Town, Lahore, Pakistan</p>
                    </div>
                  </div>

                  <div className="mt-8 bg-gray-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Data Protection Officer (DPO)</h4>
                        <p className="text-gray-600 text-sm mb-2">For EU residents:</p>
                        <a href="mailto:dpo@nozama.ai" className="text-blue-600 hover:text-blue-800 font-medium block">dpo@nozama.ai</a>
                        <p className="text-gray-500 text-xs mt-2">Response Time: 30 days maximum</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Rights Requests</h4>
                        <p className="text-gray-600 text-sm mb-2">To exercise your privacy rights:</p>
                        <a href="mailto:rights@nozama.ai" className="text-blue-600 hover:text-blue-800 font-medium block">rights@nozama.ai</a>
                        <p className="text-gray-500 text-xs mt-2">Include: Full name, email address, specific request, verification information</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Data Retention */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Data Retention</h2>
                  <div className="bg-gray-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Retention Periods</h3>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center p-3 bg-white rounded border">
                            <span className="font-medium text-gray-900">Account Data</span>
                            <span className="text-sm text-gray-600">Active + 3 years</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded border">
                            <span className="font-medium text-gray-900">Transaction Records</span>
                            <span className="text-sm text-gray-600">7 years</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded border">
                            <span className="font-medium text-gray-900">Support Communications</span>
                            <span className="text-sm text-gray-600">3 years</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-white rounded border">
                            <span className="font-medium text-gray-900">Analytics Data</span>
                            <span className="text-sm text-gray-600">Indefinite (anonymized)</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Deletion Procedures</h3>
                        <div className="space-y-3 text-gray-700 text-sm">
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Removed from active databases within 30 days</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Backup copies deleted within 90 days</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Some information may be retained in anonymized form</span>
                          </div>
                          <div className="flex items-start space-x-2">
                            <span className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span>Legal hold requirements may extend retention periods</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* International Data Transfers */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">International Data Transfers</h2>
                  <div className="bg-blue-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Cross-Border Transfers</h3>
                        <p className="text-blue-800 text-sm mb-3">Your information may be transferred to and processed in:</p>
                        <ul className="space-y-2 text-blue-700 text-sm">
                          <li>• United States (primary data processing location)</li>
                          <li>• Countries where our service providers operate</li>
                          <li>• Jurisdictions with adequate privacy protections</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900 mb-4">Transfer Safeguards</h3>
                        <ul className="space-y-2 text-blue-700 text-sm">
                          <li>• Standard contractual clauses for EU data transfers</li>
                          <li>• Adequacy decisions for approved countries</li>
                          <li>• Privacy Shield or similar frameworks where applicable</li>
                          <li>• Regular assessments of transfer security</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Children's Privacy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Children's Privacy</h2>
                  <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                    <h3 className="text-lg font-semibold text-red-900 mb-4">Age Requirements & COPPA Compliance</h3>
                    <div className="space-y-3 text-red-800">
                      <p>• Nozama.ai is not intended for children under 18</p>
                      <p>• We do not knowingly collect information from minors</p>
                      <p>• Parent/guardian consent required for users 13-17</p>
                      <p>• If we learn we've collected information from a child under 13, we'll delete it immediately and terminate the account</p>
                    </div>
                  </div>
                </section>

                {/* AI and Machine Learning Privacy */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">AI and Machine Learning Privacy</h2>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Training</h3>
                      <div className="space-y-3">
                        <div>
                          <h4 className="font-medium text-gray-900">Aggregated Data</h4>
                          <p className="text-gray-600 text-sm">Anonymized patterns for model training</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Recommendation Algorithms</h4>
                          <p className="text-gray-600 text-sm">Purchase history and preferences</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Search Optimization</h4>
                          <p className="text-gray-600 text-sm">Query patterns and results relevance</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">Fraud Detection</h4>
                          <p className="text-gray-600 text-sm">Transaction patterns and risk assessment</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white border rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Transparency</h3>
                      <ul className="space-y-2 text-gray-700 text-sm">
                        <li>• Users can see why products are recommended</li>
                        <li>• Option to disable personalized AI features</li>
                        <li>• Regular audits for AI bias and fairness</li>
                        <li>• Clear disclosure when AI makes decisions</li>
                      </ul>
                    </div>
                  </div>
                </section>

                {/* Policy Updates */}
                <section className="mb-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Updates to Privacy Policy</h2>
                  <div className="bg-yellow-50 rounded-lg p-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Policy Changes</h3>
                        <p className="text-yellow-800 text-sm mb-3">We may update this Privacy Policy to reflect:</p>
                        <ul className="space-y-1 text-yellow-700 text-sm">
                          <li>• Changes in our data practices</li>
                          <li>• New features or services</li>
                          <li>• Legal or regulatory requirements</li>
                          <li>• Industry best practices</li>
                        </ul>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-yellow-900 mb-4">Notification Process</h3>
                        <p className="text-yellow-800 text-sm mb-3">For material changes:</p>
                        <ul className="space-y-1 text-yellow-700 text-sm">
                          <li>• 30 days advance notice via email</li>
                          <li>• Prominent notice on the platform</li>
                          <li>• Option to review changes before acceptance</li>
                          <li>• Right to terminate account if you disagree</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Footer Information */}
                <section className="border-t pt-8">
                  <div className="bg-gray-900 text-white rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Effective Date and Acknowledgment</h2>
                    <p className="text-gray-300 mb-4">
                      This Privacy Policy is effective as of <strong>August 8, 2025</strong>. By using Nozama.ai, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Last Review</div>
                          <div className="text-xs text-gray-400">August 8, 2025</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Next Scheduled Review</div>
                          <div className="text-xs text-gray-400">February 8, 2026</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Globe className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium">Current Version</div>
                          <a href="https://nozama.ai/privacy" className="text-xs text-blue-400 hover:text-blue-300">nozama.ai/privacy</a>
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
          className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg transition-colors z-50"
          aria-label="Back to top"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PrivacyPolicy;