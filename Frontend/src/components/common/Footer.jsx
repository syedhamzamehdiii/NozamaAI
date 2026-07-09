import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotification } from '../../context/NotificationContext';
import {
  EnvelopeIcon,
  MapPinIcon,
  PhoneIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const Footer = () => {
  const { showSuccess, showError } = useNotification();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault();
    
    if (!newsletterEmail) {
      showError('Email Required', 'Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(newsletterEmail)) {
      showError('Invalid Email', 'Please enter a valid email address');
      return;
    }

    setIsSubscribing(true);

    try {
      // Mock API call - replace with actual newsletter subscription
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      showSuccess('Subscribed!', 'Thank you for subscribing to our newsletter');
      setNewsletterEmail('');
    } catch (error) {
      showError('Subscription Failed', 'Please try again later');
    } finally {
      setIsSubscribing(false);
    }
  };

  const footerLinks = {
    product: [
      { name: 'Browse AI Tools', href: '/products' },
      { name: 'Categories', href: '/products' },
      { name: 'Featured Tools', href: '/products' }
      // { name: 'New Releases', href: '/products?sort=newest' },
      // { name: 'Pricing', href: '/pricing' },
      // { name: 'API Documentation', href: '/docs/api' }
    ],
    company: [
      { name: 'About Us', href: '/about' },
      { name: 'Terms & Conditions', href: '/terms' },
      { name: 'Privacy Policy', href: '/privacy' }
      // { name: 'Careers', href: '/careers' },
      // { name: 'Investors', href: '/investors' },
      // { name: 'Partners', href: '/partners' }
    ],
    support: [
     
      { name: 'Contact Support', href: '/contact' },
      
      { name: 'Community Forum', href: '/community' }
 
    ],
    legal: [
      { name: 'Privacy Policy', href: '/privacy' },
      { name: 'Terms of Service', href: '/terms' },
     
    ],
    sellers: [
      { name: 'Sell on Nozama.ai', href: '/seller' },
      { name: 'Seller Guidelines', href: '/seller' },

    ]
  };

  const socialLinks = [
    {
      name: 'Twitter',
      href: 'https://twitter.com/nozamaai',
      icon: (
        <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      )
    },
    {
      name: 'GitHub',
      href: 'https://github.com/nozamaai',
      icon: (
        <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'LinkedIn',
      href: 'https://linkedin.com/company/nozamaai',
      icon: (
        <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      name: 'Discord',
      href: 'https://discord.gg/nozamaai',
      icon: (
        <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.201 13.201 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.246.195.373.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.201 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.2 0 2.176 1.068 2.157 2.38 0 1.311-.956 2.38-2.157 2.38z"/>
        </svg>
      )
    },
    {
      name: 'YouTube',
      href: 'https://youtube.com/@nozamaai',
      icon: (
        <svg className="h-4 w-4 lg:h-5 lg:w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path fillRule="evenodd" d="M19.812 5.418c.861.23 1.538.907 1.768 1.768C21.998 8.746 22 12 22 12s0 3.255-.418 4.814a2.504 2.504 0 0 1-1.768 1.768c-1.56.419-7.814.419-7.814.419s-6.255 0-7.814-.419a2.505 2.505 0 0 1-1.768-1.768C2 15.255 2 12 2 12s0-3.255.417-4.814a2.507 2.507 0 0 1 1.768-1.768C5.744 5 11.998 5 11.998 5s6.255 0 7.814.418ZM15.194 12 10 15V9l5.194 3Z" clipRule="evenodd" />
        </svg>
      )
    }
  ];

  return (
    <footer className="bg-black text-white">
      {/* Newsletter Section */}
      <div className="bg-black border-b border-gray-800">
        <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 lg:py-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:flex-1">
              <h3 className="text-base lg:text-lg xl:text-xl font-semibold text-[#DAA425] mb-2">
                Stay updated with AI innovations
              </h3>
              <p className="text-white text-xs sm:text-sm lg:text-base max-w-2xl">
                Get the latest AI tools, tutorials, and industry insights delivered to your inbox weekly.
              </p>
            </div>
            <div className="mt-4 lg:mt-0 lg:ml-8">
              <form onSubmit={handleNewsletterSubmit} className="flex max-w-xs sm:max-w-md lg:max-w-lg">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="flex-1 px-3 lg:px-4 py-2 lg:py-3 bg-black border border-gray-700 rounded-l-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#DAA425] focus:border-[#DAA425] text-sm lg:text-base transition-all duration-300"
                />
                <button
                  type="submit"
                  disabled={isSubscribing}
                  className="px-4 lg:px-6 py-2 lg:py-3 bg-[#DAA425] hover:bg-[#DAA740] text-black rounded-r-lg font-medium transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-sm lg:text-base shadow-lg hover:shadow-[#DAA425]/20"
                >
                  {isSubscribing ? 'Subscribing...' : 'Subscribe'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16 py-8 lg:py-12 xl:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6 lg:gap-8">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-2">
            <Link to="/" className="flex items-center space-x-2 lg:space-x-3 mb-4 lg:mb-6">
              {/* Logo Image */}
              <img 
                src="/logo.png" 
                alt="Nozama AI Logo" 
                className="h-8 w-auto sm:h-10 md:h-12 lg:h-14 xl:h-16 2xl:h-18 transition-transform duration-300 hover:scale-105"
              />
            </Link>
            {/* <p className="text-white mb-4 lg:mb-6 max-w-md text-sm lg:text-base xl:text-lg leading-relaxed">
              The world's largest marketplace for AI tools, datasets, and machine learning modules. 
              Empowering developers to build the future with artificial intelligence.
            </p> */}
            
            {/* Contact Info */}
            <div className="space-y-2 lg:space-y-3 text-xs sm:text-sm lg:text-base text-white">
              <div className="flex items-center hover:text-[#DAA425] transition-colors duration-300">
                <MapPinIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-gray-400" />
                Albuquerque, NM 87102, USA
              </div>
              <div className="flex items-center hover:text-[#DAA425] transition-colors duration-300">
                <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-gray-400" />
                info@nozamaai.com
              </div>
              <div className="flex items-center hover:text-[#DAA425] transition-colors duration-300">
                <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-gray-400" />
                +1 425-371-8502
              </div>
              <div className="flex items-center hover:text-[#DAA425] transition-colors duration-300">
                <GlobeAltIcon className="h-3 w-3 sm:h-4 sm:w-4 lg:h-5 lg:w-5 mr-2 lg:mr-3 text-gray-400" />
                24/7 Global Support
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-[#DAA425] font-semibold mb-3 lg:mb-4 text-sm lg:text-base xl:text-lg text-[#DAA425]">Product</h3>
            <ul className="space-y-1.5 lg:space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white hover:text-[#DAA425] hover:bg-black transition-all duration-300 text-xs sm:text-sm lg:text-base block py-1 px-1 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h3 className="text-[#DAA425] font-semibold mb-3 lg:mb-4 text-sm lg:text-base xl:text-lg text-[#DAA425]">Company</h3>
            <ul className="space-y-1.5 lg:space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white hover:text-[#DAA425] hover:bg-black transition-all duration-300 text-xs sm:text-sm lg:text-base block py-1 px-1 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-[#DAA425] font-semibold mb-3 lg:mb-4 text-sm lg:text-base xl:text-lg text-[#DAA425]">Support</h3>
            <ul className="space-y-1.5 lg:space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white hover:text-[#DAA425] hover:bg-black transition-all duration-300 text-xs sm:text-sm lg:text-base block py-1 px-1 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Sellers Links */}
          <div>
            <h3 className="text-[#DAA425] font-semibold mb-3 lg:mb-4 text-sm lg:text-base xl:text-lg text-[#DAA425]">For Sellers</h3>
            <ul className="space-y-1.5 lg:space-y-2">
              {footerLinks.sellers.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white hover:text-[#DAA425] hover:bg-black transition-all duration-300 text-xs sm:text-sm lg:text-base block py-1 px-1 rounded"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-gray-800">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4 lg:space-x-6">
              <div className="text-xs sm:text-sm lg:text-base text-white">
                <span className="font-semibold">Trusted by 50,000+ developers</span>
              </div>
              <div className="flex items-center space-x-2 lg:space-x-4">
                <div className="text-xs lg:text-sm text-black bg-[#DAA425] px-2 py-1 rounded font-medium">
                  SSL Secured
                </div>
                <div className="text-xs lg:text-sm text-black bg-[#DAA425] px-2 py-1 rounded font-medium">
                  SOC 2 Compliant
                </div>
                <div className="text-xs lg:text-sm text-black bg-[#DAA425] px-2 py-1 rounded font-medium">
                  GDPR Ready
                </div>
              </div>
            </div>
            
            {/* Social Links */}
            <div className="flex space-x-3 lg:space-x-4">
              {socialLinks.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white hover:text-[#DAA425] hover:bg-gray-900 p-2 rounded-lg transition-all duration-300"
                  aria-label={`Follow us on ${item.name}`}
                >
                  {item.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-gray-800">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div className="text-xs sm:text-sm lg:text-base text-white">
              <span>&copy; 2025 Nozama.ai. All rights reserved.</span>
            </div>
            
            {/* Legal Links */}
            <div className="flex flex-wrap items-center justify-center lg:justify-end space-x-3 lg:space-x-6 text-xs sm:text-sm lg:text-base">
              {footerLinks.legal.map((link, index) => (
                <React.Fragment key={link.name}>
                  <Link
                    to={link.href}
                    className="text-white hover:text-[#DAA425] transition-colors duration-300"
                  >
                    {link.name}
                  </Link>
                  {index < footerLinks.legal.length - 1 && (
                    <span className="text-gray-600 hidden sm:inline">•</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Platform Stats */}
        <div className="mt-6 lg:mt-8 pt-6 lg:pt-8 border-t border-gray-800">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 text-center">
            <div className="hover:bg-gray-900 p-3 lg:p-4 rounded-lg transition-all duration-300">
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#DAA425]">10,000+</div>
              <div className="text-xs sm:text-sm lg:text-base text-white">AI Tools</div>
            </div>
            <div className="hover:bg-gray-900 p-3 lg:p-4 rounded-lg transition-all duration-300">
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#DAA425]">50,000+</div>
              <div className="text-xs sm:text-sm lg:text-base text-white">Developers</div>
            </div>
            <div className="hover:bg-gray-900 p-3 lg:p-4 rounded-lg transition-all duration-300">
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#DAA425]">1M+</div>
              <div className="text-xs sm:text-sm lg:text-base text-white">Downloads</div>
            </div>
            <div className="hover:bg-gray-900 p-3 lg:p-4 rounded-lg transition-all duration-300">
              <div className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold text-[#DAA425]">99.9%</div>
              <div className="text-xs sm:text-sm lg:text-base text-white">Uptime</div>
            </div>
          </div>
        </div>

        {/* Special Mentions */}
        <div className="mt-6 lg:mt-8 text-center">
          <p className="text-xs sm:text-sm lg:text-base text-white">
            Built with <span className="text-[#DAA425]">❤️</span> by developers, for developers. Powered by the latest in AI and machine learning technology.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;