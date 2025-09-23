// Multilingual Voice Assistant JavaScript
// Provides speech-to-text and text-to-speech functionality for illiterate users

class VoiceAssistant {
    constructor() {
        this.isListening = false;
        this.isSpeaking = false;
        this.isVoiceEnabled = true;
        this.currentLanguage = 'en';
        this.supportedLanguages = [];
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.voices = [];
        
        // Speech queue for handling multiple messages without overlap
        this.speechQueue = [];
        this.isProcessingQueue = false;
        
        // Voice interface elements
        this.voiceButton = null;
        this.languageSelector = null;
        this.voiceStatus = null;
        this.voiceEnabledToggle = null;
        
        this.init();
    }

    async init() {
        // Check for Web Speech API support
        this.checkBrowserSupport();
        
        // Load supported languages
        await this.loadSupportedLanguages();
        
        // Initialize speech recognition
        this.setupSpeechRecognition();
        
        // Initialize speech synthesis
        this.setupSpeechSynthesis();
        
        // Setup voice interface
        this.setupVoiceInterface();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Integrate with global language selector
        this.integrateWithGlobalLanguageSelector();
        
        console.log('Voice Assistant initialized successfully with 70+ language support');
    }

    checkBrowserSupport() {
        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            this.showFallbackMessage('voice-recognition');
            return false;
        }
        
        // Check for speech synthesis support
        if (!('speechSynthesis' in window)) {
            console.warn('Speech synthesis not supported in this browser');
            this.showFallbackMessage('speech-synthesis');
            return false;
        }
        
        return true;
    }

    async loadSupportedLanguages() {
        try {
            const response = await fetch('/api/voice/languages');
            const data = await response.json();
            
            if (data.success) {
                this.supportedLanguages = data.languages;
                this.populateLanguageSelector();
            }
        } catch (error) {
            console.error('Failed to load supported languages:', error);
            // Fallback to common languages
            this.supportedLanguages = [
                {code: 'en', name: 'English'},
                {code: 'es', name: 'Español'},
                {code: 'hi', name: 'हिन्दी'},
                {code: 'fr', name: 'Français'}
            ];
            this.populateLanguageSelector();
        }
    }

    setupSpeechRecognition() {
        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = this.currentLanguage;
            
            this.recognition.onstart = () => this.onRecognitionStart();
            this.recognition.onresult = (event) => this.onRecognitionResult(event);
            this.recognition.onerror = (event) => this.onRecognitionError(event);
            this.recognition.onend = () => this.onRecognitionEnd();
        }
    }

    setupSpeechSynthesis() {
        // Load available voices
        this.loadVoices();
        
        // Reload voices when they become available
        if (this.synthesis.onvoiceschanged !== undefined) {
            this.synthesis.onvoiceschanged = () => this.loadVoices();
        }
    }

    loadVoices() {
        this.voices = this.synthesis.getVoices();
        console.log(`Loaded ${this.voices.length} voices`);
    }

    setupVoiceInterface() {
        console.log('🎤 Setting up voice interface...');
        
        // Check if integrated voice assistant exists, if not create legacy version
        const integratedPanel = document.getElementById('voiceAssistantPanel');
        if (integratedPanel) {
            console.log('🎯 Using integrated voice assistant panel');
            this.setupIntegratedVoiceInterface();
        } else {
            console.log('🔄 Creating legacy voice controls');
            this.createVoiceControls();
        }
        
        // Initialize interface state
        this.updateVoiceStatus('ready');
        console.log('✅ Voice interface setup complete');
    }
    
    setupIntegratedVoiceInterface() {
        // Setup toggle button in chat header
        const voiceToggleBtn = document.getElementById('voiceToggleBtn');
        if (voiceToggleBtn) {
            voiceToggleBtn.addEventListener('click', () => {
                this.toggleVoicePanel();
            });
        }
        
        // Setup collapse toggle icon
        this.setupCollapseToggle();
        
        // Bind to existing controls
        this.bindControls();
        
        console.log('🎯 Integrated voice interface setup complete');
    }
    
    toggleVoicePanel() {
        const panel = document.getElementById('voiceAssistantPanel');
        const toggleBtn = document.getElementById('voiceToggleBtn');
        const collapseElement = document.getElementById('voiceControlsBody');
        
        if (panel && toggleBtn) {
            const isHidden = panel.style.display === 'none';
            
            if (isHidden) {
                // Show panel
                panel.style.display = 'block';
                toggleBtn.classList.add('active');
                toggleBtn.style.background = 'rgba(255, 255, 255, 0.2)';
                
                // Also expand the collapse if it's collapsed
                if (collapseElement && !collapseElement.classList.contains('show')) {
                    const collapse = new bootstrap.Collapse(collapseElement, { show: true });
                }
            } else {
                // Hide panel
                panel.style.display = 'none';
                toggleBtn.classList.remove('active');
                toggleBtn.style.background = '';
            }
        }
    }

    createVoiceControls() {
        // Check if voice controls already exist
        if (document.getElementById('voiceControls')) {
            this.bindExistingControls();
            return;
        }
        
        // Create voice controls container
        const voiceControls = document.createElement('div');
        voiceControls.id = 'voiceControls';
        voiceControls.className = 'voice-controls';
        voiceControls.innerHTML = `
            <div class="voice-panel card mb-3">
                <div class="card-header d-flex align-items-center py-2">
                    <i class="fas fa-microphone me-2"></i>
                    <h6 class="mb-0">Voice Assistant</h6>
                    <div class="ms-auto d-flex align-items-center">
                        <div class="form-check form-switch me-2">
                            <input class="form-check-input" type="checkbox" id="voiceEnabled" checked>
                            <label class="form-check-label text-white small" for="voiceEnabled">Auto-speak</label>
                        </div>
                        <span id="voiceStatus" class="badge bg-secondary me-2">Ready</span>
                        <button class="btn btn-sm btn-outline-light" type="button" data-bs-toggle="collapse" data-bs-target="#voiceControlsBody" aria-expanded="true" aria-controls="voiceControlsBody" title="Minimize/Expand Voice Assistant">
                            <i class="fas fa-chevron-up" id="voiceToggleIcon"></i>
                        </button>
                    </div>
                </div>
                <div class="card-body py-2 collapse show" id="voiceControlsBody">
                    <div class="row align-items-center">
                        <div class="col-md-4 col-sm-12">
                            <label for="languageSelector" class="form-label small mb-1">Language</label>
                            <select id="languageSelector" class="form-select form-select-sm">
                                <option value="en">English</option>
                            </select>
                        </div>
                        <div class="col-md-4 col-sm-6 text-center">
                            <button id="voiceButton" class="btn btn-primary rounded-circle" 
                                    style="width: 50px; height: 50px;" aria-label="Start voice recognition" title="Start voice recognition">
                                <i class="fas fa-microphone" aria-hidden="true"></i>
                            </button>
                            <div class="mt-1">
                                <small id="voiceButtonLabel" class="text-muted">Tap to speak</small>
                            </div>
                        </div>
                        <div class="col-md-4 col-sm-6">
                            <small class="text-muted d-block mb-1">Quick commands:</small>
                            <button class="btn btn-outline-secondary btn-sm me-1 mb-1 voice-command" 
                                    data-command="I have chest pain" aria-label="Say chest pain symptoms" title="Say: I have chest pain">
                                <i class="fas fa-volume-up me-1" aria-hidden="true"></i>
                                Chest
                            </button>
                            <button class="btn btn-outline-secondary btn-sm me-1 mb-1 voice-command" 
                                    data-command="I have fever" aria-label="Say fever symptoms" title="Say: I have fever">
                                <i class="fas fa-volume-up me-1" aria-hidden="true"></i>
                                Fever
                            </button>
                        </div>
                    </div>
                    
                    <!-- Voice recognition feedback -->
                    <div id="speechFeedback" class="mt-2 d-none">
                        <div class="alert alert-info py-2 mb-0">
                            <div class="d-flex align-items-center">
                                <div class="typing-indicator me-2">
                                    <span></span><span></span><span></span>
                                </div>
                                <div>
                                    <strong class="small">Listening...</strong>
                                    <div id="interimResults" class="small text-muted"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert voice controls at the top of the chat interface
        const chatContainer = document.querySelector('.col-md-8.offset-md-2');
        if (chatContainer) {
            chatContainer.insertBefore(voiceControls, chatContainer.firstChild);
        }
        
        this.bindControls();
    }

    bindExistingControls() {
        // Bind to existing voice control elements
        this.voiceButton = document.getElementById('voiceButton');
        this.languageSelector = document.getElementById('languageSelector');
        this.voiceStatus = document.getElementById('voiceStatus');
        
        this.bindControls();
        
        // Setup collapse toggle
        this.setupCollapseToggle();
    }

    bindControls() {
        console.log('🔗 Binding voice controls...');
        // Get references to control elements
        this.voiceButton = document.getElementById('voiceButton');
        this.languageSelector = document.getElementById('languageSelector');
        this.voiceStatus = document.getElementById('voiceStatus');
        
        console.log('Voice controls bound:', {
            voiceButton: !!this.voiceButton,
            languageSelector: !!this.languageSelector, 
            voiceStatus: !!this.voiceStatus
        });
        
        // Setup collapse toggle after controls are bound
        this.setupCollapseToggle();
    }
    
    setupCollapseToggle() {
        // Handle collapse toggle icon rotation
        const voiceControlsBody = document.getElementById('voiceControlsBody');
        const toggleIcon = document.getElementById('voiceToggleIcon');
        
        if (voiceControlsBody && toggleIcon) {
            voiceControlsBody.addEventListener('show.bs.collapse', () => {
                toggleIcon.classList.remove('fa-chevron-down');
                toggleIcon.classList.add('fa-chevron-up');
            });
            
            voiceControlsBody.addEventListener('hide.bs.collapse', () => {
                toggleIcon.classList.remove('fa-chevron-up');
                toggleIcon.classList.add('fa-chevron-down');
            });
        }
    }

    setupEventListeners() {
        // Voice button click
        if (this.voiceButton) {
            this.voiceButton.addEventListener('click', () => this.toggleListening());
        }
        
        // Language selector change
        if (this.languageSelector) {
            this.languageSelector.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                this.updateRecognitionLanguage();
            });
        }
        
        // Voice command buttons
        document.querySelectorAll('.voice-command').forEach(button => {
            button.addEventListener('click', (e) => {
                const command = e.target.getAttribute('data-command');
                this.speakText(command);
            });
        });
        
        // Voice enabled toggle
        this.voiceEnabledToggle = document.getElementById('voiceEnabled');
        if (this.voiceEnabledToggle) {
            this.voiceEnabledToggle.addEventListener('change', (e) => {
                this.isVoiceEnabled = e.target.checked;
                console.log(`🔊 Voice auto-speak: ${this.isVoiceEnabled ? 'enabled' : 'disabled'}`);
                
                // Stop current speech if disabled
                if (!this.isVoiceEnabled && this.isSpeaking) {
                    this.synthesis.cancel();
                }
            });
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Spacebar to toggle voice (when not typing in input)
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                this.toggleListening();
            }
        });
    }

    populateLanguageSelector() {
        if (!this.languageSelector) return;
        
        this.languageSelector.innerHTML = '';
        
        this.supportedLanguages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.code;
            option.textContent = lang.name;
            if (lang.code === this.currentLanguage) {
                option.selected = true;
            }
            this.languageSelector.appendChild(option);
        });
    }

    toggleListening() {
        if (this.isListening) {
            this.stopListening();
        } else {
            this.startListening();
        }
    }

    startListening() {
        if (!this.recognition) {
            this.showError('Speech recognition not available');
            return;
        }
        
        if (this.isListening) return;
        
        this.isListening = true;
        this.recognition.lang = this.getRecognitionLanguage();
        this.recognition.start();
        
        this.updateVoiceStatus('listening');
        this.showSpeechFeedback(true);
        
        console.log('Started voice recognition in language:', this.recognition.lang);
    }

    stopListening() {
        if (!this.recognition || !this.isListening) return;
        
        this.recognition.stop();
        this.isListening = false;
        
        this.updateVoiceStatus('processing');
        this.showSpeechFeedback(false);
    }

    getRecognitionLanguage() {
        // Comprehensive language mapping for all 70+ supported languages
        const langMap = {
            // Tier 1: Major World Languages
            'en': 'en-US',
            'es': 'es-ES',
            'hi': 'hi-IN',
            'fr': 'fr-FR',
            'pt': 'pt-BR',
            'ar': 'ar-SA',
            'zh': 'zh-CN',
            'bn': 'bn-IN',
            'ru': 'ru-RU',
            'de': 'de-DE',
            
            // Tier 2: Extended Language Support
            'ja': 'ja-JP',
            'ko': 'ko-KR',
            'it': 'it-IT',
            'nl': 'nl-NL',
            'tr': 'tr-TR',
            'pl': 'pl-PL',
            'th': 'th-TH',
            'vi': 'vi-VN',
            'sv': 'sv-SE',
            'no': 'no-NO',
            'da': 'da-DK',
            'fi': 'fi-FI',
            'he': 'he-IL',
            
            // Tier 3: Regional Languages
            'id': 'id-ID',
            'ms': 'ms-MY',
            'tl': 'tl-PH',
            'cs': 'cs-CZ',
            'hu': 'hu-HU',
            'ro': 'ro-RO',
            'bg': 'bg-BG',
            'hr': 'hr-HR',
            'sk': 'sk-SK',
            'sl': 'sl-SI',
            'uk': 'uk-UA',
            
            // South Asian Languages
            'ta': 'ta-IN',
            'te': 'te-IN',
            'gu': 'gu-IN',
            'pa': 'pa-IN',
            'mr': 'mr-IN',
            'kn': 'kn-IN',
            'ml': 'ml-IN',
            'ur': 'ur-PK',
            'ne': 'ne-NP',
            'si': 'si-LK',
            
            // Middle Eastern & Central Asian
            'fa': 'fa-IR',
            'ku': 'ku-IQ',
            'az': 'az-AZ',
            'hy': 'hy-AM',
            'ka': 'ka-GE',
            'kk': 'kk-KZ',
            'uz': 'uz-UZ',
            
            // African Languages
            'sw': 'sw-KE',
            'am': 'am-ET',
            'yo': 'yo-NG',
            'ig': 'ig-NG',
            'ha': 'ha-NG',
            
            // Additional European
            'ca': 'ca-ES',
            'eu': 'eu-ES',
            'gl': 'gl-ES',
            'cy': 'cy-GB',
            'ga': 'ga-IE',
            'is': 'is-IS',
            'et': 'et-EE',
            'lv': 'lv-LV',
            'lt': 'lt-LT'
        };
        
        return langMap[this.currentLanguage] || 'en-US';
    }

    updateRecognitionLanguage() {
        if (this.recognition) {
            this.recognition.lang = this.getRecognitionLanguage();
            console.log('Updated recognition language to:', this.recognition.lang);
        }
    }

    onRecognitionStart() {
        console.log('Voice recognition started');
        this.updateVoiceButton(true);
    }

    onRecognitionResult(event) {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Show interim results
        this.showInterimResults(interimTranscript);
        
        // Process final results
        if (finalTranscript) {
            console.log('Final transcript:', finalTranscript);
            this.processVoiceInput(finalTranscript);
        }
    }

    onRecognitionError(event) {
        console.error('Voice recognition error:', event.error);
        
        let errorMessage = 'Voice recognition error';
        switch (event.error) {
            case 'network':
                errorMessage = 'Network error. Please check your connection.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please enable microphone permissions.';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            default:
                errorMessage = `Voice recognition error: ${event.error}`;
        }
        
        this.showError(errorMessage);
        this.resetVoiceInterface();
    }

    onRecognitionEnd() {
        console.log('Voice recognition ended');
        this.isListening = false;
        this.resetVoiceInterface();
    }

    showInterimResults(text) {
        const interimElement = document.getElementById('interimResults');
        if (interimElement) {
            interimElement.textContent = text;
        }
    }

    showSpeechFeedback(show) {
        const feedbackElement = document.getElementById('speechFeedback');
        if (feedbackElement) {
            feedbackElement.classList.toggle('d-none', !show);
        }
    }

    async processVoiceInput(speechText) {
        this.updateVoiceStatus('processing');
        
        try {
            // Process voice input through our backend
            const response = await fetch('/api/voice/process', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    speech_text: speechText,
                    language_code: this.currentLanguage
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const processedInput = data.result;
                console.log('Processed voice input:', processedInput);
                
                // Send the processed text to the chat interface
                this.sendToChat(processedInput.english_text);
                
                // Announce what was understood
                this.announceUnderstanding(processedInput);
            } else {
                throw new Error(data.error || 'Voice processing failed');
            }
            
        } catch (error) {
            console.error('Voice processing error:', error);
            this.showError('Failed to process voice input. Please try again.');
        }
        
        this.updateVoiceStatus('ready');
    }

    sendToChat(message) {
        // Send the message to the existing chat interface
        const messageInput = document.getElementById('messageInput');
        const sendButton = document.getElementById('sendButton');
        
        if (messageInput && sendButton) {
            messageInput.value = message;
            sendButton.click();
        }
    }

    announceUnderstanding(processedInput) {
        // Speak back what was understood for confirmation in the user's language
        const confirmationText = this.getConfirmationMessage(processedInput.original_text);
        this.addToSpeechQueue(confirmationText, { rate: 1.1, pitch: 1.0 }, false);
    }
    
    getConfirmationMessage(originalText) {
        // Provide confirmation in user's language
        const confirmationTemplates = {
            'en': `I heard: ${originalText}`,
            'es': `Escuché: ${originalText}`,
            'hi': `मैंने सुना: ${originalText}`,
            'fr': `J'ai entendu: ${originalText}`,
            'de': `Ich hörte: ${originalText}`,
            'ar': `سمعت: ${originalText}`,
            'zh': `我听到: ${originalText}`,
            'ja': `聞こえました: ${originalText}`,
            'ru': `Я слышал: ${originalText}`,
            'pt': `Ouvi: ${originalText}`
        };
        
        return confirmationTemplates[this.currentLanguage] || confirmationTemplates['en'];
    }
    
    // Speech queue management to prevent overlapping speech
    addToSpeechQueue(text, options = {}, isEmergency = false) {
        const speechItem = {
            text: text,
            options: options,
            isEmergency: isEmergency,
            timestamp: Date.now()
        };
        
        // Emergency messages get priority (added to front of queue)
        if (isEmergency) {
            // Cancel current speech if emergency
            if (this.isSpeaking) {
                this.synthesis.cancel();
            }
            // Clear queue and add emergency message
            this.speechQueue = [speechItem];
        } else {
            // Add to end of queue for normal messages
            this.speechQueue.push(speechItem);
        }
        
        // Start processing if not already processing
        this.processSpeechQueue();
    }
    
    async processSpeechQueue() {
        // Avoid multiple concurrent processing
        if (this.isProcessingQueue || this.speechQueue.length === 0) {
            return;
        }
        
        this.isProcessingQueue = true;
        
        while (this.speechQueue.length > 0) {
            const speechItem = this.speechQueue.shift();
            
            // Wait for current speech to finish before starting new one
            await this.speakTextQueued(speechItem.text, speechItem.options);
            
            // Add small delay between messages for better clarity
            await this.sleep(300);
        }
        
        this.isProcessingQueue = false;
    }
    
    async speakTextQueued(text, options = {}) {
        return new Promise((resolve) => {
            // Skip empty or very short texts
            if (!text || text.trim().length < 3) {
                resolve();
                return;
            }
            
            const utterance = new SpeechSynthesisUtterance(text);
            
            // Find appropriate voice
            const voice = this.findVoiceByLanguage(this.currentLanguage);
            if (voice) {
                utterance.voice = voice;
            }
            
            // Apply options
            utterance.rate = options.rate || 0.9;
            utterance.pitch = options.pitch || 1.0;
            utterance.volume = options.volume || 1.0;
            
            // Event handlers
            utterance.onstart = () => {
                this.isSpeaking = true;
                this.updateVoiceStatus('speaking');
            };
            
            utterance.onend = () => {
                this.isSpeaking = false;
                this.updateVoiceStatus('ready');
                resolve();
            };
            
            utterance.onerror = (error) => {
                console.error('Speech synthesis error:', error);
                this.isSpeaking = false;
                this.updateVoiceStatus('ready');
                resolve();
            };
            
            // Speak the text
            this.synthesis.speak(utterance);
        });
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    clearSpeechQueue() {
        this.speechQueue = [];
        if (this.isSpeaking) {
            this.synthesis.cancel();
        }
    }

    async speakText(text, options = {}) {
        if (this.isSpeaking) {
            this.synthesis.cancel(); // Stop current speech
        }
        
        try {
            // Get speech synthesis data from backend
            const response = await fetch('/api/voice/synthesize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    language_code: this.currentLanguage
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const speechData = data.speech_data;
                this.performSpeechSynthesis(speechData, options);
            } else {
                // Fallback to direct synthesis
                this.performDirectSynthesis(text, options);
            }
            
        } catch (error) {
            console.error('Speech synthesis error:', error);
            // Fallback to direct synthesis
            this.performDirectSynthesis(text, options);
        }
    }

    performSpeechSynthesis(speechData, options = {}) {
        const utterance = new SpeechSynthesisUtterance(speechData.text);
        
        // Find appropriate voice
        const voice = this.findVoiceByLanguage(speechData.language);
        if (voice) {
            utterance.voice = voice;
        }
        
        // Apply speech parameters
        utterance.rate = options.rate || speechData.speech_rate || 0.9;
        utterance.pitch = options.pitch || speechData.speech_pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Event handlers
        utterance.onstart = () => {
            this.isSpeaking = true;
            this.updateVoiceStatus('speaking');
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateVoiceStatus('ready');
        };
        
        utterance.onerror = (error) => {
            console.error('Speech synthesis error:', error);
            this.isSpeaking = false;
            this.updateVoiceStatus('ready');
        };
        
        // Speak the text
        this.synthesis.speak(utterance);
    }

    performDirectSynthesis(text, options = {}) {
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Find appropriate voice for current language
        const voice = this.findVoiceByLanguage(this.currentLanguage);
        if (voice) {
            utterance.voice = voice;
        }
        
        // Apply options
        utterance.rate = options.rate || 0.9;
        utterance.pitch = options.pitch || 1.0;
        utterance.volume = options.volume || 1.0;
        
        // Event handlers
        utterance.onstart = () => {
            this.isSpeaking = true;
            this.updateVoiceStatus('speaking');
        };
        
        utterance.onend = () => {
            this.isSpeaking = false;
            this.updateVoiceStatus('ready');
        };
        
        this.synthesis.speak(utterance);
    }

    findVoiceByLanguage(languageCode) {
        // Find the best voice for the given language
        let preferredVoices = this.voices.filter(voice => 
            voice.lang.toLowerCase().startsWith(languageCode.toLowerCase())
        );
        
        // If no exact match, try broader matching
        if (preferredVoices.length === 0) {
            const langPrefix = languageCode.split('-')[0];
            preferredVoices = this.voices.filter(voice => 
                voice.lang.toLowerCase().startsWith(langPrefix.toLowerCase())
            );
        }
        
        // If still no match, try finding similar language families
        if (preferredVoices.length === 0) {
            const languageFallbacks = {
                'te': 'hi', // Telugu → Hindi (both Indian languages)
                'ta': 'hi', // Tamil → Hindi
                'kn': 'hi', // Kannada → Hindi
                'ml': 'hi', // Malayalam → Hindi
                'gu': 'hi', // Gujarati → Hindi
                'mr': 'hi', // Marathi → Hindi
                'bn': 'hi', // Bengali → Hindi
                'pa': 'hi', // Punjabi → Hindi
                'or': 'hi', // Odia → Hindi
                'as': 'hi', // Assamese → Hindi
                'ur': 'hi', // Urdu → Hindi
                'ne': 'hi', // Nepali → Hindi
                'si': 'hi', // Sinhala → Hindi
                
                'yo': 'en', // African languages → English
                'ig': 'en',
                'ha': 'en',
                'sw': 'en',
                'am': 'en',
                'zu': 'en',
                'xh': 'en',
                
                'jv': 'id', // Javanese → Indonesian
                'ceb': 'tl', // Cebuano → Filipino
                
                'qu': 'es', // Quechua → Spanish
                'gn': 'es', // Guarani → Spanish
                'ay': 'es', // Aymara → Spanish
            };
            
            const fallbackLang = languageFallbacks[languageCode];
            if (fallbackLang) {
                preferredVoices = this.voices.filter(voice => 
                    voice.lang.toLowerCase().startsWith(fallbackLang.toLowerCase())
                );
                if (preferredVoices.length > 0) {
                    console.log(`Using ${fallbackLang} voice for ${languageCode} language`);
                }
            }
        }
        
        if (preferredVoices.length > 0) {
            // Prefer female voices for healthcare (generally perceived as more caring)
            const femaleVoice = preferredVoices.find(voice => 
                voice.name.toLowerCase().includes('female') || 
                voice.name.toLowerCase().includes('woman') ||
                voice.name.toLowerCase().includes('féminin') ||
                voice.name.toLowerCase().includes('feminino')
            );
            
            // Also prefer neural/natural voices if available
            const neuralVoice = preferredVoices.find(voice =>
                voice.name.toLowerCase().includes('neural') ||
                voice.name.toLowerCase().includes('natural') ||
                voice.name.toLowerCase().includes('enhanced')
            );
            
            return femaleVoice || neuralVoice || preferredVoices[0];
        }
        
        // Final fallback to English voice
        const englishVoices = this.voices.filter(voice => 
            voice.lang.toLowerCase().startsWith('en')
        );
        
        if (englishVoices.length > 0) {
            console.log(`No voice available for ${languageCode}, using English voice`);
            return englishVoices[0];
        }
        
        // Last resort: any available voice
        console.warn(`No suitable voice found for ${languageCode}, using system default`);
        return this.voices[0] || null;
    }
    
    testVoiceInNewLanguage(languageCode) {
        // Test voice synthesis in the new language with a simple phrase
        const testPhrases = {
            'en': 'Voice assistant ready',
            'es': 'Asistente de voz listo',
            'hi': 'वॉयस असिस्टेंट तैयार है',
            'fr': 'Assistant vocal prêt',
            'de': 'Sprachassistent bereit',
            'ar': 'مساعد الصوت جاهز',
            'zh': '语音助手已准备好',
            'ja': '音声アシスタント準備完了',
            'ru': 'Голосовой помощник готов',
            'pt': 'Assistente de voz pronto'
        };
        
        const testPhrase = testPhrases[languageCode] || testPhrases['en'];
        
        // Test quietly (lower volume)
        setTimeout(() => {
            this.speakText(testPhrase, { rate: 1.0, pitch: 1.0, volume: 0.3 });
        }, 500); // Small delay to avoid conflicts
    }

    updateVoiceStatus(status) {
        if (!this.voiceStatus) return;
        
        const statusConfig = {
            ready: { text: 'Ready', class: 'bg-secondary' },
            listening: { text: 'Listening...', class: 'bg-primary' },
            processing: { text: 'Processing...', class: 'bg-warning' },
            speaking: { text: 'Speaking...', class: 'bg-info' },
            error: { text: 'Error', class: 'bg-danger' }
        };
        
        const config = statusConfig[status] || statusConfig.ready;
        
        this.voiceStatus.textContent = config.text;
        this.voiceStatus.className = `badge ${config.class}`;
    }

    updateVoiceButton(listening) {
        if (!this.voiceButton) return;
        
        const icon = this.voiceButton.querySelector('i');
        const label = document.getElementById('voiceButtonLabel');
        
        if (listening) {
            // For integrated voice button
            this.voiceButton.classList.add('recording');
            if (icon) icon.className = 'fas fa-stop';
            if (label) label.textContent = 'Tap to stop';
            
            // Also update legacy button classes if present
            this.voiceButton.classList.remove('btn-primary');
            this.voiceButton.classList.add('btn-danger');
        } else {
            // For integrated voice button
            this.voiceButton.classList.remove('recording');
            if (icon) icon.className = 'fas fa-microphone';
            if (label) label.textContent = 'Tap to speak';
            
            // Also update legacy button classes if present
            this.voiceButton.classList.remove('btn-danger');
            this.voiceButton.classList.add('btn-primary');
        }
    }


    resetVoiceInterface() {
        this.updateVoiceButton(false);
        this.showSpeechFeedback(false);
        this.updateVoiceStatus('ready');
    }

    showError(message) {
        console.error('Voice Assistant Error:', message);
        
        // Show error in UI
        const errorAlert = document.createElement('div');
        errorAlert.className = 'alert alert-danger alert-dismissible fade show';
        errorAlert.innerHTML = `
            <i class="fas fa-exclamation-triangle me-2" aria-hidden="true"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close error message"></button>
        `;
        
        // Insert error at top of voice controls
        const voiceControls = document.getElementById('voiceControls');
        if (voiceControls) {
            voiceControls.insertBefore(errorAlert, voiceControls.firstChild);
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (errorAlert.parentNode) {
                    errorAlert.remove();
                }
            }, 5000);
        }
        
        this.updateVoiceStatus('error');
    }

    showFallbackMessage(feature) {
        console.warn(`${feature} not supported, showing fallback message`);
        
        const fallbackAlert = document.createElement('div');
        fallbackAlert.className = 'alert alert-warning';
        fallbackAlert.innerHTML = `
            <i class="fas fa-info-circle me-2" aria-hidden="true"></i>
            <strong>Voice feature not available:</strong>
            Your browser doesn't support ${feature.replace('-', ' ')}. 
            Please use the text interface or try a modern browser like Chrome or Firefox.
        `;
        
        const chatContainer = document.querySelector('.col-md-8.offset-md-2');
        if (chatContainer) {
            chatContainer.insertBefore(fallbackAlert, chatContainer.firstChild);
        }
    }

    // Public methods for integration with existing chat
    speakBotResponse(message) {
        // Only speak if voice is enabled
        if (!this.isVoiceEnabled) {
            return;
        }
        
        // Add bot response to speech queue for sequential playback
        this.addToSpeechQueue(message, { rate: 0.8, pitch: 1.1 }, false);
    }

    speakEmergencyAlert(message) {
        // Emergency messages override voice setting (always speak)
        // Add to queue with emergency priority
        this.addToSpeechQueue(message, { 
            rate: 1.2, 
            pitch: 1.3, 
            volume: 1.0 
        }, true);
    }

    setLanguage(languageCode) {
        const oldLanguage = this.currentLanguage;
        this.currentLanguage = languageCode;
        
        // Update speech recognition language
        this.updateRecognitionLanguage();
        
        // Update voice assistant UI language selector
        if (this.languageSelector) {
            this.languageSelector.value = languageCode;
        }
        
        // Update voice synthesis to use the new language
        this.loadVoices(); // Refresh available voices
        
        console.log(`🎤 Voice assistant language: ${oldLanguage} → ${languageCode}`);
        
        // Test voice synthesis in the new language
        if (languageCode !== oldLanguage) {
            this.testVoiceInNewLanguage(languageCode);
        }
    }
    
    // Integration with global language selector
    integrateWithGlobalLanguageSelector() {
        // Listen for language change events from the global language selector
        document.addEventListener('languageChanged', (event) => {
            const { languageCode, languageInfo } = event.detail;
            
            console.log(`🔄 Voice Assistant: Language changed to ${languageCode} (${languageInfo.native_name})`);
            console.log('Voice Assistant current language before change:', this.currentLanguage);
            
            // Always update the voice assistant language immediately
            this.setLanguage(languageCode);
            
            console.log('Voice Assistant current language after change:', this.currentLanguage);
            
            // Check voice support for this language
            const hasVoiceSupport = this.isLanguageVoiceSupported(languageCode);
            
            if (hasVoiceSupport) {
                console.log(`✅ Voice support available for ${languageInfo.native_name}`);
                this.showVoiceSupportStatus(languageInfo.native_name, true);
            } else {
                console.log(`⚠️ Voice support limited for ${languageInfo.native_name}, using best available voice`);
                // Don't show intrusive notifications - just log for debugging
            }
        });
        
        // Also check if there's already a selected language on startup
        setTimeout(() => {
            try {
                const currentLang = window.languageSelector?.getCurrentLanguage?.();
                if (currentLang && currentLang !== this.currentLanguage) {
                    console.log(`🔄 Voice Assistant: Syncing with current language ${currentLang}`);
                    this.setLanguage(currentLang);
                }
            } catch (error) {
                console.log('Language selector not ready yet, will sync on language change event');
            }
        }, 500);
    }
    
    showVoiceSupportStatus(languageName, isSupported) {
        const statusMessage = isSupported 
            ? `Voice assistant now supports ${languageName}` 
            : `Voice assistant not available in ${languageName}. Using English for voice features.`;
            
        const alertClass = isSupported ? 'alert-success' : 'alert-info';
        const icon = isSupported ? 'fa-check-circle' : 'fa-info-circle';
        
        // Create status notification
        const statusAlert = document.createElement('div');
        statusAlert.className = `alert ${alertClass} alert-dismissible fade show`;
        statusAlert.innerHTML = `
            <i class="fas ${icon} me-2" aria-hidden="true"></i>
            ${statusMessage}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close status message"></button>
        `;
        
        // Show notification temporarily
        const voiceControls = document.getElementById('voiceControls');
        if (voiceControls) {
            voiceControls.insertBefore(statusAlert, voiceControls.firstChild);
            
            // Auto-remove after 3 seconds
            setTimeout(() => {
                if (statusAlert.parentNode) {
                    statusAlert.remove();
                }
            }, 3000);
        }
    }
    
    // Enhanced voice feature detection
    isLanguageVoiceSupported(languageCode) {
        const recognitionLang = this.getRecognitionLanguageForCode(languageCode);
        const hasVoice = this.voices.some(voice => voice.lang.startsWith(languageCode));
        
        return recognitionLang !== 'en-US' && hasVoice;
    }
    
    getRecognitionLanguageForCode(languageCode) {
        const tempLang = this.currentLanguage;
        this.currentLanguage = languageCode;
        const result = this.getRecognitionLanguage();
        this.currentLanguage = tempLang;
        return result;
    }

    destroy() {
        // Cleanup when component is destroyed
        if (this.recognition) {
            this.recognition.stop();
        }
        
        if (this.synthesis) {
            this.synthesis.cancel();
        }
        
        // Remove event listeners
        document.removeEventListener('keydown', this.handleKeyboard);
    }
}

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if not already initialized
    if (!window.voiceAssistant) {
        window.voiceAssistant = new VoiceAssistant();
        console.log('Voice Assistant ready for multilingual healthcare triage');
    }
});
