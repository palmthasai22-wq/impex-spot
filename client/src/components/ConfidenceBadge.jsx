import React from 'react';

export default function ConfidenceBadge({ score = 0 }) {
  const isVerified = score >= 60;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold ${
      isVerified
        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
        : 'bg-amber-100 text-amber-700 border border-amber-200'
    }`}>
      {isVerified ? '✅' : '⚠️'} {score}% {isVerified ? 'Verified' : 'Unverified'}
    </span>
  );
}
