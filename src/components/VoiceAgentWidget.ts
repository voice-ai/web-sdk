/**
 * VoiceAgentWidget - UI widget for Voice.ai
 * 
 * Features:
 * - Click to connect/disconnect
 * - Shape morphs based on state (circle/square)
 * - Audio bars react to agent speech
 * - Expandable transcript panel with text input
 */

import VoiceAI from '../index';
import type { ConnectionOptions, AgentState, AgentStateInfo, AudioLevelInfo, TranscriptionSegment, ConnectionStatus } from '../types';

export interface VoiceAgentWidgetTheme {
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  barColor?: string;
}

export interface VoiceAgentWidgetOptions {
  sdk: VoiceAI;
  connectionOptions: ConnectionOptions;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  container?: HTMLElement;
  theme?: VoiceAgentWidgetTheme;
  size?: number;
  /** Enable transcript panel (default: true) */
  showTranscript?: boolean;
}

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: number;
  isFinal?: boolean;
}

export class VoiceAgentWidget {
  private sdk: VoiceAI;
  private connectionOptions: ConnectionOptions;
  private position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  private container: HTMLElement;
  private theme: VoiceAgentWidgetTheme;
  private size: number;
  private showTranscript: boolean;
  
  private widgetElement: HTMLElement | null = null;
  private buttonElement: HTMLElement | null = null;
  private buttonShape: HTMLElement | null = null;
  private glowElement: HTMLElement | null = null;
  private endButton: HTMLElement | null = null;
  private bars: HTMLElement[] = [];
  
  // Transcript panel
  private panelElement: HTMLElement | null = null;
  private messagesContainer: HTMLElement | null = null;
  private inputElement: HTMLInputElement | null = null;
  private isPanelOpen = false;
  private messages: Message[] = [];
  
  private isConnected = false;
  private isConnecting = false;
  private agentState: AgentState = 'disconnected';
  private audioLevel = 0;
  
  private animationFrame: number | null = null;
  
  private unsubscribeStatus: (() => void) | null = null;
  private unsubscribeAgentState: (() => void) | null = null;
  private unsubscribeAudioLevel: (() => void) | null = null;
  private unsubscribeError: (() => void) | null = null;
  private unsubscribeTranscription: (() => void) | null = null;

  private static readonly DEFAULT_THEME: Required<VoiceAgentWidgetTheme> = {
    primaryColor: 'rgba(45, 212, 191, 1)',
    backgroundColor: 'rgba(10, 15, 25, 0.8)',
    borderColor: 'rgba(45, 212, 191, 0.5)',
    barColor: 'rgba(255, 255, 255, 0.8)'
  };

  constructor(options: VoiceAgentWidgetOptions) {
    this.sdk = options.sdk;
    this.connectionOptions = options.connectionOptions;
    this.position = options.position || 'bottom-right';
    this.container = options.container || document.body;
    this.size = options.size || 64;
    this.theme = { ...VoiceAgentWidget.DEFAULT_THEME, ...options.theme };
    this.showTranscript = options.showTranscript !== false;
    
    this.init();
  }

  private init() {
    this.createWidget();
    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private createWidget() {
    // Main container
    this.widgetElement = document.createElement('div');
    this.widgetElement.className = `voice-agent-widget voice-agent-widget-${this.position}`;

    // Create transcript panel first (behind button)
    if (this.showTranscript) {
      this.createTranscriptPanel();
    }

    // Button
    this.buttonElement = document.createElement('button');
    this.buttonElement.className = 'voice-agent-widget-trigger';
    this.buttonElement.setAttribute('aria-label', 'Start voice call');
    this.buttonElement.style.width = `${this.size}px`;
    this.buttonElement.style.height = `${this.size}px`;
    this.buttonElement.addEventListener('click', () => this.handleClick());

    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'voice-agent-widget-button-container';

    this.glowElement = document.createElement('div');
    this.glowElement.className = 'voice-agent-widget-glow';
    this.applyGlowTheme();

    this.buttonShape = document.createElement('div');
    this.buttonShape.className = 'voice-agent-widget-button';
    this.buttonShape.style.width = `${this.size}px`;
    this.buttonShape.style.height = `${this.size}px`;
    this.applyButtonTheme();

    const innerGlow = document.createElement('div');
    innerGlow.className = 'voice-agent-widget-inner-glow';

    const barsContainer = document.createElement('div');
    barsContainer.className = 'voice-agent-widget-bars';
    this.bars = [];
    for (let i = 0; i < 3; i++) {
      const bar = document.createElement('div');
      bar.className = 'voice-agent-widget-bar';
      this.bars.push(bar);
      barsContainer.appendChild(bar);
    }
    
    this.buttonShape.appendChild(barsContainer);
    this.buttonShape.appendChild(innerGlow);
    buttonContainer.appendChild(this.glowElement);
    buttonContainer.appendChild(this.buttonShape);
    
    this.bars.forEach(bar => {
      bar.style.background = this.theme.barColor || 'rgba(255, 255, 255, 0.8)';
    });
    this.buttonElement.appendChild(buttonContainer);
    this.widgetElement.appendChild(this.buttonElement);

    // End button
    this.endButton = document.createElement('button');
    this.endButton.className = 'voice-agent-widget-end-button';
    this.endButton.innerHTML = '✕';
    this.endButton.style.display = 'none';
    this.endButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.handleDisconnect();
    });
    this.widgetElement.appendChild(this.endButton);

    this.container.appendChild(this.widgetElement);
  }

  private createTranscriptPanel() {
    // Panel container - expands from button
    this.panelElement = document.createElement('div');
    this.panelElement.className = 'voice-agent-widget-panel';
    
    // Messages area
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'voice-agent-widget-messages';
    
    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'voice-agent-widget-input-area';
    
    this.inputElement = document.createElement('input');
    this.inputElement.type = 'text';
    this.inputElement.placeholder = 'Type a message...';
    this.inputElement.className = 'voice-agent-widget-input';
    this.inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.inputElement?.value.trim()) {
        this.sendTextMessage(this.inputElement.value.trim());
        this.inputElement.value = '';
      }
    });
    
    const sendButton = document.createElement('button');
    sendButton.className = 'voice-agent-widget-send-button';
    sendButton.innerHTML = '↑';
    sendButton.addEventListener('click', () => {
      if (this.inputElement?.value.trim()) {
        this.sendTextMessage(this.inputElement.value.trim());
        this.inputElement.value = '';
      }
    });
    
    inputArea.appendChild(this.inputElement);
    inputArea.appendChild(sendButton);
    
    this.panelElement.appendChild(this.messagesContainer);
    this.panelElement.appendChild(inputArea);
    
    this.widgetElement!.appendChild(this.panelElement);
  }

  private setupEventListeners() {
    this.unsubscribeStatus = this.sdk.onStatusChange((status: ConnectionStatus) => {
      this.isConnected = status.connected;
      this.isConnecting = status.connecting;
      
      // Auto-open panel when connected
      if (status.connected && this.showTranscript && !this.isPanelOpen) {
        this.togglePanel(true);
      }
      // Close panel when disconnected
      if (!status.connected && !status.connecting) {
        this.togglePanel(false);
      }
      
      this.updateUI();
    });

    this.unsubscribeAgentState = this.sdk.onAgentStateChange((state: AgentStateInfo) => {
      this.agentState = state.state;
      this.updateUI();
    });

    this.unsubscribeAudioLevel = this.sdk.onAudioLevel((level: AudioLevelInfo) => {
      this.audioLevel = level.level;
      if (this.agentState === 'speaking' && this.bars.length === 3) {
        const scaledLevel = Math.sqrt(level.level);
        const baseHeight = 4 + scaledLevel * 14;
        this.bars[0].style.height = `${Math.max(4, baseHeight * 0.7)}px`;
        this.bars[1].style.height = `${Math.min(18, baseHeight)}px`;
        this.bars[2].style.height = `${Math.max(4, baseHeight * 0.7)}px`;
      }
    });

    this.unsubscribeError = this.sdk.onError((error: Error) => {
      console.error('[VoiceAgentWidget] Error:', error.message);
      this.updateUI();
    });

    // Subscribe to transcriptions - use segment.id for proper grouping
    this.unsubscribeTranscription = this.sdk.onTranscription((segment: TranscriptionSegment) => {
      // The segment.id stays the same as the transcription updates
      // This is the key to updating in place rather than creating new bubbles
      this.updateOrAddMessage({
        id: segment.id,
        text: segment.text,
        role: segment.role,
        timestamp: segment.timestamp,
        isFinal: segment.isFinal
      });
    });
  }

  private addMessage(message: Message) {
    this.messages.push(message);
    this.renderMessages();
  }

  private updateOrAddMessage(message: Message) {
    const existingIndex = this.messages.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      // Update existing message in data
      this.messages[existingIndex] = message;
      // Update just the DOM element, don't re-render everything
      this.updateMessageElement(message);
    } else {
      // Add new message
      this.messages.push(message);
      this.appendMessageElement(message);
    }
  }

  private updateMessageElement(message: Message) {
    if (!this.messagesContainer) return;
    
    const existingEl = this.messagesContainer.querySelector(`[data-msg-id="${message.id}"]`);
    if (existingEl) {
      existingEl.textContent = message.text;
    }
  }

  private appendMessageElement(message: Message) {
    if (!this.messagesContainer) return;
    
    const bubble = document.createElement('div');
    bubble.className = `voice-agent-widget-message voice-agent-widget-message-${message.role}`;
    bubble.setAttribute('data-msg-id', message.id);
    bubble.textContent = message.text;
    this.messagesContainer.appendChild(bubble);
    
    // Auto-scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private renderMessages() {
    if (!this.messagesContainer) return;
    
    this.messagesContainer.innerHTML = '';
    
    this.messages.forEach(msg => {
      const bubble = document.createElement('div');
      bubble.className = `voice-agent-widget-message voice-agent-widget-message-${msg.role}`;
      bubble.setAttribute('data-msg-id', msg.id);
      bubble.textContent = msg.text;
      this.messagesContainer!.appendChild(bubble);
    });
    
    // Auto-scroll to bottom
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  private async sendTextMessage(text: string) {
    if (!this.isConnected) return;
    
    // Add user message immediately
    this.addMessage({
      id: `msg-${Date.now()}`,
      text,
      role: 'user',
      timestamp: Date.now()
    });
    
    try {
      await this.sdk.sendMessage(text);
    } catch (error) {
      console.error('[VoiceAgentWidget] Failed to send message:', error);
    }
  }

  private togglePanel(open?: boolean) {
    this.isPanelOpen = open !== undefined ? open : !this.isPanelOpen;
    
    if (this.panelElement) {
      if (this.isPanelOpen) {
        this.panelElement.classList.add('open');
      } else {
        this.panelElement.classList.remove('open');
      }
    }
  }

  private startAnimationLoop() {
    let time = 0;
    
    const animate = () => {
      time += 0.05;
      
      if (this.glowElement) {
        let intensity = 0.2;
        if (this.isConnecting) {
          intensity = 0.4 + Math.sin(time * 3) * 0.2;
        } else if (this.isConnected) {
          intensity = 0.5 + this.audioLevel * 0.5;
        }
        this.glowElement.style.opacity = String(intensity);
      }
      
      if (this.bars.length === 3) {
        if (this.agentState === 'speaking') {
          this.bars.forEach(bar => bar.style.opacity = '1');
        } else if (this.isConnecting) {
          const pulse = 5 + Math.sin(time * 5) * 3;
          this.bars[0].style.height = `${pulse}px`;
          this.bars[1].style.height = `${5 + Math.sin(time * 5 + 0.7) * 3}px`;
          this.bars[2].style.height = `${5 + Math.sin(time * 5 + 1.4) * 3}px`;
        } else if (this.isConnected && this.agentState === 'listening') {
          const breath = 6 + Math.sin(time * 1.5) * 2;
          this.bars[0].style.height = `${breath}px`;
          this.bars[1].style.height = `${breath + 2}px`;
          this.bars[2].style.height = `${breath}px`;
        } else {
          this.bars[0].style.height = '4px';
          this.bars[1].style.height = '5px';
          this.bars[2].style.height = '4px';
        }
      }
      
      this.animationFrame = requestAnimationFrame(animate);
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }

  private async handleClick() {
    if (this.isConnecting) return;

    if (this.isConnected) {
      // Toggle panel instead of disconnect
      if (this.showTranscript) {
        this.togglePanel();
      }
    } else {
      await this.handleConnect();
    }
  }

  private async handleConnect() {
    this.isConnecting = true;
    this.messages = []; // Clear messages
    this.renderMessages();
    this.updateUI();
    
    try {
      await this.sdk.connect(this.connectionOptions);
    } catch (error) {
      console.error('[VoiceAgentWidget] Connection failed:', error);
      this.isConnecting = false;
      this.updateUI();
    }
  }

  private async handleDisconnect() {
    await this.sdk.disconnect();
    this.togglePanel(false);
    this.updateUI();
  }

  private updateUI() {
    if (!this.widgetElement || !this.buttonElement || !this.endButton) return;

    const stateClasses = [
      'voice-agent-widget-state-disconnected',
      'voice-agent-widget-state-connecting',
      'voice-agent-widget-state-listening',
      'voice-agent-widget-state-speaking'
    ];
    stateClasses.forEach(cls => this.widgetElement!.classList.remove(cls));

    if (this.isConnecting) {
      this.widgetElement.classList.add('voice-agent-widget-state-connecting');
    } else if (this.isConnected) {
      if (this.agentState === 'speaking') {
        this.widgetElement.classList.add('voice-agent-widget-state-speaking');
      } else {
        this.widgetElement.classList.add('voice-agent-widget-state-listening');
      }
    } else {
      this.widgetElement.classList.add('voice-agent-widget-state-disconnected');
    }

    this.endButton.style.display = this.isConnected ? 'flex' : 'none';
  }

  private applyButtonTheme(): void {
    if (!this.buttonShape) return;
    this.buttonShape.style.background = this.theme.backgroundColor || 'rgba(10, 15, 25, 0.8)';
    this.buttonShape.style.borderColor = this.theme.borderColor || 'rgba(45, 212, 191, 0.5)';
  }

  private applyGlowTheme(): void {
    if (!this.glowElement) return;
    const primary = this.theme.primaryColor || 'rgba(45, 212, 191, 1)';
    this.glowElement.style.background = `radial-gradient(circle at center, ${primary} 0%, transparent 70%)`;
  }

  public setTheme(theme: Partial<VoiceAgentWidgetTheme>): void {
    this.theme = { ...this.theme, ...theme };
    this.applyButtonTheme();
    this.applyGlowTheme();
    this.bars.forEach(bar => {
      bar.style.background = this.theme.barColor || 'rgba(255, 255, 255, 0.8)';
    });
  }

  public destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }

    if (this.unsubscribeStatus) this.unsubscribeStatus();
    if (this.unsubscribeAgentState) this.unsubscribeAgentState();
    if (this.unsubscribeAudioLevel) this.unsubscribeAudioLevel();
    if (this.unsubscribeError) this.unsubscribeError();
    if (this.unsubscribeTranscription) this.unsubscribeTranscription();

    if (this.widgetElement && this.widgetElement.parentNode) {
      this.widgetElement.parentNode.removeChild(this.widgetElement);
    }
  }
}
