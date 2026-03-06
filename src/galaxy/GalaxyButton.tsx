import './GalaxyButton.css';

function GalaxyButton({ side, title, subtitle, styles, onClick }:{
    title: string;
    subtitle: string;
    styles?: React.CSSProperties;
    side: 'left' | 'right'
    onClick: () => void;
}) {

  return (
    <button
      className={`galaxy-button galaxy-button--${side}`}
      style={styles}
      onClick={onClick}
    >
      <div className='galaxy-button__label'>
        <h2 className="galaxy-button__title">{title}</h2>
        <h4 className='galaxy-button__subtitle'>{subtitle}</h4>
      </div>
      <div className="galaxy-button__diamond" />
    </button>
  );
}

export default GalaxyButton;
