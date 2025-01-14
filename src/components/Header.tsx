import './Header.css';

const Header = () => {



  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const href = event.currentTarget.getAttribute('href');
    if (href) {
      const targetElement = document.querySelector(href);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (

    <div className='header'>
      <img className='header-logo' src='https://placeholder.co/150' alt='NovaEdge Tech' />
      <div className='header-text'>
        <h1>
  NovaEdge Tech
        </h1>
{/*         <p>
  Welcome to NovaEdge Tech
        </p> */}

      </div>
{/*       <div className='header-menu'>
        <a href='#our-projects' onClick={handleClick}>Our Projects</a>
        <a href='#services' onClick={handleClick}>Services</a>
        <a href='#our-apps' onClick={handleClick}>Our Apps</a>
        <a href='#our-skills' onClick={handleClick}>Our Skills</a>
        <a href='#our-team' onClick={handleClick}>Our Team</a>
        <a href='#contact' onClick={handleClick}>Contact</a>
      </div> */}
    </div>


  );
};

export default Header;