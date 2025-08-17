'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, TrendingUp, TrendingDown, Minus, ExternalLink, Filter } from 'lucide-react';
import type { Widget } from '@/lib/store';

interface NewsEventsFeedWidgetProps {
  widget: Widget;
  sheetId: string;
}

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source: string;
  timestamp: Date;
  sentiment: 'positive' | 'negative' | 'neutral';
  category: 'earnings' | 'economic' | 'company' | 'market';
  symbols?: string[];
  impact: 'high' | 'medium' | 'low';
}

interface EventItem {
  id: string;
  title: string;
  date: Date;
  time: string;
  type: 'earnings' | 'economic' | 'dividend' | 'split';
  symbol?: string;
  estimate?: string;
  previous?: string;
  status: 'upcoming' | 'live' | 'completed';
}

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Apple Reports Strong Q4 Earnings, Beats Estimates',
    summary: 'Apple Inc. reported Q4 earnings of $1.46 per share, beating analyst estimates of $1.39. Revenue grew 8.1% year-over-year to $89.5 billion.',
    source: 'Reuters',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    sentiment: 'positive',
    category: 'earnings',
    symbols: ['AAPL'],
    impact: 'high'
  },
  {
    id: '2',
    title: 'Fed Signals Potential Rate Cut in December Meeting',
    summary: 'Federal Reserve officials indicated openness to interest rate cuts at the December FOMC meeting, citing cooling inflation and economic data.',
    source: 'Bloomberg',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    sentiment: 'positive',
    category: 'economic',
    impact: 'high'
  },
  {
    id: '3',
    title: 'Tesla Announces New Gigafactory in Mexico',
    summary: 'Tesla Inc. announced plans to build a new Gigafactory in Mexico, expected to produce 1 million vehicles annually by 2025.',
    source: 'CNBC',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    sentiment: 'positive',
    category: 'company',
    symbols: ['TSLA'],
    impact: 'medium'
  },
  {
    id: '4',
    title: 'Oil Prices Drop 3% on OPEC+ Production Increase',
    summary: 'Crude oil prices fell 3% after OPEC+ announced plans to increase production by 500,000 barrels per day starting next month.',
    source: 'MarketWatch',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
    sentiment: 'negative',
    category: 'market',
    impact: 'medium'
  },
  {
    id: '5',
    title: 'Microsoft Cloud Revenue Surges 25% in Q3',
    summary: 'Microsoft Corporation reported cloud revenue growth of 25% in Q3, driven by strong Azure performance and enterprise adoption.',
    source: 'Wall Street Journal',
    timestamp: new Date(Date.now() - 10 * 60 * 60 * 1000), // 10 hours ago
    sentiment: 'positive',
    category: 'earnings',
    symbols: ['MSFT'],
    impact: 'high'
  }
];

const MOCK_EVENTS: EventItem[] = [
  {
    id: '1',
    title: 'AAPL Earnings Release',
    date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    time: '16:30 ET',
    type: 'earnings',
    symbol: 'AAPL',
    estimate: '$1.39',
    previous: '$1.29',
    status: 'upcoming'
  },
  {
    id: '2',
    title: 'FOMC Interest Rate Decision',
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
    time: '14:00 ET',
    type: 'economic',
    status: 'upcoming'
  },
  {
    id: '3',
    title: 'MSFT Earnings Release',
    date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
    time: '16:30 ET',
    type: 'earnings',
    symbol: 'MSFT',
    estimate: '$2.78',
    previous: '$2.45',
    status: 'upcoming'
  },
  {
    id: '4',
    title: 'NVDA Dividend Payment',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    time: '09:00 ET',
    type: 'dividend',
    symbol: 'NVDA',
    status: 'upcoming'
  },
  {
    id: '5',
    title: 'CPI Inflation Data',
    date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
    time: '08:30 ET',
    type: 'economic',
    status: 'upcoming'
  }
];

export function NewsEventsFeedWidget({ widget }: Readonly<NewsEventsFeedWidgetProps>) {
  const [activeTab, setActiveTab] = useState('news');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return <TrendingUp className="w-3 h-3 text-green-600" />;
      case 'negative': return <TrendingDown className="w-3 h-3 text-red-600" />;
      default: return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600';
      case 'negative': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-green-100 text-green-800 border-green-200';
    }
  };

  const getEventStatusColor = (status: string) => {
    switch (status) {
      case 'live': return 'bg-red-100 text-red-800 border-red-200';
      case 'upcoming': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatTimeAgo = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    return 'Just now';
  };

  const formatEventDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const filteredNews = MOCK_NEWS.filter(item => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (selectedSentiment !== 'all' && item.sentiment !== selectedSentiment) return false;
    return true;
  });

  const upcomingEvents = MOCK_EVENTS.filter(event => event.status === 'upcoming');

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          News & Events Feed
          <Badge variant="secondary" className="ml-auto">{filteredNews.length} items</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex gap-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="earnings">Earnings</SelectItem>
              <SelectItem value="economic">Economic</SelectItem>
              <SelectItem value="company">Company</SelectItem>
              <SelectItem value="market">Market</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedSentiment} onValueChange={setSelectedSentiment}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiment</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="news">Market News</TabsTrigger>
            <TabsTrigger value="events">Events Calendar</TabsTrigger>
          </TabsList>

          <TabsContent value="news" className="mt-4 space-y-3">
            {filteredNews.map((item) => (
              <div key={item.id} className="p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {getSentimentIcon(item.sentiment)}
                    <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    <Badge className={`text-xs ${getImpactColor(item.impact)}`}>
                      {item.impact} impact
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTimeAgo(item.timestamp)}
                  </div>
                </div>
                
                <h4 className="font-medium text-sm mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground mb-2">{item.summary}</p>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{item.source}</span>
                    {item.symbols && (
                      <div className="flex gap-1">
                        {item.symbols.map(symbol => (
                          <Badge key={symbol} variant="secondary" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="events" className="mt-4 space-y-3">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getEventStatusColor(event.status)}`}>
                      {event.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">{event.type}</Badge>
                    {event.symbol && (
                      <Badge variant="secondary" className="text-xs">{event.symbol}</Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium">{formatEventDate(event.date)}</div>
                    <div className="text-xs text-muted-foreground">{event.time}</div>
                  </div>
                </div>
                
                <h4 className="font-medium text-sm mb-2">{event.title}</h4>
                
                {(event.estimate || event.previous) && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {event.estimate && (
                      <div>
                        <span className="text-muted-foreground">Estimate: </span>
                        <span className="font-medium">{event.estimate}</span>
                      </div>
                    )}
                    {event.previous && (
                      <div>
                        <span className="text-muted-foreground">Previous: </span>
                        <span className="font-medium">{event.previous}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </TabsContent>
        </Tabs>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Data updates every 15 minutes • Mock data for demonstration
        </div>
      </CardContent>
    </Card>
  );
}
