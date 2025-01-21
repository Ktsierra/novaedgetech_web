import { useEffect, useState } from 'react';
import './GalaxyButton.css';

function GalaxyButton({ swapSide, side, title, styles, onClick }:{
    swapSide?: boolean;
    title: string;
    styles?: React.CSSProperties;
    side: 'left' | 'right'
    onClick: () => void;
}) {

  const [instantSide, setInstantSide] = useState(side);

  useEffect(() => {
    if (swapSide) {
      setInstantSide(side === 'left' ? 'right' : 'left');
    } else {
      setInstantSide(side);
    }

    console.log('swapSide', swapSide);
  }, [swapSide, side]);

  return (
    <button
      className={`galaxy-button ${instantSide } `}
      // className={`galaxy-button ${ !swapSide ? side : side === 'left' ? 'right' : 'left' } `}
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
