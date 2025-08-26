/**
 * JWT-based authentication system for production use.
 * Handles token management, user sessions, and secure API access.
 */

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'premium' | 'enterprise';
  permissions: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  lastLogin: Date;
  isActive: boolean;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: 'Bearer';
}

export interface AuthSession {
  user: User;
  token: AuthToken;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: AuthToken;
  error?: string;
  requiresMFA?: boolean;
}

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  refreshTokenExpiresIn: string;
  mfaEnabled: boolean;
  sessionTimeout: number;
  maxConcurrentSessions: number;
}

export class AuthenticationManager {
  private config: AuthConfig;
  private activeSessions: Map<string, AuthSession> = new Map();
  private refreshTokens: Map<string, { userId: string; expiresAt: number }> = new Map();

  constructor(config: Partial<AuthConfig> = {}) {
    this.config = {
      jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      jwtExpiresIn: '15m',
      refreshTokenExpiresIn: '7d',
      mfaEnabled: false,
      sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
      maxConcurrentSessions: 5,
      ...config,
    };
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string, ipAddress: string, userAgent: string): Promise<AuthResult> {
    try {
      // In production, this would validate against a database
      const user = await this.validateCredentials(email, password);
      
      if (!user) {
        return {
          success: false,
          error: 'Invalid credentials',
        };
      }

      // Check if user is active
      if (!user.isActive) {
        return {
          success: false,
          error: 'Account is deactivated',
        };
      }

      // Check MFA if enabled
      if (this.config.mfaEnabled && user.role === 'admin') {
        return {
          success: false,
          requiresMFA: true,
          error: 'MFA required for admin access',
        };
      }

      // Generate tokens
      const token = await this.generateTokens(user);
      
      // Create session
      const session = await this.createSession(user, token, ipAddress, userAgent);
      
      // Update user last login
      user.lastLogin = new Date();

      return {
        success: true,
        user,
        token,
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      return {
        success: false,
        error: 'Authentication failed',
      };
    }
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(email: string, password: string): Promise<User | null> {
    // In production, this would query a database and hash passwords
    // For demo purposes, use mock users
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@madlab.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['read', 'write', 'admin', 'delete'],
        metadata: { department: 'IT' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '2',
        email: 'user@madlab.com',
        name: 'Standard User',
        role: 'user',
        permissions: ['read', 'write'],
        metadata: { department: 'Finance' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '3',
        email: 'premium@madlab.com',
        name: 'Premium User',
        role: 'premium',
        permissions: ['read', 'write', 'premium'],
        metadata: { department: 'Trading' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
    ];

    const user = mockUsers.find(u => u.email === email);
    
    // In production, verify password hash
    if (user && password === 'password') {
      return user;
    }

    return null;
  }

  /**
   * Generate JWT tokens
   */
  private async generateTokens(user: User): Promise<AuthToken> {
    const now = Date.now();
    const expiresAt = now + (15 * 60 * 1000); // 15 minutes
    
    // In production, use a proper JWT library
    const accessToken = this.generateMockJWT(user, expiresAt);
    const refreshToken = this.generateMockRefreshToken(user.id);
    
    // Store refresh token
    this.refreshTokens.set(refreshToken, {
      userId: user.id,
      expiresAt: now + (7 * 24 * 60 * 60 * 1000), // 7 days
    });

    return {
      accessToken,
      refreshToken,
      expiresAt,
      tokenType: 'Bearer',
    };
  }

  /**
   * Generate mock JWT token (replace with proper JWT library in production)
   */
  private generateMockJWT(user: User, expiresAt: number): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      exp: expiresAt,
      iat: Date.now(),
    };
    
    // In production, use proper JWT signing
    return `mock_jwt_${btoa(JSON.stringify(payload))}`;
  }

  /**
   * Generate mock refresh token
   */
  private generateMockRefreshToken(userId: string): string {
    const token = `refresh_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return token;
  }

  /**
   * Create user session
   */
  private async createSession(user: User, token: AuthToken, ipAddress: string, userAgent: string): Promise<AuthSession> {
    const session: AuthSession = {
      user,
      token,
      ipAddress,
      userAgent,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    // Check concurrent session limit
    const userSessions = Array.from(this.activeSessions.values())
      .filter(s => s.user.id === user.id);
    
    if (userSessions.length >= this.config.maxConcurrentSessions) {
      // Remove oldest session
      const oldestSession = userSessions.reduce((oldest, current) => 
        current.createdAt < oldest.createdAt ? current : oldest
      );
      this.activeSessions.delete(oldestSession.token.accessToken);
    }

    // Store session
    this.activeSessions.set(token.accessToken, session);
    
    return session;
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      // In production, verify JWT signature
      const session = this.activeSessions.get(token);
      
      if (!session) {
        return null;
      }

      // Check if token is expired
      if (Date.now() > session.token.expiresAt) {
        this.activeSessions.delete(token);
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      
      return session.user;
    } catch (error) {
      console.error('Token validation failed:', error);
      return null;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthResult> {
    try {
      const tokenData = this.refreshTokens.get(refreshToken);
      
      if (!tokenData || Date.now() > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
        return {
          success: false,
          error: 'Invalid or expired refresh token',
        };
      }

      // Find user
      const user = await this.findUserById(tokenData.userId);
      
      if (!user) {
        this.refreshTokens.delete(refreshToken);
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Generate new tokens
      const newToken = await this.generateTokens(user);
      
      // Update session
      const session = this.activeSessions.get(refreshToken);
      if (session) {
        session.token = newToken;
        session.lastActivity = new Date();
        this.activeSessions.set(newToken.accessToken, session);
        this.activeSessions.delete(refreshToken);
      }

      // Remove old refresh token
      this.refreshTokens.delete(refreshToken);

      return {
        success: true,
        user,
        token: newToken,
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        error: 'Token refresh failed',
      };
    }
  }

  /**
   * Find user by ID
   */
  private async findUserById(userId: string): Promise<User | null> {
    // In production, query database
    const mockUsers: User[] = [
      {
        id: '1',
        email: 'admin@madlab.com',
        name: 'Admin User',
        role: 'admin',
        permissions: ['read', 'write', 'admin', 'delete'],
        metadata: { department: 'IT' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '2',
        email: 'user@madlab.com',
        name: 'Standard User',
        role: 'user',
        permissions: ['read', 'write'],
        metadata: { department: 'Finance' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
      {
        id: '3',
        email: 'premium@madlab.com',
        name: 'Premium User',
        role: 'premium',
        permissions: ['read', 'write', 'premium'],
        metadata: { department: 'Trading' },
        createdAt: new Date('2024-01-01'),
        lastLogin: new Date(),
        isActive: true,
      },
    ];

    return mockUsers.find(u => u.id === userId) || null;
  }

  /**
   * Logout user
   */
  async logout(token: string): Promise<boolean> {
    try {
      const session = this.activeSessions.get(token);
      
      if (session) {
        // Remove refresh token
        this.refreshTokens.delete(session.token.refreshToken);
        
        // Remove session
        this.activeSessions.delete(token);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Logout failed:', error);
      return false;
    }
  }

  /**
   * Get active sessions for a user
   */
  getUserSessions(userId: string): AuthSession[] {
    return Array.from(this.activeSessions.values())
      .filter(session => session.user.id === userId);
  }

  /**
   * Get all active sessions
   */
  getAllSessions(): AuthSession[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    
    // Clean up expired access tokens
    for (const [token, session] of Array.from(this.activeSessions.entries())) {
      if (now > session.token.expiresAt) {
        this.activeSessions.delete(token);
        this.refreshTokens.delete(session.token.refreshToken);
      }
    }
    
    // Clean up expired refresh tokens
    for (const [refreshToken, tokenData] of Array.from(this.refreshTokens.entries())) {
      if (now > tokenData.expiresAt) {
        this.refreshTokens.delete(refreshToken);
      }
    }
  }

  /**
   * Get authentication statistics
   */
  getAuthStats(): {
    totalSessions: number;
    totalRefreshTokens: number;
    activeUsers: number;
  } {
    const uniqueUsers = new Set(Array.from(this.activeSessions.values()).map(s => s.user.id));
    
    return {
      totalSessions: this.activeSessions.size,
      totalRefreshTokens: this.refreshTokens.size,
      activeUsers: uniqueUsers.size,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const authManager = new AuthenticationManager();
