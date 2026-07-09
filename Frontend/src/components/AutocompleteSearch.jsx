// components/AutocompleteSearch.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, ClockIcon } from '@heroicons/react/24/outline';
import { productService } from '../services/Products';

const AutocompleteSearch = ({ 
  className = "", 
  placeholder = "Search AI tools, datasets, APIs...",
  isMobile = false 
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState([]);
  
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const timeoutRef = useRef(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading recent searches:', e);
      }
    }
  }, []);

  // Save recent searches to localStorage
  const saveRecentSearch = (searchTerm) => {
    const updated = [searchTerm, ...recentSearches.filter(s => s !== searchTerm)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('recentSearches', JSON.stringify(updated));
  };

// Debounced search function
const debouncedSearch = async (searchTerm) => {
  if (!searchTerm || searchTerm.length < 2) {
    setSuggestions([]);
    setIsLoading(false);
    return;
  }

  try {
    setIsLoading(true);
    const response = await productService.getProducts({
      search: searchTerm,
      limit: 10, // Get more results to filter from
      sort_by: 'created_at',
      sort_order: 'desc'
    });

    if (response && response.products) {
      console.log('Products received:', response.products);
      
      // Filter for relevant matches
      const relevantMatches = response.products.filter(product => 
        product.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
      
      // Sort by relevance (exact matches first, then by how early the term appears)
      const sortedMatches = relevantMatches.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        // Exact match comes first
        if (aTitle === searchLower && bTitle !== searchLower) return -1;
        if (bTitle === searchLower && aTitle !== searchLower) return 1;
        
        // Then by position where the search term appears
        const aIndex = aTitle.indexOf(searchLower);
        const bIndex = bTitle.indexOf(searchLower);
        
        return aIndex - bIndex;
      });
      
      // Take top 3 matches
      setSuggestions(sortedMatches.slice(0, 3));
    }
  } catch (error) {
    console.error('Search error:', error);
    setSuggestions([]);
  } finally {
    setIsLoading(false);
  }
};

  // Handle input change with debouncing
  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      debouncedSearch(value);
    }, 300);
  };

  // Handle input focus
  const handleFocus = () => {
    setIsOpen(true);
    if (query.length >= 2) {
      debouncedSearch(query);
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current && !searchRef.current.contains(event.target) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle keyboard navigation
// Handle keyboard navigation
const handleKeyDown = (e) => {
  if (!isOpen) return;
  
  const itemCount = suggestions.length + (query.length >= 2 ? 1 : 0) + (query.length < 2 ? recentSearches.length : 0);

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    setSelectedIndex(prev => prev < itemCount - 1 ? prev + 1 : prev);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
  } else if (e.key === 'Enter') {
    e.preventDefault();
    
    if (selectedIndex === -1) {
      // No selection, submit search
      handleSubmit();
    } else if (selectedIndex < suggestions.length) {
      // Navigate to product
      const product = suggestions[selectedIndex];
      const productId = product.id; // Use 'id' not '_id'
      if (productId) {
        navigate(`/products/${productId}`);
        setIsOpen(false);
        setQuery('');
      } else {
        console.error('Product ID not found:', product);
      }
    } else if (selectedIndex === suggestions.length && query.length >= 2) {
      // "View all results"
      handleSubmit();
    } else if (query.length < 2) {
      // Recent search
      const recentIndex = selectedIndex - suggestions.length - (query.length >= 2 ? 1 : 0);
      const recentSearch = recentSearches[recentIndex];
      if (recentSearch) {
        setQuery(recentSearch);
        handleSubmit(recentSearch);
      }
    }
  } else if (e.key === 'Escape') {
    setIsOpen(false);
    setSelectedIndex(-1);
    searchRef.current?.blur();
  }
};

  // Handle form submission
  const handleSubmit = (searchTerm = query) => {
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm.trim());
      navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      setIsOpen(false);
      setQuery('');
      searchRef.current?.blur();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (product) => {
     const productId = product.id; // Try both _id and id
  if (productId) {
    navigate(`/products/${productId}`);
    setIsOpen(false);
    setQuery('');
  } else {
    console.error('Product ID not found:', product);
  }
};

  // Handle recent search click
  const handleRecentSearchClick = (searchTerm) => {
    setQuery(searchTerm);
    handleSubmit(searchTerm);
  };

  // Format price
  const formatPrice = (price) => {
    return `$${Number(price).toFixed(2)}`;
  };

  return (
    <div className="relative" ref={searchRef}>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="relative">
          <div className={`absolute inset-y-0 left-0 ${isMobile ? 'pl-3' : 'pl-2 lg:pl-3'} flex items-center pointer-events-none`}>
            <MagnifyingGlassIcon className={`text-gray-400 ${isMobile ? 'h-4 w-4' : 'h-4 w-4 lg:h-5 lg:w-5'}`} />
          </div>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            className={`${className} ${isMobile ? 'pl-8' : 'pl-7 lg:pl-10'}`}
            placeholder={placeholder}
            autoComplete="off"
          />
        </div>
      </form>

      {/* Dropdown */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-700 rounded-lg shadow-2xl z-50 max-h-96 overflow-y-auto"
        >
          {/* Loading */}
          {isLoading && (
            <div className="px-4 py-3 text-center text-gray-400 text-sm">
              <div className="animate-spin h-4 w-4 border-2 border-[#DAA425] border-t-transparent rounded-full mx-auto"></div>
            </div>
          )}

          {/* Product Suggestions */}
          {suggestions.length > 0 && (
            <div className="py-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Products
              </div>
              {suggestions.map((product, index) => (
                <button
                  key={product.id}
                  onClick={() => handleSuggestionClick(product)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-900 transition-colors flex items-center space-x-3 ${
                    selectedIndex === index ? 'bg-gray-900' : ''
                  }`}
                >
                  <div className="w-10 h-10 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden">
                    {product.images && product.images[0] ? (
                      <img 
                        src={`${product.images[0]}`}
                        alt={product.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentNode.style.backgroundColor = '#374151';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">AI</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {product.title}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {product.category || 'AI Tool'}
                    </div>
                  </div>
                  <div className="text-sm font-medium text-[#DAA425]">
                    {formatPrice(product.price)}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* View all results */}
          {query.length >= 2 && (
            <div className="border-t border-gray-700">
              <button
                onClick={() => handleSubmit()}
                className={`w-full px-3 py-2 text-left hover:bg-gray-900 transition-colors flex items-center text-[#DAA425] ${
                  selectedIndex === suggestions.length ? 'bg-gray-900' : ''
                }`}
              >
                <MagnifyingGlassIcon className="h-4 w-4 mr-3" />
                View all results for "{query}"
              </button>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && query.length < 2 && (
            <div className="border-t border-gray-700 py-2">
              <div className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wide">
                Recent Searches
              </div>
              {recentSearches.map((search, index) => {
                const adjustedIndex = suggestions.length + (query.length >= 2 ? 1 : 0) + index;
                return (
                  <button
                    key={search}
                    onClick={() => handleRecentSearchClick(search)}
                    className={`w-full px-3 py-2 text-left hover:bg-gray-900 transition-colors flex items-center text-gray-300 ${
                      selectedIndex === adjustedIndex ? 'bg-gray-900' : ''
                    }`}
                  >
                    <ClockIcon className="h-4 w-4 mr-3 text-gray-400" />
                    {search}
                  </button>
                );
              })}
            </div>
          )}

          {/* No results */}
          {!isLoading && query.length >= 2 && suggestions.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-400 text-sm">
              No products found for "{query}"
            </div>
          )}

          {/* Empty state */}
          {!isLoading && query.length < 2 && recentSearches.length === 0 && (
            <div className="px-4 py-3 text-center text-gray-400 text-sm">
              Start typing to search for AI tools...
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSearch;