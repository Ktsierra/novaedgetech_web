
import './App.css';
import Contact from './components/Contact';
import Content from './components/Content';
import Footer from './components/Footer';
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
      <Footer />
    </div>
  );
}

export default App;
