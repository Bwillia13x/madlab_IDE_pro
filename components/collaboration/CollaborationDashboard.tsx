'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { UserPlus, Users, Settings, Shield, MoreHorizontal, Clock, Star, Search, Plus, Building2, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConnectionStatus } from '@/lib/data/useRealtimeData';

// Enhanced collaboration types
interface Team {
  id: string;
  name: string;
  description: string;
  members: TeamMember[];
  createdAt: Date;
  maxMembers: number;
  settings: TeamSettings;
  isActive: boolean;
  tags: string[];
  permissions: TeamPermissions;
  analytics: TeamAnalytics;
  security: SecuritySettings;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer' | 'manager' | 'analyst' | 'guest';
  status: 'online' | 'offline' | 'away' | 'busy' | 'do-not-disturb';
  permissions: string[];
  joinedAt: Date;
  avatar?: string;
  lastSeen: Date;
  activity: MemberActivity;
  skills: string[];
  timezone: string;
  language: string;
}

interface TeamSettings {
  securityLevel: 'basic' | 'enhanced' | 'enterprise';
  allowGuestAccess: boolean;
  requireApproval: boolean;
  enableRealTimeCollaboration: boolean;
  dataSharingLevel: 'private' | 'team' | 'public';
  autoBackup: boolean;
  versionControl: boolean;
  auditLogging: boolean;
  integrations: string[];
}

interface TeamPermissions {
  canInvite: boolean;
  canRemove: boolean;
  canEditSettings: boolean;
  canViewAnalytics: boolean;
  canExportData: boolean;
  canManageIntegrations: boolean;
  canAccessAPI: boolean;
}

interface TeamAnalytics {
  totalMembers: number;
  activeMembers: number;
  collaborationHours: number;
  projectsCompleted: number;
  averageResponseTime: number;
  satisfactionScore: number;
  productivityMetrics: ProductivityMetrics;
  usagePatterns: UsagePatterns;
}

interface ProductivityMetrics {
  tasksCompleted: number;
  timeSpent: number;
  efficiency: number;
  quality: number;
  collaboration: number;
}

interface UsagePatterns {
  peakHours: string[];
  preferredTools: string[];
  commonActivities: string[];
  teamPreferences: Record<string, string | number | boolean>;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeout: number;
  ipWhitelist: string[];
  deviceManagement: boolean;
  encryptionLevel: 'standard' | 'high' | 'enterprise';
  compliance: string[];
}

interface MemberActivity {
  lastLogin: Date;
  loginCount: number;
  activeTime: number;
  contributions: number;
  collaborations: number;
  achievements: Achievement[];
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: Date;
  category: string;
}



export default function CollaborationDashboard() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [activeTeam, setActiveTeam] = useState<Team | null>(null);

  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const connectionStatus = useConnectionStatus();

  // Mock data for demonstration
  useEffect(() => {
    const mockTeams: Team[] = [
      {
        id: '1',
        name: 'Quantitative Research',
        description: 'Advanced quantitative research and strategy development team',
        members: [
          {
            id: '1',
            name: 'Dr. Sarah Chen',
            email: 'sarah.chen@company.com',
            role: 'admin',
            status: 'online',
            permissions: ['full'],
            joinedAt: new Date('2024-01-15'),
            avatar: '/avatars/sarah.jpg',
            lastSeen: new Date(),
            activity: {
              lastLogin: new Date(),
              loginCount: 156,
              activeTime: 2840,
              contributions: 89,
              collaborations: 156,
              achievements: [
                { id: '1', name: 'Research Pioneer', description: 'Published 10+ research papers', icon: '📚', earnedAt: new Date('2024-06-15'), category: 'research' },
                { id: '2', name: 'Team Leader', description: 'Led 5 successful projects', icon: '👑', earnedAt: new Date('2024-05-20'), category: 'leadership' }
              ]
            },
            skills: ['Quantitative Analysis', 'Python', 'Machine Learning', 'Risk Management'],
            timezone: 'America/New_York',
            language: 'en'
          },
          {
            id: '2',
            name: 'Michael Rodriguez',
            email: 'michael.rodriguez@company.com',
            role: 'analyst',
            status: 'online',
            permissions: ['read', 'write'],
            joinedAt: new Date('2024-02-01'),
            avatar: '/avatars/michael.jpg',
            lastSeen: new Date(),
            activity: {
              lastLogin: new Date(),
              loginCount: 89,
              activeTime: 1560,
              contributions: 45,
              collaborations: 78,
              achievements: [
                { id: '3', name: 'Data Wizard', description: 'Processed 1M+ data points', icon: '🔢', earnedAt: new Date('2024-06-10'), category: 'data' }
              ]
            },
            skills: ['Data Analysis', 'R', 'Statistics', 'Visualization'],
            timezone: 'America/Chicago',
            language: 'en'
          }
        ],
        createdAt: new Date('2024-01-15'),
        maxMembers: 15,
        settings: {
          securityLevel: 'enterprise',
          allowGuestAccess: false,
          requireApproval: true,
          enableRealTimeCollaboration: true,
          dataSharingLevel: 'team',
          autoBackup: true,
          versionControl: true,
          auditLogging: true,
          integrations: ['GitHub', 'Slack', 'Jira', 'Tableau']
        },
        isActive: true,
        tags: ['quantitative', 'research', 'strategy', 'enterprise'],
        permissions: {
          canInvite: true,
          canRemove: true,
          canEditSettings: true,
          canViewAnalytics: true,
          canExportData: true,
          canManageIntegrations: true,
          canAccessAPI: true
        },
        analytics: {
          totalMembers: 2,
          activeMembers: 2,
          collaborationHours: 2840,
          projectsCompleted: 12,
          averageResponseTime: 2.5,
          satisfactionScore: 4.8,
          productivityMetrics: {
            tasksCompleted: 156,
            timeSpent: 2840,
            efficiency: 94,
            quality: 96,
            collaboration: 92
          },
          usagePatterns: {
            peakHours: ['09:00', '14:00', '16:00'],
            preferredTools: ['Python', 'Jupyter', 'GitHub', 'Slack'],
            commonActivities: ['Data Analysis', 'Model Development', 'Research Review', 'Team Meetings'],
            teamPreferences: { theme: 'dark', notifications: 'high', autoSave: true }
          }
        },
        security: {
          twoFactorRequired: true,
          sessionTimeout: 3600,
          ipWhitelist: ['192.168.1.0/24', '10.0.0.0/8'],
          deviceManagement: true,
          encryptionLevel: 'enterprise',
          compliance: ['SOC2', 'GDPR', 'HIPAA']
        }
      }
    ];

    setTeams(mockTeams);
    setActiveTeam(mockTeams[0]);
  }, []);

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    let filtered = teams;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(team =>
        team.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        team.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(team => team.isActive === (filterStatus === 'active'));
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'members':
          return b.members.length - a.members.length;
        case 'created':
          return b.createdAt.getTime() - a.createdAt.getTime();
        case 'activity':
          return b.analytics.collaborationHours - a.analytics.collaborationHours;
        default:
          return 0;
      }
    });

    return filtered;
  }, [teams, searchQuery, filterStatus, sortBy]);

  // Team statistics
  const teamStats = useMemo(() => {
    if (!teams.length) return null;

    const totalMembers = teams.reduce((sum, team) => sum + team.analytics.totalMembers, 0);
    const activeMembers = teams.reduce((sum, team) => sum + team.analytics.activeMembers, 0);
    const totalCollaborationHours = teams.reduce((sum, team) => sum + team.analytics.collaborationHours, 0);
    const averageSatisfaction = teams.reduce((sum, team) => sum + team.analytics.satisfactionScore, 0) / teams.length;

    return {
      totalTeams: teams.length,
      totalMembers,
      activeMembers,
      totalCollaborationHours,
      averageSatisfaction,
      activeTeams: teams.filter(team => team.isActive).length
    };
  }, [teams]);

  // Create new team
  const handleCreateTeam = useCallback((teamData: Partial<Team>) => {
    const newTeam: Team = {
      id: Date.now().toString(),
      name: teamData.name || 'New Team',
      description: teamData.description || '',
      members: [],
      createdAt: new Date(),
      maxMembers: teamData.maxMembers || 10,
      settings: {
        securityLevel: 'basic',
        allowGuestAccess: false,
        requireApproval: false,
        enableRealTimeCollaboration: true,
        dataSharingLevel: 'private',
        autoBackup: false,
        versionControl: false,
        auditLogging: false,
        integrations: []
      },
      isActive: true,
      tags: [],
      permissions: {
        canInvite: true,
        canRemove: false,
        canEditSettings: false,
        canViewAnalytics: false,
        canExportData: false,
        canManageIntegrations: false,
        canAccessAPI: false
      },
      analytics: {
        totalMembers: 0,
        activeMembers: 0,
        collaborationHours: 0,
        projectsCompleted: 0,
        averageResponseTime: 0,
        satisfactionScore: 0,
        productivityMetrics: {
          tasksCompleted: 0,
          timeSpent: 0,
          efficiency: 0,
          quality: 0,
          collaboration: 0
        },
        usagePatterns: {
          peakHours: [],
          preferredTools: [],
          commonActivities: [],
          teamPreferences: {}
        }
      },
      security: {
        twoFactorRequired: false,
        sessionTimeout: 1800,
        ipWhitelist: [],
        deviceManagement: false,
        encryptionLevel: 'standard',
        compliance: []
      }
    };

    setTeams(prev => [...prev, newTeam]);
    setShowCreateTeam(false);
  }, []);

  // Invite member to team
  const handleInviteMember = useCallback((_invitationData: Record<string, unknown>) => {
    if (activeTeam) {
      // Simplified invitation handling
      setShowInviteMember(false);
    }
  }, [activeTeam]);

  if (!teams.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
          <p className="text-muted-foreground mb-4">Create your first team to start collaborating</p>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with connection status and quick actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team Collaboration</h1>
          <p className="text-muted-foreground">Manage teams, sessions, and collaboration tools</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-muted-foreground">
              {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button onClick={() => setShowCreateTeam(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Team
          </Button>
        </div>
      </div>

      {/* Team Statistics Overview */}
      {teamStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalTeams}</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.activeTeams} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalMembers}</div>
              <p className="text-xs text-muted-foreground">
                {teamStats.activeMembers} online
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collaboration Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.totalCollaborationHours}</div>
              <p className="text-xs text-muted-foreground">
                This month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{teamStats.averageSatisfaction.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Average rating
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search teams, members, or tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teams</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="members">Members</SelectItem>
                <SelectItem value="created">Created Date</SelectItem>
                <SelectItem value="activity">Activity</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <div className="grid grid-cols-2 gap-1 w-4 h-4">
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                  <div className="w-1.5 h-1.5 bg-current rounded-sm" />
                </div>
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <div className="flex flex-col gap-1 w-4 h-4">
                  <div className="w-full h-1 bg-current rounded-sm" />
                  <div className="w-full h-1 bg-current rounded-sm" />
                  <div className="w-full h-1 bg-current rounded-sm" />
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teams Grid/List */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
        {filteredTeams.map((team) => (
          <Card key={team.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    {team.name}
                    {team.settings.securityLevel === 'enterprise' && (
                      <Shield className="h-4 w-4 text-blue-500" />
                    )}
                    {!team.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Team Members */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-sm font-medium">Members ({team.members.length}/{team.maxMembers})</Label>
                    <Button variant="ghost" size="sm" onClick={() => setShowInviteMember(true)}>
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex -space-x-2">
                    {team.members.slice(0, 5).map((member) => (
                      <TooltipProvider key={member.id}>
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="h-8 w-8 border-2 border-background">
                              <AvatarImage src={member.avatar} />
                              <AvatarFallback className="text-xs">
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="text-center">
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{member.role}</p>
                              <p className="text-xs text-muted-foreground">{member.status}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                    {team.members.length > 5 && (
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                        +{team.members.length - 5}
                      </div>
                    )}
                  </div>
                </div>

                {/* Team Tags */}
                <div className="flex flex-wrap gap-1">
                  {team.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Team Analytics */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Productivity</span>
                    <span>{team.analytics.productivityMetrics.efficiency}%</span>
                  </div>
                  <Progress value={team.analytics.productivityMetrics.efficiency} className="h-2" />
                  
                  <div className="flex justify-between text-sm">
                    <span>Collaboration</span>
                    <span>{team.analytics.productivityMetrics.collaboration}%</span>
                  </div>
                  <Progress value={team.analytics.productivityMetrics.collaboration} className="h-2" />
                </div>

                {/* Team Actions */}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="flex-1">
                    <Activity className="h-4 w-4 mr-2" />
                    View Analytics
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Team Dialog */}
      <Dialog open={showCreateTeam} onOpenChange={setShowCreateTeam}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
            <DialogDescription>
              Set up a new team for collaboration. You can customize settings later.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="team-name">Team Name</Label>
              <Input id="team-name" placeholder="Enter team name" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="team-description">Description</Label>
              <Input id="team-description" placeholder="Enter team description" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="max-members">Maximum Members</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select max members" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 members</SelectItem>
                  <SelectItem value="10">10 members</SelectItem>
                  <SelectItem value="20">20 members</SelectItem>
                  <SelectItem value="50">50 members</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTeam(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleCreateTeam({ name: 'New Team', maxMembers: 10 })}>
              Create Team
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your team.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="Enter email address" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Role</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="guest">Guest</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Personal Message (Optional)</Label>
              <Input id="message" placeholder="Add a personal message" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInviteMember(false)}>
              Cancel
            </Button>
            <Button onClick={() => handleInviteMember({ email: 'test@example.com', role: 'member' })}>
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}