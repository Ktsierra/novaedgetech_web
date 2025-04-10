import './GalaxyButton.css';

function GalaxyButton({ side, title, styles, onClick }:{
    title: string;
    styles?: React.CSSProperties;
    side: 'left' | 'right'
    onClick: () => void;
}) {

  return (
    <button
      className={`galaxy-button ${side } `}
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
