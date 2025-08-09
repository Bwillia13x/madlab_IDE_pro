'use client';

import { useState } from 'react';
import { Send, Minimize2, Maximize2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspaceStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export function AgentChat() {
  const { messages, addMessage, chatCollapsed, toggleChat } = useWorkspaceStore();
  const [inputValue, setInputValue] = useState('');

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    addMessage(inputValue, 'user');
    setInputValue('');

    // Simulate agent response
    setTimeout(() => {
      addMessage(
        "I understand you're looking for financial analysis assistance. I can help you with data interpretation, model validation, and insights generation. What specific analysis would you like to explore?",
        'agent'
      );
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (chatCollapsed) return null;

  return (
    <div className="w-80 bg-[#252526] border-l border-[#2d2d30] flex flex-col">
      {/* Header */}
      <div className="h-9 px-3 flex items-center justify-between border-b border-[#2d2d30]">
        <span className="text-xs font-medium text-[#cccccc] uppercase tracking-wider">
          Agent Chat
        </span>
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
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-[#2d2d30]">
        <div className="flex gap-2">
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
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// TODO: Advanced AI agent integration
// - Context-aware financial analysis assistance
// - Integration with financial data APIs
// - Natural language query processing
// - Code generation for financial models
// - Multi-modal support (charts, documents, etc.)
// - Agent memory and conversation history
// - Custom agent personalities for different use cases