import React, { useState, useRef, useEffect } from 'react';
import { Scene } from '../types';

interface MixboardProps {
  scenes: Scene[];
  onUpdate: (id: string, updates: Partial<Scene>) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onRegenerateImage: (id: string) => void;
  onGenerateVideo: (id: string) => void;
  onView: (scene: Scene) => void;
}

export const Mixboard: React.FC<MixboardProps> = ({
  scenes,
  onUpdate,
  onDelete,
  onAdd,
  onRegenerateImage,
  onGenerateVideo,
  onView
}) => {
  // Canvas State
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = useState(false);
  
  // Drag State
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    targetId: string | null; // null means panning canvas
    startX: number;
    startY: number;
    initialX: number; // item or pan initial x
    initialY: number; // item or pan initial y
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [globalPrompt, setGlobalPrompt] = useState("");

  // Initialize positions if missing
  useEffect(() => {
    let hasUpdates = false;
    const updates = new Map<string, Partial<Scene>>();

    scenes.forEach((scene, index) => {
        if (scene.x === undefined || scene.y === undefined) {
            hasUpdates = true;
            // Simple grid layout initialization
            const col = index % 4;
            const row = Math.floor(index / 4);
            updates.set(scene.id, {
                x: col * 320 + 100,
                y: row * 280 + 100,
                width: 280,
                height: 240
            });
        }
    });

    if (hasUpdates) {
        // Batch update implies we should have a batch update method, 
        // but for now we'll just fire individual updates or user can move them.
        // In a real app, use a batch update prop. Here we just force update local logic if needed.
        // Just rely on user to move them or next render cycle for stability.
        updates.forEach((pos, id) => onUpdate(id, pos));
    }
  }, [scenes.length]); // Only run when count changes to avoid loops

  // --- Event Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const newScale = Math.min(Math.max(0.1, scale - e.deltaY * zoomSensitivity), 5);
        setScale(newScale);
    } else {
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent, sceneId?: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (sceneId) {
        // Selecting an item
        if (!e.shiftKey && !selectedIds.has(sceneId)) {
            setSelectedIds(new Set([sceneId]));
        } else if (e.shiftKey) {
            setSelectedIds(prev => {
                const next = new Set(prev);
                if (next.has(sceneId)) next.delete(sceneId);
                else next.add(sceneId);
                return next;
            });
        }

        const scene = scenes.find(s => s.id === sceneId);
        if (!scene) return;

        setDragState({
            isDragging: false,
            targetId: sceneId,
            startX: e.clientX,
            startY: e.clientY,
            initialX: scene.x || 0,
            initialY: scene.y || 0
        });
    } else {
        // Panning Canvas (Clicked background)
        if (!e.shiftKey) setSelectedIds(new Set()); // Deselect all

        setIsPanning(true);
        setDragState({
            isDragging: false,
            targetId: null,
            startX: e.clientX,
            startY: e.clientY,
            initialX: pan.x,
            initialY: pan.y
        });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState) return;

    const dx = (e.clientX - dragState.startX) / (dragState.targetId ? scale : 1);
    const dy = (e.clientY - dragState.startY) / (dragState.targetId ? scale : 1);

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
         if (!dragState.isDragging) {
             setDragState(prev => prev ? ({ ...prev, isDragging: true }) : null);
         }
    }

    if (dragState.targetId) {
        // Moving Item
        onUpdate(dragState.targetId, {
            x: dragState.initialX + dx,
            y: dragState.initialY + dy
        });
    } else {
        // Panning Canvas
        setPan({
            x: dragState.initialX + (e.clientX - dragState.startX), // 1:1 movement for pan
            y: dragState.initialY + (e.clientY - dragState.startY)
        });
    }
  };

  const handlePointerUp = () => {
    setDragState(null);
    setIsPanning(false);
  };

  // --- Render Helpers ---

  const renderConnector = (s1: Scene, s2: Scene) => {
     // A simple curve between scene centers (Sequential logic)
     // In a real mixboard, connectors are data. Here we imply sequence by index order for visualization?
     // Let's NOT draw lines automatically in this free-form mode unless user enabled it.
     // To keep it clean like the screenshot, NO lines by default.
     return null;
  };

  const selectedScene = selectedIds.size === 1 ? scenes.find(s => s.id === Array.from(selectedIds)[0]) : null;

  return (
    <div className="relative w-full h-[85vh] flex flex-col bg-[#F3F4F6] rounded-xl overflow-hidden border border-gray-300 shadow-inner group select-none">
      
      {/* 1. Canvas Area */}
      <div 
        ref={containerRef}
        className={`flex-1 overflow-hidden relative ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onPointerDown={(e) => handlePointerDown(e)}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Background Grid */}
        <div 
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
                backgroundImage: 'radial-gradient(#6B7280 1px, transparent 1px)',
                backgroundSize: `${20 * scale}px ${20 * scale}px`,
                backgroundPosition: `${pan.x}px ${pan.y}px`
            }}
        />

        {/* Transform Layer */}
        <div 
            className="absolute left-0 top-0 transform-gpu origin-top-left transition-transform duration-75 ease-out"
            style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`
            }}
        >
            {scenes.map((scene) => {
                const isSelected = selectedIds.has(scene.id);
                return (
                    <div
                        key={scene.id}
                        className={`absolute flex flex-col bg-white shadow-sm rounded-lg overflow-hidden transition-shadow ${isSelected ? 'ring-2 ring-purple-600 shadow-2xl z-20' : 'hover:shadow-md z-10'}`}
                        style={{
                            left: scene.x || 0,
                            top: scene.y || 0,
                            width: scene.width || 280,
                            // height is auto based on content, or fixed? Let's fix width, auto height
                        }}
                        onPointerDown={(e) => handlePointerDown(e, scene.id)}
                    >
                         {/* Header/Handle */}
                         <div className="h-6 bg-gray-100 border-b border-gray-200 flex items-center justify-between px-2 cursor-move">
                            <span className="text-[10px] font-bold text-gray-500">#{scene.sceneNumber}</span>
                            <div className="flex gap-1">
                                <div className="w-2 h-2 rounded-full bg-red-300"></div>
                                <div className="w-2 h-2 rounded-full bg-yellow-300"></div>
                                <div className="w-2 h-2 rounded-full bg-green-300"></div>
                            </div>
                         </div>

                         {/* Content */}
                         <div className="p-0">
                            <div 
                                className="relative aspect-video bg-gray-200 cursor-pointer"
                                onDoubleClick={() => onView(scene)}
                            >
                                {scene.imageUrl ? (
                                    <img src={scene.imageUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                        {scene.status === 'generating' ? '⏳' : 'No Image'}
                                    </div>
                                )}
                                
                                {scene.videoUrl && (
                                    <div className="absolute top-1 right-1 bg-black/50 text-white text-[8px] px-1 rounded">Video</div>
                                )}
                            </div>
                            <div className="p-3 bg-white">
                                <p className="text-[10px] text-gray-500 font-mono mb-1 truncate">
                                    {scene.imagePrompt.substring(0, 30)}...
                                </p>
                                <p className="text-xs text-gray-800 line-clamp-3 leading-relaxed">
                                    {scene.originalText}
                                </p>
                            </div>
                         </div>

                         {/* Context Toolbar (Visible only when selected) */}
                         {isSelected && (
                             <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-[#2D3748] text-white rounded-lg shadow-xl flex items-center gap-1 p-1 z-30 whitespace-nowrap">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onRegenerateImage(scene.id); }}
                                    className="p-2 hover:bg-gray-600 rounded" title="Regenerate Image"
                                 >
                                    🔄
                                 </button>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onGenerateVideo(scene.id); }}
                                    className="p-2 hover:bg-gray-600 rounded" title="Generate Video"
                                 >
                                    🎥
                                 </button>
                                 <div className="w-px h-4 bg-gray-600 mx-1"></div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete(scene.id); }}
                                    className="p-2 hover:bg-red-600 rounded text-red-300 hover:text-white" title="Delete"
                                 >
                                    🗑️
                                 </button>
                             </div>
                         )}

                         {/* Resize Handle (Visual only for now) */}
                         {isSelected && (
                             <>
                                <div className="absolute top-0 left-0 w-2 h-2 bg-purple-600 -translate-x-1 -translate-y-1 rounded-full border border-white"></div>
                                <div className="absolute top-0 right-0 w-2 h-2 bg-purple-600 translate-x-1 -translate-y-1 rounded-full border border-white"></div>
                                <div className="absolute bottom-0 left-0 w-2 h-2 bg-purple-600 -translate-x-1 translate-y-1 rounded-full border border-white"></div>
                                <div className="absolute bottom-0 right-0 w-2 h-2 bg-purple-600 translate-x-1 translate-y-1 rounded-full border border-white cursor-se-resize"></div>
                             </>
                         )}
                    </div>
                );
            })}
        </div>
        
        {/* Floating Controls (Zoom) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 bg-white/90 backdrop-blur shadow-lg rounded-full px-4 py-2 text-gray-700 z-50">
            <button onClick={() => setScale(s => Math.max(0.1, s - 0.1))} className="hover:text-black font-bold">-</button>
            <span className="text-xs font-mono min-w-[3rem] text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(5, s + 0.1))} className="hover:text-black font-bold">+</button>
        </div>
      </div>

      {/* 2. Bottom Input Bar (Global Action) */}
      <div className="h-16 bg-white border-t border-gray-200 flex items-center px-6 z-40 relative">
          <div className="flex-1 max-w-3xl mx-auto relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <span className="text-xl">✨</span>
              </div>
              <input 
                  type="text" 
                  value={globalPrompt}
                  onChange={(e) => setGlobalPrompt(e.target.value)}
                  placeholder={selectedScene ? `Change selected scene #${selectedScene.sceneNumber}...` : "What do you want to change?"}
                  className="w-full h-10 pl-10 pr-12 rounded-full border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none text-gray-700 shadow-sm transition-all"
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && globalPrompt.trim()) {
                          if (selectedScene) {
                              onUpdate(selectedScene.id, { originalText: globalPrompt, status: 'pending' });
                              onRegenerateImage(selectedScene.id); // Trigger logic
                              setGlobalPrompt("");
                          } else {
                              alert("Please select a scene to edit.");
                          }
                      }
                  }}
              />
              <button 
                 className="absolute inset-y-1 right-1 w-8 h-8 flex items-center justify-center bg-purple-600 text-white rounded-full hover:bg-purple-500 transition-colors"
                 onClick={() => {
                     if (selectedScene && globalPrompt.trim()) {
                        onUpdate(selectedScene.id, { originalText: globalPrompt });
                        onRegenerateImage(selectedScene.id);
                        setGlobalPrompt("");
                     } else if (!selectedScene) {
                        onAdd(); // Logic for "Add" if nothing selected
                     }
                 }}
              >
                  {selectedScene ? '→' : '+'}
              </button>
          </div>
      </div>
    </div>
  );
};