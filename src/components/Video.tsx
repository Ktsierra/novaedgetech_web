import StarryNight from './StarryNight';
import './Video.css';

const Video = () => {


  return (
    <div className="video-container">
      <StarryNight starCount={500} nebulaCount={5} speed={0.05} />
      <div className="video-overlay"></div>
      <div className="video-content">
        <div className='text-box right top'>
          <div className='bubble-right' />
          <h1>Welcome to NovaEdge Tech</h1>
          <p>Our mission is to provide innovative solutions to our clients.</p>
        </div>
        <div className='text-box left middle'>
          <div className='bubble-left' />
          <h1>Welcome to NovaEdge Tech</h1>
          <p>Our mission is to provide innovative solutions to our clients.</p>
        </div>
        <div className='text-box right bottom'>
          <div className='bubble-right' />
          <h1>Welcome to NovaEdge Tech</h1>
          <p>Our mission is to provide innovative solutions to our clients.</p>
        </div>

      </div>
    </div>
  );
};

export default Video;
