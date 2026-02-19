import React from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
  isTableView: boolean;
  onRetry: (sceneId: string) => void;
  onGenerateVideo: (sceneId: string) => void;
  onViewImage: (scene: Scene) => void;
  onDownload: (scene: Scene) => void;
}

export const SceneCard: React.FC<SceneCardProps> = ({ 
  scene, 
  isTableView, 
  onRetry, 
  onGenerateVideo,
  onViewImage,
  onDownload
}) => {
  
  // -- Table View Rendering --
  if (isTableView) {
    return (
      <div className="bg-gray-800 border-b border-gray-700 p-4 flex gap-4 items-center hover:bg-gray-750 transition-colors">
        <div className="w-16 text-center font-mono text-gray-500 text-sm">#{scene.sceneNumber}</div>
        
        {/* Thumbnail */}
        <div 
          className="w-24 h-16 bg-gray-900 rounded overflow-hidden flex-shrink-0 cursor-pointer border border-gray-700 relative group"
          onClick={() => scene.imageUrl && onViewImage(scene)}
        >
           {scene.videoUrl ? (
                <video src={scene.videoUrl} className="w-full h-full object-cover" muted loop autoPlay />
           ) : (
                scene.imageUrl ? (
                    <>
                        <img src={scene.imageUrl} className="w-full h-full object-cover" alt="Scene" />
                        {scene.status === 'generating' && (
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-gray-600">
                        {scene.status === 'generating' ? '...' : 'No Img'}
                    </div>
                )
           )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
            <p className="text-gray-200 text-sm truncate">{scene.originalText}</p>
            <p className="text-gray-500 text-xs truncate mt-1">{scene.imagePrompt}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           {scene.status === 'failed' && <span className="text-red-500 text-xs">실패</span>}
           <button 
              onClick={() => onRetry(scene.id)}
              disabled={scene.status === 'generating'}
              className="px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded text-gray-200 disabled:opacity-50"
           >
              {scene.status === 'generating' ? '생성중...' : (scene.imageUrl ? '재생성' : (scene.status === 'failed' ? '재시도' : '생성'))}
           </button>
           {scene.imageUrl && (
             <>
                <button 
                    onClick={() => onDownload(scene)}
                    className="px-2 py-1 text-xs text-gray-400 hover:text-white"
                    title="다운로드"
                >
                    ⬇️
                </button>
                <button 
                    onClick={() => onGenerateVideo(scene.id)}
                    className="px-3 py-1 text-xs bg-gradient-to-r from-purple-900 to-indigo-900 hover:from-purple-800 hover:to-indigo-800 rounded border border-purple-700 text-purple-100"
                >
                    {scene.videoStatus === 'generating' ? '생성중...' : '영상화'}
                </button>
             </>
           )}
        </div>
      </div>
    );
  }

  // -- Grid View Rendering --
  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 flex flex-col h-full group">
      {/* Image/Video Area */}
      <div className="relative aspect-video bg-gray-900 flex items-center justify-center overflow-hidden">
        {scene.imageUrl ? (
          <div className="relative w-full h-full">
            
            {/* Display Video by Default if available, otherwise Image */}
            {scene.videoUrl ? (
                <video 
                    src={scene.videoUrl} 
                    className="w-full h-full object-cover cursor-pointer"
                    autoPlay
                    loop
                    muted
                    onClick={() => onViewImage(scene)} // Opens modal with video
                />
            ) : (
                <img 
                    src={scene.imageUrl} 
                    alt={`Scene ${scene.sceneNumber}`} 
                    className="w-full h-full object-cover cursor-pointer transition-transform duration-700 group-hover:scale-105"
                    onClick={() => onViewImage(scene)}
                />
            )}
            
            {/* Overlay Buttons */}
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                    onClick={(e) => { e.stopPropagation(); onDownload(scene); }}
                    className="bg-black/60 hover:bg-black/80 text-white p-1.5 rounded"
                    title="다운로드"
                >
                    ⬇️
                </button>
                <button 
                    onClick={(e) => { e.stopPropagation(); onGenerateVideo(scene.id); }}
                    className="bg-purple-600/80 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs flex items-center gap-1 backdrop-blur-sm"
                >
                    {scene.videoStatus === 'generating' ? '🎥...' : (scene.videoUrl ? '▶️ 재생' : '🎥 영상화')}
                </button>
            </div>

            {/* Loading Overlay when Regenerating Image */}
            {scene.status === 'generating' && (
                <div className="absolute inset-0 bg-black/60 z-20 flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white mb-2"></div>
                    <span className="text-white text-xs font-bold animate-pulse">다시 그리는 중...</span>
                </div>
            )}

            {/* Loading Overlay when Generating Video */}
            {scene.videoStatus === 'generating' && (
                <div className="absolute inset-0 bg-black/70 z-20 flex flex-col items-center justify-center backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-2"></div>
                    <span className="text-purple-300 text-xs font-bold animate-pulse">Veo 3 영상화 중...</span>
                </div>
            )}
            
            {/* History Badge */}
            {scene.history.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-gray-300 pointer-events-none z-10">
                    v{scene.history.length}
                </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 p-4 text-center w-full">
            {scene.status === 'pending' && <span className="text-2xl opacity-50">🖼️</span>}
            {scene.status === 'generating' && (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="text-xs">그리는 중...</span>
              </div>
            )}
            {scene.status === 'failed' && (
              <div className="flex flex-col items-center gap-2 text-red-400">
                <span className="text-2xl">⚠️</span>
                <span className="text-sm">실패</span>
              </div>
            )}
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs font-bold text-white z-10 pointer-events-none">
          #{scene.sceneNumber}
        </div>
      </div>

      {/* Text Area */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="bg-gray-900/50 p-2 rounded border border-gray-700">
            <p className="text-gray-300 text-sm line-clamp-3 italic">"{scene.originalText}"</p>
        </div>
        <div className="mt-auto pt-2 border-t border-gray-700 flex justify-between items-center">
            <span className="text-xs text-gray-500">Tier 1</span>
            <button 
                onClick={() => onRetry(scene.id)}
                disabled={scene.status === 'generating'}
                className="text-xs text-blue-400 hover:text-blue-300 underline disabled:opacity-50 disabled:no-underline"
            >
                {scene.imageUrl ? '다시 그리기' : '이미지 생성'}
            </button>
        </div>
      </div>
    </div>
  );
};