'use client';
import React from 'react';
import IncidentFeed from '@/components/IncidentFeed';
import { useAuth } from '@/context/AuthContext'; // Adjust path to your context file
import Link from 'next/link';

const Feed = () => {
  const { user, loading } = useAuth();

  // 1. Show a loading state while checkAuth finishes
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Verifying session...</p>
      </div>
    );
  }

  // 2. If no user is found after loading, show the Login prompt
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h2 className="text-2xl font-bold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">Your session has expired or you are not logged in.</p>
        <Link 
          href="/login" 
          className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Please Log In
        </Link>
      </div>
    );
  }

  // 3. User is authenticated, show the feed
  return (
    <>
      <IncidentFeed />
    </>
  );
};

export default Feed;