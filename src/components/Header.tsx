import logo from '../assets/logo.svg';
import useLoading from '../hooks/useLoading';
import useCamera from '../hooks/useCamera';
import './Header.css';

const Header = () => {
  const { loading } = useLoading();
  const {starSelected} = useCamera();
  console.log(starSelected)
  return (

    <div className={`header ${loading || starSelected ? 'goUp' : 'goDown'}`}>
      <img className='header-logo' src={logo} alt='NovaEdge Tech' />
      <div className='header-text'>
        <h1>
  NovaEdge Tech
        </h1>
      </div>
    </div>


  );
};

export default Header;