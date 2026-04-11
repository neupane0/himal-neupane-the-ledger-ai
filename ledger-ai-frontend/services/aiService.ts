import api from './api';

/**
 * AI Service - Uses backend FinBERT + spaCy instead of Gemini
 */

export const categorizeTransaction = async (description: string): Promise<string> => {
  try {
    const response = await api.post('/ai/categorize/', {
      text: description
    });
    return response.data.category || 'Uncategorized';
  } catch (error) {
    console.error("AI Categorization Error:", error);
    return 'Uncategorized';
  }
};

export const parseVoiceLog = async (transcript: string): Promise<any> => {
  try {
    const response = await api.post('/ai/parse-voice/', {
      transcript: transcript
    });
    return response.data;
  } catch (error) {
    console.error("Voice Parse Error:", error);
    return null;
  }
};

// Keep parseReceipt for backward compatibility (uses backend Tesseract + AI)
export const parseReceipt = async (file: File): Promise<any> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/upload-receipt/', formData);

    return response.data;
  } catch (error) {
    console.error("Receipt Parsing Error:", error);
    throw error;
  }
};

// Placeholder functions for features not yet implemented
export const getForecastInsights = async (spendingData: any): Promise<string> => {
  return "Spending looks normal. (Forecast model not yet implemented)";
};

export const getBudgetAdvice = async (budgets: any[]): Promise<string> => {
  return "Keep tracking your expenses to see improvements. (Budget advice model not yet implemented)";
};
