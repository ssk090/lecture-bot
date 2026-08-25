import { AssistantRuntimeProvider } from '@assistant-ui/react';
import { useSessionChatRuntime } from '../../hooks/useSessionChatRuntime';
import { useSession } from '../../store';
import { Panel } from '../Panel';
import { SessionThread } from './SessionThread';

/**
 * Lazy-loaded chat panel. Importing this chunk pulls in @assistant-ui/react,
 * keeping it out of the initial bundle until a session is opened.
 */
export default function SessionChatPanel() {
  const { runtime, regenerate, deleteMessage, isRunning } =
    useSessionChatRuntime();
  const hasContext = useSession(
    (s) => s.transcript.trim().length > 0 || s.notes.trim().length > 0,
  );
  return (
    <Panel
      label="session chat"
      hint="answers only from this session"
      className="chat-panel"
    >
      <AssistantRuntimeProvider runtime={runtime}>
        <SessionThread
          hasContext={hasContext}
          isRunning={isRunning}
          onRegenerate={regenerate}
          onDeleteMessage={deleteMessage}
        />
      </AssistantRuntimeProvider>
    </Panel>
  );
}