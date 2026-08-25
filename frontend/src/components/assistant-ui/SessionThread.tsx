import {
  ComposerPrimitive,
  ThreadPrimitive,
  type ThreadMessage,
} from '@assistant-ui/react';
import { Check, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { marked } from 'marked';
import { useState } from 'react';

function messageText(message: ThreadMessage) {
  return message.content
    .filter((part) => part.type === 'text')
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('');
}

function BubbleActions({
  role,
  content,
  isRunning,
  onCopy,
  onRegenerate,
  onDelete
}: {
  role: string;
  content: string;
  isRunning: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="chat-actions">
      <button
        className="chat-action"
        title="Copy"
        onClick={() => {
          navigator.clipboard?.writeText(content).catch(() => {});
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      {role === 'assistant' && (
        <button
          className="chat-action"
          title="Regenerate"
          disabled={isRunning}
          onClick={onRegenerate}
        >
          <RefreshCw size={12} />
        </button>
      )}
      <button className="chat-action" title="Delete" disabled={isRunning} onClick={onDelete}>
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function SessionThread({
  hasContext,
  isRunning,
  onRegenerate,
  onDeleteMessage
}: {
  hasContext: boolean;
  isRunning: boolean;
  onRegenerate: () => void;
  onDeleteMessage: (role: 'user' | 'assistant', content: string) => void;
}) {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport className="chat-messages">
        <ThreadPrimitive.Empty>
          <div className="chat-welcome">
            {hasContext
              ? 'Ask about this session and I will answer only from this session transcript and study pack.'
              : 'Add a transcript or study pack to this session first. The chat answers only from this session.'}
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages>
          {({ message }) => {
            const text = messageText(message);
            const html = marked.parse(text || '…', { async: false });
            return (
              <div className={`chat-row ${message.role}`}>
                <div className={`chat-bubble ${message.role}`}>
                  <div
                    className="chat-body"
                    dangerouslySetInnerHTML={{ __html: html as string }}
                  />
                  <BubbleActions
                    role={message.role}
                    content={text}
                    isRunning={isRunning}
                    onCopy={() => {}}
                    onRegenerate={onRegenerate}
                    onDelete={() =>
                      onDeleteMessage(message.role === 'user' ? 'user' : 'assistant', text)
                    }
                  />
                </div>
              </div>
            );
          }}
        </ThreadPrimitive.Messages>

        <ThreadPrimitive.ViewportFooter>
          <ComposerPrimitive.Root className="chat-composer">
            <ComposerPrimitive.Input
              asChild
              autoFocus={false}
              placeholder="Ask a question about this session…"
            >
              <textarea aria-label="Ask about this session" />
            </ComposerPrimitive.Input>
            <ComposerPrimitive.Send disabled={isRunning || !hasContext} asChild>
              <button className="cli-button primary">
                {isRunning ? '…' : 'ask'}
              </button>
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}