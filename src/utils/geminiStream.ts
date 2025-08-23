import { GoogleGenerativeAI } from '@google/generative-ai';

export type ChunkHandler = (text: string) => void;

export async function streamGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  onChunk: ChunkHandler,
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const mdl = genAI.getGenerativeModel({ model, systemInstruction: systemPrompt });

  const streamResp = await mdl.generateContentStream({
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
  });

  let full = '';
  for await (const item of streamResp.stream) {
    const txt = typeof (item as any).text === 'function' ? (item as any).text() : String(item);
    full += txt;
    onChunk(txt);
  }
  // Ensure full final text
  const final = (await streamResp.response).text();
  return final || full;
}
