/**
 * Global Language Selector for Healthcare Triage Bot
 * Supports 50+ languages with RTL support and dynamic UI translation
 */

class LanguageSelector {
    constructor() {
        this.currentLanguage = 'en';
        this.languages = [];
        this.translations = {};
        this.isRTL = false;
        
        this.init();
    }
    
    async init() {
        try {
            console.log('🌐 Starting language selector initialization...');
            
            // Load current language from session or localStorage first
            this.loadCurrentLanguage();
            console.log('📱 Current language loaded:', this.currentLanguage);
            
            // Create language selector UI immediately with placeholder
            this.createLanguageSelector();
            console.log('🎨 Language selector UI created');
            
            // Load available languages
            console.log('📡 Loading languages from API...');
            await this.loadLanguages();
            console.log('✅ Languages loaded:', this.languages.length);
            
            // Update language selector UI with loaded languages
            this.populateLanguageOptions();
            console.log('🔄 Language options populated');
            
            // Set up event listeners AFTER UI is populated
            this.setupEventListeners();
            console.log('👂 Event listeners set up');
            
            // Initialize translations for current language
            console.log('📚 Loading translations for:', this.currentLanguage);
            await this.loadTranslations(this.currentLanguage);
            console.log('✅ Translations loaded');
            
            // Apply translations to the page
            this.applyTranslations();
            console.log('🎯 Translations applied to page');
            
            console.log('🎉 Language selector initialization completed successfully!');
            
            // Update display with current language
            const currentLangInfo = this.languages.find(lang => lang.code === this.currentLanguage);
            if (currentLangInfo) {
                this.updateLanguageDisplay(currentLangInfo);
                this.updateActiveLanguageOption(this.currentLanguage);
                
                // Sync initial language with server if not English
                if (this.currentLanguage !== 'en') {
                    await this.syncLanguageWithServer(this.currentLanguage);
                }
                
                // Trigger initial language change event for voice assistant sync
                setTimeout(() => {
                    console.log('🔔 Triggering initial language sync event');
                    this.dispatchLanguageChangeEvent(this.currentLanguage, currentLangInfo);
                }, 100);
            }
            
            // Force show the dropdown to verify it exists
            const dropdown = document.getElementById('languageDropdown');
            if (dropdown) {
                console.log('✅ Language dropdown button found and ready');
            } else {
                console.error('❌ Language dropdown button not found!');
            }
            
        } catch (error) {
            console.error('💥 Language selector initialization failed:', error);
            this.showInitializationError(error);
        }
    }
    
    async loadLanguages() {
        try {
            console.log('Loading languages from /api/languages...');
            const response = await fetch('/api/languages');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Languages data:', data);
            
            if (data.success) {
                this.languages = data.languages;
                console.log(`Loaded ${data.total_languages} languages successfully`);
            } else {
                console.error('Languages API returned error:', data.error);
                this.loadFallbackLanguages();
            }
        } catch (error) {
            console.error('Failed to load languages:', error);
            this.loadFallbackLanguages();
        }
    }
    
    loadFallbackLanguages() {
        console.log('Loading fallback languages...');
        // Fallback to essential languages if API fails
        this.languages = [
            { code: 'en', name: 'English', native_name: 'English', population: 1500000000, region: 'Global', voice_support: true, rtl: false },
            { code: 'es', name: 'Spanish', native_name: 'Español', population: 500000000, region: 'Americas/Europe', voice_support: true, rtl: false },
            { code: 'hi', name: 'Hindi', native_name: 'हिन्दी', population: 600000000, region: 'South Asia', voice_support: true, rtl: false },
            { code: 'fr', name: 'French', native_name: 'Français', population: 280000000, region: 'Europe/Africa', voice_support: true, rtl: false },
            { code: 'ar', name: 'Arabic', native_name: 'العربية', population: 420000000, region: 'Middle East/North Africa', voice_support: true, rtl: true },
            { code: 'zh', name: 'Chinese', native_name: '中文', population: 1100000000, region: 'East Asia', voice_support: true, rtl: false },
            { code: 'pt', name: 'Portuguese', native_name: 'Português', population: 260000000, region: 'Americas/Europe', voice_support: true, rtl: false },
            { code: 'ru', name: 'Russian', native_name: 'Русский', population: 258000000, region: 'Eastern Europe/Asia', voice_support: true, rtl: false },
            { code: 'ja', name: 'Japanese', native_name: '日本語', population: 125000000, region: 'East Asia', voice_support: true, rtl: false },
            { code: 'de', name: 'German', native_name: 'Deutsch', population: 132000000, region: 'Europe', voice_support: true, rtl: false }
        ];
        console.log('Loaded', this.languages.length, 'fallback languages');
    }
    
    showInitializationError(error) {
        console.error('Language selector failed to initialize:', error);
        // Log error but don't create fallback UI
        console.log('Please refresh the page to try again.');
    }
    
    createLanguageSelector() {
        console.log('Creating language selector with', this.languages.length, 'languages');
        // Create language selector dropdown
        const selectorHTML = `
            <div class="language-selector-container">
                <div class="dropdown">
                    <button class="btn btn-outline-light btn-sm dropdown-toggle" type="button" 
                            id="languageDropdown" data-bs-toggle="dropdown" aria-expanded="false" 
                            aria-label="Select language" title="Select language">
                        <i class="fas fa-globe me-1" aria-hidden="true"></i>
                        <span id="currentLanguageName">English</span>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end language-dropdown" aria-labelledby="languageDropdown">
                        <li><h6 class="dropdown-header">Popular Languages</h6></li>
                        <li id="popularLanguages" style="display: contents;"></li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <div class="dropdown-item-text">
                                <input type="text" id="languageSearch" class="form-control form-control-sm" 
                                       placeholder="Search languages..." autocomplete="off" aria-label="Search languages">
                            </div>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li><h6 class="dropdown-header">All Languages</h6></li>
                        <li id="allLanguages" class="language-list" style="display: contents;"></li>
                    </ul>
                </div>
            </div>
        `;
        
        // Insert the selector into the navbar
        const navbar = document.querySelector('.navbar-nav');
        if (navbar) {
            const selectorElement = document.createElement('li');
            selectorElement.className = 'nav-item';
            selectorElement.innerHTML = selectorHTML;
            navbar.appendChild(selectorElement);
            console.log('Language selector UI created successfully');
        } else {
            console.error('Could not find navbar to insert language selector');
        }
    }
    
    populateLanguageOptions() {
        console.log('Populating language options with', this.languages.length, 'languages');
        // Get popular languages (top 10 by population)
        const popularLanguages = this.languages
            .filter(lang => lang.population > 50000000)
            .slice(0, 10);
        console.log('Popular languages:', popularLanguages.length);
        
        // Populate popular languages section
        const popularContainer = document.getElementById('popularLanguages');
        if (popularContainer) {
            popularContainer.innerHTML = popularLanguages
                .map(lang => this.createLanguageOption(lang, true))
                .join('');
        }
        
        // Populate all languages section
        const allContainer = document.getElementById('allLanguages');
        if (allContainer) {
            allContainer.innerHTML = this.languages
                .map(lang => this.createLanguageOption(lang))
                .join('');
        }
    }
    
    createLanguageOption(language, isPopular = false) {
        const isSelected = language.code === this.currentLanguage;
        const voiceIcon = language.voice_support ? '<i class="fas fa-microphone text-success ms-1" title="Voice support available"></i>' : '';
        const rtlIcon = language.rtl ? '<i class="fas fa-align-right text-info ms-1" title="Right-to-left language"></i>' : '';
        const botIcon = language.bot_support ? '<i class="fas fa-robot text-primary ms-1" title="Full bot conversation support"></i>' : '<i class="fas fa-exclamation-triangle text-warning ms-1" title="Limited bot support (English fallback)"></i>';
        
        const supportClass = language.bot_support ? '' : 'text-muted';
        
        return `
            <li>
                <a class="dropdown-item language-option ${isSelected ? 'active' : ''} ${supportClass}" 
                   href="#" data-language-code="${language.code}"
                   data-is-popular="${isPopular}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <strong>${language.native_name}</strong>
                            ${language.name !== language.native_name ? `<br><small class="text-muted">${language.name}</small>` : ''}
                            ${!language.bot_support ? '<br><small class="text-warning">Limited bot support</small>' : ''}
                        </div>
                        <div class="language-indicators">
                            ${botIcon}
                            ${voiceIcon}
                            ${rtlIcon}
                            ${isSelected ? '<i class="fas fa-check text-primary"></i>' : ''}
                        </div>
                    </div>
                    <small class="text-muted">${language.region} • ${this.formatPopulation(language.population)} speakers</small>
                </a>
            </li>
        `;
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up event listeners...');
        
        // Language selection with more specific targeting
        document.addEventListener('click', (e) => {
            console.log('Click detected:', e.target);
            const languageOption = e.target.closest('.language-option');
            if (languageOption) {
                e.preventDefault();
                e.stopPropagation();
                const languageCode = languageOption.dataset.languageCode;
                console.log(`Language option clicked: ${languageCode}`);
                this.changeLanguage(languageCode);
            }
        });
        
        // Wait for search input to be created
        setTimeout(() => {
            const searchInput = document.getElementById('languageSearch');
            if (searchInput) {
                console.log('🔍 Search input found, adding listeners');
                searchInput.addEventListener('input', (e) => {
                    this.filterLanguages(e.target.value);
                });
                
                // Prevent dropdown close when clicking search input
                searchInput.addEventListener('click', (e) => {
                    e.stopPropagation();
                });
            } else {
                console.warn('Search input not found');
            }
        }, 100);
        
        console.log('✅ Event listeners set up');
    }
    
    filterLanguages(query) {
        const allLanguageItems = document.querySelectorAll('#allLanguages .language-option');
        
        allLanguageItems.forEach(item => {
            const languageCode = item.dataset.languageCode;
            const language = this.languages.find(l => l.code === languageCode);
            
            if (language) {
                const matchesSearch = query === '' ||
                    language.name.toLowerCase().includes(query.toLowerCase()) ||
                    language.native_name.toLowerCase().includes(query.toLowerCase()) ||
                    language.region.toLowerCase().includes(query.toLowerCase()) ||
                    language.code.toLowerCase().includes(query.toLowerCase());
                
                item.closest('li').style.display = matchesSearch ? 'block' : 'none';
            }
        });
    }
    
    async syncLanguageWithServer(languageCode) {
        // Sync language setting with server without UI updates
        try {
            const response = await fetch('/api/language/set', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language_code: languageCode })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log(`Server language synced to: ${languageCode}`);
            }
        } catch (error) {
            console.error('Failed to sync language with server:', error);
        }
    }
    
    async changeLanguage(languageCode) {
        console.log(`🌍 Starting language change to: ${languageCode}`);
        try {
            // Show loading state
            this.showLoadingState();
            
            console.log('Sending language change request to server...');
            // Set language on server
            const response = await fetch('/api/language/set', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ language_code: languageCode })
            });
            
            console.log('Server response status:', response.status);
            
            const data = await response.json();
            
            if (data.success) {
                this.currentLanguage = languageCode;
                this.isRTL = data.language_info.rtl;
                
                // Store in localStorage
                localStorage.setItem('selectedLanguage', languageCode);
                
                // Load translations for new language
                await this.loadTranslations(languageCode);
                
                // Apply translations and text direction
                this.applyTranslations();
                this.applyTextDirection();
                
                // Update UI
                this.updateLanguageDisplay(data.language_info);
                this.updateActiveLanguageOption(languageCode);
                
                // Hide loading state
                this.hideLoadingState();
                
                // Dispatch language change event
                this.dispatchLanguageChangeEvent(languageCode, data.language_info);
                
                // Update voice assistant language immediately
                if (window.voiceAssistant) {
                    console.log(`🎤 Updating voice assistant to ${languageCode}`);
                    window.voiceAssistant.setLanguage(languageCode);
                }
                
                console.log(`Language changed to: ${languageCode}`);
            } else {
                console.error('Failed to set language:', data.error);
                this.hideLoadingState();
            }
        } catch (error) {
            console.error('Error changing language:', error);
            this.hideLoadingState();
        }
    }
    
    async loadTranslations(languageCode) {
        try {
            const response = await fetch(`/api/translations/${languageCode}`);
            const data = await response.json();
            
            if (data.success) {
                this.translations = data.translations;
                console.log(`Loaded translations for ${languageCode}`);
            }
        } catch (error) {
            console.error('Failed to load translations:', error);
        }
    }
    
    applyTranslations() {
        console.log('🔄 Applying translations for language:', this.currentLanguage);
        console.log('Available translations keys:', Object.keys(this.translations));
        
        // Apply translations to elements with data-i18n attributes
        const elementsToTranslate = document.querySelectorAll('[data-i18n]');
        console.log(`Found ${elementsToTranslate.length} elements to translate`);
        
        elementsToTranslate.forEach(element => {
            const key = element.dataset.i18n;
            const translation = this.translations[key];
            
            console.log(`Translating key '${key}':`, translation);
            
            if (translation) {
                if (element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'search')) {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            } else {
                console.warn(`No translation found for key: ${key}`);
            }
        });
        
        // Apply translations to title and placeholders
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.dataset.i18nTitle;
            const translation = this.translations[key];
            if (translation) {
                element.title = translation;
            }
        });
    }
    
    applyTextDirection() {
        // Apply RTL direction to the entire page
        document.documentElement.dir = this.isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = this.currentLanguage;
        
        // Add RTL class to body for CSS customizations
        document.body.classList.toggle('rtl-layout', this.isRTL);
        
        // Update Bootstrap utilities for RTL if needed
        if (this.isRTL) {
            document.body.classList.add('text-end');
        } else {
            document.body.classList.remove('text-end');
        }
    }
    
    updateLanguageDisplay(languageInfo) {
        const displayElement = document.getElementById('currentLanguageName');
        if (displayElement && languageInfo) {
            displayElement.textContent = languageInfo.native_name;
        }
    }
    
    updateActiveLanguageOption(languageCode) {
        // Remove active class from all language options
        document.querySelectorAll('.language-option').forEach(option => {
            option.classList.remove('active');
            option.querySelector('.fa-check')?.remove();
        });
        
        // Add active class to selected language
        const selectedOption = document.querySelector(`[data-language-code="${languageCode}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
            const indicators = selectedOption.querySelector('.language-indicators');
            if (indicators && !indicators.querySelector('.fa-check')) {
                indicators.insertAdjacentHTML('beforeend', '<i class="fas fa-check text-primary ms-1"></i>');
            }
        }
    }
    
    loadCurrentLanguage() {
        // Try to get language from localStorage first
        const savedLanguage = localStorage.getItem('selectedLanguage');
        if (savedLanguage) {
            this.currentLanguage = savedLanguage;
        } else {
            // Detect browser language
            const browserLang = navigator.language.split('-')[0];
            this.currentLanguage = browserLang;
        }
    }
    
    showLoadingState() {
        const button = document.getElementById('languageDropdown');
        if (button) {
            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Loading...';
        }
    }
    
    hideLoadingState() {
        const button = document.getElementById('languageDropdown');
        if (button) {
            button.disabled = false;
        }
        // The content will be updated by updateLanguageDisplay
    }
    
    dispatchLanguageChangeEvent(languageCode, languageInfo) {
        const event = new CustomEvent('languageChanged', {
            detail: {
                languageCode,
                languageInfo,
                translations: this.translations
            }
        });
        document.dispatchEvent(event);
    }
    
    formatPopulation(population) {
        if (population >= 1000000000) {
            return (population / 1000000000).toFixed(1) + 'B';
        } else if (population >= 1000000) {
            return (population / 1000000).toFixed(1) + 'M';
        } else if (population >= 1000) {
            return (population / 1000).toFixed(1) + 'K';
        }
        return population.toString();
    }
    
    // Public API methods
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    
    getTranslation(key, defaultValue = key) {
        return this.translations[key] || defaultValue;
    }
    
    isRightToLeft() {
        return this.isRTL;
    }
    
    getAvailableLanguages() {
        return this.languages;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌐 Initializing Language Selector...');
    window.languageSelector = new LanguageSelector();
    console.log('✅ Language Selector initialized:', window.languageSelector);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LanguageSelector;
}
