'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Minimize2, Bot, User, Mic, MicOff, Brain, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';
import { log, trackEvent } from '@/lib/utils/errorLogger';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { WORKFLOWS } from '@/lib/workflows';
import { advancedAgent } from '@/lib/ai/advancedAgent';
import { aiAgent } from '@/lib/ai/agent';
import { TelemetryDashboard } from './TelemetryDashboard';

// Type definition for the SpeechRecognition API
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onend: () => void;
  onerror: (event: Event) => void;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionEvent extends Event {
  results: {
    [key: number]: {
      [key:number]: {
        transcript: string;
      }
    }
  }
}

declare global {
  interface Window {
    webkitSpeechRecognition: { new(): SpeechRecognition };
    SpeechRecognition: { new(): SpeechRecognition };
  }
}

export function AgentChat() {
  const { messages, addMessage, chatCollapsed, toggleChat, globalSymbol, createSheetFromWorkflow, addWidget, activeSheetId, setDataProvider, setGlobalSymbol, globalTimeframe } = useWorkspaceStore();
  const dataProvider = useWorkspaceStore((s) => s.dataProvider);
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<{ id: string; title: string }[]>([]);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  // no stream controller state needed at the moment
  const [recentCmds, setRecentCmds] = useState<string[]>([]);
  const [showTelemetry, setShowTelemetry] = useState(false);
  const [agentMode, setAgentMode] = useState<'basic' | 'advanced'>('advanced');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('madlab_agent_recent_cmds');
      if (raw) setRecentCmds(JSON.parse(raw));
    } catch {}
  }, []);

  // Listen for external telemetry open requests
  useEffect(() => {
    const openTelemetry = () => {
      try {
        if (useWorkspaceStore.getState().chatCollapsed) {
          toggleChat();
        }
        setShowTelemetry(true);
      } catch {}
    };
    window.addEventListener('madlab:open-telemetry', openTelemetry);
    return () => window.removeEventListener('madlab:open-telemetry', openTelemetry);
  }, [toggleChat]);

  function pushRecent(cmd: string) {
    try {
      const next = [cmd, ...recentCmds.filter((c) => c !== cmd)].slice(0, 5);
      setRecentCmds(next);
      localStorage.setItem('madlab_agent_recent_cmds', JSON.stringify(next));
    } catch {}
  }

  async function handleSendMessage() {
    if (!inputValue.trim()) return;
    
    const message = inputValue.trim();
    const startTime = Date.now();
    
    // Add user message
    addMessage(message, 'user');
    setInputValue('');
    
    // Check for slash commands first
    if (message.startsWith('/')) {
      if (handleSlashCommand(message)) {
        pushRecent(message);
        return;
      }
    }
    
    // Add agent message placeholder
    const agentMessageId = addMessage('', 'agent');
    
    try {
      let fullText = '';
      
      if (agentMode === 'advanced') {
        // Use advanced agent with context awareness
        const currentContext = {
          symbol: globalSymbol,
          analysisType: undefined as any,
        };
        
        const advancedResponse = await advancedAgent.processInput(
          message,
          currentContext,
          messages.slice(-10).map(m => ({ role: m.sender, content: m.content }))
        );
        
        fullText = advancedResponse.content;
        
        // Add recommendations and next steps
        if (advancedResponse.recommendations.length > 0) {
          fullText += '\n\n**Recommendations:**\n' + 
            advancedResponse.recommendations.map(r => `• ${r}`).join('\n');
        }
        
        if (advancedResponse.nextSteps.length > 0) {
          fullText += '\n\n**Next Steps:**\n' + 
            advancedResponse.nextSteps.map(s => `• ${s}`).join('\n');
        }
        
        // Process directives from advanced agent
        advancedResponse.directives.forEach(directive => {
          handleAgentDirectives(directive);
        });
        
        // Track advanced agent usage
        trackEvent('advanced_agent_used', true, {
          messageLength: message.length,
          responseLength: fullText.length,
          confidence: advancedResponse.confidence,
          directivesCount: advancedResponse.directives.length,
          recommendationsCount: advancedResponse.recommendations.length,
        }, Date.now() - startTime);
        
      } else {
        // Use basic agent with action router integration
        const actionContext = {
          currentSheetId: activeSheetId,
          globalSymbol,
          globalTimeframe
        };
        
        const response = await aiAgent.processQuery(message, actionContext);
        
        fullText = response.response;
        
        // Show success feedback for successful responses
        if (response.data) {
          toast.success('Query completed successfully!');
        }
        
        // Add suggestions if available
        if (response.suggestions && response.suggestions.length > 0) {
          fullText += '\n\n**Try these commands:**\n' + 
            response.suggestions.map(s => `• ${s}`).join('\n');
        }
        
        // Track successful agent interaction
        trackEvent('agent_message_sent', true, { 
          messageLength: message.length,
          responseLength: fullText.length,
          hasData: !!response.data,
          confidence: response.confidence
        }, Date.now() - startTime);
      }
      
      // Add the agent message with final content
      useWorkspaceStore.getState().addMessage(fullText, 'agent');
      
    } catch (error) {
      const errorMessage = `Failed to get agent response: ${error instanceof Error ? error.message : String(error)}`;
      useWorkspaceStore.getState().addMessage(errorMessage, 'agent');
      
      // Track failed agent interaction
      trackEvent('agent_message_sent', false, { 
        messageLength: message.length,
        error: String(error)
      }, Date.now() - startTime);
      
      log('error', 'Agent API call failed', { message }, error);
      toast.error('Failed to get agent response');
    }
  }

  const toggleVoice = () => {
    try {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      if (!SpeechRecognition) return;
      if (!recognitionRef.current) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript as string;
          setInputValue(transcript);
          setListening(false);
        };
        recognitionRef.current.onend = () => setListening(false);
        recognitionRef.current.onerror = () => setListening(false);
      }
      if (!listening) {
        setListening(true);
        recognitionRef.current.start();
      } else {
        recognitionRef.current.stop();
        setListening(false);
      }
    } catch {
      setListening(false);
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (inputValue.startsWith('/')) {
        if (handleSlashCommand(inputValue)) {
          pushRecent(inputValue.trim());
          setInputValue('');
          return;
        }
      }
      handleSendMessage();
    }
  };

  function handleSlashCommand(raw: string): boolean {
    const cmd = raw.trim();
    const startTime = Date.now();
    
    try {
      // /help
      if (cmd === '/help') {
        addMessage(
          [
            'Slash commands:',
            '• /add_widget {type}',
            '• /provider {name}',
            '• /symbol {SYM}',
            '• /backtest {symbol} {short} {long}',
            '• /telemetry - Show system metrics',
            '• /agent_mode {basic|advanced} - Switch agent mode',
            '',
            'Agent directives (embed in agent replies):',
            '• action:add_widget:{type}',
            '• action:switch_provider:{name}',
            '• action:set_symbol:{SYM}',
            '• action:run_backtest:{symbol,short,long}',
          ].join('\n'),
          'agent'
        );
        trackEvent('slash_command_help', true, { command: cmd }, Date.now() - startTime);
        return true;
      }
      // /add_widget {type}
      if (cmd.startsWith('/add_widget')) {
        const match = cmd.match(/^\/add_widget\s+(\w[\w-]*)/);
        if (match && activeSheetId) {
          const widgetType = match[1];
          addWidget(activeSheetId, {
            type: widgetType,
            title: `${widgetType} Widget`,
            layout: { i: `widget-${Date.now()}`, x: 0, y: 0, w: 6, h: 4 }
          });
          trackEvent('slash_command_add_widget', true, { command: cmd, widgetType }, Date.now() - startTime);
          return true;
        }
        trackEvent('slash_command_add_widget', false, { command: cmd, error: 'Invalid format' }, Date.now() - startTime);
        return false;
      }
      // /provider {name}
      if (cmd.startsWith('/provider')) {
        const match = cmd.match(/^\/provider\s+(\w+)/);
        if (match) {
          const providerName = match[1];
          setDataProvider(providerName);
          trackEvent('slash_command_provider', true, { command: cmd, provider: providerName }, Date.now() - startTime);
          return true;
        }
        trackEvent('slash_command_provider', false, { command: cmd, error: 'Invalid format' }, Date.now() - startTime);
        return false;
      }
      // /symbol {SYM}
      if (cmd.startsWith('/symbol')) {
        const match = cmd.match(/^\/symbol\s+([A-Z]+)/);
        if (match) {
          const symbol = match[1];
          setGlobalSymbol(symbol);
          trackEvent('slash_command_symbol', true, { command: cmd, symbol }, Date.now() - startTime);
          return true;
        }
        trackEvent('slash_command_symbol', false, { command: cmd, error: 'Invalid format' }, Date.now() - startTime);
        return false;
      }
      // /backtest {symbol} {short} {long}
      if (cmd.startsWith('/backtest')) {
        const match = cmd.match(/^\/backtest\s+([A-Z]+)\s+(\d+)\s+(\d+)/);
        if (match && activeSheetId) {
          const [, symbol, short, long] = match;
          addWidget(activeSheetId, {
            type: 'backtesting-framework',
            title: `Backtest ${symbol}`,
            layout: { i: `widget-${Date.now()}`, x: 0, y: 0, w: 8, h: 6 },
            props: {
              symbol,
              shortMA: parseInt(short),
              longMA: parseInt(long),
              autorun: true,
            }
          });
          trackEvent('slash_command_backtest', true, { command: cmd, symbol, shortMA: short, longMA: long }, Date.now() - startTime);
          return true;
        }
        trackEvent('slash_command_backtest', false, { command: cmd, error: 'Invalid format' }, Date.now() - startTime);
        return false;
      }
      // /telemetry
      if (cmd === '/telemetry') {
        setShowTelemetry(true);
        trackEvent('slash_command_telemetry', true, { command: cmd }, Date.now() - startTime);
        return true;
      }
      // /agent_mode {basic|advanced}
      if (cmd.startsWith('/agent_mode')) {
        const match = cmd.match(/^\/agent_mode\s+(basic|advanced)/i);
        if (match) {
          const mode = match[1].toLowerCase() as 'basic' | 'advanced';
          setAgentMode(mode);
          addMessage(`Switched to ${mode} agent mode.`, 'agent');
          trackEvent('slash_command_agent_mode', true, { command: cmd, mode }, Date.now() - startTime);
          return true;
        }
        trackEvent('slash_command_agent_mode', false, { command: cmd, error: 'Invalid format' }, Date.now() - startTime);
        return false;
      }
      trackEvent('slash_command_unknown', false, { command: cmd }, Date.now() - startTime);
      return false;
    } catch (error) {
      trackEvent('slash_command_error', false, { command: cmd, error: String(error) }, Date.now() - startTime);
      log('error', 'Slash command execution failed', { command: cmd }, error);
      return false;
    }
  }

  function handleAgentDirectives(text: string) {
    // Simple protocol: lines like action:add_widget:{type}
    const lines = text.split('\n');
    let actionCount = 0;
    let successCount = 0;
    
    for (const line of lines) {
      if (/^action:help/i.test(line)) {
        addMessage(
          [
            'Slash commands:',
            '• /add_widget {type}',
            '• /provider {name}',
            '• /symbol {SYM}',
            '• /backtest {symbol} {short} {long}',
            '',
            'Agent directives (embed in agent replies):',
            '• action:add_widget:{type}',
            '• action:switch_provider:{name}',
            '• action:set_symbol:{SYM}',
            '• action:run_backtest:{symbol,short,long}',
          ].join('\n'),
          'agent'
        );
        actionCount++;
        successCount++;
        continue;
      }
      const m = line.match(/^action:add_widget:(\w[\w-]*)/i);
      if (m) {
        actionCount++;
        try {
          if (activeSheetId) {
            addWidget(activeSheetId, {
              type: m[1],
              title: `${m[1]} Widget`,
              layout: { i: `widget-${Date.now()}`, x: 0, y: 0, w: 6, h: 4 }
            });
            successCount++;
          }
          trackEvent('agent_directive_add_widget', true, { widgetType: m[1] });
        } catch (error) {
          trackEvent('agent_directive_add_widget', false, { widgetType: m[1], error: String(error) });
          log('error', 'Agent directive add_widget failed', { widgetType: m[1] }, error);
        }
        continue;
      }
      const m2 = line.match(/^action:switch_provider:(\w+)/i);
      if (m2) {
        actionCount++;
        try {
          setDataProvider(m2[1]);
          successCount++;
          trackEvent('agent_directive_switch_provider', true, { provider: m2[1] });
        } catch (error) {
          trackEvent('agent_directive_switch_provider', false, { provider: m2[1], error: String(error) });
          log('error', 'Agent directive switch_provider failed', { provider: m2[1] }, error);
        }
        continue;
      }
      const m3 = line.match(/^action:set_symbol:([A-Z]+)/i);
      if (m3) {
        actionCount++;
        try {
          setGlobalSymbol(m3[1]);
          successCount++;
          trackEvent('agent_directive_set_symbol', true, { symbol: m3[1] });
        } catch (error) {
          trackEvent('agent_directive_set_symbol', false, { symbol: m3[1], error: String(error) });
          log('error', 'Agent directive set_symbol failed', { symbol: m3[1] }, error);
        }
        continue;
      }
      const m4 = line.match(/^action:run_backtest:([A-Z]+),(\d+),(\d+)/i);
      if (m4) {
        actionCount++;
        try {
          const [, symbol, short, long] = m4;
          if (activeSheetId) {
            addWidget(activeSheetId, {
              type: 'backtesting-framework',
              title: `Backtest ${symbol}`,
              layout: { i: `widget-${Date.now()}`, x: 0, y: 0, w: 8, h: 6 },
              props: {
                symbol,
                shortMA: parseInt(short),
                longMA: parseInt(long),
                autorun: true,
              }
            });
            successCount++;
          }
          trackEvent('agent_directive_run_backtest', true, { symbol, shortMA: short, longMA: long });
        } catch (error) {
          trackEvent('agent_directive_run_backtest', false, { symbol: m4[1], shortMA: m4[2], longMA: m4[3], error: String(error) });
          log('error', 'Agent directive run_backtest failed', { symbol: m4[1], shortMA: m4[2], longMA: m4[3] }, error);
        }
        continue;
      }
    }
    
    // Track overall directive processing success
    if (actionCount > 0) {
      trackEvent('agent_directives_processed', successCount === actionCount, { 
        total: actionCount, 
        successful: successCount, 
        failed: actionCount - successCount 
      });
    }
  }

  if (chatCollapsed) return null;

  // Show telemetry dashboard if requested
  if (showTelemetry) {
    return (
      <div className="w-80 bg-[#252526] border-l border-[#2d2d30] flex flex-col">
        <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d30]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-[#cccccc] uppercase tracking-wider">
              TELEMETRY
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-xs"
              onClick={() => setShowTelemetry(false)}
              title="Back to agent chat"
            >
              ← Chat
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={toggleChat}
          >
            <Minimize2 className="h-3 w-3 text-[#cccccc]" />
          </Button>
        </div>
        <div className="flex-1">
          <TelemetryDashboard />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#252526] border-l border-[#2d2d30] flex flex-col">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d30]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#cccccc] uppercase tracking-wider">
            AGENT CHAT
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant={agentMode === 'advanced' ? 'default' : 'ghost'}
              size="sm"
              className="h-5 px-2 text-xs"
              onClick={() => setAgentMode(agentMode === 'advanced' ? 'basic' : 'advanced')}
              title={`Switch to ${agentMode === 'advanced' ? 'basic' : 'advanced'} mode`}
            >
              <Brain className="h-3 w-3 mr-1" />
              {agentMode === 'advanced' ? 'Advanced' : 'Basic'}
            </Button>
            <Button
              variant={showTelemetry ? 'default' : 'ghost'}
              size="sm"
              className="h-5 px-2 text-xs"
              onClick={() => setShowTelemetry(!showTelemetry)}
              title="Toggle telemetry dashboard"
            >
              <Activity className="h-3 w-3 mr-1" />
              Metrics
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={toggleChat}
        >
          <Minimize2 className="h-3 w-3 text-[#cccccc]" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.sender === 'user' && "flex-row-reverse"
              )}
            >
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                message.sender === 'agent' ? 'bg-[#007acc]' : 'bg-[#0e639c]'
              )}>
                {message.sender === 'agent' ? (
                  <Bot className="h-4 w-4 text-white" />
                ) : (
                  <User className="h-4 w-4 text-white" />
                )}
              </div>
              
              <div className={cn(
                "max-w-[240px] p-3 rounded-lg text-sm",
                message.sender === 'agent' 
                  ? 'bg-[#2d2d30] text-[#cccccc]' 
                  : 'bg-[#007acc] text-white'
              )}>
                {message.content}
              </div>
            </div>
          ))}
          {/* Inline suggestions */}
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <Button
                  key={s.id}
                  size="sm"
                  variant="secondary"
                  className="h-6 text-xs"
                  onClick={() => {
                    const wf = WORKFLOWS.find(w => w.id === s.id);
                    if (!wf) return;
                    const widgets = wf.widgets(globalSymbol);
                    const sheetId = createSheetFromWorkflow(wf.title, wf.kind, widgets);
                    if (sheetId) {
                      const url = new URL(window.location.href);
                      url.searchParams.set('sheet', sheetId);
                      window.history.replaceState({}, '', url.toString());
                      toast.success(`Created sheet "${wf.title}"`);
                      addMessage(`Created sheet \"${wf.title}\" for ${globalSymbol}.`, 'agent');
                      setSuggestions([]);
                    }
                  }}
                >
                  Create sheet: {s.title}
                </Button>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[#2d2d30]">
        <div className="flex gap-2">
          <Button
            variant={listening ? 'default' : 'outline'}
            onClick={toggleVoice}
            className="h-9 w-9 p-0"
            title="Voice input (browser only)"
          >
            {listening ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
          </Button>
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your analysis..."
            className="flex-1 bg-[#2d2d30] border-[#3e3e42] text-[#cccccc] placeholder-[#969696]"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="bg-[#007acc] hover:bg-[#005a9e]"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {/* Slash command hints */}
        <div className="mt-2 text-[10px] text-[#969696] flex flex-wrap items-center gap-2">
          <span>Try:</span>
          {(() => {
            const recents = recentCmds.slice(0, 3);
            const defaults = [
              '/add_widget options-chain',
              `/provider ${dataProvider === 'mock' ? 'polygon' : 'mock'}`,
              `/symbol ${globalSymbol || 'AAPL'}`,
              '/backtest AAPL 20 50',
              '/telemetry',
              `/agent_mode ${agentMode === 'advanced' ? 'basic' : 'advanced'}`,
            ];
            const picks = (recents.length > 0 ? recents : defaults).slice(0, 4);
            return picks;
          })().map((t) => (
            <Button
              key={t}
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px]"
              onClick={() => {
                setInputValue(t);
                if (handleSlashCommand(t)) {
                  pushRecent(t);
                  setInputValue('');
                }
              }}
            >
              {t}
            </Button>
          ))}
          {recentCmds.length > 0 && (
            <>
              <span className="ml-2">Recent:</span>
              {recentCmds.map((c, i) => (
                <Button
                  key={`${c}-${i}`}
                  variant="outline"
                  size="sm"
                  className="h-5 px-2 text-[10px]"
                  onClick={() => {
                    setInputValue(c);
                    if (handleSlashCommand(c)) {
                      pushRecent(c);
                      setInputValue('');
                    }
                  }}
                >
                  {c}
                </Button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// eslint-disable-next-line
// TODO: Advanced AI agent integration
// - Context-aware financial analysis assistance
// - Integration with financial data APIs
// - Natural language query processing
// - Code generation for financial models
// - Multi-modal support (charts, documents, etc.)
// - Agent memory and conversation history
// - Custom agent personalities for different use cases
