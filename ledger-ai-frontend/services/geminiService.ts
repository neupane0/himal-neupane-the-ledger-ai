import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import Tesseract from 'tesseract.js';

const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("VITE_GEMINI_API_KEY is missing in environment variables");
    throw new Error("Gemini API Key is missing");
  }
  return new GoogleGenerativeAI(apiKey);
};

// Helper for retries with exponential backoff
const generateContentWithRetry = async (model: string, params: any, retries = 3, delay = 1000): Promise<any> => {
  try {
    const ai = getAI();
    const modelInstance = ai.getGenerativeModel({
      model: model,
      generationConfig: params.generationConfig
    });

    return await modelInstance.generateContent(params.contents);
  } catch (error: any) {
    if (retries > 0 && (error?.status === 429 || error?.toString().includes('429'))) {
      console.warn(`Quota exceeded. Retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateContentWithRetry(model, params, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const categorizeTransaction = async (description: string): Promise<string> => {
  try {
    const model = 'gemini-flash-latest';
    const response = await generateContentWithRetry(model, {
      contents: `Categorize this transaction into a single word category (e.g., Food, Transport, Utilities, Entertainment, Health, Income, Shopping). Description: "${description}". Return only the category name.`,
    });
    return response.response.text()?.trim() || 'Uncategorized';
  } catch (error) {
    console.error("Gemini Categorization Error:", error);
    return 'Uncategorized';
  }
};

export const parseReceipt = async (base64Image: string): Promise<any> => {
  try {
    // 1. OCR with Tesseract
    console.log("Starting Tesseract OCR...");
    const { data: { text } } = await Tesseract.recognize(
      `data:image/jpeg;base64,${base64Image}`,
      'eng',
      { logger: m => console.log(m) }
    );

    console.log("OCR Text:", text);
    console.log("OCR Text length:", text.length);

    // 2. Parse with Gemini
    console.log("Sending text to Gemini...");
    const model = 'gemini-flash-latest';
    const response = await generateContentWithRetry(model, {
      contents: `Analyze this receipt text and extract the following: Merchant Name (store or business name), Date (in YYYY-MM-DD format), and Total Amount. Return as JSON. Text: "${text}"`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            merchant: { type: SchemaType.STRING },
            date: { type: SchemaType.STRING },
            total: { type: SchemaType.NUMBER },
            items: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  price: { type: SchemaType.NUMBER }
                }
              }
            }
          }
        }
      }
    });

    console.log("Gemini Response:", response.response.text());
    return JSON.parse(response.response.text() || '{}');
  } catch (error) {
    console.error("Receipt Parsing Error Details:", error);
    throw error;
  }
};

export const parseVoiceLog = async (transcript: string): Promise<any> => {
  try {
    const model = 'gemini-flash-latest';
    const response = await generateContentWithRetry(model, {
      contents: `Extract transaction details from this text: "${transcript}". Return JSON with amount, currency, category, date (YYYY-MM-DD), description. If date is not specified, use today's date.`,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            amount: { type: SchemaType.NUMBER },
            category: { type: SchemaType.STRING },
            date: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING }
          }
        }
      }
    });
    return JSON.parse(response.response.text() || '{}');
  } catch (error) {
    console.error("Gemini Voice Parse Error:", error);
    return null;
  }
};

export const getForecastInsights = async (spendingData: any): Promise<string> => {
  try {
    const model = 'gemini-flash-latest';
    const response = await generateContentWithRetry(model, {
      contents: `Analyze this monthly spending data and provide a brief, helpful insight or warning about future trends. Keep it under 2 sentences. Data: ${JSON.stringify(spendingData)}`
    });
    return response.response.text() || "Spending looks normal.";
  } catch (error) {
    console.error("Forecast Error", error);
    return "Unable to generate insights at this time.";
  }
};

export const getBudgetAdvice = async (budgets: any[]): Promise<string> => {
  try {
    const model = 'gemini-2.0-flash-001';
    const response = await generateContentWithRetry(model, {
      contents: `Review these budget categories and spending. Suggest one adjustment to save money. Keep it concise. Data: ${JSON.stringify(budgets)}`
    });
    return response.response.text() || "Your budget looks balanced.";
  } catch (error) {
    return "Keep tracking your expenses to see improvements.";
  }
};