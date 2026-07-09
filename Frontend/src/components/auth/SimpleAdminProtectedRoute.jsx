// src/components/auth/SimpleAdminProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';

const SimpleAdminProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('simpleAdminToken');
  const userRole = localStorage.getItem('userRole');
  
  if (!token || userRole !== 'simple_admin') {
    return <Navigate to="/simple-admin/login" replace />;
  }
  
  return children;
};

export default SimpleAdminProtectedRoute;