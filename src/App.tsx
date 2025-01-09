
import './App.css';
import Contact from './components/Contact';
import Content from './components/Content';
import Footer from './components/Footer';
import GalaxyScene from './components/GalaxyScene';
import Header from './components/Header';
import Team from './components/Team';
import Video from './components/Video';
import RenderedGalaxy from './components/Galaxy';

function App() {

  return (
    <div className="App">
      <Header />
      <Video />
      <Content />
      <Team />
      <Contact />
      <GalaxyScene />
      <RenderedGalaxy />


      {/*       <div style={{ width: '100vw', height: '100vh', zIndex: -1000}}>
        <iframe
        width={"100%"}
        height={"100%"}
        title="Need some space?"
        frameBorder={0}
        //allow="autoplay; fullscreen; xr-spatial-tracking"
        //xr-spatial-tracking
        //execution-while-out-of-viewport
        //execution-while-not-rendered
        //web-share
        src="https://sketchfab.com/models/d6521362b37b48e3a82bce4911409303/embed?autospin=0&autostart=1&transparent=0&ui_animations=0&ui_infos=0&ui_stop=0&ui_inspector=0&ui_watermark_link=0&ui_watermark=0&ui_hint=0&ui_ar=0&ui_help=0&ui_settings=0&ui_vr=0&ui_fullscreen=0&ui_annotations=0&ui_theme=light">
       </iframe>
      </div> */}
      <Footer />
    </div>
  );
}

export default App;
