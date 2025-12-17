import React from 'react';

const Logo = ({ size = 'default', showText = true }) => {
  const sizes = {
    small: { svg: 32, text: 'text-sm' },
    default: { svg: 40, text: 'text-base' },
    large: { svg: 56, text: 'text-xl' }
  };
  
  const { svg: svgSize, text: textSize } = sizes[size] || sizes.default;

  return (
    <div className="flex items-center gap-3">
      {/* Logo SVG - Two interlocking rings (turquoise and purple) */}
      <svg 
        width={svgSize} 
        height={svgSize} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
      >
        {/* Turquoise ring (left, P shape) */}
        <path 
          d="M25 80 C10 80 10 50 25 35 C35 25 55 25 55 45 C55 60 40 60 35 55 C30 50 35 40 45 40"
          stroke="#14B8A6"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path 
          d="M30 35 L30 20"
          stroke="#14B8A6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Purple ring (right, D shape) */}
        <path 
          d="M75 20 C90 20 90 50 75 65 C65 75 45 75 45 55 C45 40 60 40 65 45 C70 50 65 60 55 60"
          stroke="#8B5CF6"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        <path 
          d="M70 65 L70 80"
          stroke="#8B5CF6"
          strokeWidth="8"
          strokeLinecap="round"
        />
        
        {/* Intersection overlay effect */}
        <ellipse 
          cx="50" 
          cy="50" 
          rx="12" 
          ry="15" 
          fill="none"
          stroke="url(#gradient)"
          strokeWidth="6"
          opacity="0.3"
        />
        
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className={`font-bold text-foreground ${textSize}`}>PREMIDIS</span>
          <span className="text-xs text-muted-foreground">HR Platform</span>
        </div>
      )}
    </div>
  );
};

export default Logo;
