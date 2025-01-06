import './Video.css';

const Video = () => {
  return (
    <div className="video-container">
      <video autoPlay muted loop className="video">
        <source src="https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4" type="video/mp4" />
      </video>
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
