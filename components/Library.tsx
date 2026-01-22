import React, { useEffect, useState } from 'react';
import { GeneratedAnimation } from '../types';
import { Trash2, Download, Copy, Maximize2, Grid } from 'lucide-react';
import { downloadSVG } from '../utils/export';

const Library: React.FC = () => {
  const [items, setItems] = useState<GeneratedAnimation[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('animgen_library');
    if (data) {
      setItems(JSON.parse(data));
    }
  }, []);

  const handleDelete = (id: string) => {
    if (confirm('Delete asset permanently?')) {
      const newItems = items.filter(item => item.id !== id);
      setItems(newItems);
      localStorage.setItem('animgen_library', JSON.stringify(newItems));
    }
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    alert('SVG Copied');
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-dim select-none">
        <div className="w-20 h-20 bg-panel rounded-full flex items-center justify-center mb-6 border border-border">
          <Grid size={32} opacity={0.3} />
        </div>
        <h2 className="text-xl font-bold mb-2 uppercase tracking-wide">Library Empty</h2>
        <p className="text-xs">Generated assets will appear here.</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto p-8 font-sans">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
         <h1 className="text-2xl font-bold text-text uppercase tracking-widest flex items-center gap-3">
           Asset Library <span className="text-sm font-medium text-text-dim bg-panel px-2 py-1 rounded-sm border border-border">{items.length}</span>
         </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {items.map((item) => (
          <div key={item.id} className="group bg-surface rounded-sm border border-border overflow-hidden hover:border-primary transition-all shadow-lg hover:shadow-primary/5">
            <div className="aspect-square bg-[#050505] relative overflow-hidden flex items-center justify-center p-6 transparency-grid">
              <div 
                className="w-full h-full flex items-center justify-center scale-90 transition-transform group-hover:scale-100"
                dangerouslySetInnerHTML={{ __html: item.svgContent }}
              />
              
              {/* Overlay Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-2">
                 <button 
                  onClick={() => handleDelete(item.id)}
                  className="p-2 bg-red-900/80 hover:bg-red-600 text-white rounded-sm backdrop-blur-sm transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 p-3 bg-black/80 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform flex gap-2 justify-center">
                <button 
                  onClick={() => downloadSVG(item.svgContent, item.title)}
                  className="px-3 py-1.5 bg-text text-black text-[10px] font-bold uppercase rounded-sm hover:bg-white transition-colors flex items-center gap-2"
                >
                  <Download size={10} /> Save
                </button>
                <button 
                  onClick={() => copyToClipboard(item.svgContent)}
                  className="px-3 py-1.5 bg-panel border border-border text-text text-[10px] font-bold uppercase rounded-sm hover:bg-border transition-colors flex items-center gap-2"
                >
                  <Copy size={10} /> Copy
                </button>
              </div>
            </div>
            
            <div className="p-3 bg-panel border-t border-border">
              <h3 className="font-bold text-xs text-text mb-1 truncate" title={item.title}>{item.title}</h3>
              <div className="flex items-center justify-between text-[10px] text-text-dim">
                <span className="font-mono">{item.width}×{item.height}</span>
                <span>{new Date(item.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;