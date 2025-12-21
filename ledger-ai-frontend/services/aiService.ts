import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Helper to get CSRF token from cookie
const getCsrfToken = (): string => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; csrftoken=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
  return '';
};

/**
 * AI Service - Uses backend FinBERT + spaCy instead of Gemini
 */

export const categorizeTransaction = async (description: string): Promise<string> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/categorize/`, {
      text: description
    }, {
      withCredentials: true,
      headers: {
        'X-CSRFToken': getCsrfToken(),
      }
    });
    return response.data.category || 'Uncategorized';
  } catch (error) {
    console.error("AI Categorization Error:", error);
    return 'Uncategorized';
  }
};

export const parseVoiceLog = async (transcript: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/parse-voice/`, {
      transcript: transcript
    }, {
      withCredentials: true,
      headers: {
        'X-CSRFToken': getCsrfToken(),
      }
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

    const response = await axios.post(`${API_BASE_URL}/upload-receipt/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true
    });

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
