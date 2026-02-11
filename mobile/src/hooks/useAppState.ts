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
  const [showSheet, setShowSheet] = useState(false);
  const resultTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Panel IDs waiting to be tagged onto the next agent message
  const pendingPanelIdsRef = useRef<string[]>([]);

  const addSidePanel = useCallback(
    (msg: { panelType: string; title: string; data: unknown; isActionable?: boolean }) => {
      const panelId = `sp-${Date.now()}`;
      setSidePanels((prev) => {
        const collapsed = prev.map((p) => ({ ...p, isExpanded: false }));
        const newPanel: SidePanelItem = {
          id: panelId,
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
      // Queue this panel ID — it will be attached to the next agent message
      pendingPanelIdsRef.current.push(panelId);
      setShowSheet(true);
    },
    [],
  );

  const handleToggleExpand = useCallback((panelId: string) => {
    setSidePanels((prev) =>
      prev.map((p) => (p.id === panelId ? { ...p, isExpanded: !p.isExpanded } : p)),
    );
  }, []);

  const handleDismissPanel = useCallback((_panelId: string) => {
    setShowSheet(false);
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
        const pendingId = pendingPanelIdsRef.current.length > 0
          ? pendingPanelIdsRef.current[pendingPanelIdsRef.current.length - 1]
          : undefined;
        pendingPanelIdsRef.current = [];
        setMessages((prev) => [
          ...prev,
          { role: 'agent', text: msg.text, time: new Date().toLocaleTimeString(), panelId: pendingId },
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

  const addUserMessage = useCallback((text: string) => {
    setMessages((prev) => [
      ...prev,
      { role: 'user', text, time: new Date().toLocaleTimeString() },
    ]);
  }, []);

  const openPanelById = useCallback((panelId: string) => {
    setSidePanels((prev) =>
      prev.map((p) => ({ ...p, isExpanded: p.id === panelId })),
    );
    setShowSheet(true);
  }, []);

  const handleClear = useCallback(() => {
    setMessages([]);
    setSidePanels([]);
    setShowSheet(false);
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
    showSheet,
    setShowSheet,
    resultTimerRef,
    handleDataMessage,
    handleToggleExpand,
    handleDismissPanel,
    openPanelById,
    addUserMessage,
    handleCancelJobCard,
    handleUpdateJobCard,
    handleClear,
  };
}
