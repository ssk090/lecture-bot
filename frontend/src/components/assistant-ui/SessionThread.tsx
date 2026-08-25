import {
  ComposerPrimitive,
  ThreadPrimitive,
} from '@assistant-ui/react';
import { Send } from 'lucide-react';
import { marked } from 'marked';

export function SessionThread() {
  return (
    <ThreadPrimitive.Root>
      <ThreadPrimitive.Viewport className="chat-messages">
        <ThreadPrimitive.Empty>
          <div className="chat-welcome">
            Ask about this session and I will answer only from this session
            transcript and study pack.
          </div>
        </ThreadPrimitive.Empty>

        <ThreadPrimitive.Messages>
          {({ message }) => {
            const text = message.content
              .filter((part) => part.type === 'text')
              .map((part) => (part.type === 'text' ? part.text : ''))
              .join('');
            const html = marked.parse(text || '…', { async: false });
            return (
              <div className={`chat-bubble ${message.role}`}>
                <div
                  className="chat-body"
                  dangerouslySetInnerHTML={{ __html: html as string }}
                />
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
            <ComposerPrimitive.Send asChild>
              <button className="cli-button primary">
                <Send size={14} /> ask
              </button>
            </ComposerPrimitive.Send>
          </ComposerPrimitive.Root>
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}