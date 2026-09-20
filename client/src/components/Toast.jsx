import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          fontFamily: '"Noto Sans Thai", sans-serif',
          fontWeight: '500',
          color: '#fff',
          borderRadius: '8px',
          background: '#333',
        },
        success: {
          style: {
            background: '#16A34A',
          },
        },
        error: {
          style: {
            background: '#DC2626',
          },
        },
      }}
    />
  );
}
