
import './App.css';
import Contact from './components/Contact';
import Content from './components/Content';
import Footer from './components/Footer';
import Header from './components/Header';
import Team from './components/Team';
import Video from './components/Video';
// import { Test } from './galaxy/CustomEffect';
import GalaxyScene from './galaxy/Scene';

function App() {

  return (
    <div className="App">
      <Header />
      <GalaxyScene />
      <Video />
      <Content />
      <Team />
      <Contact />
      <Footer />
    </div>
  );
}

export default App;
