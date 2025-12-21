import React from 'react';

const Logo = ({ size = 'default', showText = true }) => {
  const sizes = {
    small: { img: 36, text: 'text-sm' },
    default: { img: 48, text: 'text-base' },
    large: { img: 64, text: 'text-xl' }
  };
  
  const { img: imgSize, text: textSize } = sizes[size] || sizes.default;

  return (
    <div className="flex items-center gap-3">
      {/* Logo Image */}
      <img 
        src="/logo.webp" 
        alt="PREMIDIS Logo" 
        width={imgSize} 
        height={imgSize}
        className="flex-shrink-0 object-contain"
        style={{ borderRadius: '8px' }}
      />
      
      {showText && (
        <span className={`font-bold text-foreground ${textSize}`}>PREMIDIS SARL</span>
      )}
    </div>
  );
};

export default Logo;
