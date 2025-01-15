import { useState } from 'react';
import './GalaxyButton.css';

function GalaxyButton({ title, styles, side, onClick }:{
    title: string;
    styles?: React.CSSProperties;
    side?: 'left' | 'right';
    onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };




  return (
    <button
      className="galaxy-button"
      style={styles}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <h2 className={`button-title ${side ?? ''}`}>{title}</h2>
      <div className="diamond-icon">
        <div className={`diamond-line ${isHovered ? 'hovered' : ''}`}></div>
        <div className={`diamond-line ${isHovered ? 'hovered' : ''}`}></div>
      </div>
    </button>
  );
}

export default GalaxyButton;
