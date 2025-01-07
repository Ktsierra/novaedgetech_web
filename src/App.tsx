
import './App.css';
import Contact from './components/Contact';
import Content from './components/Content';
import Footer from './components/Footer';
import GalaxyScene from './components/GalaxyScene';
import Header from './components/Header';
import Team from './components/Team';
import Video from './components/Video';

function App() {

  return (
    <div className="App">
      <Header />
      <Video />
      <Content />
      <Team />
      <Contact />
      <GalaxyScene />
      <Footer />
    </div>
  );
}

export default App;
