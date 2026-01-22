import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Editor from './components/Editor';
import Library from './components/Library';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-background text-slate-200 selection:bg-primary/30 selection:text-white">
        <Header />
        <main>
          <Routes>
            <Route path="/" element={<Editor />} />
            <Route path="/library" element={<Library />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;