import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Engine, Resolution, AspectRatio, AnalysisResult, VideoSettings } from "../types";

// Helper to get AI instance safely
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key not found in environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Step 1: Analyze Script Parts sequentially and generate a holistic storyboard
 */
export const analyzeScript = async (scriptParts: string[], targetSceneCount: number): Promise<AnalysisResult> => {
  const ai = getAI();

  // scriptParts[0] is Intro, scriptParts[1...] are Body Parts
  const introScript = scriptParts[0];
  const bodyScripts = scriptParts.slice(1);

  // Combine parts with clear delimiters
  let formattedScript = `[INTRO (HIGH CONFLICT / CLIMAX START)]\n${introScript}\n[INTRO END]\n\n`;
  formattedScript += bodyScripts.map((part, index) => `[BODY PART ${index + 1} START]\n${part}\n[BODY PART ${index + 1} END]`).join("\n\n");

  const systemInstruction = `
  You are an expert film director and cinematographer specializing in WORLD HISTORY DRAMA (Historical Epic).
  You are provided with a script structure containing:
  1. **INTRO**: This is the "HOOK". It contains the HIGHEST CONFLICT/CLIMAX of the story.
  2. **BODY PARTS (1~${bodyScripts.length})**: The rest of the narrative (context, development, etc.).

  **CORE TASK:**
  1. **Analyze the Intro (The Conflict)**: Understand the intense emotion, danger, or drama in the Intro.
  2. **Analyze the Flow**: Read the Body Parts to understand how this conflict fits into the wider story.
  3. **Storyboard Generation**: Create exactly ${targetSceneCount} scenes.
     - **SCENE #1 MUST CORRESPOND TO THE INTRO (CLIMAX).** 
     - Scene #1 must be the most visually striking scene to capture the audience immediately.

  **VEO 3 VIDEO PROMPT RULES (CRITICAL):**
  - **Goal**: Create a prompt for "Google Veo 3" that generates a NATURAL, highly realistic, and INTENSE video.
  - **Focus**: Since the Intro is the climax, the video prompt for Scene #1 must describe extreme tension.
  - **Structure (English)**: "[Camera Movement]. [Lighting/Atmosphere]. [Action/Emotion]. [Details]."
  - **Example**: "Handheld camera shaking violently, close-up on the protagonist's trembling hand holding a bloodied sword. Dark stormy night, heavy rain. protagonist's eyes full of murderous intent."

  **SAFETY RULE (NO CHILDREN):**
  - **ABSOLUTELY NO VISUAL DEPICTION OF CHILDREN OR BABIES.**
  - If the script involves a child, use a **CINEMATIC WORKAROUND** for the 'imagePrompt':
    1. POV Shot, Over-the-shoulder, Focus on objects/hands, or Adult's reaction.
  - The 'imagePrompt' MUST reflect this workaround explicitly in English.

  **OUTPUT JSON SCHEMA:**
  Return a JSON object with 'characters' and 'scenes'.
  `;

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING, description: "Detailed physical appearance strictly in ENGLISH." }
          },
          required: ["name", "description"]
        }
      },
      scenes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            sceneNumber: { type: Type.INTEGER },
            originalText: { type: Type.STRING, description: "The specific sentence(s) from the script." },
            imagePrompt: { type: Type.STRING, description: "Detailed prompt strictly in ENGLISH. NO CHILDREN allowed. Use workarounds." },
            videoPrompt: { type: Type.STRING, description: "Cinematic Video prompt in ENGLISH. Make Scene #1 (Intro) very intense and natural." }
          },
          required: ["sceneNumber", "originalText", "imagePrompt", "videoPrompt"],
        },
      }
    },
    required: ["characters", "scenes"]
  };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: formattedScript,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.5, // Increased for more dramatic creativity
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from analysis model.");

    const parsed = JSON.parse(text);

    return {
      characters: parsed.characters.map((c: any) => ({
        id: crypto.randomUUID(),
        name: c.name,
        description: c.description,
        status: 'pending',
        history: []
      })),
      scenes: parsed.scenes.map((s: any) => ({
        id: crypto.randomUUID(),
        sceneNumber: s.sceneNumber,
        originalText: s.originalText,
        imagePrompt: s.imagePrompt,
        videoPrompt: s.videoPrompt || `(자동 생성된 비디오 프롬프트 없음) ${s.originalText}`,
        status: 'pending',
        history: []
      }))
    };

  } catch (error) {
    console.error("Script analysis failed:", error);
    throw error;
  }
};

/**
 * Step 2: Generate Image
 */
export const generateImage = async (
  prompt: string,
  engine: Engine,
  aspectRatio: AspectRatio,
  resolution: Resolution
): Promise<string> => {
  const ai = getAI();
  const isPro = engine === Engine.NANO_BANANA_PRO;

  const safePrompt = `${prompt}. Masterpiece, best quality, authentic historical drama style, detailed period costumes and accessories. NO children, NO babies. If prompt implies a child, use POV or obscure view.`;

  const imageConfig: any = {
    aspectRatio: aspectRatio,
  };

  if (isPro) {
    imageConfig.imageSize = resolution;
  }

  try {
    const response = await ai.models.generateContent({
      model: engine,
      contents: {
        parts: [{ text: safePrompt }]
      },
      config: {
        imageConfig: imageConfig
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }

    const textPart = response.candidates?.[0]?.content?.parts?.find(p => p.text);
    if (textPart && textPart.text) {
      throw new Error(`AI Generation Refused: ${textPart.text}`);
    }

    if (response.candidates?.[0]?.finishReason) {
      throw new Error(`Generation blocked. Reason: ${response.candidates[0].finishReason}`);
    }

    throw new Error("No image data found in response. The model may have returned an empty response.");
  } catch (error) {
    console.error(`Image generation failed:`, error);
    throw error;
  }
};

/**
 * Step 3: Generate Video (Veo)
 */
export const generateVideo = async (
  imageBase64: string,
  prompt: string,
  settings: VideoSettings
): Promise<string> => {
  const ai = getAI();
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

  try {
    let operation = await ai.models.generateVideos({
      model: settings.model,
      prompt: prompt,
      image: {
        imageBytes: base64Data,
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: settings.resolution,
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) throw new Error("No video URI returned.");

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    if (!response.ok) throw new Error("Failed to download video bytes.");

    const blob = await response.blob();
    return URL.createObjectURL(blob);

  } catch (error) {
    console.error("Video generation failed:", error);
    throw error;
  }
};