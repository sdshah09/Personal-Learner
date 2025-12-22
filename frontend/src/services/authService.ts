const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface SignupRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  userId: number;
  username: string;
  email?: string;
}

export interface AuthError {
  error: string;
}

export class AuthService {
  private apiUrl: string;

  constructor() {
    this.apiUrl = API_BASE_URL;
  }

  async signup(data: SignupRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      return result as AuthResponse;
    } catch (error) {
      console.error('Error signing up:', error);
      throw error;
    }
  }

  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Login failed');
      }

      return result as AuthResponse;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  }

  logout(): void {
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('email');
  }

  getCurrentUser(): { userId: number; username: string; email?: string } | null {
    const userId = localStorage.getItem('userId');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');

    if (userId && username) {
      return {
        userId: parseInt(userId, 10),
        username,
        email: email || undefined,
      };
    }

    return null;
  }

  saveUser(user: AuthResponse): void {
    localStorage.setItem('userId', user.userId.toString());
    localStorage.setItem('username', user.username);
    if (user.email) {
      localStorage.setItem('email', user.email);
    }
  }
}

