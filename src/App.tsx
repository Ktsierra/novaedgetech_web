
import './App.css';
import GalaxyScene from './galaxy/Scene';
import Header from './components/Header';
import { CameraProvider } from './context/CameraContext';
import BlackHoleLoader from './components/BlackHoleLoader';
import useLoading from './hooks/useLoading';

function App() {

  const { loading } = useLoading();


  return (
    <div className="App">
      {loading && <BlackHoleLoader />}
      <CameraProvider>
        <Header />
        <GalaxyScene />
      </CameraProvider>
    </div>
  );
}

export default App;
