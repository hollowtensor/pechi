import { useState, useCallback, useRef } from 'react';
import type { AppState, ChatMessage, JobCard, SidePanelItem } from '../types';

export function useAppState() {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [status, setStatus] = useState('Ready');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [appState, setAppState] = useState<AppState>('idle');
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [sidePanels, setSidePanels] = useState<SidePanelItem[]>([]);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const addSidePanel = useCallback(
    (msg: { panelType: string; title: string; data: unknown; isActionable?: boolean }) => {
      setSidePanels((prev) => {
        const collapsed = prev.map((p) => ({ ...p, isExpanded: false }));
        const newPanel: SidePanelItem = {
          id: `sp-${Date.now()}`,
          panelType: msg.panelType as SidePanelItem['panelType'],
          title: msg.title,
          content: {
            type: msg.panelType as SidePanelItem['panelType'],
            data: msg.data,
          } as SidePanelItem['content'],
          isActionable: msg.isActionable || msg.panelType === 'job_card',
          isExpanded: true,
        };
        return [...collapsed, newPanel];
      });
    },
    [],
  );

  const handleToggleExpand = useCallback((panelId: string) => {
    setSidePanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, isExpanded: !p.isExpanded } : p)),
    );
  }, []);

  const handleDismissPanel = useCallback((panelId: string) => {
    setSidePanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const handleCancelJobCard = useCallback((panelId: string) => {
    setSidePanels((prev) => prev.filter((p) => p.id !== panelId));
  }, []);

  const handleUpdateJobCard = useCallback((panelId: string, jobCard: JobCard) => {
    setSidePanels((prev) =>
      prev.map((p) =>
        p.id === panelId
          ? { ...p, content: { type: 'job_card' as const, data: jobCard } }
          : p,
      ),
    );
  }, []);

  const handleDataMessage = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (msg: any) => {
      if (msg.type === 'user_message') {
        setMessages((prev) => [
          ...prev,
          { role: 'user', text: msg.text, time: new Date().toLocaleTimeString() },
        ]);
        setAppState('transcribing');
      } else if (msg.type === 'agent_message') {
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: msg.text, time: new Date().toLocaleTimeString() },
        ]);
        setAppState('result');
        clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => setAppState('connected'), 1500);
      } else if (msg.type === 'thinking') {
        setAppState('thinking');
        setStatus('Thinking...');
      } else if (msg.type === 'status') {
        setStatus(msg.text);
        if (msg.text.includes('Listening')) {
          setAppState('listening');
        } else if (msg.text.includes('Transcribing')) {
          setAppState('transcribing');
        } else if (msg.text.includes('Ready') || msg.text.includes('speaking')) {
          setAppState('connected');
        }
      } else if (msg.type === 'error') {
        setStatus(`Error: ${msg.text}`);
      } else if (msg.type === 'side_panel') {
        addSidePanel(msg);
      } else if (msg.type === 'job_card_confirmed') {
        setSidePanels((prev) => prev.filter((p) => p.panelType !== 'job_card'));
      }
    },
    [addSidePanel],
  );

  const handleClear = useCallback(() => {
    setMessages([]);
    setSidePanels([]);
  }, []);

  return {
    connected,
    setConnected,
    connecting,
    setConnecting,
    status,
    setStatus,
    messages,
    appState,
    setAppState,
    language,
    setLanguage,
    sidePanels,
    resultTimerRef,
    handleDataMessage,
    handleToggleExpand,
    handleDismissPanel,
    handleCancelJobCard,
    handleUpdateJobCard,
    handleClear,
  };
}
