import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FiLoader } from 'react-icons/fi';

const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <FiLoader className="animate-spin text-primary text-4xl" />
      </div>
    );
  }

  if (!user) {
    // Redirect to the correct portal login page
    const loginPath = requireAdmin ? '/admin/login' : '/employee/login';
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (requireAdmin && user.role !== 'Admin') {
    return <Navigate to="/employee/dashboard" replace />;
  }

  // Prevent Admin from accessing Employee routes
  if (!requireAdmin && user.role === 'Admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;
