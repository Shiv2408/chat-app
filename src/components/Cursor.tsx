import React from 'react';

const CursorSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translate(-2px, -2px)' }}>
    <path d="M5.29289 4.29289C5.68342 3.90237 6.31658 3.90237 6.70711 4.29289L18.7071 16.2929C19.0976 16.6834 19.0976 17.3166 18.7071 17.7071C18.3166 18.0976 17.6834 18.0976 17.2929 17.7071L12 12.4142L10.2929 14.1213C9.90237 14.5118 9.2692 14.5118 8.87868 14.1213L4.29289 9.53553C3.90237 9.14501 3.90237 8.51184 4.29289 8.12132L5.29289 4.29289Z" fill="currentColor" />
  </svg>
);

interface CursorProps {
  point: { x: number; y: number } | null;
  color: string;
  name: string;
}

const Cursor: React.FC<CursorProps> = ({ point, color, name }) => {
  if (!point || point.x === null || point.y === null) return null;
  return (
    <div className="absolute top-0 left-0 transition-transform duration-75 ease-in-out pointer-events-none" style={{ transform: `translate(${point.x}px, ${point.y}px)`, color: color, zIndex: 9999 }}>
      <CursorSvg />
      <span className="block px-2 py-1 ml-4 text-sm text-white bg-gray-800 rounded-full">{name}</span>
    </div>
  );
};

export default Cursor;