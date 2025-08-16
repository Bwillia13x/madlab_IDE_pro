'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Users,
  UserPlus,
  Settings,
  BarChart3,
  Activity,
  MessageSquare,
  Share2,
  Video,
  Calendar,
  Clock,
  TrendingUp,
  Users2,
  FileText,
  PieChart,
  Target,
  Zap,
  Globe,
  Shield,
  Bell,
  MoreHorizontal,
  Play,
  Pause,
  Square,
  Mic,
  MicOff,
  Camera,
  CameraOff,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { teamManager, type Team, type TeamMember, type CollaborationSession, type TeamAnalytics } from '@/lib/collaboration/teamManager';
import { useConnectionStatus } from '@/lib/data/useRealtimeData';

interface CollaborationDashboardProps {
  teamId?: string;
  onTeamSelect?: (teamId: string) => void;
}

export function CollaborationDashboard({ teamId, onTeamSelect }: CollaborationDashboardProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [activeSessions, setActiveSessions] = useState<CollaborationSession[]>([]);
  const [teamAnalytics, setTeamAnalytics] = useState<TeamAnalytics | null>(null);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [newTeamData, setNewTeamData] = useState({
    name: '',
    description: '',
    maxMembers: 10,
  });
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'viewer' as TeamMember['role'],
    status: 'offline' as TeamMember['status'],
    permissions: [] as string[],
  });

  const connectionStatus = useConnectionStatus();

  // Load teams on component mount
  useEffect(() => {
    loadTeams();
  }, []);

  // Load selected team data
  useEffect(() => {
    if (teamId) {
      loadTeamData(teamId);
    }
  }, [teamId]);

  // Set up team manager event listeners
  useEffect(() => {
    const handleTeamCreated = (team: Team) => {
      setTeams(prev => [...prev, team]);
    };

    const handleTeamUpdated = (team: Team) => {
      setTeams(prev => prev.map(t => t.id === team.id ? team : t));
      if (selectedTeam?.id === team.id) {
        setSelectedTeam(team);
      }
    };

    const handleTeamDeleted = (deletedTeamId: string) => {
      setTeams(prev => prev.filter(t => t.id !== deletedTeamId));
      if (selectedTeam?.id === deletedTeamId) {
        setSelectedTeam(null);
      }
    };

    const handleMemberAdded = ({ teamId, member }: { teamId: string; member: TeamMember }) => {
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(prev => prev ? { ...prev, members: [...prev.members, member] } : null);
      }
    };

    const handleMemberRemoved = ({ teamId, member }: { teamId: string; member: TeamMember }) => {
      if (selectedTeam?.id === teamId) {
        setSelectedTeam(prev => prev ? { ...prev, members: prev.members.filter(m => m.id !== member.id) } : null);
      }
    };

    const handleSessionCreated = (session: CollaborationSession) => {
      if (session.teamId === selectedTeam?.id) {
        setActiveSessions(prev => [...prev, session]);
      }
    };

    const handleSessionEnded = (session: CollaborationSession) => {
      setActiveSessions(prev => prev.filter(s => s.id !== session.id));
    };

    const handleAnalyticsGenerated = (analytics: TeamAnalytics) => {
      if (analytics.teamId === selectedTeam?.id) {
        setTeamAnalytics(analytics);
      }
    };

    // Subscribe to events
    teamManager.on('teamCreated', handleTeamCreated);
    teamManager.on('teamUpdated', handleTeamUpdated);
    teamManager.on('teamDeleted', handleTeamDeleted);
    teamManager.on('memberAdded', handleMemberAdded);
    teamManager.on('memberRemoved', handleMemberRemoved);
    teamManager.on('sessionCreated', handleSessionCreated);
    teamManager.on('sessionEnded', handleSessionEnded);
    teamManager.on('analyticsGenerated', handleAnalyticsGenerated);

    return () => {
      teamManager.off('teamCreated', handleTeamCreated);
      teamManager.off('teamUpdated', handleTeamUpdated);
      teamManager.off('teamDeleted', handleTeamDeleted);
      teamManager.off('memberAdded', handleMemberAdded);
      teamManager.off('memberRemoved', handleMemberRemoved);
      teamManager.off('sessionCreated', handleSessionCreated);
      teamManager.off('sessionEnded', handleSessionEnded);
      teamManager.off('analyticsGenerated', handleAnalyticsGenerated);
    };
  }, [selectedTeam]);

  const loadTeams = async () => {
    try {
      const allTeams = await teamManager.getAllTeams();
      setTeams(allTeams);
      
      if (teamId && !selectedTeam) {
        const team = allTeams.find(t => t.id === teamId);
        if (team) {
          setSelectedTeam(team);
        }
      }
    } catch (error) {
      console.error('Failed to load teams:', error);
    }
  };

  const loadTeamData = async (id: string) => {
    try {
      const team = await teamManager.getTeam(id);
      if (team) {
        setSelectedTeam(team);
        onTeamSelect?.(id);
        
        // Generate analytics for the team
        const analytics = await teamManager.generateTeamAnalytics(id, 'week');
        setTeamAnalytics(analytics);
      }
    } catch (error) {
      console.error('Failed to load team data:', error);
    }
  };

  const handleCreateTeam = async () => {
    try {
      const team = await teamManager.createTeam({
        ...newTeamData,
        ownerId: 'current-user-id', // This would come from auth context
        members: [],
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
        tags: ['new'],
      });

      setSelectedTeam(team);
      setShowCreateTeam(false);
      setNewTeamData({ name: '', description: '', maxMembers: 10 });
    } catch (error) {
      console.error('Failed to create team:', error);
    }
  };

  const handleInviteMember = async () => {
    if (!selectedTeam) return;

    try {
      await teamManager.addMember(selectedTeam.id, inviteData);
      setShowInviteMember(false);
      setInviteData({ email: '', name: '', role: 'viewer', status: 'offline', permissions: [] });
    } catch (error) {
      console.error('Failed to invite member:', error);
    }
  };

  const handleTeamSelect = (team: Team) => {
    setSelectedTeam(team);
    onTeamSelect?.(team.id);
    loadTeamData(team.id);
  };

  const getMemberStatusColor = (status: TeamMember['status']) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'away': return 'bg-yellow-500';
      case 'busy': return 'bg-red-500';
      case 'offline': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };

  const getRoleColor = (role: TeamMember['role']) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'analyst': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!selectedTeam) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Team Collaboration</h2>
          <Button onClick={() => setShowCreateTeam(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>

        {/* Team Selection */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map(team => (
            <Card key={team.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleTeamSelect(team)}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {team.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{team.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span>{team.members.length} members</span>
                  <Badge variant="outline">{team.settings.securityLevel}</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Create Team Modal */}
        {showCreateTeam && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Create New Team</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Team Name</Label>
                  <Input
                    id="team-name"
                    value={newTeamData.name}
                    onChange={(e) => setNewTeamData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter team name"
                  />
                </div>
                <div>
                  <Label htmlFor="team-description">Description</Label>
                  <Input
                    id="team-description"
                    value={newTeamData.description}
                    onChange={(e) => setNewTeamData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter team description"
                  />
                </div>
                <div>
                  <Label htmlFor="max-members">Max Members</Label>
                  <Select value={newTeamData.maxMembers.toString()} onValueChange={(value) => setNewTeamData(prev => ({ ...prev, maxMembers: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateTeam} className="flex-1">Create Team</Button>
                  <Button variant="outline" onClick={() => setShowCreateTeam(false)} className="flex-1">Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{selectedTeam.name}</h2>
          <p className="text-muted-foreground">{selectedTeam.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connectionStatus.isConnected ? 'default' : 'destructive'}>
            {connectionStatus.isConnected ? (
              <>
                <Wifi className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
          <Button onClick={() => setShowInviteMember(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
          <Button variant="outline">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{selectedTeam.members.length}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam.members.filter(m => m.status === 'online').length} online
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeSessions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeSessions.filter(s => s.status === 'active').length} running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Security Level</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{selectedTeam.settings.securityLevel}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam.settings.requireApproval ? 'Approval required' : 'Auto-join'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Sharing</CardTitle>
                <Share2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{selectedTeam.settings.dataSharingLevel}</div>
                <p className="text-xs text-muted-foreground">
                  {selectedTeam.settings.enableRealTimeCollaboration ? 'Real-time enabled' : 'Manual sync'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <Button variant="outline" className="h-20 flex-col">
                  <Video className="h-6 w-6 mb-2" />
                  Start Session
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <MessageSquare className="h-6 w-6 mb-2" />
                  Team Chat
                </Button>
                <Button variant="outline" className="h-20 flex-col">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Team Members ({selectedTeam.members.length})
                <Button variant="outline" size="sm" onClick={() => setShowInviteMember(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedTeam.members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={member.avatar} />
                        <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{member.name}</div>
                        <div className="text-sm text-muted-foreground">{member.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getRoleColor(member.role)}>{member.role}</Badge>
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${getMemberStatusColor(member.status)}`} />
                        <span className="text-xs text-muted-foreground capitalize">{member.status}</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Active Sessions ({activeSessions.length})
                <Button>
                  <Play className="h-4 w-4 mr-2" />
                  New Session
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No active sessions</p>
                  <p className="text-sm">Start a collaboration session to begin working together</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map(session => (
                    <div key={session.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-medium">{session.name}</h4>
                          <p className="text-sm text-muted-foreground">{session.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{session.participants.length} participants</Badge>
                          <Button variant="outline" size="sm">
                            <Square className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Started: {session.startTime.toLocaleTimeString()}</span>
                        <span>Duration: {Math.floor((Date.now() - session.startTime.getTime()) / 60000)}m</span>
                        <span>Shared: {session.sharedData.length} items</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {teamAnalytics ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Indicators</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Team Efficiency</span>
                      <span className="text-sm font-medium">{teamAnalytics.performanceIndicators.teamEfficiency.toFixed(1)}%</span>
                    </div>
                    <Progress value={teamAnalytics.performanceIndicators.teamEfficiency} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Collaboration Score</span>
                      <span className="text-sm font-medium">{teamAnalytics.performanceIndicators.collaborationScore.toFixed(1)}%</span>
                    </div>
                    <Progress value={teamAnalytics.performanceIndicators.collaborationScore} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Data Utilization</span>
                      <span className="text-sm font-medium">{teamAnalytics.performanceIndicators.dataUtilization.toFixed(1)}%</span>
                    </div>
                    <Progress value={teamAnalytics.performanceIndicators.dataUtilization} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Collaboration Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{teamAnalytics.collaborationMetrics.totalSessions}</div>
                      <div className="text-xs text-muted-foreground">Total Sessions</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{Math.round(teamAnalytics.collaborationMetrics.averageSessionDuration / 60000)}m</div>
                      <div className="text-xs text-muted-foreground">Avg Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{teamAnalytics.collaborationMetrics.activeParticipants}</div>
                      <div className="text-xs text-muted-foreground">Active Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{teamAnalytics.collaborationMetrics.sharedDataCount}</div>
                      <div className="text-xs text-muted-foreground">Shared Items</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No analytics available</p>
                <p className="text-sm">Analytics will be generated as the team collaborates</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Invite Member Modal */}
      {showInviteMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Invite Team Member</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="member-email">Email</Label>
                <Input
                  id="member-email"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <Label htmlFor="member-name">Name</Label>
                <Input
                  id="member-name"
                  value={inviteData.name}
                  onChange={(e) => setInviteData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="member-role">Role</Label>
                <Select value={inviteData.role} onValueChange={(value: TeamMember['role']) => setInviteData(prev => ({ ...prev, role: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="viewer">Viewer</SelectItem>
                    <SelectItem value="analyst">Analyst</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteMember} className="flex-1">Send Invite</Button>
                <Button variant="outline" onClick={() => setShowInviteMember(false)} className="flex-1">Cancel</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}