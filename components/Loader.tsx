
import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-yellow-400"></div>
    </div>
  );
};

export default Loader;
