
import './App.css';
/* import Contact from './unused/Contact';
import Content from './unused/Content';
import Footer from './unused/Footer';
import Team from './unused/Team';
import Video from './unused/Video'; */
import GalaxyScene from './galaxy/Scene';
import Header from './components/Header';
import { CameraProvider } from './context/CameraContext';

function App() {

  return (
    <div className="App">
      <CameraProvider>
      <Header />
      <GalaxyScene />
{/*       <Video />
      <Content />
      <Team />
      <Contact />
      <Footer /> */}
      </CameraProvider>
    </div>
  );
}

export default App;
