const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatResponse {
  response: string;
  success: boolean;
}

export class ChatService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = `${API_BASE_URL}/api/chat`;
  }

  async sendMessage(message: string, userId: number): Promise<string> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ChatResponse = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to get response from server');
      }

      return data.response;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
}

