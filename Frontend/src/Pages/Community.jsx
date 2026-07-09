import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  FireIcon,
  ClockIcon,
  UserIcon,
  MagnifyingGlassIcon,
  TagIcon,
  HeartIcon,
  EyeIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

const Community = () => {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState('recent');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPost, setEditingPost] = useState(null);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    category_id: '',
    tags: ''
  });

  // API functions
  const fetchCategories = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        // Set default category if available
        if (data.length > 0 && !newPost.category_id) {
          setNewPost(prev => ({ ...prev, category_id: data[0].id }));
        }
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      setLoading(true);
      let url = 'http://localhost:8000/api/v1/posts?limit=20';
      
      if (searchTerm) {
        url += `&search=${encodeURIComponent(searchTerm)}`;
      }
      
      if (activeTab === 'popular') {
        url += '&sort_by=likes&sort_order=desc';
      } else if (activeTab === 'trending') {
        url += '&sort_by=views&sort_order=desc';
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchPosts();
  }, [activeTab, searchTerm]);



  // Transform categories for display
  const displayCategories = categories.map(category => ({
    ...category,
    posts: posts.filter(p => p.category_id === category.id).length,
    color: `bg-${category.color.replace('#', '')}-100 text-${category.color.replace('#', '')}-800`
  }));

  // Get current user info
  const getCurrentUser = () => {
    if (user) {
      return user.first_name || user.name || 'Anonymous User';
    }
    return 'Anonymous User';
  };

  // API functions for posts
  const createPost = async () => {
    if (!isAuthenticated) {
      alert('Please sign in to create a post');
      return;
    }

    if (!newPost.title.trim() || !newPost.content.trim() || !newPost.category_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('simpleAdminToken');
      const response = await fetch('http://localhost:8000/api/v1/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(user?.id ? { 'X-User-Id': user.id } : {})
        },
        body: JSON.stringify({
          title: newPost.title,
          content: newPost.content,
          category_id: newPost.category_id,
          tags: newPost.tags ? newPost.tags.split(',').map(tag => tag.trim()) : []
        })
      });

      if (response.ok) {
        const post = await response.json();
        setPosts([post, ...posts]);
        setNewPost({ title: '', content: '', category_id: categories[0]?.id || '', tags: '' });
        setShowNewPostModal(false);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post');
    }
  };

  const updatePost = async () => {
    if (!editingPost) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('simpleAdminToken');
      const response = await fetch(`http://localhost:8000/api/v1/posts/${editingPost.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(user?.id ? { 'X-User-Id': user.id } : {})
        },
        body: JSON.stringify({
          title: editingPost.title,
          content: editingPost.content,
          tags: editingPost.tags
        })
      });

      if (response.ok) {
        const updatedPost = await response.json();
        setPosts(posts.map(p => p.id === updatedPost.id ? updatedPost : p));
        setShowEditModal(false);
        setEditingPost(null);
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error updating post:', error);
      alert('Failed to update post');
    }
  };

  const deletePost = async (postId) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('simpleAdminToken');
      const response = await fetch(`http://localhost:8000/api/v1/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(user?.id ? { 'X-User-Id': user.id } : {})
        }
      });

      if (response.ok) {
        setPosts(posts.filter(p => p.id !== postId));
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Failed to delete post');
    }
  };

  const likePost = async (postId) => {
    if (!isAuthenticated) {
      alert('Please sign in to like posts');
      return;
    }

    try {
      const token = localStorage.getItem('token') || localStorage.getItem('adminToken') || localStorage.getItem('simpleAdminToken');
      const response = await fetch(`http://localhost:8000/api/v1/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          ...(user?.id ? { 'X-User-Id': user.id } : {})
        }
      });

      if (response.ok) {
        const result = await response.json();
        setPosts(posts.map(p => 
          p.id === postId 
            ? { ...p, likes: result.like_count, user_liked: result.liked }
            : p
        ));
      }
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.category_name && post.category_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (post.tags && post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    
    if (activeTab === 'recent') {
      return new Date(b.last_activity || b.created_at) - new Date(a.last_activity || a.created_at);
    } else if (activeTab === 'popular') {
      return b.likes - a.likes;
    } else if (activeTab === 'trending') {
      return b.views - a.views;
    }
    return 0;
  });

  const handleCreatePost = () => {
    createPost();
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const handlePostClick = (post) => {
    // View tracking is handled by the backend
  };

  const handleLike = (postId) => {
    likePost(postId);
  };

  const handleEditPost = (post) => {
    if (!isAuthenticated || post.user_id !== user?.id) {
      alert('You can only edit your own posts');
      return;
    }
    setEditingPost(post);
    setShowEditModal(true);
  };

  const handleDeletePost = (post) => {
    if (!isAuthenticated || post.user_id !== user?.id) {
      alert('You can only delete your own posts');
      return;
    }
    deletePost(post.id);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Community Forum</h1>
          <p className="text-gray-600 mt-2">Connect with AI developers and share knowledge</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Create Post Button */}
            <button 
              onClick={() => setShowNewPostModal(true)}
              className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              New Discussion
            </button>

            {/* Categories */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-3">
                {displayCategories.map((category, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-medium text-gray-900">{category.name}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${category.color}`}>
                      {category.post_count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Community Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Posts</span>
                  <span className="text-sm font-semibold text-gray-900">{posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Active Users</span>
                  <span className="text-sm font-semibold text-gray-900">1,234</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Online Now</span>
                  <span className="text-sm font-semibold text-green-600">89</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Search and Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                <div className="relative flex-1 max-w-md">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search discussions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActiveTab('recent')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'recent'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <ClockIcon className="h-4 w-4 inline mr-1" />
                    Recent
                  </button>
                  <button
                    onClick={() => setActiveTab('popular')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'popular'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <HeartIcon className="h-4 w-4 inline mr-1" />
                    Popular
                  </button>
                  <button
                    onClick={() => setActiveTab('trending')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'trending'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FireIcon className="h-4 w-4 inline mr-1" />
                    Trending
                  </button>
                </div>
              </div>
            </div>

            {/* Forum Posts */}
            <div className="space-y-4">
              {loading ? (
                <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading posts...</p>
                </div>
              ) : sortedPosts.length > 0 ? (
                sortedPosts.map((post) => (
                <div 
                  key={post.id} 
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center">
                            {post.is_pinned && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mr-2">
                            Pinned
                          </span>
                        )}
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
                          {post.title}
                        </h3>
                          </div>
                          
                          {/* Edit/Delete buttons for post owner */}
                          {isAuthenticated && post.user_id === user?.id && (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditPost(post)}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Edit post"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeletePost(post)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete post"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                      </div>
                      
                      <p className="text-gray-700 mb-3 line-clamp-2">{post.content}</p>
                      
                      <div className="flex items-center text-sm text-gray-500 mb-3">
                        <UserIcon className="h-4 w-4 mr-1" />
                          <span className="mr-4 font-medium">{post.user_name}</span>
                          <span className="mr-4">in {post.category_name}</span>
                          <span>{formatTimeAgo(post.last_activity || post.created_at)}</span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                        <div className="flex items-center">
                          <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1" />
                          <span>{post.replies} replies</span>
                        </div>
                        <div className="flex items-center">
                          <EyeIcon className="h-4 w-4 mr-1" />
                          <span>{post.views} views</span>
                        </div>
                        <button 
                            onClick={() => handleLike(post.id)}
                            className={`flex items-center transition-colors ${
                              post.user_liked ? 'text-red-500' : 'hover:text-red-500'
                            }`}
                          >
                            <HeartIcon className={`h-4 w-4 mr-1 ${post.user_liked ? 'fill-current' : ''}`} />
                          <span>{post.likes} likes</span>
                        </button>
                      </div>

                        {post.tags && post.tags.length > 0 && (
                        <div className="flex items-center gap-2">
                          <TagIcon className="h-4 w-4 text-gray-400" />
                          <div className="flex flex-wrap gap-1">
                            {post.tags.map((tag, index) => (
                              <span
                                key={index}
                                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                ))
              ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No discussions found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your search terms or start a new discussion.</p>
                <button 
                  onClick={() => setShowNewPostModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Start New Discussion
                </button>
              </div>
            )}
            </div>

            {/* No Results (single instance shown above) */}
          </div>
        </div>
      </div>

      {/* New Post Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Start New Discussion</h3>
              <button
                onClick={() => {
                  setShowNewPostModal(false);
                  setNewPost({ title: '', content: '', category: 'General Discussion', tags: '' });
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter discussion title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={newPost.category_id}
                  onChange={(e) => setNewPost(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={newPost.content}
                  onChange={(e) => setNewPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your thoughts, ask questions, or start a discussion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newPost.tags}
                  onChange={(e) => setNewPost(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AI, Machine Learning, Python..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowNewPostModal(false);
                  setNewPost({ title: '', content: '', category: 'General Discussion', tags: '' });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={!newPost.title.trim() || !newPost.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Post Discussion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Post Modal */}
      {showEditModal && editingPost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Edit Discussion</h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPost(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter discussion title..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Content</label>
                <textarea
                  value={editingPost.content}
                  onChange={(e) => setEditingPost(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Share your thoughts, ask questions, or start a discussion..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editingPost.tags ? editingPost.tags.join(', ') : ''}
                  onChange={(e) => setEditingPost(prev => ({ 
                    ...prev, 
                    tags: e.target.value ? e.target.value.split(',').map(tag => tag.trim()) : []
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="AI, Machine Learning, Python..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingPost(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updatePost}
                disabled={!editingPost.title.trim() || !editingPost.content.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Update Discussion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;