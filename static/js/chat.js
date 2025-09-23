// Healthcare Triage Bot - Chat Interface JavaScript

class TriageChatBot {
    constructor() {
        this.messagesContainer = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.loadingSpinner = document.getElementById('loadingSpinner');
        this.newChatButton = document.getElementById('newChatButton');
        
        this.sessionId = null;
        this.isTyping = false;
        
        this.init();
    }

    init() {
        // Event listeners
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.newChatButton.addEventListener('click', () => this.startNewChat());
        
        
        // Quick example buttons
        document.querySelectorAll('.quick-example').forEach(button => {
            button.addEventListener('click', (e) => {
                const message = e.target.getAttribute('data-message') || e.target.closest('.quick-example').getAttribute('data-message');
                this.messageInput.value = message;
                this.sendMessage();
            });
        });
        
        // Listen for language changes
        document.addEventListener('languageChanged', (event) => {
            this.handleLanguageChange(event.detail);
        });
        
        // Start initial session
        this.startNewChat();
    }

    handleLanguageChange(detail) {
        // Restart chat to show new greeting in selected language
        console.log('🔄 Chat: Restarting conversation for new language:', detail.languageCode);
        this.startNewChat();
        
        // Add a brief animation to indicate change
        this.messagesContainer.classList.add('language-change-animation');
        setTimeout(() => this.messagesContainer.classList.remove('language-change-animation'), 600);
    }

    async startNewChat() {
        this.showLoading('Starting new conversation...');
        this.disableInput();
        
        try {
            const response = await fetch('/api/start_session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.sessionId = data.session_id;
                this.clearMessages();
                this.displayMessages(data.messages);
                this.enableInput();
                this.messageInput.focus();
            } else {
                this.showError('Failed to start chat session: ' + data.error);
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Add user message to chat
        this.displayUserMessage(message);
        this.messageInput.value = '';
        
        // Show typing indicator
        this.showTypingIndicator();
        this.disableInput();
        
        try {
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            this.hideTypingIndicator();
            
            if (data.success) {
                this.displayMessages(data.messages);
                
                // Check for emergency
                if (data.is_emergency) {
                    this.showEmergencyModal();
                }
            } else {
                // Check if we need to start a new session
                if (data.needs_new_session) {
                    console.log('Session expired, starting new session...');
                    // Re-add the user message and start a new session
                    await this.startNewChat();
                    // Retry sending the message
                    await this.retrySendMessage(message);
                } else {
                    this.showError('Failed to send message: ' + data.error);
                }
            }
        } catch (error) {
            this.hideTypingIndicator();
            this.showError('Network error: ' + error.message);
        } finally {
            this.enableInput();
        }
    }
    
    async retrySendMessage(message) {
        try {
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message: message })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayMessages(data.messages);
                
                // Check for emergency
                if (data.is_emergency) {
                    this.showEmergencyModal();
                }
            } else {
                this.showError('Failed to retry message: ' + data.error);
            }
        } catch (error) {
            this.showError('Network error during retry: ' + error.message);
        }
    }

    displayMessages(messages) {
        // Clear any pending speech to avoid overlap with new conversation
        if (window.voiceAssistant) {
            window.voiceAssistant.clearSpeechQueue();
        }
        
        // Hide welcome message when displaying first bot messages
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
        
        messages.forEach(message => {
            this.displayBotMessage(message.message, message.message_type);
        });
    }

    displayUserMessage(message) {
        const messageElement = this.createMessageElement(message, 'user');
        this.messagesContainer.appendChild(messageElement);
        
        // Hide quick suggestions after first user message
        const quickSuggestions = document.getElementById('quickSuggestions');
        if (quickSuggestions) {
            quickSuggestions.style.display = 'none';
        }
        
        this.scrollToBottom();
    }

    displayBotMessage(message, messageType = 'text') {
        const messageElement = this.createMessageElement(message, 'bot', messageType);
        this.messagesContainer.appendChild(messageElement);
        this.scrollToBottom();
        
        // Integrate with voice assistant for text-to-speech
        if (window.voiceAssistant && this.shouldSpeakBotResponse(message)) {
            // Check if this is an emergency message
            const isEmergency = message.includes('EMERGENCY') || message.includes('🚨') || 
                               message.includes('911') || message.includes('108') || 
                               message.includes('call emergency');
            
            if (isEmergency) {
                // Speak emergency messages with high priority
                window.voiceAssistant.speakEmergencyAlert(message);
            } else {
                // Speak bot responses for accessibility in the selected language
                window.voiceAssistant.speakBotResponse(message);
            }
        }
    }

    createMessageElement(text, sender, messageType = 'text') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        
        // Check if this is an emergency message
        const isEmergency = text.includes('EMERGENCY') || text.includes('🚨') || text.includes('911') || text.includes('108');
        if (isEmergency) {
            messageDiv.classList.add('emergency-message');
        }

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';
        
        // Format message text
        if (text.startsWith('•')) {
            // List item
            bubbleDiv.innerHTML = `<small>${this.escapeHtml(text)}</small>`;
        } else if (text.includes('Assessment:') || text.includes('Urgency Level:')) {
            // Assessment information with badge
            let formattedText = this.escapeHtml(text);
            if (text.includes('Urgency Level:')) {
                const urgencyLevel = text.split(':')[1].trim().toLowerCase();
                const badgeClass = `urgency-${urgencyLevel.replace(' ', '-')}`;
                formattedText = text.split(':')[0] + ': <span class="urgency-badge ' + badgeClass + '">' + text.split(':')[1].trim() + '</span>';
            }
            bubbleDiv.innerHTML = `<strong>${formattedText}</strong>`;
        } else {
            bubbleDiv.textContent = text;
        }

        const timestampDiv = document.createElement('div');
        timestampDiv.className = 'message-timestamp';
        timestampDiv.textContent = new Date().toLocaleTimeString();

        messageDiv.appendChild(bubbleDiv);
        messageDiv.appendChild(timestampDiv);

        return messageDiv;
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typing-indicator';
        
        const indicator = document.createElement('div');
        indicator.className = 'typing-indicator';
        indicator.innerHTML = '<span></span><span></span><span></span>';
        
        typingDiv.appendChild(indicator);
        this.messagesContainer.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    showEmergencyModal() {
        const modal = new bootstrap.Modal(document.getElementById('emergencyModal'));
        modal.show();
        
        // Add sound alert if available
        this.playEmergencySound();
    }

    playEmergencySound() {
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwaCD2P0vLKdSYEJnvG7N2GSgwccsLz6bFiGgU7k9X0zpkzBSF9x+zac08MDV2w6OOwYxsEPJDV8tGVOQYYarzu65hPEgxOqOTsyH4wCCl+yO3bezkDD1+z6OG2ZxwEO5DT8tOQOwUTbr7o56hTEgpFpuPs0otHCCWAx+3diU4LDVyx5+O6bxwGOpTS8tGSOQYYarzu65hPEgxOqOTsyH4wCCl+yO3bezkDD1+z6OG2ZxwEO5DT8tOQOw==');
            audio.play().catch(() => {
                // Ignore if audio can't play
            });
        } catch (e) {
            // Ignore errors
        }
    }



    showLoading(message = 'Loading...') {
        this.messagesContainer.innerHTML = `
            <div class="text-center text-muted">
                <div class="spinner-border spinner-border-sm me-2" role="status" aria-label="Loading">
                    <span class="visually-hidden">Loading...</span>
                </div>
                ${message}
            </div>
        `;
    }

    hideLoading() {
        const loading = this.messagesContainer.querySelector('.spinner-border');
        if (loading) {
            loading.parentElement.remove();
        }
    }

    clearMessages() {
        this.messagesContainer.innerHTML = '';
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.textContent = 'Error: ' + message;
        this.messagesContainer.appendChild(errorDiv);
        this.scrollToBottom();
    }

    enableInput() {
        this.messageInput.disabled = false;
        this.sendButton.disabled = false;
    }

    disableInput() {
        this.messageInput.disabled = true;
        this.sendButton.disabled = true;
    }

    scrollToBottom() {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    shouldSpeakBotResponse(message) {
        // Don't speak HTML content or very short messages
        if (message.includes('<') || message.length < 10) {
            return false;
        }
        
        // Don't speak if user has likely disabled voice (check for voice controls)
        const voiceControls = document.getElementById('voiceControls');
        if (!voiceControls || voiceControls.style.display === 'none') {
            return false;
        }
        
        return true;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the chat bot when page loads
document.addEventListener('DOMContentLoaded', () => {
    new TriageChatBot();
});
