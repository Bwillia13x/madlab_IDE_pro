'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingDown, TrendingUp, Shield, Activity } from 'lucide-react';

interface RiskMetrics {
  portfolioValue: number;
  var95: number;
  var99: number;
  expectedShortfall: number;
  maxDrawdown: number;
  sharpeRatio: number;
  volatility: number;
  beta: number;
  correlationRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  leverageRatio: number;
  marginUtilization: number;
  exposureLimit: number;
  stressTestResults: StressTestResult[];
  riskAlerts: RiskAlert[];
  sectorExposure: SectorExposure[];
  positionRisks: PositionRisk[];
  historicalVaR: HistoricalVaR[];
}

interface StressTestResult {
  scenario: string;
  impact: number;
  probability: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface RiskAlert {
  id: string;
  type: 'limit_breach' | 'volatility_spike' | 'correlation_risk' | 'liquidity_risk' | 'concentration_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  position?: string;
  metric: string;
  currentValue: number;
  threshold: number;
}

interface SectorExposure {
  sector: string;
  exposure: number;
  limit: number;
  risk: number;
  color: string;
}

interface PositionRisk {
  symbol: string;
  position: number;
  var95: number;
  beta: number;
  volatility: number;
  concentration: number;
  liquidity: number;
  risk_score: number;
  status: 'safe' | 'warning' | 'critical';
}

interface HistoricalVaR {
  date: string;
  var95: number;
  var99: number;
  actual_pnl: number;
  breaches: number;
}

const RiskMonitoringDashboard: React.FC = () => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  const [alerts, setAlerts] = useState<RiskAlert[]>([]);

  useEffect(() => {
    // Simulate real-time risk data
    const fetchRiskMetrics = () => {
      const mockMetrics: RiskMetrics = {
        portfolioValue: 1250000,
        var95: -15750, // 1.26% of portfolio
        var99: -28400, // 2.27% of portfolio
        expectedShortfall: -32100,
        maxDrawdown: 0.089,
        sharpeRatio: 1.42,
        volatility: 0.156,
        beta: 1.08,
        correlationRisk: 0.23,
        concentrationRisk: 0.34,
        liquidityRisk: 0.12,
        leverageRatio: 1.8,
        marginUtilization: 0.67,
        exposureLimit: 0.85,
        stressTestResults: [
          {
            scenario: 'Market Crash 2008',
            impact: -0.35,
            probability: 0.02,
            description: 'Severe market downturn similar to 2008 financial crisis',
            severity: 'critical'
          },
          {
            scenario: 'COVID-19 Shock',
            impact: -0.28,
            probability: 0.05,
            description: 'Pandemic-induced market volatility',
            severity: 'high'
          },
          {
            scenario: 'Interest Rate Shock',
            impact: -0.18,
            probability: 0.15,
            description: 'Rapid 300bp rate increase',
            severity: 'medium'
          },
          {
            scenario: 'Sector Rotation',
            impact: -0.12,
            probability: 0.25,
            description: 'Major sector rotation away from current holdings',
            severity: 'medium'
          }
        ],
        riskAlerts: [
          {
            id: 'alert_1',
            type: 'concentration_risk',
            severity: 'high',
            message: 'Technology sector exposure exceeds 40% limit',
            timestamp: new Date(Date.now() - 30 * 60 * 1000),
            acknowledged: false,
            metric: 'sector_concentration',
            currentValue: 42.5,
            threshold: 40
          },
          {
            id: 'alert_2',
            type: 'volatility_spike',
            severity: 'medium',
            message: 'Portfolio volatility increased by 15% over 24h',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
            acknowledged: false,
            metric: 'volatility_change',
            currentValue: 18.2,
            threshold: 15
          },
          {
            id: 'alert_3',
            type: 'limit_breach',
            severity: 'critical',
            message: 'AAPL position exceeds single position limit',
            timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
            acknowledged: true,
            position: 'AAPL',
            metric: 'position_size',
            currentValue: 12.8,
            threshold: 10
          }
        ],
        sectorExposure: [
          { sector: 'Technology', exposure: 42.5, limit: 40, risk: 0.18, color: '#8884d8' },
          { sector: 'Healthcare', exposure: 18.3, limit: 25, risk: 0.12, color: '#82ca9d' },
          { sector: 'Financial', exposure: 15.7, limit: 20, risk: 0.15, color: '#ffc658' },
          { sector: 'Consumer', exposure: 12.2, limit: 15, risk: 0.14, color: '#ff7300' },
          { sector: 'Energy', exposure: 8.1, limit: 15, risk: 0.22, color: '#8dd1e1' },
          { sector: 'Other', exposure: 3.2, limit: 10, risk: 0.08, color: '#d084d0' }
        ],
        positionRisks: [
          {
            symbol: 'AAPL',
            position: 12.8,
            var95: -2100,
            beta: 1.2,
            volatility: 0.28,
            concentration: 0.85,
            liquidity: 0.95,
            risk_score: 78,
            status: 'critical'
          },
          {
            symbol: 'MSFT',
            position: 8.5,
            var95: -1350,
            beta: 0.9,
            volatility: 0.24,
            concentration: 0.45,
            liquidity: 0.98,
            risk_score: 52,
            status: 'warning'
          },
          {
            symbol: 'GOOGL',
            position: 7.2,
            var95: -1200,
            beta: 1.1,
            volatility: 0.26,
            concentration: 0.38,
            liquidity: 0.92,
            risk_score: 48,
            status: 'safe'
          }
        ],
        historicalVaR: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          var95: -12000 + Math.random() * 8000,
          var99: -20000 + Math.random() * 12000,
          actual_pnl: -5000 + Math.random() * 15000,
          breaches: Math.random() > 0.9 ? 1 : 0
        }))
      };

      setRiskMetrics(mockMetrics);
      setAlerts(mockMetrics.riskAlerts);
      setLoading(false);
    };

    fetchRiskMetrics();
    const interval = setInterval(fetchRiskMetrics, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getRiskColor = (risk: number) => {
    if (risk < 0.2) return 'text-green-600';
    if (risk < 0.5) return 'text-yellow-600';
    if (risk < 0.8) return 'text-orange-600';
    return 'text-red-600';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(alerts.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!riskMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Failed to load risk metrics</div>
      </div>
    );
  }

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);
  const criticalAlerts = alerts.filter(alert => alert.severity === 'critical');

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Risk Monitoring Dashboard</h1>
          <p className="text-muted-foreground">Real-time portfolio risk analysis and alerts</p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={criticalAlerts.length > 0 ? "destructive" : "secondary"}>
            {unacknowledgedAlerts.length} Active Alerts
          </Badge>
          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
            <Activity className="h-4 w-4" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Risk Alerts */}
      {unacknowledgedAlerts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">Active Risk Alerts ({unacknowledgedAlerts.length})</p>
              {unacknowledgedAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Badge className={getSeverityColor(alert.severity)}>
                      {alert.severity.toUpperCase()}
                    </Badge>
                    <span>{alert.message}</span>
                  </div>
                  <button 
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Acknowledge
                  </button>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Portfolio VaR (95%)</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${Math.abs(riskMetrics.var95).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {((Math.abs(riskMetrics.var95) / riskMetrics.portfolioValue) * 100).toFixed(2)}% of portfolio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expected Shortfall</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${Math.abs(riskMetrics.expectedShortfall).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              Worst case scenario loss
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sharpe Ratio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {riskMetrics.sharpeRatio.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Risk-adjusted return
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Drawdown</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {(riskMetrics.maxDrawdown * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Peak to trough decline
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="positions">Position Risk</TabsTrigger>
          <TabsTrigger value="stress">Stress Tests</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Historical VaR Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Historical Value at Risk</CardTitle>
                <CardDescription>95% and 99% VaR vs actual P&L</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={riskMetrics.historicalVaR}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="var95" stroke="#8884d8" name="VaR 95%" />
                    <Line type="monotone" dataKey="var99" stroke="#82ca9d" name="VaR 99%" />
                    <Line type="monotone" dataKey="actual_pnl" stroke="#ffc658" name="Actual P&L" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Sector Exposure */}
            <Card>
              <CardHeader>
                <CardTitle>Sector Risk Exposure</CardTitle>
                <CardDescription>Current exposure vs limits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskMetrics.sectorExposure.map((sector) => (
                    <div key={sector.sector} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{sector.sector}</span>
                        <div className="text-sm">
                          <span className={`font-medium ${sector.exposure > sector.limit ? 'text-red-600' : 'text-green-600'}`}>
                            {sector.exposure.toFixed(1)}%
                          </span>
                          <span className="text-muted-foreground"> / {sector.limit}%</span>
                        </div>
                      </div>
                      <Progress 
                        value={(sector.exposure / sector.limit) * 100} 
                        className="h-2"
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Risk Metrics Grid */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Metrics</CardTitle>
                <CardDescription>Portfolio risk indicators</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Volatility</div>
                  <div className="text-lg font-semibold">{(riskMetrics.volatility * 100).toFixed(1)}%</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Beta</div>
                  <div className="text-lg font-semibold">{riskMetrics.beta.toFixed(2)}</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Correlation Risk</div>
                  <div className={`text-lg font-semibold ${getRiskColor(riskMetrics.correlationRisk)}`}>
                    {(riskMetrics.correlationRisk * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Liquidity Risk</div>
                  <div className={`text-lg font-semibold ${getRiskColor(riskMetrics.liquidityRisk)}`}>
                    {(riskMetrics.liquidityRisk * 100).toFixed(0)}%
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Leverage Ratio</div>
                  <div className="text-lg font-semibold">{riskMetrics.leverageRatio.toFixed(1)}x</div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Margin Utilization</div>
                  <div className="text-lg font-semibold">{(riskMetrics.marginUtilization * 100).toFixed(0)}%</div>
                </div>
              </CardContent>
            </Card>

            {/* Concentration Risk */}
            <Card>
              <CardHeader>
                <CardTitle>Concentration Analysis</CardTitle>
                <CardDescription>Portfolio concentration metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Overall Concentration Risk</span>
                    <span className={`font-semibold ${getRiskColor(riskMetrics.concentrationRisk)}`}>
                      {(riskMetrics.concentrationRisk * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={riskMetrics.concentrationRisk * 100} />
                  
                  <div className="text-sm text-muted-foreground">
                    HHI Score: {(riskMetrics.concentrationRisk * 10000).toFixed(0)}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Position Risk Analysis</CardTitle>
              <CardDescription>Individual position risk metrics and alerts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">Position %</th>
                      <th className="text-left p-2">VaR (95%)</th>
                      <th className="text-left p-2">Beta</th>
                      <th className="text-left p-2">Volatility</th>
                      <th className="text-left p-2">Risk Score</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {riskMetrics.positionRisks.map((position) => (
                      <tr key={position.symbol} className="border-b">
                        <td className="p-2 font-medium">{position.symbol}</td>
                        <td className="p-2">{position.position.toFixed(1)}%</td>
                        <td className="p-2 text-red-600">${Math.abs(position.var95).toLocaleString()}</td>
                        <td className="p-2">{position.beta.toFixed(2)}</td>
                        <td className="p-2">{(position.volatility * 100).toFixed(1)}%</td>
                        <td className="p-2">
                          <div className="flex items-center space-x-2">
                            <Progress value={position.risk_score} className="w-16 h-2" />
                            <span className="text-sm">{position.risk_score}</span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge 
                            variant={position.status === 'critical' ? 'destructive' : 
                                   position.status === 'warning' ? 'default' : 'secondary'}
                          >
                            {position.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stress Test Results</CardTitle>
              <CardDescription>Portfolio performance under adverse scenarios</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {riskMetrics.stressTestResults.map((test, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{test.scenario}</h4>
                        <p className="text-sm text-muted-foreground">{test.description}</p>
                      </div>
                      <Badge className={getSeverityColor(test.severity)}>
                        {test.severity}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2">
                      <div>
                        <div className="text-sm text-muted-foreground">Potential Loss</div>
                        <div className="text-lg font-semibold text-red-600">
                          {(test.impact * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-muted-foreground">
                          ${(riskMetrics.portfolioValue * Math.abs(test.impact)).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Probability</div>
                        <div className="text-lg font-semibold">
                          {(test.probability * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Expected Annual Loss</div>
                        <div className="text-lg font-semibold">
                          ${(riskMetrics.portfolioValue * Math.abs(test.impact) * test.probability).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Alerts</CardTitle>
              <CardDescription>All risk alerts and notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id} 
                    className={`border rounded-lg p-4 ${alert.acknowledged ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {alert.timestamp.toLocaleTimeString()}
                          </span>
                          {alert.position && (
                            <Badge variant="outline">{alert.position}</Badge>
                          )}
                        </div>
                        <p className="font-medium">{alert.message}</p>
                        <div className="text-sm text-muted-foreground">
                          Current: {alert.currentValue} | Threshold: {alert.threshold}
                        </div>
                      </div>
                      {!alert.acknowledged && (
                        <button 
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Acknowledge
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RiskMonitoringDashboard;