import React from 'react';

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="inline-block">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
        <h2 className="mt-6 text-xl font-semibold text-gray-800">SafarBuddy</h2>
        <p className="mt-2 text-gray-600">Loading your experience...</p>
      </div>
    </div>
  );
}
