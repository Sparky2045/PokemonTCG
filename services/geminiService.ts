
import { GoogleGenAI, Type } from "@google/genai";
import { IdentifiedCard } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.error("Gemini API key is not set. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY! });

export const identifyCard = async (base64ImageData: string): Promise<IdentifiedCard | null> => {
    const model = 'gemini-3-flash-preview';
    
    const prompt = `You are a Pokemon TCG card identification expert. Analyze the provided image of a Pokemon card. The card can be in English or German. Identify the exact card name and the expansion set name. Return your response as a single, minified JSON object with two keys: "name" and "set". For example: {"name":"Charizard","set":"Base Set"}. If you cannot identify the card, return {"name":null,"set":null}. Do not include any other text, explanation, or markdown formatting in your response.`;
    
    try {
        const response = await ai.models.generateContent({
            model,
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: 'image/jpeg',
                                data: base64ImageData,
                            },
                        },
                    ],
                },
            ],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        set: { type: Type.STRING }
                    },
                    nullable: true,
                }
            }
        });

        if (response.text) {
            const result = JSON.parse(response.text);
            if (result.name && result.set) {
                return result;
            }
        }
        return null;
    } catch (error) {
        console.error("Error identifying card with Gemini:", error);
        return null;
    }
};
