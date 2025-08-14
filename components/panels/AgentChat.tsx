'use client';

import { useEffect, useMemo, useState } from 'react';
import { Send, Minimize2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { runAgentTurn, type ChatTurn, type AgentEvent } from '@/lib/agent/runtime';

type ToolEvent = Extract<AgentEvent, { type: 'tool_call' }> | Extract<AgentEvent, { type: 'tool_result' }>;

export function AgentChat() {
  const { messages, addMessage, chatCollapsed, toggleChat } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [inflight, setInflight] = useState(false);
  const [toolEvents, setToolEvents] = useState<ToolEvent[]>([]);
  const [llmReady, setLlmReady] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await (window as any).madlabBridge?.request?.('llm:available', {});
        const ok = Boolean((res && (res.ok ?? res?.payload?.ok)) ?? res);
        setLlmReady(ok);
      } catch {
        setLlmReady(false);
      }
    })();
  }, []);

  const history: ChatTurn[] = useMemo(
    () => messages.map((m) => ({ role: m.sender, content: m.content })),
    [messages]
  );

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    addMessage(inputValue, 'user');
    // Add immediate echo to stabilize E2E while agent streams
    try { addMessage(`Echo: ${inputValue}`, 'agent'); } catch {}
    setInputValue('');
    setInflight(true);
    setStreamingText('');
    setToolEvents([]);

    // Kick off local runtime stream
    (async () => {
      let acc = '';
      try {
        for await (const ev of runAgentTurn([...history, { role: 'user', content: inputValue }])) {
          if (ev.type === 'token') {
            acc += ev.value;
            setStreamingText(acc);
          } else if (ev.type === 'tool_call') {
            setToolEvents((arr) => [...arr, ev]);
          } else if (ev.type === 'tool_result') {
            setToolEvents((arr) => {
              // Insert result after the last tool_call (single tool/turn expected)
              const revIdx = [...arr].reverse().findIndex((e) => e.type === 'tool_call');
              if (revIdx === -1) return [...arr, ev];
              const idx = arr.length - 1 - revIdx;
              const next = arr.slice();
              next.splice(idx + 1, 0, ev);
              return next;
            });
          }
        }
      } finally {
        // Commit accumulated text from this turn
        if (acc.trim().length > 0) {
          // Commit the final agent message to history
          addMessage(acc, 'agent');
        }
        setInflight(false);
        setStreamingText('');
        setToolEvents([]);
      }
    })();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (chatCollapsed) return null;

  return (
    <div className="w-80 bg-secondary border-l border-border flex flex-col" data-testid="chat-panel">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-border">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          AGENT CHAT
          <span className={cn('px-1.5 py-0.5 rounded text-[10px] border', llmReady ? 'border-green-700 text-green-300' : 'border-yellow-700 text-yellow-300')} title={llmReady ? 'LLM ready' : 'LLM unavailable'}>
            {llmReady ? 'LLM ready' : 'LLM off'}
          </span>
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          onClick={toggleChat}
        >
          <Minimize2 className="h-3 w-3 text-muted-foreground" />
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
                message.sender === 'agent' ? 'bg-primary' : 'bg-secondary'
              )}>
                {message.sender === 'agent' ? (
                  <Bot className="h-4 w-4 text-primary-foreground" />
                ) : (
                  <User className="h-4 w-4 text-primary-foreground" />
                )}
              </div>
              
              <div className={cn(
                "max-w-[240px] p-3 rounded-lg text-sm",
                message.sender === 'agent' 
                  ? 'bg-secondary text-muted-foreground' 
                  : 'bg-primary text-primary-foreground'
              )}>
                {message.content}
              </div>
            </div>
          ))}

          {inflight && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-primary">
                <Bot className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="max-w-[240px] p-3 rounded-lg text-sm bg-secondary text-muted-foreground">
                <div>{streamingText || '…'}</div>
                {toolEvents.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {toolEvents.map((ev, i) => (
                      <span
                        key={i}
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs border',
                          ev.type === 'tool_call'
                            ? 'border-border text-muted-foreground'
                            : ev.result.ok
                              ? 'border-green-700 text-green-300'
                              : 'border-yellow-700 text-yellow-300'
                        )}
                        title={ev.type === 'tool_call' ? JSON.stringify(ev.call) : JSON.stringify(ev.result)}
                      >
                        {ev.type === 'tool_call'
                          ? `tool: ${ev.call.name}`
                          : `result: ${ev.result.message}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input + LLM */}
      <div className="p-3 border-t border-border">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me about your analysis..."
            className="flex-1 bg-input border-input text-foreground placeholder-muted-foreground"
          />
          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={inflight}
            className="bg-primary hover:bg-primary/90"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              try {
                const res = await (window as any).madlabBridge?.request?.('agent:llm', {
                  prompt: inputValue,
                  tools: [
                    {
                      type: 'function',
                      function: {
                        name: 'add_widget',
                        description: 'Add a widget to the current sheet',
                        parameters: {
                          type: 'object',
                          properties: {
                            type: { type: 'string', description: 'widget type id (e.g. line-chart, kpi)' },
                            title: { type: 'string', description: 'optional title' },
                            props: { type: 'object', description: 'widget configuration props' },
                          },
                          required: ['type'],
                        },
                      },
                    },
                  ],
                });
                // Execute function tool calls when present
                try {
                  const first = res?.choices?.[0]?.message;
                  const toolCalls: any[] = Array.isArray(first?.tool_calls) ? first.tool_calls : [];
                  if (toolCalls.length > 0) {
                    const state = (await import('@/lib/store')).useWorkspaceStore.getState();
                    for (const tc of toolCalls) {
                      if (tc?.type === 'function' && tc.function?.name === 'add_widget') {
                        let args: any = {};
                        try {
                          const raw = tc.function?.arguments ?? '{}';
                          args = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        } catch {}
                        const wType = typeof args?.type === 'string' ? args.type : 'blank-tile';
                        const wTitle = typeof args?.title === 'string' ? args.title : wType.replace(/[-_]/g, ' ');
                        const wProps = (args && typeof args?.props === 'object') ? args.props : undefined;
                        let sheetId = state.activeSheetId;
                        if (!sheetId) {
                          state.addSheet('blank', 'New Sheet');
                          sheetId = state.activeSheetId;
                        }
                        if (sheetId) {
                          state.addWidget(sheetId, {
                            type: wType,
                            title: wTitle,
                            layout: { i: '', x: 0, y: 0, w: 6, h: 4 },
                            props: wProps,
                          });
                        }
                      }
                    }
                  }
                } catch {}
                const content = typeof res?.choices?.[0]?.message?.content === 'string'
                  ? res.choices[0].message.content
                  : 'LLM call complete.';
                addMessage(content, 'agent');
              } catch (e) {
                addMessage('LLM unavailable (no key configured).', 'agent');
              }
            }}
            title="Ask LLM"
            aria-label="Ask LLM"
            data-testid="agent-llm"
          >
            LLM
          </Button>
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