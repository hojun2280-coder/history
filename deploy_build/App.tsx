import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SettingsPanel } from './components/SettingsPanel';
import { SceneCard } from './components/SceneCard';
import { CharacterCard } from './components/CharacterCard';
import { Mixboard } from './components/Mixboard';
import { analyzeScript, generateImage, generateVideo } from './services/geminiService';
import { AspectRatio, Engine, GenerationSettings, Resolution, Scene, Character, VideoSettings, GeneratedAsset } from './types';

// Constants
const MAX_CONCURRENCY = 3; 

export default function App() {
  // Data State
  const [scriptParts, setScriptParts] = useState<string[]>(["", ""]); 
  const [activePartIndex, setActivePartIndex] = useState(0);

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  
  // UI State
  const [isTableView, setIsTableView] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Mixboard Mode State
  const [isMixboardMode, setIsMixboardMode] = useState(false);

  // Advanced Lightbox/Modal State
  const [selectedItem, setSelectedItem] = useState<{ type: 'scene' | 'character', data: Scene | Character } | null>(null);
  const [activeHistoryUrl, setActiveHistoryUrl] = useState<string | null>(null);

  // Video Modal State
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [targetSceneId, setTargetSceneId] = useState<string | null>(null);
  const [currentVideoPrompt, setCurrentVideoPrompt] = useState<string>(""); 
  const [videoSettings, setVideoSettings] = useState<VideoSettings>({
      model: 'veo-3.1-fast-generate-preview',
      resolution: '720p'
  });

  // Settings
  const [settings, setSettings] = useState<GenerationSettings>({
    aspectRatio: AspectRatio.LANDSCAPE,
    resolution: Resolution.RES_1K,
    engine: Engine.NANO_BANANA, // Default changed to Fast engine
    targetSceneCount: 20, 
    totalParts: 1 
  });

  const processingQueue = useRef<boolean>(false);

  // Sync scriptParts size with settings.totalParts
  useEffect(() => {
    setScriptParts(prev => {
        const targetLength = settings.totalParts + 1;
        if (prev.length === targetLength) return prev;
        const newParts = [...prev];
        if (newParts.length < targetLength) {
            while (newParts.length < targetLength) newParts.push("");
        } else {
            return newParts.slice(0, targetLength);
        }
        return newParts;
    });
    if (activePartIndex >= settings.totalParts + 1) {
        setActivePartIndex(settings.totalParts);
    }
  }, [settings.totalParts]);

  // Sync Modal selection if underlying data changes
  useEffect(() => {
    if (selectedItem) {
        if (selectedItem.type === 'scene') {
            const updated = scenes.find(s => s.id === selectedItem.data.id);
            if (updated) setSelectedItem({ type: 'scene', data: updated });
        } else {
            const updated = characters.find(c => c.id === selectedItem.data.id);
            if (updated) setSelectedItem({ type: 'character', data: updated });
        }
    }
  }, [scenes, characters]);


  // --- Core Generation Logic ---

  const generateSingleImage = async (id: string, type: 'character' | 'scene', characterData?: Character) => {
    const isCharacter = type === 'character';
    
    if (isCharacter) {
        setCharacters(prev => prev.map(c => c.id === id ? { ...c, status: 'generating' } : c));
    } else {
        setScenes(prev => prev.map(s => s.id === id ? { ...s, status: 'generating' } : s));
    }

    try {
        let prompt = "";
        let originalText = "";

        if (isCharacter) {
            const char = characterData || characters.find(c => c.id === id);
            if (!char) return;
            prompt = `Solo close-up portrait of ONE single person named ${char.name}, ${char.description}, looking at camera, historical drama style, plain background, high quality, highly detailed face`;
            originalText = char.description;
        } else {
            const scene = scenes.find(s => s.id === id);
            if (!scene) return;
            // If the user updated originalText in Mixboard, we should re-prompt engineering ideally,
            // but for simplicity here we assume imagePrompt was updated or we just use originalText as context.
            // In a real app, you might want to call LLM to update imagePrompt from originalText.
            prompt = scene.imagePrompt || scene.originalText; 
            originalText = scene.originalText;
        }

        const imageUrl = await generateImage(
            prompt,
            settings.engine,
            isCharacter ? AspectRatio.SQUARE : settings.aspectRatio,
            settings.resolution
        );

        const newAsset: GeneratedAsset = {
            id: crypto.randomUUID(),
            url: imageUrl,
            prompt: prompt,
            createdAt: Date.now(),
            videoStatus: 'pending'
        };

        if (isCharacter) {
            setCharacters(prev => prev.map(c => c.id === id ? { 
                ...c, 
                status: 'completed', 
                imageUrl,
                history: [newAsset, ...c.history] 
            } : c));
        } else {
            setScenes(prev => prev.map(s => s.id === id ? { 
                ...s, 
                status: 'completed', 
                imageUrl,
                history: [newAsset, ...s.history] 
            } : s));
        }
        
        if (selectedItem && selectedItem.data.id === id) {
            setActiveHistoryUrl(imageUrl);
        }

    } catch (err: any) {
        if (isCharacter) {
            setCharacters(prev => prev.map(c => c.id === id ? { ...c, status: 'failed', error: err.message } : c));
        } else {
            setScenes(prev => prev.map(s => s.id === id ? { ...s, status: 'failed', error: err.message } : s));
        }
    }
  };

  // --- Mixboard Manipulation Logic ---

  const handleSceneReorder = (fromIndex: number, toIndex: number) => {
    // Only used in Grid Mode now
    const updated = [...scenes];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, moved);
    setScenes(updated);
  };

  const handleSceneUpdate = (id: string, updates: Partial<Scene>) => {
    setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleSceneDelete = (id: string) => {
      if(confirm('이 장면을 정말 삭제하시겠습니까?')) {
          setScenes(prev => prev.filter(s => s.id !== id));
      }
  };

  const handleSceneAdd = () => {
      const newScene: Scene = {
          id: crypto.randomUUID(),
          sceneNumber: scenes.length + 1,
          originalText: '새로운 아이디어',
          imagePrompt: 'A creative new scene...',
          videoPrompt: '',
          status: 'pending',
          history: [],
          x: 100,
          y: 100,
          width: 280,
          height: 240
      };
      setScenes(prev => [...prev, newScene]);
  };


  // --- Actions ---

  const handleScriptPartChange = (text: string) => {
    setScriptParts(prev => {
        const next = [...prev];
        next[activePartIndex] = text;
        return next;
    });
  };

  const handleAnalyze = async () => {
    if (scriptParts.every(p => p.trim().length === 0)) {
        alert("대본을 입력해주세요.");
        return;
    }

    setIsAnalyzing(true);
    
    try {
      const result = await analyzeScript(scriptParts, settings.targetSceneCount);
      
      setScenes(prevScenes => {
          const preservedScenes = new Map<number, Scene>();
          
          prevScenes.forEach(s => {
              if (s.imageUrl || s.status === 'completed') {
                  preservedScenes.set(s.sceneNumber, s);
              }
          });

          return result.scenes.map((newScene, idx) => {
              // Initialize coordinates for new scenes
              const col = idx % 4;
              const row = Math.floor(idx / 4);
              const defaultPos = {
                  x: col * 320 + 100,
                  y: row * 280 + 100,
                  width: 280,
                  height: 240
              };

              if (preservedScenes.has(newScene.sceneNumber)) {
                  const oldScene = preservedScenes.get(newScene.sceneNumber)!;
                  return {
                      ...oldScene,
                      originalText: newScene.originalText,
                      imagePrompt: newScene.imagePrompt,
                      videoPrompt: newScene.videoPrompt
                  };
              }
              return { ...newScene, ...defaultPos };
          });
      });

      setCharacters(prevChars => {
          const preservedChars = new Map<string, Character>();
          prevChars.forEach(c => {
              if (c.imageUrl || c.status === 'completed') {
                  preservedChars.set(c.name, c);
              }
          });

          return result.characters.map(newChar => {
              if (preservedChars.has(newChar.name)) {
                  const oldChar = preservedChars.get(newChar.name)!;
                  return {
                      ...oldChar,
                      description: newChar.description 
                  };
              }
              return newChar;
          });
      });

      setTimeout(() => {
        setCharacters(chars => {
            chars.forEach(c => {
                if (c.status === 'pending' && !c.imageUrl) {
                    generateSingleImage(c.id, 'character', c);
                }
            });
            return chars;
        });
      }, 500);

    } catch (error) {
      alert("분석 실패. API 키 또는 대본 내용을 확인하세요.");
      console.error(error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const runGenerationQueue = useCallback(async (targets: Scene[]) => {
    if (processingQueue.current) return; 
    processingQueue.current = true;
    setIsGenerating(true);

    const queue = [...targets];
    const activePromises: Promise<void>[] = [];

    const processNext = async () => {
        if (queue.length === 0) return;
        const scene = queue.shift();
        if (!scene) return;

        const promise = generateSingleImage(scene.id, 'scene').then(() => {
            activePromises.splice(activePromises.indexOf(promise), 1);
        });
        
        activePromises.push(promise);
        if (queue.length > 0 && activePromises.length < MAX_CONCURRENCY) processNext();
        await promise; 
        if (queue.length > 0) await processNext();
    };

    const initialBatchSize = Math.min(MAX_CONCURRENCY, queue.length);
    const initialPromises = [];
    for (let i = 0; i < initialBatchSize; i++) initialPromises.push(processNext());

    await Promise.all(initialPromises);
    processingQueue.current = false;
    setIsGenerating(false);
  }, [scenes, settings, characters]);

  const handleStartSceneGeneration = () => {
    const pendingScenes = scenes.filter(s => s.status === 'pending' || s.status === 'failed');
    
    if (pendingScenes.length === 0) {
        if (confirm("모든 장면이 이미 생성되었습니다. 전체를 다시 생성하시겠습니까?")) {
            runGenerationQueue(scenes);
        }
    } else {
        runGenerationQueue(pendingScenes);
    }
  };

  const handleDownload = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      console.error(e);
      alert("다운로드 실패");
    }
  };

  const handleDownloadAll = async () => {
     if (!confirm(`총 ${scenes.filter(s => s.imageUrl).length}장의 이미지를 다운로드합니다. 브라우저 설정에서 여러 파일 다운로드를 허용해주세요.`)) return;
     const completed = scenes.filter(s => s.imageUrl);
     for (const s of completed) {
         handleDownload(s.imageUrl!, `scene_${s.sceneNumber.toString().padStart(3, '0')}.png`);
         await new Promise(r => setTimeout(r, 500)); 
     }
  };

  // --- Modal / Video Logic ---
  
  const openDetailModal = (item: { type: 'scene' | 'character', data: Scene | Character }) => {
      setSelectedItem(item);
      setActiveHistoryUrl(item.data.imageUrl || null);
  };

  const closeDetailModal = () => {
      setSelectedItem(null);
      setActiveHistoryUrl(null);
  };

  const openVideoModal = (sceneId: string, specificImageUrl?: string) => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    setTargetSceneId(sceneId);
    setCurrentVideoPrompt(scene.videoPrompt || scene.originalText);
    setVideoModalOpen(true);
  };

  const handleGenerateVideo = async () => {
      if (!targetSceneId) return;
      setVideoModalOpen(false); 
      
      const scene = scenes.find(s => s.id === targetSceneId);
      
      const sourceImageUrl = (selectedItem && selectedItem.data.id === targetSceneId && activeHistoryUrl) 
            ? activeHistoryUrl 
            : scene?.imageUrl;

      if (!scene || !sourceImageUrl) return;

      const win = window as any;
      if (win.aistudio) {
        const hasKey = await win.aistudio.hasSelectedApiKey();
        if (!hasKey) {
            try { await win.aistudio.openSelectKey(); } catch (e) { alert("결제된 API 키가 필요합니다."); return; }
        }
      }

      setScenes(prev => prev.map(s => {
          if (s.id !== targetSceneId) return s;
          const updatedHistory = s.history.map(asset => {
              if (asset.url === sourceImageUrl) {
                  return { ...asset, videoStatus: 'generating' as const };
              }
              return asset;
          });
          return { 
              ...s, 
              history: updatedHistory,
              videoStatus: (s.imageUrl === sourceImageUrl) ? 'generating' : s.videoStatus 
          };
      }));

      try {
          const videoUrl = await generateVideo(sourceImageUrl, currentVideoPrompt, videoSettings);
          
          setScenes(prev => prev.map(s => {
            if (s.id !== targetSceneId) return s;
            const updatedHistory = s.history.map(asset => {
                if (asset.url === sourceImageUrl) {
                    return { ...asset, videoStatus: 'completed' as const, videoUrl };
                }
                return asset;
            });
            return { 
                ...s, 
                history: updatedHistory,
                videoStatus: (s.imageUrl === sourceImageUrl) ? 'completed' : s.videoStatus,
                videoUrl: (s.imageUrl === sourceImageUrl) ? videoUrl : s.videoUrl
            };
        }));

      } catch (e) {
          console.error(e);
          setScenes(prev => prev.map(s => {
            if (s.id !== targetSceneId) return s;
            const updatedHistory = s.history.map(asset => {
                if (asset.url === sourceImageUrl) {
                    return { ...asset, videoStatus: 'failed' as const };
                }
                return asset;
            });
            return { 
                ...s, 
                history: updatedHistory,
                videoStatus: (s.imageUrl === sourceImageUrl) ? 'failed' : s.videoStatus 
            };
        }));
          alert("비디오 생성 실패.");
      }
  };

  const completedCount = scenes.filter(s => s.status === 'completed').length;
  const activeAsset = selectedItem && selectedItem.data.history.find(h => h.url === activeHistoryUrl);
  const totalCharCount = scriptParts.reduce((acc, curr) => acc + curr.length, 0);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-30 shadow-md">
        <div className="max-w-screen-2xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold">W</div>
                <h1 className="text-lg font-bold">World Story Illustrator <span className="text-xs font-normal text-gray-400 ml-2">v4.0 Mixboard</span></h1>
            </div>
            <div className="flex items-center gap-4">
                {!isMixboardMode && (
                    <div className="flex bg-gray-700 rounded-lg p-1">
                        <button onClick={() => setIsTableView(false)} className={`px-3 py-1 rounded-md text-sm ${!isTableView ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}>Grid</button>
                        <button onClick={() => setIsTableView(true)} className={`px-3 py-1 rounded-md text-sm ${isTableView ? 'bg-gray-600 text-white shadow' : 'text-gray-400'}`}>List</button>
                    </div>
                )}
                {completedCount > 0 && (
                     <button onClick={handleDownloadAll} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded text-gray-200 flex items-center gap-2"><span>📦</span> 전체 다운로드</button>
                )}
            </div>
        </div>
      </header>

      <main className="flex-1 max-w-screen-2xl mx-auto w-full p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
            <SettingsPanel 
                settings={settings} 
                setSettings={setSettings} 
                disabled={isGenerating || isAnalyzing}
                isMixboardMode={isMixboardMode}
                setMixboardMode={setIsMixboardMode}
            />
            {!isMixboardMode && (
                <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 text-sm">
                    <div className="flex justify-between mb-1"><span className="text-gray-400">진행률</span><span>{Math.round((completedCount / (scenes.length || 1)) * 100)}%</span></div>
                    <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden"><div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(completedCount / (scenes.length || 1)) * 100}%` }} /></div>
                </div>
            )}
        </div>

        <div className="lg:col-span-9 space-y-6">
            
            {/* Conditional Rendering based on Mode */}
            {isMixboardMode ? (
                // --- MIXBOARD MODE ---
                <Mixboard 
                    scenes={scenes}
                    onUpdate={handleSceneUpdate}
                    onDelete={handleSceneDelete}
                    onAdd={handleSceneAdd}
                    onRegenerateImage={(id) => generateSingleImage(id, 'scene')}
                    onGenerateVideo={(id) => openVideoModal(id)}
                    onView={(s) => openDetailModal({ type: 'scene', data: s })}
                />
            ) : (
                // --- STANDARD MODE ---
                <>
                    {/* Script Input Area */}
                    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-bold text-gray-300">대본 입력 (Script Parts)</h2>
                            <span className="text-xs text-gray-500">총 {totalCharCount.toLocaleString()}자</span>
                        </div>
                        
                        <div className="flex border-b border-gray-700 mb-0 overflow-x-auto">
                            {scriptParts.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setActivePartIndex(index)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                        activePartIndex === index 
                                        ? (index === 0 ? 'border-red-500 text-red-400' : 'border-blue-500 text-blue-400')
                                        : 'border-transparent text-gray-400 hover:text-gray-200'
                                    }`}
                                >
                                    {index === 0 ? "Intro (갈등/Climax)" : `Part ${index}`}
                                </button>
                            ))}
                        </div>

                        <textarea 
                            className="w-full h-64 bg-gray-900 border border-t-0 border-gray-600 rounded-b-lg p-3 text-sm text-gray-200 focus:ring-2 focus:ring-blue-500 mb-4 font-mono leading-relaxed resize-none" 
                            placeholder={
                                activePartIndex === 0 
                                ? "이곳은 갈등이 가장 고조되는 '인트로(Intro)' 구간입니다..." 
                                : `Part ${activePartIndex} 대본을 입력하세요...`
                            }
                            value={scriptParts[activePartIndex]} 
                            onChange={(e) => handleScriptPartChange(e.target.value)}
                        />

                        <div className="flex justify-between items-center">
                            <div className="text-xs text-gray-500 flex gap-4">
                                <span>현재 파트: {scriptParts[activePartIndex].length.toLocaleString()} 자</span>
                            </div>
                            <button onClick={handleAnalyze} disabled={isAnalyzing} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 disabled:opacity-50">
                                {isAnalyzing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        <span>분석 중...</span>
                                    </>
                                ) : (
                                    '1. 대본 종합 분석'
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Characters */}
                    {characters.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2"><span className="bg-gray-700 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">2</span>주요 등장인물 (자동 추출)</h2>
                                <button onClick={() => characters.forEach(c => generateSingleImage(c.id, 'character'))} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white">전체 재생성</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {characters.map(char => (
                                    <CharacterCard key={char.id} character={char} onGenerate={(id) => generateSingleImage(id, 'character')} onView={(c) => openDetailModal({ type: 'character', data: c })}/>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Scenes */}
                    {scenes.length > 0 && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between mt-8">
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <span className="bg-gray-700 w-6 h-6 rounded-full inline-flex items-center justify-center text-xs">3</span>
                                    스토리보드 (총 {scenes.length}컷)
                                </h2>
                                <button onClick={handleStartSceneGeneration} disabled={isGenerating} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg shadow-green-900/20 disabled:opacity-50 flex items-center gap-2">
                                    {isGenerating ? '순차 생성 중...' : '전체 이미지 생성 시작'}
                                </button>
                            </div>
                            
                            <div className={isTableView ? "flex flex-col border border-gray-700 rounded-lg overflow-hidden" : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
                                {scenes.map(scene => (
                                    <SceneCard key={scene.id} scene={scene} isTableView={isTableView} onRetry={(id) => generateSingleImage(id, 'scene')} onGenerateVideo={(id) => openVideoModal(id)} onViewImage={(s) => openDetailModal({ type: 'scene', data: s })} onDownload={(s) => s.imageUrl && handleDownload(s.imageUrl, `scene_${scene.sceneNumber}.png`)}/>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </main>

      {/* DETAIL MODAL (Lightbox with History) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
            <div className="bg-gray-900 w-full max-w-6xl h-[90vh] rounded-2xl flex flex-col md:flex-row overflow-hidden border border-gray-700 shadow-2xl relative">
                
                {/* Close Button */}
                <button onClick={closeDetailModal} className="absolute top-4 right-4 z-50 text-white hover:text-gray-300 bg-black/50 rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Left: Image/Video Viewer */}
                <div className="flex-1 bg-black flex flex-col relative">
                    <div className="flex-1 flex items-center justify-center p-4 relative">
                        {activeHistoryUrl ? (
                            <>
                                {/* Video Player if asset has videoUrl */}
                                {activeAsset?.videoUrl ? (
                                    <video 
                                        src={activeAsset.videoUrl} 
                                        controls 
                                        autoPlay 
                                        loop 
                                        className="max-w-full max-h-full shadow-2xl"
                                        poster={activeHistoryUrl} 
                                    />
                                ) : (
                                    <img src={activeHistoryUrl} alt="Detail" className="max-w-full max-h-full object-contain shadow-2xl" />
                                )}

                                {/* Video Generation Overlay */}
                                {activeAsset?.videoStatus === 'generating' && (
                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center z-20">
                                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-purple-500 mb-4"></div>
                                        <span className="text-white text-lg font-bold animate-pulse">Veo 3 영상화 진행 중...</span>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="text-gray-500">이미지가 없습니다</div>
                        )}
                    </div>
                    
                    {/* Bottom Toolbar inside Image Area */}
                    <div className="p-4 bg-gradient-to-t from-black/80 to-transparent flex justify-center gap-4">
                        {activeHistoryUrl && (
                            <>
                                <button 
                                    onClick={() => handleDownload(activeAsset?.videoUrl || activeHistoryUrl!, activeAsset?.videoUrl ? 'generated_video.mp4' : 'detail_image.png')}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-full text-sm font-medium flex items-center gap-2 border border-gray-600 transition-colors"
                                >
                                    <span>⬇️</span> {activeAsset?.videoUrl ? '영상 다운로드' : '이미지 다운로드'}
                                </button>
                                {selectedItem.type === 'scene' && !activeAsset?.videoUrl && activeAsset?.videoStatus !== 'generating' && (
                                    <button 
                                        onClick={() => openVideoModal(selectedItem.data.id, activeHistoryUrl!)}
                                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full text-sm font-medium flex items-center gap-2 shadow-lg shadow-purple-900/50 hover:from-purple-500 hover:to-indigo-500 transition-all"
                                    >
                                        <span>🎥</span> 이 이미지로 영상 만들기
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Sidebar Info */}
                <div className="w-full md:w-96 bg-gray-800 flex flex-col border-l border-gray-700">
                    <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="mb-6">
                            <span className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1 block">Original Context</span>
                            <p className="text-gray-200 text-lg font-medium leading-relaxed">
                                {selectedItem.type === 'scene' ? (selectedItem.data as Scene).originalText : (selectedItem.data as Character).description}
                            </p>
                        </div>

                        {selectedItem.type === 'scene' && (
                            <div className="mb-6">
                                <span className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-1 block">Veo Video Prompt (Korean)</span>
                                <div className="bg-gray-900/50 rounded p-3 text-sm text-gray-300 border border-gray-700">
                                    {(selectedItem.data as Scene).videoPrompt}
                                </div>
                            </div>
                        )}

                        <div className="mb-8">
                             <span className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1 block">Image Prompt (English)</span>
                             <div className="bg-gray-900 rounded p-3 text-xs text-gray-400 font-mono break-words border border-gray-700">
                                {
                                    // Find prompt for active history item or fallback to current
                                    selectedItem.data.history.find(h => h.url === activeHistoryUrl)?.prompt || 
                                    (selectedItem.type === 'scene' ? (selectedItem.data as Scene).imagePrompt : "Character Prompt")
                                }
                             </div>
                        </div>

                        {/* History Grid */}
                        <div>
                             <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">History (v{selectedItem.data.history.length})</span>
                                <button 
                                    onClick={() => generateSingleImage(selectedItem.data.id, selectedItem.type)}
                                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                >
                                    <span>↻</span> 새로 생성
                                </button>
                             </div>
                             
                             <div className="grid grid-cols-3 gap-2">
                                {selectedItem.data.history.map((hist, idx) => (
                                    <div 
                                        key={hist.id}
                                        onClick={() => setActiveHistoryUrl(hist.url)}
                                        className={`aspect-square rounded overflow-hidden cursor-pointer border-2 relative group ${activeHistoryUrl === hist.url ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-transparent hover:border-gray-500'}`}
                                    >
                                        <img src={hist.url} alt={`ver ${idx}`} className="w-full h-full object-cover" />
                                        
                                        {/* Video Status Indicator on History Thumb */}
                                        {hist.videoStatus === 'generating' && (
                                            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-purple-500 border-t-transparent"></div>
                                            </div>
                                        )}
                                        {hist.videoUrl && (
                                            <div className="absolute top-1 right-1 bg-purple-600 rounded-full p-0.5">
                                                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" /></svg>
                                            </div>
                                        )}
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Video Generation Modal */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full border border-gray-700 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-4">Veo 영상 생성</h3>
                <p className="text-sm text-gray-400 mb-4">현재 선택된 이미지로 영상을 생성합니다.</p>
                
                {/* Prompt Editor */}
                <div className="mb-4">
                     <label className="block text-xs text-blue-400 font-bold mb-1">영상 연출 및 대사 (Video Prompt)</label>
                     <textarea 
                        className="w-full h-32 bg-gray-900 border border-gray-600 rounded p-2 text-sm text-gray-200 focus:ring-1 focus:ring-blue-500 leading-relaxed"
                        value={currentVideoPrompt}
                        onChange={(e) => setCurrentVideoPrompt(e.target.value)}
                        placeholder="영상 움직임과 대사를 입력하세요..."
                     />
                     <p className="text-[10px] text-gray-500 mt-1">* 특히 Scene #1(인트로)인 경우 더 극적으로 묘사하세요.</p>
                </div>

                <div className="space-y-4 mb-6">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">모델 (Model)</label>
                        <select value={videoSettings.model} onChange={(e) => setVideoSettings(prev => ({...prev, model: e.target.value as any}))} className="w-full bg-gray-900 text-white p-2 rounded border border-gray-600 text-sm">
                            <option value="veo-3.1-fast-generate-preview">Veo Fast (빠름)</option>
                            <option value="veo-3.1-generate-preview">Veo Quality (고화질)</option>
                        </select>
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setVideoModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white text-sm">취소</button>
                    <button onClick={handleGenerateVideo} className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded font-bold text-sm shadow hover:from-purple-500 hover:to-indigo-500">생성 시작</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
}