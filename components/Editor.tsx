import React, { useState, useRef, useEffect } from 'react';
import { 
  Wand2, Download, Share2, Save, RefreshCw, 
  Settings2, MonitorPlay, Code, Grid, Image as ImageIcon, Loader2, Plus, X, 
  History, RotateCcw, Clock, Play, Pause, BrainCircuit, Lightbulb, ChevronRight, Send, Layers, PenTool, LayoutTemplate, Square
} from 'lucide-react';
import { generateAnimation, refineAnimation } from '../services/gemini';
import { GeneratedAnimation, AnimationStyle } from '../types';
import { downloadSVG, downloadPNG, downloadGIF } from '../utils/export';

const SIZES = [
  { w: 32, h: 32, label: '32px Icon' },
  { w: 64, h: 64, label: '64px App' },
  { w: 128, h: 128, label: '128px Badge' },
  { w: 512, h: 512, label: '512px Asset' },
  { w: 800, h: 600, label: '800x600 Web' },
  { w: 1920, h: 1080, label: '1080p HD' },
  { w: 0, h: 0, label: 'Custom...' },
];

const THINKING_STEPS = [
  "Resolving Geometry...",
  "Calculating Vectors...",
  "Injecting Keyframes...",
  "Optimizing Paths...",
  "Finalizing Render..."
];

const Editor: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [refinePrompt, setRefinePrompt] = useState('');
  const [style, setStyle] = useState<AnimationStyle>(AnimationStyle.RIVE_LIKE);
  const [selectedSize, setSelectedSize] = useState(SIZES.find(s => s.w === 512) || SIZES[0]);
  const [customSize, setCustomSize] = useState({ w: 512, h: 512 });
  const [duration, setDuration] = useState<number>(2);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  
  const [isPaused, setIsPaused] = useState(false);
  const [scrubTime, setScrubTime] = useState(0);

  const [history, setHistory] = useState<GeneratedAnimation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [result, setResult] = useState<GeneratedAnimation | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [thinkingStep, setThinkingStep] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: any;
    if (isGenerating || isRefining) {
      setThinkingStep(0);
      interval = setInterval(() => {
        setThinkingStep(prev => (prev + 1) % THINKING_STEPS.length);
      }, 1200);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isRefining]);

  useEffect(() => {
    if (history.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history.length, isGenerating, isRefining]);

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (file.type === 'image/gif') {
           const img = new Image();
           img.onload = () => {
             const canvas = document.createElement('canvas');
             canvas.width = img.width;
             canvas.height = img.height;
             const ctx = canvas.getContext('2d');
             if (ctx) {
               ctx.drawImage(img, 0, 0);
               resolve(canvas.toDataURL('image/png'));
             } else resolve(result);
           };
           img.onerror = () => resolve(result); 
           img.src = result;
        } else resolve(result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const newFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) newFiles.push(file);
        }
      }
      if (newFiles.length > 0) {
        e.preventDefault();
        try {
          const processed = await Promise.all(newFiles.map(processImageFile));
          setReferenceImages(prev => [...prev, ...processed].slice(0, 3));
        } catch (err) { console.error(err); }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  useEffect(() => {
    if (result) {
        setIsPaused(false);
        setScrubTime(0);
    }
  }, [result?.id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files) as File[];
      const processed = await Promise.all(files.map(processImageFile));
      setReferenceImages(prev => [...prev, ...processed].slice(0, 3));
    }
  };

  const removeImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const getEffectiveSize = () => {
    if (selectedSize.label.startsWith('Custom')) return customSize;
    return { w: selectedSize.w, h: selectedSize.h };
  };

  const generateFilename = (baseTitle: string) => {
    // 1. Sanitize title to English alphanumeric + underscores
    const safeTitle = baseTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40);
    // 2. Generate timestamp YYYYMMDD_HHmmss
    const now = new Date();
    const ts = now.toISOString().replace(/[-:T]/g, '').slice(0, 14); 
    // Format: Title_YYYYMMDDHHmmss
    return `${safeTitle}_${ts}`;
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError(null);
    setRefinePrompt('');

    const { w, h } = getEffectiveSize();

    try {
      const data = await generateAnimation(prompt, w, h, style, duration, referenceImages);
      const newAnim: GeneratedAnimation = {
        id: crypto.randomUUID(), createdAt: Date.now(), prompt, style, width: w, height: h, ...data
      };
      setResult(newAnim);
      setHistory(prev => [...prev, newAnim]);
    } catch (e: any) {
      setError(e.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!result || !refinePrompt.trim()) return;
    setIsRefining(true);
    setError(null);

    const { w, h } = getEffectiveSize();
    
    try {
      const data = await refineAnimation(result.svgContent, refinePrompt, w, h, duration);
      const updated: GeneratedAnimation = {
        ...result, ...data, width: w, height: h, duration: data.duration,
        id: crypto.randomUUID(), createdAt: Date.now(), prompt: refinePrompt, designRationale: data.designRationale
      };
      setResult(updated);
      setHistory(prev => [...prev, updated]);
      setRefinePrompt('');
    } catch (e: any) {
      setError(e.message || "Refinement failed");
    } finally {
      setIsRefining(false);
    }
  };

  const handleRollback = (item: GeneratedAnimation, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setResult(item);
    setDuration(item.duration);
    const predefined = SIZES.find(s => s.w === item.width && s.h === item.height);
    if (predefined) setSelectedSize(predefined);
    else {
       setSelectedSize(SIZES.find(s => s.label.startsWith('Custom'))!);
       setCustomSize({ w: item.width, h: item.height });
    }
  };

  const handleSave = () => {
    if (!result) return;
    const existing = localStorage.getItem('animgen_library');
    const library = existing ? JSON.parse(existing) : [];
    localStorage.setItem('animgen_library', JSON.stringify([result, ...library]));
    alert('Asset saved to library');
  };

  const handleShare = async () => {
    if (result) {
      await navigator.clipboard.writeText(result.svgContent);
      alert('SVG copied to clipboard');
    }
  };

  const handleExport = async (format: 'svg' | 'png' | 'gif') => {
    if (!result) return;
    
    // Strict Filename Generation
    const filename = generateFilename(result.title || 'AnimGen_Asset');
    
    try {
      if (format === 'svg') downloadSVG(result.svgContent, filename);
      else if (format === 'png') await downloadPNG(result.svgContent, result.width, result.height, filename, isPaused ? scrubTime : 0);
      else if (format === 'gif') {
        setIsExporting(true);
        await new Promise(r => setTimeout(r, 50));
        await downloadGIF(result.svgContent, result.width, result.height, filename, result.duration || duration);
        setIsExporting(false);
      }
    } catch (e) {
      console.error(e);
      alert("Export failed: " + (e as Error).message);
      setIsExporting(false);
    }
  };

  const getPreviewSVG = () => {
    if (!result) return '';
    if (!isPaused) return result.svgContent;
    const styleBlock = `<style>svg * { animation-play-state: paused !important; animation-delay: -${scrubTime}s !important; }</style>`;
    return result.svgContent.replace('</svg>', `${styleBlock}</svg>`);
  };

  // --- UI COMPONENTS ---
  
  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-48px)] bg-background text-text overflow-hidden font-sans">
      
      {/* ----------------- COLUMN 1: TOOLSET ----------------- */}
      <div className="w-full lg:w-[300px] bg-surface border-r border-border flex flex-col shrink-0 h-full select-none z-10 shadow-xl">
        <div className="p-3 border-b border-border flex items-center justify-between bg-panel">
          <div className="flex items-center gap-2 text-text font-bold text-xs uppercase tracking-wider">
            <LayoutTemplate size={14} className="text-primary"/> Properties
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin">
          {/* Prompt Group */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-dim uppercase flex items-center gap-1.5">
              <PenTool size={10} /> Description
            </label>
            <div className="relative group">
              <textarea 
                className="w-full bg-input border border-border rounded-sm p-3 text-xs font-medium focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none h-24 text-text placeholder-text-dim/30 shadow-inner"
                placeholder="Describe motion, shapes, colors..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating}
              />
              <div className="absolute bottom-2 right-2 text-[10px] text-text-dim opacity-50">{prompt.length} chars</div>
            </div>
          </div>

          {/* Settings Group */}
          <div className="space-y-4">
             <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-dim uppercase">Visual Style</label>
              <select 
                className="w-full bg-panel border border-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-primary outline-none text-text appearance-none hover:bg-border transition-colors cursor-pointer"
                value={style}
                onChange={(e) => setStyle(e.target.value as AnimationStyle)}
                disabled={isGenerating}
              >
                {Object.values(AnimationStyle).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-text-dim uppercase">Resolution</label>
              <div className="grid grid-cols-1 gap-2">
                <select 
                  className="w-full bg-panel border border-border rounded-sm p-2 text-xs focus:ring-1 focus:ring-primary outline-none text-text appearance-none hover:bg-border transition-colors cursor-pointer"
                  value={JSON.stringify(selectedSize)}
                  onChange={(e) => setSelectedSize(JSON.parse(e.target.value))}
                  disabled={isGenerating}
                >
                  {SIZES.map((s) => <option key={s.label} value={JSON.stringify(s)}>{s.label}</option>)}
                </select>
                {selectedSize.label.startsWith('Custom') && (
                  <div className="flex gap-2">
                    <div className="relative w-full">
                       <span className="absolute left-2 top-1.5 text-[10px] text-text-dim">W</span>
                       <input type="number" value={customSize.w} onChange={(e) => setCustomSize({...customSize, w: parseInt(e.target.value)})} className="w-full bg-input border border-border rounded-sm py-1.5 pl-6 pr-2 text-xs text-right outline-none focus:border-primary"/>
                    </div>
                    <div className="relative w-full">
                       <span className="absolute left-2 top-1.5 text-[10px] text-text-dim">H</span>
                       <input type="number" value={customSize.h} onChange={(e) => setCustomSize({...customSize, h: parseInt(e.target.value)})} className="w-full bg-input border border-border rounded-sm py-1.5 pl-6 pr-2 text-xs text-right outline-none focus:border-primary"/>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/50">
               <div className="flex justify-between items-center">
                 <label className="text-[10px] font-bold text-text-dim uppercase flex items-center gap-1.5"><Clock size={10}/> Loop Duration</label>
                 <span className="text-[10px] font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{duration.toFixed(1)}s</span>
               </div>
               <input 
                 type="range" min="0.5" max="10" step="0.5" 
                 value={duration} onChange={(e) => setDuration(parseFloat(e.target.value))}
                 className="w-full h-1 bg-border rounded-lg appearance-none cursor-pointer accent-primary"
                 disabled={isGenerating}
               />
             </div>
          </div>

          {/* References */}
          <div className="space-y-2 pt-2 border-t border-border/50">
            <label className="text-[10px] font-bold text-text-dim uppercase flex justify-between">
              Ref Images <span className="opacity-50 text-[9px]">{referenceImages.length}/3</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
                {referenceImages.map((img, idx) => (
                  <div key={idx} className="relative aspect-square group">
                    <img src={img} alt="Ref" className="w-full h-full object-cover rounded-sm border border-border opacity-70 group-hover:opacity-100 transition-opacity" />
                    <button onClick={() => removeImage(idx)} className="absolute -top-1 -right-1 bg-surface border border-border rounded-sm p-0.5 text-text-dim hover:text-red-400 opacity-0 group-hover:opacity-100"><X size={8}/></button>
                  </div>
                ))}
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-sm border border-dashed border-border hover:border-primary flex items-center justify-center text-text-dim hover:text-primary transition-colors bg-panel hover:bg-border"
                  title="Add Reference (or Paste)"
                >
                  <Plus size={12} />
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" multiple onChange={handleImageUpload} />
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border bg-panel">
          <button 
            onClick={handleGenerate}
            disabled={isGenerating || isRefining || !prompt.trim()}
            className="w-full h-10 rounded-sm font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-2 transition-all bg-primary hover:bg-primary-hover text-black disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            {isGenerating ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} strokeWidth={2.5} />}
            Generate Asset
          </button>
        </div>
      </div>

      {/* ----------------- COLUMN 2: VIEWPORT ----------------- */}
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        {/* Viewport Header */}
        <div className="h-9 bg-surface border-b border-border flex items-center px-4 justify-between select-none">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">Viewport</span>
              {result && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">{result.width} × {result.height} px</span>}
           </div>
           <div className="flex items-center gap-2">
             <button onClick={() => setShowGrid(!showGrid)} className={`p-1.5 rounded-sm hover:bg-panel transition-colors ${showGrid ? 'text-primary' : 'text-text-dim'}`} title="Toggle Transparency Grid"><Grid size={14}/></button>
           </div>
        </div>

        {/* Infinite Canvas Feel */}
        <div className={`flex-1 flex items-center justify-center p-12 overflow-hidden relative ${showGrid ? 'transparency-grid' : 'bg-[#050505]'}`}>
           {result && !isGenerating && !isRefining ? (
             <div 
               className="shadow-2xl shadow-black ring-1 ring-[#333]"
               dangerouslySetInnerHTML={{ __html: getPreviewSVG() }}
               style={{ width: result.width, height: result.height, maxWidth: '100%', maxHeight: '100%' }}
             />
           ) : isGenerating || isRefining ? (
             <div className="flex flex-col items-center justify-center gap-6">
                <div className="w-16 h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin"></div>
                <div className="text-center space-y-1">
                   <div className="font-bold text-primary text-xs uppercase tracking-widest animate-pulse">
                      {isRefining ? "Refining Geometry" : "Generating Vector"}
                   </div>
                   <div className="font-mono text-text-dim text-[10px]">
                      {THINKING_STEPS[thinkingStep]}
                   </div>
                </div>
             </div>
           ) : (
             <div className="text-center text-text-dim/20 select-none">
               <Square size={80} strokeWidth={0.5} className="mx-auto mb-4" />
               <p className="font-medium text-xs uppercase tracking-widest">No Active Asset</p>
             </div>
           )}
        </div>

        {/* Timeline / Action Footer */}
        {result && !isGenerating && !isRefining && (
          <div className="bg-surface border-t border-border flex flex-col">
            {/* Timeline */}
            <div className="h-8 flex items-center px-4 gap-4 border-b border-border/50">
                <button onClick={() => setIsPaused(!isPaused)} className="text-text hover:text-white transition-colors">
                  {isPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
                </button>
                <div className="flex-1 relative h-full flex items-center group">
                   <div className="absolute inset-x-0 h-1 bg-border rounded-full overflow-hidden">
                      <div className="h-full bg-primary/30" style={{width: `${(scrubTime / (result.duration || duration)) * 100}%`}}></div>
                   </div>
                   <input 
                      type="range" min="0" max={result.duration || duration} step="0.01"
                      value={scrubTime}
                      onChange={(e) => { setScrubTime(parseFloat(e.target.value)); setIsPaused(true); }}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                   />
                   {/* Scrubber Knob (Visual Only) */}
                   <div 
                      className="absolute h-3 w-1 bg-primary rounded-full pointer-events-none transition-all" 
                      style={{left: `${(scrubTime / (result.duration || duration)) * 100}%`}}
                   ></div>
                </div>
                <span className="text-[10px] font-mono text-text-dim w-10 text-right">{scrubTime.toFixed(2)}s</span>
            </div>

            {/* Actions */}
            <div className="p-2 flex justify-between items-center bg-panel">
               <div className="flex gap-1">
                 <button onClick={handleShare} className="h-8 px-3 rounded-sm bg-surface hover:bg-border text-text-dim hover:text-text text-xs font-medium border border-border transition-colors flex items-center gap-2">
                   <Share2 size={12}/> Copy SVG
                 </button>
                 <button onClick={handleSave} className="h-8 px-3 rounded-sm bg-surface hover:bg-border text-text-dim hover:text-text text-xs font-medium border border-border transition-colors flex items-center gap-2">
                   <Save size={12}/> Save
                 </button>
               </div>
               <div className="flex gap-1">
                 <button onClick={() => handleExport('png')} className="h-8 px-3 rounded-sm bg-surface hover:bg-border text-text-dim hover:text-text text-xs font-medium border border-border transition-colors flex items-center gap-2">
                   <ImageIcon size={12}/> PNG
                 </button>
                 <button onClick={() => handleExport('svg')} className="h-8 px-3 rounded-sm bg-surface hover:bg-border text-text-dim hover:text-text text-xs font-medium border border-border transition-colors flex items-center gap-2">
                   <Code size={12}/> SVG
                 </button>
                 <button 
                   onClick={() => handleExport('gif')} 
                   className="h-8 px-3 rounded-sm bg-primary hover:bg-primary-hover text-black text-xs font-bold border border-primary transition-colors flex items-center gap-2 shadow-lg shadow-primary/10"
                 >
                   {isExporting ? <Loader2 size={12} className="animate-spin"/> : <Download size={12}/>} GIF
                 </button>
               </div>
            </div>
          </div>
        )}
      </div>

      {/* ----------------- COLUMN 3: HISTORY / INSPECTOR ----------------- */}
      <div className="w-full lg:w-[320px] bg-surface border-l border-border flex flex-col shrink-0 h-full text-xs z-10 shadow-xl">
         <div className="p-3 border-b border-border flex items-center justify-between bg-panel">
            <div className="flex items-center gap-2 text-text font-bold text-xs uppercase tracking-wider">
               <Layers size={14} className="text-primary"/> History Stack
            </div>
            <div className="text-[10px] text-text-dim">{history.length} Steps</div>
         </div>
         
         <div className="flex-1 overflow-y-auto p-0 scrollbar-thin bg-background">
            {history.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-text-dim/30">
                  <History size={32} strokeWidth={1} className="mb-2"/>
                  <p>No history yet</p>
               </div>
            ) : (
               history.map((item, index) => {
                  const isActive = result?.id === item.id;
                  return (
                    <div 
                      key={item.id} 
                      className={`group border-b border-border transition-colors cursor-pointer relative ${isActive ? 'bg-surface' : 'bg-transparent hover:bg-surface/50'}`}
                      onClick={(e) => handleRollback(item, e)}
                    >
                       {/* Active Indicator Line */}
                       {isActive && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary"></div>}
                       
                       <div className="p-3 flex gap-3">
                          {/* Thumbnail */}
                          <div className="w-12 h-12 bg-background border border-border rounded-sm shrink-0 overflow-hidden relative">
                             <div className="absolute inset-0 flex items-center justify-center opacity-80">
                                <div className="w-full h-full scale-75" dangerouslySetInnerHTML={{ __html: item.svgContent }} />
                             </div>
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                             <div className="flex justify-between items-start mb-1">
                                <span className={`font-bold truncate ${isActive ? 'text-primary' : 'text-text'}`}>
                                   {item.title || "Untitled Asset"}
                                </span>
                                <span className="text-[9px] text-text-dim">{new Date(item.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                             </div>
                             <p className="text-text-dim truncate text-[10px] mb-1.5 opacity-80">{item.prompt}</p>
                             
                             {/* Rationale Snippet */}
                             {item.designRationale && isActive && (
                                <div className="mt-2 p-2 bg-panel rounded-sm border border-border text-text-dim/90 leading-relaxed whitespace-pre-line text-[10px]">
                                   <div className="flex items-center gap-1 text-primary mb-1 uppercase tracking-wider font-bold text-[9px]">
                                      <BrainCircuit size={10}/> Agent Thought
                                   </div>
                                   {item.designRationale}
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                  );
               })
            )}
            <div ref={chatEndRef} />
         </div>

         {/* Refine Input */}
         <div className="p-3 bg-panel border-t border-border">
             <div className="mb-1.5 flex justify-between items-center text-[10px] font-bold text-text-dim uppercase">
                <span>Refine Active Asset</span>
                {result && <span className="text-primary">{result.width}×{result.height}</span>}
             </div>
             <div className="relative">
                <textarea 
                  className="w-full bg-input border border-border rounded-sm p-3 pr-10 text-xs text-text outline-none focus:border-primary placeholder-text-dim/30 resize-none h-16 shadow-inner"
                  placeholder={result ? "E.g. 'Make it faster', 'Change blue to red'..." : "Select an asset to refine..."}
                  value={refinePrompt}
                  onChange={(e) => setRefinePrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleRefine(); } }}
                  disabled={!result || isRefining}
                />
                <button 
                   onClick={handleRefine}
                   disabled={!result || isRefining || !refinePrompt.trim()}
                   className="absolute bottom-2 right-2 p-1.5 bg-primary hover:bg-primary-hover text-black rounded-sm disabled:opacity-0 transition-all"
                >
                   {isRefining ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                </button>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Editor;