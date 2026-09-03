import React from 'react';
import Image from 'next/image';

export function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <Image
          src="/brand/logo-mark.svg"
          alt="SafarBuddy"
          width={64}
          height={64}
          className="mx-auto h-16 w-16 animate-pulse"
          priority
        />
        <h2 className="mt-6 text-xl font-semibold text-gray-800">SafarBuddy</h2>
        <p className="mt-2 text-gray-600">Loading your experience...</p>
      </div>
    </div>
  );
}
