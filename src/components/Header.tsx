import logo from '../assets/logo.svg';
import useLoading from '../hooks/useLoading';
import useCamera from '../hooks/useCamera';
import { initialReferencePoints } from '../constants/referencePoints';
import './Header.css';

const Header = () => {
  const { loading } = useLoading();
  const { starSelected, setStarSelected, setStarIndex, setCameraPosition } = useCamera();

  const handleNavClick = (index: number) => {
    const ref = initialReferencePoints[index];
    setStarSelected(true);
    setStarIndex(index);
    setCameraPosition([ref.position.x, ref.position.y, ref.position.z]);
  };

  const handleLogoClick = () => {
    setStarSelected(false);
    setCameraPosition([0, 500, 500]);
  };

  return (
    <div className={`header ${loading || starSelected ? 'goUp' : 'goDown'}`}>
      <div className='header-brand' onClick={handleLogoClick}>
        <img className='header-logo' src={logo} alt='NovaEdge Tech' />
        <h1 className='header-title'>NovaEdge Tech</h1>
      </div>
      <nav className='header-nav'>
        {initialReferencePoints.map((ref, index) => (
          <button
            key={ref.title}
            className='header-nav-link'
            onClick={() => handleNavClick(index)}
          >
            {ref.title}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Header;
