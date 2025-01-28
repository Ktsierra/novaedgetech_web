
import './App.css';
import GalaxyScene from './galaxy/Scene';
import Header from './components/Header';
import { CameraProvider } from './context/CameraContext';
import BlackHoleLoader from './components/BlackHoleLoader';
import { GalaxyProvider } from './context/GalaxyContext';
import PresentationCard from './components/PresentationCard';

function App() {

  return (
    <div className="App">
      <BlackHoleLoader />
      <GalaxyProvider>
      <CameraProvider>
        <Header />
        <GalaxyScene />
        <PresentationCard />
      </CameraProvider>
      </GalaxyProvider>
    </div>
  );
}

export default App;
