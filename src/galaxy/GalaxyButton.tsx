import { Vector3 } from '@react-three/fiber';
import './GalaxyButton.css';

function GalaxyButton({ buttonRef, title, styles, onClick }:{
    buttonRef: 'left' | 'right';
    title: string;
    styles?: React.CSSProperties;
    index: number;
    side: 'left' | 'right' 
    refPosition: Vector3;
    onClick: () => void;
}) {

  return (
    <button
      className={`galaxy-button ${buttonRef ?? ''}`}
      style={styles}
      onClick={onClick}
    >
      <div className='button-title-container'>
        <h2 className="button-title">{title}</h2>
        <h4 className='button-subtitle'>{title}</h4>
      </div>
      <div className="diamond-icon">
        <div className="diamond-line"></div>
        <div className="diamond-line"></div>
      </div>
    </button>
  );
}

export default GalaxyButton;
