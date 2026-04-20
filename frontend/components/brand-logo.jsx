"use client";

export function BrandLogo({ className = "" }) {
  return (
    <img
      className={`brand-logo ${className}`.trim()}
      src="/WalkerMillerSilver.png"
      alt="Walker-Miller Energy Services"
    />
  );
}
