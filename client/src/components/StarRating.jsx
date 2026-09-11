import React from 'react';

export default function StarRating({ value = 0, onChange, size = 'normal' }) {
  const stars = [1, 2, 3, 4, 5];
  const sizeClass = size === 'small' ? 'text-sm gap-0.5' : 'text-2xl gap-1';

  return (
    <div className={`flex items-center ${sizeClass}`}>
      {stars.map(star => (
        <span
          key={star}
          onClick={() => onChange && onChange(star)}
          className={`transition-all duration-150 ${onChange ? 'cursor-pointer hover:scale-125' : ''} ${
            star <= value ? 'text-accent-400 drop-shadow-sm' : 'text-gray-300'
          }`}
        >
          ★
        </span>
      ))}
      {!onChange && value > 0 && (
        <span className="text-xs text-gray-500 ml-1 font-semibold">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
