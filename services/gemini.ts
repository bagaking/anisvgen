import { GoogleGenAI, Type } from "@google/genai";
import { AnimationStyle } from "../types";

const SYSTEM_INSTRUCTION = `
You are an expert SVG animator and Design Agent.
Your goal is to generate high-quality, lightweight, and smooth SVG animations based on user descriptions.

Rules:
1. Output ONLY valid JSON.
2. The JSON must match the specified schema.
3. The 'svgContent' must be a complete, self-contained <svg> string.
4. **MANDATORY**: Use **CSS Keyframes** (<style> @keyframes) for ALL animations. DO NOT use SMIL (<animate>, <animateTransform>).
5. **SEAMLESS LOOP**: The animation MUST loop perfectly. 0% and 100% keyframes MUST be IDENTICAL.
6. **FILL THE CANVAS (SMARTLY)**: The drawing should be large but **MUST RESPECT PADDING**.
7. **DURATION**: The 'duration' field MUST match the CSS 'animation-duration'.
8. **CONTAINMENT**: Ensure all paths are strictly contained within the viewBox dimensions.
9. **TITLE**: The 'title' MUST be in **ENGLISH** regardless of the prompt language. It should be short, specific, and file-name friendly (e.g. "Neon_Robot_Running").

**SKILL: PREVENTING CLIPPING & CUT-OFF GLOWS**:
1. **FILTER BOUNDS**: When using <filter> (dropshadow, glow, blur), you **MUST** explicitly set wide bounds to prevent clipping.
   - **BAD**: <filter id="glow"> (Defaults to 120%, often clips)
   - **GOOD**: <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
2. **SAFE ZONE**: Do **NOT** draw shapes touching the absolute edge of the viewBox if they have strokes or filters.
   - Leave at least 10% padding inside the viewBox.
   - Example: If viewBox="0 0 100 100", keep main shapes within 10 10 90 90.

**DESIGN RATIONALE & AGENT BEHAVIOR**:
The user wants to see how you think. In the 'designRationale' field:
1. **LANGUAGE**: You **MUST** write the rationale in the **SAME LANGUAGE** as the user's prompt.
2. **METHODOLOGY**: Reference specific design principles (e.g., "Squash & Stretch", "Material Motion", "Gestalt").
3. **STEP-BY-STEP**: Briefly list the steps you took to execute the design.
`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "A short catchy title in English (e.g. Red_Ball_Bounce)" },
    description: { type: Type.STRING, description: "A brief description of what was generated" },
    svgContent: { type: Type.STRING, description: "The full <svg>...</svg> code string" },
    duration: { type: Type.NUMBER, description: "The length of the animation loop in seconds. MUST match CSS." },
    designRationale: { type: Type.STRING, description: "Detailed agent thought process: Design Analysis -> Methodology -> Execution Steps. In User's Language." },
  },
  required: ["title", "description", "svgContent", "duration", "designRationale"],
};

export const generateAnimation = async (
  prompt: string,
  width: number,
  height: number,
  style: AnimationStyle,
  duration: number,
  referenceImages: string[] = []
): Promise<{ svgContent: string; title: string; description: string; duration: number; designRationale: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const textPrompt = `
    Task: Create a new animated SVG.
    User Prompt: "${prompt}"
    Target Style: ${style}
    Dimensions: ${width}x${height}
    Target Duration: ${duration}s
    
    Instructions:
    - Analyze the user's intent deeply.
    - **CRITICAL**: Use <filter x="-50%" y="-50%" width="200%" height="200%"> for any blurs or glows to avoid clipping.
    - **CRITICAL**: Keep main elements 10% away from the edge to ensure shadows/strokes aren't cut off.
    - Select a design methodology that fits the style.
    - Plan the animation curve to ensure a seamless ${duration}s loop.
    - Generate the SVG code.
    - Explain your reasoning in the 'designRationale' field in the SAME LANGUAGE as the User Prompt.
    ${referenceImages.length > 0 ? "- **Reference Images Provided**: Extract color palette and shape language from these images." : ""}
  `;

  const parts: any[] = [{ text: textPrompt }];

  referenceImages.forEach((base64String) => {
    const matches = base64String.match(/^data:(.+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      parts.push({
        inlineData: {
          mimeType: matches[1],
          data: matches[2],
        },
      });
    }
  });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: { parts },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("AI response was not valid JSON");
  }
};

export const refineAnimation = async (
  currentSvg: string,
  refinePrompt: string,
  width: number,
  height: number,
  duration: number
): Promise<{ svgContent: string; title: string; description: string; duration: number; designRationale: string }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const fullPrompt = `
    Task: Refine/Edit an existing SVG animation.
    User Modification Request: "${refinePrompt}"
    
    Constraints:
    - New Dimensions: ${width}x${height} (Rescale/Reflow content to fit perfectly)
    - New Duration: ${duration}s (Update CSS animation-duration)
    
    Original SVG:
    \`\`\`xml
    ${currentSvg}
    \`\`\`
    
    Instructions:
    1. Analyze what needs to change based on the User Modification Request.
    2. **ANT-CLIPPING CHECK**: If adding glows/shadows, ensure filters have (x="-50%" width="200%") and content is padded.
    3. Apply design principles to ensure the change is aesthetically pleasing.
    4. Execute the code changes.
    5. In 'designRationale', explain strictly in the SAME LANGUAGE as the User Request:
       - What you analyzed.
       - The design method you used.
       - The steps you took.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: fullPrompt,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse JSON", text);
    throw new Error("AI response was not valid JSON");
  }
};