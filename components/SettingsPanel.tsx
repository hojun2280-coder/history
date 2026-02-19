import React from 'react';
import { AspectRatio, Engine, GenerationSettings, Resolution } from '../types';

interface SettingsPanelProps {
  settings: GenerationSettings;
  setSettings: React.Dispatch<React.SetStateAction<GenerationSettings>>;
  disabled: boolean;
  isMixboardMode: boolean;
  setMixboardMode: (active: boolean) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  setSettings,
  disabled,
  isMixboardMode,
  setMixboardMode
}) => {

  const handleChange = (key: keyof GenerationSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 h-fit">

      {/* Mixboard Toggle (Advanced Feature) */}
      <div className="mb-8 p-1 bg-gray-900 rounded-lg flex relative border border-gray-700">
        <button
          onClick={() => setMixboardMode(false)}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all z-10 ${!isMixboardMode ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
        >
          기본 (Standard)
        </button>
        <button
          onClick={() => setMixboardMode(true)}
          className={`flex-1 py-2 text-sm font-bold rounded-md transition-all z-10 flex items-center justify-center gap-1 ${isMixboardMode ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
        >
          <span>🎛️</span> 믹스보드
        </button>
      </div>

      <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <span>⚙️</span> 설정 (Settings)
      </h2>

      {/* Part Count Setting */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          본문 파트 수 (Body Parts)
        </label>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min="1"
            max="5"
            value={settings.totalParts}
            onChange={(e) => handleChange('totalParts', parseInt(e.target.value))}
            disabled={disabled}
            className="flex-1 h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <span className="text-white font-bold w-8 text-center">{settings.totalParts}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          <span className="text-red-400 font-bold">Intro(필수)</span> + 본문 파트(1~5)로 구성됩니다.
        </p>
      </div>

      {/* Target Scene Count */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          총 생성할 컷 수 (Total Scenes)
        </label>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="range"
              min="5"
              max="100"
              value={settings.targetSceneCount}
              onChange={(e) => handleChange('targetSceneCount', parseInt(e.target.value))}
              disabled={disabled}
              className="w-full h-4 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-500 transition-all"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5장</span>
              <span>100장</span>
            </div>
          </div>
          <div className="w-20">
            <input
              type="number"
              min="5"
              max="100"
              value={settings.targetSceneCount}
              onChange={(e) => handleChange('targetSceneCount', Math.max(5, Math.min(100, parseInt(e.target.value) || 5)))}
              disabled={disabled}
              className="w-full bg-gray-900 border border-gray-600 text-white text-center rounded py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          * 전체 대본 길이에 맞춰 AI가 적절히 배분합니다.
        </p>
      </div>

      {/* Engine Selection (Box UI) */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          엔진 (Engine)
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={async () => {
              const win = window as any;

              const hasEnvKey = process.env.API_KEY && process.env.API_KEY.length > 0;

              if (settings.engine !== Engine.NANO_BANANA_PRO) {
                if (hasEnvKey) {
                  // API Key exists in env, allow Pro mode immediately
                  handleChange('engine', Engine.NANO_BANANA_PRO);
                  return;
                }

                if (win.aistudio) {
                  try {
                    const hasKey = await win.aistudio.hasSelectedApiKey();
                    if (!hasKey) {
                      const success = await win.aistudio.openSelectKey();
                      if (!success) return; // User cancelled or failed
                    }
                  } catch (e) {
                    console.error(e);
                    alert("구글 클라우드 계정 연결 중 오류가 발생했습니다.");
                    return;
                  }
                } else {
                  alert("⚠️ Pro 모드는 구글 클라우드 결제 계정(Paid API Key)이 연결된 프로젝트에서만 작동합니다. (환경 변수 또는 AI Studio 연결 필요)");
                  return;
                }
              }
              handleChange('engine', Engine.NANO_BANANA_PRO);
            }}
            disabled={disabled}
            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${settings.engine === Engine.NANO_BANANA_PRO
              ? 'bg-blue-900/40 border-blue-500 text-white ring-1 ring-blue-500'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
          >
            <span className="text-xl">🚀</span>
            <div className="text-center">
              <div className="text-sm font-bold">Pro (고화질)</div>
              <div className="text-[10px] opacity-70">Veo/4K 지원 (유료)</div>
            </div>
          </button>

          <button
            onClick={() => handleChange('engine', Engine.NANO_BANANA)}
            disabled={disabled}
            className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${settings.engine === Engine.NANO_BANANA
              ? 'bg-blue-900/40 border-blue-500 text-white ring-1 ring-blue-500'
              : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'
              }`}
          >
            <span className="text-xl">⚡</span>
            <div className="text-center">
              <div className="text-sm font-bold">Fast (기본)</div>
              <div className="text-[10px] opacity-70">빠른 속도 (무료티어 가능)</div>
            </div>
          </button>
        </div>
      </div>

      {/* Resolution */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          화질 (Resolution)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(Resolution).map((res) => (
            <button
              key={res}
              onClick={() => handleChange('resolution', res)}
              disabled={disabled || (settings.engine === Engine.NANO_BANANA && res !== Resolution.RES_1K)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${settings.resolution === res
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700'
                } disabled:opacity-30 disabled:cursor-not-allowed`}
            >
              {res}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          화면 비율 (Aspect Ratio)
        </label>
        <div className="grid grid-cols-3 gap-2">
          {Object.values(AspectRatio).map((ratio) => (
            <button
              key={ratio}
              onClick={() => handleChange('aspectRatio', ratio)}
              disabled={disabled}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${settings.aspectRatio === ratio
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-700'
                } disabled:opacity-50`}
            >
              {ratio}
            </button>
          ))}
        </div>
      </div>

      <div className="text-xs text-gray-500 border-t border-gray-700 pt-4">
        <p>Tier 1 사용자 모드 활성화됨.</p>
        <p className="mt-1">인트로(갈등 고조) + 파트별 순차 분석 지원.</p>
      </div>
    </div>
  );
};