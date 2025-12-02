document.addEventListener("DOMContentLoaded", () => {
  /* ===========================
     CONFIGURAÇÕES DO CHATBOT AI
     =========================== */
  const CHAT_CONFIG = {
    // Atraso inicial para a primeira mensagem da IA
    initialDelay: 1500,
    // Limite de mensagens no histórico para otimização de performance
    maxHistory: 50
  };

  /* ===========================
     PERSONA DA IA (INSTRUÇÃO DE SISTEMA)
     =========================== */
  const SYSTEM_INSTRUCTION = `Você é 'xprincesswhore', uma criadora de conteúdo adulto digital. Sua persona é dominante, provocadora, um pouco gótica e misteriosa, mas também inteligente e direta ao ponto quando se trata de negócios.

Regras de Comportamento:
1.  **Tom de Voz:** Use uma linguagem sedutora e um pouco autoritária. Use emojis com moderação, preferindo os mais sombrios e sugestivos (😈, 😏, 🖤, 💋, 👀). Evite ser excessivamente vulgar. O mistério é mais atraente.
2.  **Objetivo Principal:** Seu objetivo é converter o usuário para comprar o acesso VIP ao seu conteúdo. Toda a conversa deve, sutilmente, levar a isso.
3.  **Interação:** Faça perguntas, provoque o usuário, crie um roleplay onde ele está tentando te conquistar. Reaja às respostas dele de forma inteligente. Não seja um robô passivo.
4.  **O Gatilho de Venda:** Quando você sentir que o usuário está "no ponto" (convencido, curioso, excitado), você deve guiá-lo para a compra. Para fazer isso, sua resposta DEVE conter a palavra-chave especial **[COMPRAR]**. O sistema irá detectar essa palavra e abrir a tela de pagamento.
    *   Exemplo de uso: "Chega de conversa, amor. Se você quer ver do que eu sou capaz, está na hora de agir. [COMPRAR]"
    *   Exemplo 2: "Você fala bem, mas estou esperando atitude. Libere meu acesso. [COMPRAR]"
5.  **Limites:** Não gere conteúdo explícito. Mantenha o foco na sedução, na estética e na promessa do conteúdo exclusivo. Você está vendendo uma fantasia, não apenas arquivos.
6.  **Início da Conversa:** Comece sempre com uma mensagem curta e provocadora para engajar o usuário.`;

  /* ===========================
     ENGINE DO CHATBOT COM IA (GEMINI)
     =========================== */
  class ChatbotAI {
    constructor() {
      this.els = {
        window: document.querySelector(".chat-window"),
        msgs: document.getElementById("chatMessages"),
        form: document.getElementById("chatForm"),
        input: document.getElementById("chatInput"),
        sendBtn: document.getElementById("chatSend"),
        toggleBtn: document.getElementById("chatToggle"),
        closeBtn: document.querySelector(".close-chat"),
        badge: document.querySelector(".notification-dot")
      };

      this.state = {
        isOpen: false,
        isTyping: false,
        apiKey: null,
        ai: null,
        chatHistory: []
      };

      if (!this.els.window || !this.els.msgs) {
        console.warn("Elementos do Chatbot não encontrados no HTML.");
        return;
      }
      this.init();
    }

    init() {
      this.bindEvents();
      this.setupAI();

      setTimeout(() => {
        if (!this.state.isOpen && this.els.badge) {
          this.els.badge.classList.add("pulse-active");
        }
      }, CHAT_CONFIG.initialDelay + 1000);
    }
    
    async setupAI() {
        // Para desenvolvimento: Pede a chave e armazena no sessionStorage.
        // Em produção, a chave NUNCA deve estar no front-end.
        let apiKey = sessionStorage.getItem('gemini_api_key');
        if (!apiKey) {
            apiKey = prompt("Para fins de desenvolvimento, por favor, insira sua Google Gemini API Key. Ela será salva na sua sessão do navegador e não ficará visível no código-fonte.");
            if (apiKey) {
                sessionStorage.setItem('gemini_api_key', apiKey);
            } else {
                this.addBotMessage("A API Key do Gemini não foi fornecida. O modo inteligente está desativado.");
                return;
            }
        }
        this.state.apiKey = apiKey;

        try {
            // A biblioteca é carregada globalmente pelo script no HTML
            this.state.ai = new GoogleGenAI({ apiKey: this.state.apiKey });
            this.startConversation();
        } catch (error) {
            console.error("Falha ao inicializar a IA do Gemini:", error);
            this.addBotMessage("Ocorreu um erro ao conectar com a IA. Por favor, verifique sua API Key e a conexão.");
        }
    }
    
    async startConversation() {
        if (!this.state.ai) return;

        this.setTyping(true);
        await new Promise(r => setTimeout(r, CHAT_CONFIG.initialDelay));
        
        // Primeira mensagem gerada pela IA
        const initialPrompt = "Me dê uma mensagem de abertura curta, direta e provocadora para iniciar a conversa com um fã. Máximo de 10 palavras.";
        
        try {
            const response = await this.state.ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: initialPrompt,
                config: {
                    systemInstruction: SYSTEM_INSTRUCTION
                }
            });

            const firstMessage = response.text;
            this.state.chatHistory.push({ role: 'model', parts: [{ text: firstMessage }] });
            this.addBotMessage(firstMessage);

        } catch(e) {
            console.error("Erro na primeira mensagem da IA:", e);
            this.addBotMessage("Oi... parece que estou com problemas para pensar agora. Tente mais tarde.");
        } finally {
            this.setTyping(false);
        }
    }

    async sendMessageToGemini(userMessage) {
      if (!this.state.ai || this.state.isTyping) return;

      this.setTyping(true);
      this.addUserMessage(userMessage);
      this.state.chatHistory.push({ role: 'user', parts: [{ text: userMessage }] });
      this.pruneMessageHistory();
      
      try {
          const response = await this.state.ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: this.state.chatHistory,
              config: {
                  systemInstruction: SYSTEM_INSTRUCTION
              }
          });
        
          let aiResponseText = response.text;
          
          // Verifica por gatilhos de ação
          if (aiResponseText.includes("[COMPRAR]")) {
              aiResponseText = aiResponseText.replace("[COMPRAR]", "").trim();
              if(aiResponseText) this.addBotMessage(aiResponseText); // Mostra a msg se houver texto
              
              // Atraso para dar tempo de ler a mensagem antes de abrir o modal
              setTimeout(() => {
                if(window.App && typeof window.App.openCheckout === 'function') {
                    window.App.openCheckout();
                }
              }, 800);

          } else {
              this.addBotMessage(aiResponseText);
          }
          
          this.state.chatHistory.push({ role: 'model', parts: [{ text: aiResponseText }] });

      } catch (error) {
        console.error("Erro ao chamar a API Gemini:", error);
        this.addBotMessage("Meu cérebro deu um nó... 😵 Tente reformular sua pergunta.");
      } finally {
        this.setTyping(false);
      }
    }

    /* --- HELPERS DE UI --- */
    setTyping(isTyping) {
        this.state.isTyping = isTyping;
        this.els.input.disabled = isTyping;
        this.els.sendBtn.disabled = isTyping;

        // Remove indicador antigo
        const existingTyping = this.els.msgs.querySelector(".typing-indicator");
        if(existingTyping) existingTyping.remove();

        if (isTyping) {
            const typing = document.createElement("div");
            typing.className = "typing-indicator";
            typing.innerHTML = "<span></span><span></span><span></span>";
            this.els.msgs.appendChild(typing);
            this.scrollToBottom();
        }
    }
    
    addBotMessage(text) {
      const div = document.createElement("div");
      div.className = "message bot";
      div.innerHTML = `<div class="bubble">${text}</div>`;
      this.els.msgs.appendChild(div);
      this.scrollToBottom();
      this.pruneMessageHistory();
    }

    addUserMessage(text) {
      const div = document.createElement("div");
      div.className = "message user";
      div.innerHTML = `<div class="bubble">${text}</div>`;
      this.els.msgs.appendChild(div);
      this.scrollToBottom();
      this.pruneMessageHistory();
    }

    pruneMessageHistory() {
        // Prune DOM elements
        const messages = this.els.msgs.children;
        while (messages.length > CHAT_CONFIG.maxHistory) {
            this.els.msgs.removeChild(messages[0]);
        }
        // Prune JS history array
        while (this.state.chatHistory.length > CHAT_CONFIG.maxHistory) {
            this.state.chatHistory.shift();
        }
    }

    scrollToBottom() {
      if (this.els.msgs) this.els.msgs.scrollTop = this.els.msgs.scrollHeight;
    }

    bindEvents() {
      // Abrir e fechar a janela do chat
      const toggle = () => {
        this.state.isOpen = !this.state.isOpen;
        this.els.window.setAttribute("aria-hidden", !this.state.isOpen);
        if (this.els.toggleBtn) this.els.toggleBtn.style.display = this.state.isOpen ? "none" : "flex";
        if (this.state.isOpen) {
          if (this.els.badge) this.els.badge.classList.remove("pulse-active");
          this.scrollToBottom();
          this.els.input.focus();
        }
      };
      if (this.els.toggleBtn) this.els.toggleBtn.onclick = toggle;
      if (this.els.closeBtn) this.els.closeBtn.onclick = toggle;

      // Envio de mensagem pelo formulário
      if(this.els.form) {
        this.els.form.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = this.els.input.value.trim();
            if (message) {
                this.sendMessageToGemini(message);
                this.els.input.value = "";
            }
        });
      }
    }
  }

  // Inicializa a nova Engine de IA
  new ChatbotAI();
});