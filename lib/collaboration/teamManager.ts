import { EventEmitter } from 'events';

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'analyst' | 'viewer';
  avatar?: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  lastActive: Date;
  permissions: string[];
  joinDate: Date;
  department?: string;
  location?: string;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: TeamMember[];
  settings: TeamSettings;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  tags: string[];
  maxMembers: number;
}

export interface TeamSettings {
  allowGuestAccess: boolean;
  requireApproval: boolean;
  enableRealTimeCollaboration: boolean;
  dataSharingLevel: 'private' | 'team' | 'public';
  notificationPreferences: NotificationPreferences;
  securityLevel: 'basic' | 'enhanced' | 'enterprise';
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  slack: boolean;
  teams: boolean;
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}

export interface CollaborationSession {
  id: string;
  teamId: string;
  name: string;
  description: string;
  participants: string[];
  startTime: Date;
  endTime?: Date;
  status: 'active' | 'paused' | 'ended';
  sharedData: SharedData[];
  notes: SessionNote[];
  recordings: Recording[];
}

export interface SharedData {
  id: string;
  type: 'chart' | 'analysis' | 'portfolio' | 'report' | 'document';
  name: string;
  content: Record<string, unknown> | string | number | boolean;
  sharedBy: string;
  sharedAt: Date;
  permissions: 'view' | 'edit' | 'comment';
  version: number;
}

export interface SessionNote {
  id: string;
  authorId: string;
  content: string;
  timestamp: Date;
  type: 'note' | 'action' | 'decision';
  tags: string[];
}

export interface Recording {
  id: string;
  name: string;
  url: string;
  duration: number;
  recordedBy: string;
  recordedAt: Date;
  size: number;
}

export interface TeamAnalytics {
  teamId: string;
  period: 'day' | 'week' | 'month' | 'quarter' | 'year';
  memberActivity: MemberActivity[];
  collaborationMetrics: CollaborationMetrics;
  dataSharingStats: DataSharingStats;
  performanceIndicators: PerformanceIndicators;
}

export interface MemberActivity {
  memberId: string;
  loginCount: number;
  sessionDuration: number;
  dataAccessCount: number;
  collaborationActions: number;
  lastActivity: Date;
}

export interface CollaborationMetrics {
  totalSessions: number;
  averageSessionDuration: number;
  activeParticipants: number;
  sharedDataCount: number;
  noteCount: number;
  recordingCount: number;
}

export interface DataSharingStats {
  totalShared: number;
  byType: Record<string, number>;
  byMember: Record<string, number>;
  averageSharingFrequency: number;
}

export interface PerformanceIndicators {
  teamEfficiency: number;
  collaborationScore: number;
  dataUtilization: number;
  memberSatisfaction: number;
}

export class TeamManager extends EventEmitter {
  private teams: Map<string, Team> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private analytics: Map<string, TeamAnalytics[]> = new Map();
  private activeUsers: Map<string, TeamMember> = new Map();
  private invitations: Map<string, {
    id: string;
    teamId: string;
    email: string;
    role: 'member' | 'viewer' | 'manager' | 'analyst';
    invitedBy: string;
    invitedAt: Date;
    expiresAt: Date;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
  }> = new Map();

  constructor() {
    super();
    this.initializeDefaultTeams();
  }

  // Team Management
  async createTeam(teamData: Omit<Team, 'id' | 'createdAt' | 'updatedAt' | 'isActive'>): Promise<Team> {
    const team: Team = {
      ...teamData,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.teams.set(team.id, team);
    this.emit('teamCreated', team);
    
    return team;
  }

  async updateTeam(teamId: string, updates: Partial<Team>): Promise<Team | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    const updatedTeam: Team = {
      ...team,
      ...updates,
      updatedAt: new Date(),
    };

    this.teams.set(teamId, updatedTeam);
    this.emit('teamUpdated', updatedTeam);
    
    return updatedTeam;
  }

  async deleteTeam(teamId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    // End all active sessions
    for (const session of Array.from(this.sessions.values())) {
      if (session.teamId === teamId && session.status === 'active') {
        await this.endSession(session.id);
      }
    }

    this.teams.delete(teamId);
    this.emit('teamDeleted', teamId);
    
    return true;
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return this.teams.get(teamId) || null;
  }

  async getAllTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }

  async getTeamsByMember(memberId: string): Promise<Team[]> {
    return Array.from(this.teams.values()).filter(team =>
      team.members.some(member => member.id === memberId)
    );
  }

  // Member Management
  async addMember(teamId: string, memberData: Omit<TeamMember, 'id' | 'joinDate' | 'lastActive'>): Promise<TeamMember | null> {
    const team = this.teams.get(teamId);
    if (!team) return null;

    if (team.members.length >= team.maxMembers) {
      throw new Error('Team has reached maximum member limit');
    }

    const member: TeamMember = {
      ...memberData,
      id: this.generateId(),
      joinDate: new Date(),
      lastActive: new Date(),
    };

    team.members.push(member);
    team.updatedAt = new Date();

    this.teams.set(teamId, team);
    this.emit('memberAdded', { teamId, member });
    
    return member;
  }

  async removeMember(teamId: string, memberId: string): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const memberIndex = team.members.findIndex(m => m.id === memberId);
    if (memberIndex === -1) return false;

    // Prevent removing team owner
    if (team.members[memberIndex].role === 'admin' && team.ownerId === memberId) {
      throw new Error('Cannot remove team owner');
    }

    const removedMember = team.members.splice(memberIndex, 1)[0];
    team.updatedAt = new Date();

    this.teams.set(teamId, team);
    this.emit('memberRemoved', { teamId, member: removedMember });
    
    return true;
  }

  async updateMemberRole(teamId: string, memberId: string, newRole: TeamMember['role']): Promise<boolean> {
    const team = this.teams.get(teamId);
    if (!team) return false;

    const member = team.members.find(m => m.id === memberId);
    if (!member) return false;

    member.role = newRole;
    team.updatedAt = new Date();

    this.teams.set(teamId, team);
    this.emit('memberRoleUpdated', { teamId, memberId, newRole });
    
    return true;
  }

  async updateMemberStatus(memberId: string, status: TeamMember['status']): Promise<void> {
    const member = this.activeUsers.get(memberId);
    if (member) {
      member.status = status;
      member.lastActive = new Date();
      this.activeUsers.set(memberId, member);
      this.emit('memberStatusUpdated', { memberId, status });
    }
  }

  // Collaboration Sessions
  async createSession(sessionData: Omit<CollaborationSession, 'id' | 'startTime' | 'status'>): Promise<CollaborationSession> {
    const session: CollaborationSession = {
      ...sessionData,
      id: this.generateId(),
      startTime: new Date(),
      status: 'active',
    };

    this.sessions.set(session.id, session);
    this.emit('sessionCreated', session);
    
    return session;
  }

  async joinSession(sessionId: string, memberId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') return false;

    if (!session.participants.includes(memberId)) {
      session.participants.push(memberId);
      this.emit('memberJoinedSession', { sessionId, memberId });
    }

    return true;
  }

  async leaveSession(sessionId: string, memberId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    const participantIndex = session.participants.indexOf(memberId);
    if (participantIndex !== -1) {
      session.participants.splice(participantIndex, 1);
      this.emit('memberLeftSession', { sessionId, memberId });
    }

    return true;
  }

  async endSession(sessionId: string): Promise<boolean> {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'ended';
    session.endTime = new Date();

    this.sessions.set(sessionId, session);
    this.emit('sessionEnded', session);
    
    return true;
  }

  async addSessionNote(sessionId: string, noteData: Omit<SessionNote, 'id' | 'timestamp'>): Promise<SessionNote | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const note: SessionNote = {
      ...noteData,
      id: this.generateId(),
      timestamp: new Date(),
    };

    session.notes.push(note);
    this.emit('noteAdded', { sessionId, note });
    
    return note;
  }

  async shareData(sessionId: string, data: Omit<SharedData, 'id' | 'sharedAt' | 'version'>): Promise<SharedData | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const sharedData: SharedData = {
      ...data,
      id: this.generateId(),
      sharedAt: new Date(),
      version: 1,
    };

    session.sharedData.push(sharedData);
    this.emit('dataShared', { sessionId, data: sharedData });
    
    return sharedData;
  }

  // Analytics & Reporting
  async generateTeamAnalytics(teamId: string, period: TeamAnalytics['period']): Promise<TeamAnalytics> {
    const team = this.teams.get(teamId);
    if (!team) throw new Error('Team not found');

    const now = new Date();
    const startDate = this.getPeriodStartDate(now, period);

    // Calculate member activity
    const memberActivity: MemberActivity[] = team.members.map(member => {
      const sessions = Array.from(this.sessions.values()).filter(s => 
        s.teamId === teamId && 
        s.participants.includes(member.id) &&
        s.startTime >= startDate
      );

      return {
        memberId: member.id,
        loginCount: this.calculateLoginCount(member.id, startDate),
        sessionDuration: this.calculateSessionDuration(member.id, sessions),
        dataAccessCount: this.calculateDataAccessCount(member.id, sessions),
        collaborationActions: this.calculateCollaborationActions(member.id, sessions),
        lastActivity: member.lastActive,
      };
    });

    // Calculate collaboration metrics
    const teamSessions = Array.from(this.sessions.values()).filter(s => 
      s.teamId === teamId && s.startTime >= startDate
    );

    const collaborationMetrics: CollaborationMetrics = {
      totalSessions: teamSessions.length,
      averageSessionDuration: this.calculateAverageSessionDuration(teamSessions),
      activeParticipants: this.calculateActiveParticipants(teamSessions),
      sharedDataCount: teamSessions.reduce((sum, s) => sum + s.sharedData.length, 0),
      noteCount: teamSessions.reduce((sum, s) => sum + s.notes.length, 0),
      recordingCount: teamSessions.reduce((sum, s) => sum + s.recordings.length, 0),
    };

    // Calculate data sharing stats
    const dataSharingStats: DataSharingStats = {
      totalShared: collaborationMetrics.sharedDataCount,
      byType: this.calculateDataSharingByType(teamSessions),
      byMember: this.calculateDataSharingByMember(teamSessions),
      averageSharingFrequency: this.calculateAverageSharingFrequency(teamSessions, period),
    };

    // Calculate performance indicators
    const performanceIndicators: PerformanceIndicators = {
      teamEfficiency: this.calculateTeamEfficiency(memberActivity, collaborationMetrics),
      collaborationScore: this.calculateCollaborationScore(collaborationMetrics),
      dataUtilization: this.calculateDataUtilization(dataSharingStats),
      memberSatisfaction: this.calculateMemberSatisfaction(memberActivity),
    };

    const analytics: TeamAnalytics = {
      teamId,
      period,
      memberActivity,
      collaborationMetrics,
      dataSharingStats,
      performanceIndicators,
    };

    // Store analytics
    if (!this.analytics.has(teamId)) {
      this.analytics.set(teamId, []);
    }
    this.analytics.get(teamId)!.push(analytics);

    this.emit('analyticsGenerated', analytics);
    
    return analytics;
  }

  async getTeamAnalytics(teamId: string, period?: TeamAnalytics['period']): Promise<TeamAnalytics[]> {
    const teamAnalytics = this.analytics.get(teamId) || [];
    
    if (period) {
      return teamAnalytics.filter(a => a.period === period);
    }
    
    return teamAnalytics;
  }

  // Utility Methods
  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getPeriodStartDate(now: Date, period: TeamAnalytics['period']): Date {
    const start = new Date(now);
    
    switch (period) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - start.getDay());
        start.setHours(0, 0, 0, 0);
        break;
      case 'month':
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(start.getMonth() / 3);
        start.setMonth(quarter * 3, 1);
        start.setHours(0, 0, 0, 0);
        break;
      case 'year':
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        break;
    }
    
    return start;
  }

  private calculateLoginCount(_memberId: string, _startDate: Date): number {
    // This would typically integrate with authentication system
    return Math.floor(Math.random() * 10) + 1; // Mock data
  }

  private calculateSessionDuration(memberId: string, sessions: CollaborationSession[]): number {
    return sessions.reduce((total, session) => {
      const endTime = session.endTime || new Date();
      return total + (endTime.getTime() - session.startTime.getTime());
    }, 0);
  }

  private calculateDataAccessCount(memberId: string, sessions: CollaborationSession[]): number {
    return sessions.reduce((total, session) => {
      return total + session.sharedData.length;
    }, 0);
  }

  private calculateCollaborationActions(memberId: string, sessions: CollaborationSession[]): number {
    return sessions.reduce((total, session) => {
      return total + session.notes.filter(note => note.authorId === memberId).length;
    }, 0);
  }

  private calculateAverageSessionDuration(sessions: CollaborationSession[]): number {
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((total, session) => {
      const endTime = session.endTime || new Date();
      return total + (endTime.getTime() - session.startTime.getTime());
    }, 0);
    
    return totalDuration / sessions.length;
  }

  private calculateActiveParticipants(sessions: CollaborationSession[]): number {
    const uniqueParticipants = new Set<string>();
    sessions.forEach(session => {
      session.participants.forEach(participant => uniqueParticipants.add(participant));
    });
    return uniqueParticipants.size;
  }

  private calculateDataSharingByType(sessions: CollaborationSession[]): Record<string, number> {
    const typeCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      session.sharedData.forEach(data => {
        typeCounts[data.type] = (typeCounts[data.type] || 0) + 1;
      });
    });
    
    return typeCounts;
  }

  private calculateDataSharingByMember(sessions: CollaborationSession[]): Record<string, number> {
    const memberCounts: Record<string, number> = {};
    
    sessions.forEach(session => {
      session.sharedData.forEach(data => {
        memberCounts[data.sharedBy] = (memberCounts[data.sharedBy] || 0) + 1;
      });
    });
    
    return memberCounts;
  }

  private calculateAverageSharingFrequency(sessions: CollaborationSession[], period: TeamAnalytics['period']): number {
    if (sessions.length === 0) return 0;
    
    const totalShared = sessions.reduce((sum, session) => sum + session.sharedData.length, 0);
    const periodDays = this.getPeriodDays(period);
    
    return totalShared / periodDays;
  }

  private getPeriodDays(period: TeamAnalytics['period']): number {
    switch (period) {
      case 'day': return 1;
      case 'week': return 7;
      case 'month': return 30;
      case 'quarter': return 90;
      case 'year': return 365;
      default: return 1;
    }
  }

  private calculateTeamEfficiency(memberActivity: MemberActivity[], _collaborationMetrics: CollaborationMetrics): number {
    const totalActivity = memberActivity.reduce((sum, member) => 
      sum + member.collaborationActions + member.dataAccessCount, 0
    );
    
    return Math.min(100, (totalActivity / (memberActivity.length * 10)) * 100);
  }

  private calculateCollaborationScore(collaborationMetrics: CollaborationMetrics): number {
    const score = (
      (collaborationMetrics.totalSessions * 0.3) +
      (collaborationMetrics.averageSessionDuration / 60000 * 0.2) + // Convert to minutes
      (collaborationMetrics.activeParticipants * 0.2) +
      (collaborationMetrics.sharedDataCount * 0.15) +
      (collaborationMetrics.noteCount * 0.15)
    );
    
    return Math.min(100, score);
  }

  private calculateDataUtilization(dataSharingStats: DataSharingStats): number {
    return Math.min(100, (dataSharingStats.totalShared / 50) * 100);
  }

  private calculateMemberSatisfaction(memberActivity: MemberActivity[]): number {
    const activeMembers = memberActivity.filter(member => 
      member.lastActivity > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
    );
    
    if (activeMembers.length === 0) return 0;
    
    const satisfaction = activeMembers.reduce((sum, member) => {
      const memberScore = Math.min(100, (
        (member.loginCount * 10) +
        (member.sessionDuration / 60000 * 0.1) + // Convert to minutes
        (member.collaborationActions * 5)
      ));
      return sum + memberScore;
    }, 0);
    
    return satisfaction / activeMembers.length;
  }

  // Initialize default teams for demonstration
  private initializeDefaultTeams(): void {
    const defaultTeam: Team = {
      id: 'default-team',
      name: 'MAD LAB Core Team',
      description: 'Core development and research team for MAD LAB platform',
      ownerId: 'admin-1',
      members: [
        {
          id: 'admin-1',
          email: 'admin@madlab.com',
          name: 'System Administrator',
          role: 'admin',
          status: 'online',
          lastActive: new Date(),
          permissions: ['*'],
          joinDate: new Date(),
          department: 'IT',
          location: 'HQ',
        },
      ],
      settings: {
        allowGuestAccess: false,
        requireApproval: true,
        enableRealTimeCollaboration: true,
        dataSharingLevel: 'team',
        notificationPreferences: {
          email: true,
          push: true,
          slack: false,
          teams: false,
          frequency: 'immediate',
        },
        securityLevel: 'enhanced',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      tags: ['core', 'development', 'research'],
      maxMembers: 50,
    };

    this.teams.set(defaultTeam.id, defaultTeam);
  }

  // Cleanup and destruction
  destroy(): void {
    this.teams.clear();
    this.sessions.clear();
    this.analytics.clear();
    this.activeUsers.clear();
    this.invitations.clear();
    this.removeAllListeners();
  }
}

// Singleton instance
export const teamManager = new TeamManager();

// Export for use in other modules
export default teamManager;