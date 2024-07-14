import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header/Header';
import Home from './components/Home/Home';
import Register from './components/Register/Register';
import Connexion from './components/Connexion/Connexion';

function App() {
  return (
    <div className="App">

  <Router>
    <Header/>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Connexion />} />
    </Routes>
  </Router>

  
    </div>
  );
}

export default App;
