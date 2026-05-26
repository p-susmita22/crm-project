import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200 p-4">
      <div className="w-full max-w-4xl min-h-[500px] flex bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transform transition-all">
        <Outlet />
      </div>
    </div>
  );
};

export default AuthLayout;
