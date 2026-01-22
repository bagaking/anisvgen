import React from 'react';
import { Layers, Library, PlusCircle, Terminal, Box, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path 
    ? "text-primary border-b-2 border-primary" 
    : "text-text-dim hover:text-text border-b-2 border-transparent";

  return (
    <header className="bg-surface border-b border-border sticky top-0 z-50 h-12 flex-none select-none">
      <div className="w-full h-full px-4 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-2 group cursor-pointer">
          <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
             <Sparkles className="text-black" size={14} fill="black" />
          </div>
          <div className="flex flex-col">
             <h1 className="text-xs font-bold text-text tracking-widest uppercase">
               AnimGen<span className="text-primary">PRO</span>
             </h1>
          </div>
        </div>

        {/* Pro Nav */}
        <nav className="flex items-center gap-1 h-full">
          <Link 
            to="/" 
            className={`h-full flex items-center gap-2 px-4 text-xs font-medium uppercase tracking-wide transition-all ${isActive('/')}`}
          >
            <Box size={14} />
            <span>Workspace</span>
          </Link>
          <Link 
            to="/library" 
            className={`h-full flex items-center gap-2 px-4 text-xs font-medium uppercase tracking-wide transition-all ${isActive('/library')}`}
          >
            <Library size={14} />
            <span>Assets</span>
          </Link>
        </nav>
        
        {/* Status / User */}
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
             <span className="text-[10px] font-bold text-text-dim uppercase">System Ready</span>
           </div>
        </div>
      </div>
    </header>
  );
};

export default Header;