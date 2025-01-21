
import './App.css';
import GalaxyScene from './galaxy/Scene';
import Header from './components/Header';
import { CameraProvider } from './context/CameraContext';
import BlackHoleLoader from './components/BlackHoleLoader';

function App() {

  return (
    <div className="App">
      <BlackHoleLoader />
      <CameraProvider>
        <Header />
        <GalaxyScene />
      </CameraProvider>
    </div>
  );
}

export default App;
