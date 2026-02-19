import React from 'react';
import { Character } from '../types';

interface CharacterCardProps {
  character: Character;
  onGenerate: (id: string) => void;
  onView: (character: Character) => void;
}

export const CharacterCard: React.FC<CharacterCardProps> = ({ character, onGenerate, onView }) => {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-4 flex gap-4 items-center">
      {/* Avatar / Image */}
      <div 
        className="relative w-24 h-24 flex-shrink-0 rounded-full overflow-hidden bg-gray-900 border-2 border-gray-600 cursor-pointer group"
        onClick={() => character.imageUrl && onView(character)}
      >
        {character.imageUrl ? (
          <>
            <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
            {character.status === 'generating' && (
                 <div className="absolute inset-0 bg-black/60 z-20 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                 </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center z-10">
               <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-bold">상세보기</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-600">
             {character.status === 'generating' ? (
                 <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
             ) : (
                 <span>?</span>
             )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-white truncate">{character.name}</h3>
        <p className="text-xs text-gray-400 line-clamp-2 mb-2" title={character.description}>
          {character.description}
        </p>
        
        <div className="flex items-center gap-2">
            <button
                onClick={() => onGenerate(character.id)}
                disabled={character.status === 'generating'}
                className={`text-xs px-3 py-1.5 rounded transition-colors ${
                    character.status === 'completed' 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-blue-600 text-white hover:bg-blue-500'
                }`}
            >
                {character.status === 'generating' ? '생성 중...' : character.status === 'completed' ? '다시 그리기' : '생성하기'}
            </button>
            {character.history.length > 1 && (
                <span className="text-[10px] text-gray-500 bg-gray-900 px-1.5 py-0.5 rounded">v{character.history.length}</span>
            )}
        </div>
      </div>
    </div>
  );
};