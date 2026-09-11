import React from 'react';
import { Toaster } from 'react-hot-toast';

export default function ToastContainer() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          fontFamily: 'Prompt, sans-serif',
          background: '#333',
          color: '#fff',
          borderRadius: '8px',
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
