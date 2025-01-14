
import React from 'react';
import './Footer.css';

const Footer: React.FC = () => {
  return (
    <div id='footer' className='footer-container'>
      <p>&copy; {new Date().getFullYear()} NovaEdge Tech</p>
    </div>
  );
};

export default Footer;