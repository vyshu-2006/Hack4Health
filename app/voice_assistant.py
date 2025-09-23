"""
Multilingual Voice Assistant Module
Provides speech-to-text and text-to-speech capabilities for the healthcare triage bot
Supports multiple languages to assist illiterate users and bridge language barriers
"""

import json
import re
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

class SupportedLanguage(Enum):
    # Major World Languages (Top tier - full voice support)
    ENGLISH = "en"
    SPANISH = "es" 
    HINDI = "hi"
    FRENCH = "fr"
    PORTUGUESE = "pt"
    ARABIC = "ar"
    CHINESE = "zh"
    BENGALI = "bn"
    RUSSIAN = "ru"
    GERMAN = "de"
    
    # Extended Language Support (Tier 2 - Web Speech API support)
    JAPANESE = "ja"
    KOREAN = "ko"
    ITALIAN = "it"
    DUTCH = "nl"
    TURKISH = "tr"
    POLISH = "pl"
    THAI = "th"
    VIETNAMESE = "vi"
    SWEDISH = "sv"
    NORWEGIAN = "no"
    DANISH = "da"
    FINNISH = "fi"
    HEBREW = "he"
    
    # Regional Languages (Tier 3 - Basic voice support)
    INDONESIAN = "id"
    MALAY = "ms"
    FILIPINO = "tl"
    CZECH = "cs"
    HUNGARIAN = "hu"
    ROMANIAN = "ro"
    BULGARIAN = "bg"
    CROATIAN = "hr"
    SLOVAK = "sk"
    SLOVENIAN = "sl"
    UKRAINIAN = "uk"
    
    # South Asian Languages
    TAMIL = "ta"
    TELUGU = "te"
    GUJARATI = "gu"
    PUNJABI = "pa"
    MARATHI = "mr"
    KANNADA = "kn"
    MALAYALAM = "ml"
    URDU = "ur"
    NEPALI = "ne"
    SINHALA = "si"
    
    # Middle Eastern & Central Asian
    PERSIAN = "fa"
    KURDISH = "ku"
    AZERBAIJANI = "az"
    ARMENIAN = "hy"
    GEORGIAN = "ka"
    KAZAKH = "kk"
    UZBEK = "uz"
    
    # African Languages
    SWAHILI = "sw"
    AMHARIC = "am"
    YORUBA = "yo"
    IGBO = "ig"
    HAUSA = "ha"
    
    # Additional European Languages
    CATALAN = "ca"
    BASQUE = "eu"
    GALICIAN = "gl"
    WELSH = "cy"
    IRISH = "ga"
    ICELANDIC = "is"
    ESTONIAN = "et"
    LATVIAN = "lv"
    LITHUANIAN = "lt"

@dataclass
class VoiceConfig:
    language: SupportedLanguage
    voice_name: str
    speech_rate: float = 1.0
    speech_pitch: float = 1.0

class LanguageTranslator:
    """Handles translation between different languages for voice input/output"""
    
    def __init__(self):
        # Simple translation dictionary for medical terms and phrases
        # In production, this would use Google Translate API or similar service
        self.translations = self._load_translations()
        
    def _load_translations(self) -> Dict[str, Dict[str, str]]:
        """Load translation mappings for medical terms"""
        return {
            # Emergency phrases
            "emergency": {
                "en": "This is a medical emergency",
                "es": "Esta es una emergencia médica",
                "hi": "यह एक चिकित्सा आपातकाल है",
                "fr": "C'est une urgence médicale",
                "pt": "Esta é uma emergência médica",
                "ar": "هذه حالة طبية طارئة",
                "zh": "这是医疗紧急情况",
                "bn": "এটি একটি চিকিৎসা জরুরী অবস্থা",
                "ru": "Это неотложная медицинская помощь",
                "de": "Dies ist ein medizinischer Notfall"
            },
            "call_emergency": {
                "en": "Call emergency services immediately",
                "es": "Llame a los servicios de emergencia inmediatamente",
                "hi": "तुरंत आपातकालीन सेवाओं को कॉल करें",
                "fr": "Appelez immédiatement les services d'urgence",
                "pt": "Ligue para os serviços de emergência imediatamente",
                "ar": "اتصل بخدمات الطوارئ على الفور",
                "zh": "立即呼叫紧急服务",
                "bn": "অবিলম্বে জরুরী সেবায় কল করুন",
                "ru": "Немедленно вызовите службу экстренного реагирования",
                "de": "Rufen Sie sofort den Notdienst an"
            },
            # Common symptoms
            "chest_pain": {
                "en": "chest pain",
                "es": "dolor en el pecho",
                "hi": "सीने में दर्द",
                "fr": "douleur thoracique",
                "pt": "dor no peito",
                "ar": "ألم في الصدر",
                "zh": "胸痛",
                "bn": "বুকে ব্যথা",
                "ru": "боль в груди",
                "de": "Brustschmerzen"
            },
            "difficulty_breathing": {
                "en": "difficulty breathing",
                "es": "dificultad para respirar",
                "hi": "सांस लेने में कठिनाई",
                "fr": "difficulté à respirer",
                "pt": "dificuldade para respirar", 
                "ar": "صعوبة في التنفس",
                "zh": "呼吸困难",
                "bn": "শ্বাসকষ্ট",
                "ru": "затрудненное дыхание",
                "de": "Atembeschwerden"
            },
            "fever": {
                "en": "fever",
                "es": "fiebre", 
                "hi": "बुखार",
                "fr": "fièvre",
                "pt": "febre",
                "ar": "حمى",
                "zh": "发烧",
                "bn": "জ্বর",
                "ru": "лихорадка",
                "de": "Fieber"
            },
            "headache": {
                "en": "headache",
                "es": "dolor de cabeza",
                "hi": "सिरदर्द",
                "fr": "mal de tête",
                "pt": "dor de cabeça",
                "ar": "صداع",
                "zh": "头痛",
                "bn": "মাথাব্যথা",
                "ru": "головная боль",
                "de": "Kopfschmerzen"
            },
            # Greetings and responses
            "hello": {
                "en": "Hello! I'm your healthcare assistant. Please describe your symptoms.",
                "es": "¡Hola! Soy tu asistente de salud. Por favor describe tus síntomas.",
                "hi": "नमस्ते! मैं आपका स्वास्थ्य सहायक हूं। कृपया अपने लक्षणों का वर्णन करें।",
                "fr": "Bonjour! Je suis votre assistant de santé. Veuillez décrire vos symptômes.",
                "pt": "Olá! Sou seu assistente de saúde. Por favor, descreva seus sintomas.",
                "ar": "مرحبا! أنا مساعدك الصحي. يرجى وصف الأعراض الخاصة بك.",
                "zh": "您好！我是您的健康助手。请描述您的症状。",
                "bn": "হ্যালো! আমি আপনার স্বাস্থ্য সহায়ক। দয়া করে আপনার লক্ষণগুলি বর্ণনা করুন।",
                "ru": "Привет! Я ваш помощник по здравоохранению. Пожалуйста, опишите свои симптомы.",
                "de": "Hallo! Ich bin Ihr Gesundheitsassistent. Bitte beschreiben Sie Ihre Symptome."
            },
            "self_care": {
                "en": "Your symptoms appear mild and can be managed at home",
                "es": "Tus síntomas parecen leves y pueden tratarse en casa",
                "hi": "आपके लक्षण हल्के लगते हैं और घर पर इनका इलाज किया जा सकता है",
                "fr": "Vos symptômes semblent légers et peuvent être gérés à domicile",
                "pt": "Seus sintomas parecem leves e podem ser tratados em casa",
                "ar": "تبدو أعراضك خفيفة ويمكن التعامل معها في المنزل",
                "zh": "您的症状似乎很轻微，可以在家中处理",
                "bn": "আপনার লক্ষণগুলি হালকা মনে হচ্ছে এবং বাড়িতেই সামলানো যেতে পারে",
                "ru": "Ваши симптомы кажутся легкими и могут быть устранены дома",
                "de": "Ihre Symptome scheinen mild zu sein und können zu Hause behandelt werden"
            },
            "urgent_care": {
                "en": "Your symptoms require prompt medical attention within 24 hours",
                "es": "Tus síntomas requieren atención médica inmediata en 24 horas",
                "hi": "आपके लक्षणों को 24 घंटों के भीतर तत्काल चिकित्सा ध्यान की आवश्यकता है",
                "fr": "Vos symptômes nécessitent une attention médicale rapide dans les 24 heures",
                "pt": "Seus sintomas requerem atenção médica imediata em 24 horas",
                "ar": "تتطلب أعراضك عناية طبية فورية خلال 24 ساعة",
                "zh": "您的症状需要在24小时内得到及时的医疗关注",
                "bn": "আপনার লক্ষণগুলির জন্য 24 ঘন্টার মধ্যে তাৎক্ষণিক চিকিৎসা মনোযোগ প্রয়োজন",
                "ru": "Ваши симптомы требуют срочной медицинской помощи в течение 24 часов",
                "de": "Ihre Symptome erfordern innerhalb von 24 Stunden eine rasche ärztliche Behandlung"
            }
        }
    
    def translate_text(self, text: str, from_lang: str, to_lang: str) -> str:
        """Translate text from one language to another"""
        # Simple keyword-based translation for medical terms
        translated_text = text.lower()
        
        # Look for medical terms and translate them
        for term, translations in self.translations.items():
            if from_lang in translations:
                source_text = translations[from_lang].lower()
                if source_text in translated_text and to_lang in translations:
                    translated_text = translated_text.replace(
                        source_text, 
                        translations[to_lang].lower()
                    )
        
        return translated_text
    
    def get_translation(self, key: str, language: str) -> str:
        """Get a specific translation for a key and language"""
        if key in self.translations and language in self.translations[key]:
            return self.translations[key][language]
        return self.translations[key].get("en", key)  # Fallback to English

class VoiceAssistant:
    """Main voice assistant class handling speech recognition and synthesis"""
    
    def __init__(self):
        self.translator = LanguageTranslator()
        self.current_language = SupportedLanguage.ENGLISH
        self.voice_configs = self._get_voice_configs()
        
    def _get_voice_configs(self) -> Dict[SupportedLanguage, VoiceConfig]:
        """Configure voice settings for each supported language"""
        return {
            # Tier 1: Major World Languages (Premium voice quality)
            SupportedLanguage.ENGLISH: VoiceConfig(
                SupportedLanguage.ENGLISH, "en-US", speech_rate=0.9
            ),
            SupportedLanguage.SPANISH: VoiceConfig(
                SupportedLanguage.SPANISH, "es-ES", speech_rate=0.9
            ),
            SupportedLanguage.HINDI: VoiceConfig(
                SupportedLanguage.HINDI, "hi-IN", speech_rate=0.8
            ),
            SupportedLanguage.FRENCH: VoiceConfig(
                SupportedLanguage.FRENCH, "fr-FR", speech_rate=0.9
            ),
            SupportedLanguage.PORTUGUESE: VoiceConfig(
                SupportedLanguage.PORTUGUESE, "pt-BR", speech_rate=0.9
            ),
            SupportedLanguage.ARABIC: VoiceConfig(
                SupportedLanguage.ARABIC, "ar-SA", speech_rate=0.8
            ),
            SupportedLanguage.CHINESE: VoiceConfig(
                SupportedLanguage.CHINESE, "zh-CN", speech_rate=0.8
            ),
            SupportedLanguage.BENGALI: VoiceConfig(
                SupportedLanguage.BENGALI, "bn-IN", speech_rate=0.8
            ),
            SupportedLanguage.RUSSIAN: VoiceConfig(
                SupportedLanguage.RUSSIAN, "ru-RU", speech_rate=0.9
            ),
            SupportedLanguage.GERMAN: VoiceConfig(
                SupportedLanguage.GERMAN, "de-DE", speech_rate=0.9
            ),
            
            # Tier 2: Extended Language Support
            SupportedLanguage.JAPANESE: VoiceConfig(
                SupportedLanguage.JAPANESE, "ja-JP", speech_rate=0.8
            ),
            SupportedLanguage.KOREAN: VoiceConfig(
                SupportedLanguage.KOREAN, "ko-KR", speech_rate=0.8
            ),
            SupportedLanguage.ITALIAN: VoiceConfig(
                SupportedLanguage.ITALIAN, "it-IT", speech_rate=0.9
            ),
            SupportedLanguage.DUTCH: VoiceConfig(
                SupportedLanguage.DUTCH, "nl-NL", speech_rate=0.9
            ),
            SupportedLanguage.TURKISH: VoiceConfig(
                SupportedLanguage.TURKISH, "tr-TR", speech_rate=0.9
            ),
            SupportedLanguage.POLISH: VoiceConfig(
                SupportedLanguage.POLISH, "pl-PL", speech_rate=0.9
            ),
            SupportedLanguage.THAI: VoiceConfig(
                SupportedLanguage.THAI, "th-TH", speech_rate=0.8
            ),
            SupportedLanguage.VIETNAMESE: VoiceConfig(
                SupportedLanguage.VIETNAMESE, "vi-VN", speech_rate=0.8
            ),
            SupportedLanguage.SWEDISH: VoiceConfig(
                SupportedLanguage.SWEDISH, "sv-SE", speech_rate=0.9
            ),
            SupportedLanguage.NORWEGIAN: VoiceConfig(
                SupportedLanguage.NORWEGIAN, "no-NO", speech_rate=0.9
            ),
            SupportedLanguage.DANISH: VoiceConfig(
                SupportedLanguage.DANISH, "da-DK", speech_rate=0.9
            ),
            SupportedLanguage.FINNISH: VoiceConfig(
                SupportedLanguage.FINNISH, "fi-FI", speech_rate=0.9
            ),
            SupportedLanguage.HEBREW: VoiceConfig(
                SupportedLanguage.HEBREW, "he-IL", speech_rate=0.8
            ),
            
            # Tier 3: Regional Languages (Basic voice support)
            SupportedLanguage.INDONESIAN: VoiceConfig(
                SupportedLanguage.INDONESIAN, "id-ID", speech_rate=0.9
            ),
            SupportedLanguage.MALAY: VoiceConfig(
                SupportedLanguage.MALAY, "ms-MY", speech_rate=0.9
            ),
            SupportedLanguage.FILIPINO: VoiceConfig(
                SupportedLanguage.FILIPINO, "tl-PH", speech_rate=0.9
            ),
            SupportedLanguage.CZECH: VoiceConfig(
                SupportedLanguage.CZECH, "cs-CZ", speech_rate=0.9
            ),
            SupportedLanguage.HUNGARIAN: VoiceConfig(
                SupportedLanguage.HUNGARIAN, "hu-HU", speech_rate=0.9
            ),
            SupportedLanguage.ROMANIAN: VoiceConfig(
                SupportedLanguage.ROMANIAN, "ro-RO", speech_rate=0.9
            ),
            SupportedLanguage.BULGARIAN: VoiceConfig(
                SupportedLanguage.BULGARIAN, "bg-BG", speech_rate=0.9
            ),
            SupportedLanguage.CROATIAN: VoiceConfig(
                SupportedLanguage.CROATIAN, "hr-HR", speech_rate=0.9
            ),
            SupportedLanguage.SLOVAK: VoiceConfig(
                SupportedLanguage.SLOVAK, "sk-SK", speech_rate=0.9
            ),
            SupportedLanguage.SLOVENIAN: VoiceConfig(
                SupportedLanguage.SLOVENIAN, "sl-SI", speech_rate=0.9
            ),
            SupportedLanguage.UKRAINIAN: VoiceConfig(
                SupportedLanguage.UKRAINIAN, "uk-UA", speech_rate=0.9
            ),
            
            # South Asian Languages
            SupportedLanguage.TAMIL: VoiceConfig(
                SupportedLanguage.TAMIL, "ta-IN", speech_rate=0.8
            ),
            SupportedLanguage.TELUGU: VoiceConfig(
                SupportedLanguage.TELUGU, "te-IN", speech_rate=0.8
            ),
            SupportedLanguage.GUJARATI: VoiceConfig(
                SupportedLanguage.GUJARATI, "gu-IN", speech_rate=0.8
            ),
            SupportedLanguage.PUNJABI: VoiceConfig(
                SupportedLanguage.PUNJABI, "pa-IN", speech_rate=0.8
            ),
            SupportedLanguage.MARATHI: VoiceConfig(
                SupportedLanguage.MARATHI, "mr-IN", speech_rate=0.8
            ),
            SupportedLanguage.KANNADA: VoiceConfig(
                SupportedLanguage.KANNADA, "kn-IN", speech_rate=0.8
            ),
            SupportedLanguage.MALAYALAM: VoiceConfig(
                SupportedLanguage.MALAYALAM, "ml-IN", speech_rate=0.8
            ),
            SupportedLanguage.URDU: VoiceConfig(
                SupportedLanguage.URDU, "ur-PK", speech_rate=0.8
            ),
            SupportedLanguage.NEPALI: VoiceConfig(
                SupportedLanguage.NEPALI, "ne-NP", speech_rate=0.8
            ),
            SupportedLanguage.SINHALA: VoiceConfig(
                SupportedLanguage.SINHALA, "si-LK", speech_rate=0.8
            ),
            
            # Middle Eastern & Central Asian Languages
            SupportedLanguage.PERSIAN: VoiceConfig(
                SupportedLanguage.PERSIAN, "fa-IR", speech_rate=0.8
            ),
            SupportedLanguage.KURDISH: VoiceConfig(
                SupportedLanguage.KURDISH, "ku-IQ", speech_rate=0.8
            ),
            SupportedLanguage.AZERBAIJANI: VoiceConfig(
                SupportedLanguage.AZERBAIJANI, "az-AZ", speech_rate=0.9
            ),
            SupportedLanguage.ARMENIAN: VoiceConfig(
                SupportedLanguage.ARMENIAN, "hy-AM", speech_rate=0.9
            ),
            SupportedLanguage.GEORGIAN: VoiceConfig(
                SupportedLanguage.GEORGIAN, "ka-GE", speech_rate=0.9
            ),
            SupportedLanguage.KAZAKH: VoiceConfig(
                SupportedLanguage.KAZAKH, "kk-KZ", speech_rate=0.9
            ),
            SupportedLanguage.UZBEK: VoiceConfig(
                SupportedLanguage.UZBEK, "uz-UZ", speech_rate=0.9
            ),
            
            # African Languages (using available regional codes)
            SupportedLanguage.SWAHILI: VoiceConfig(
                SupportedLanguage.SWAHILI, "sw-KE", speech_rate=0.9
            ),
            SupportedLanguage.AMHARIC: VoiceConfig(
                SupportedLanguage.AMHARIC, "am-ET", speech_rate=0.8
            ),
            SupportedLanguage.YORUBA: VoiceConfig(
                SupportedLanguage.YORUBA, "yo-NG", speech_rate=0.9
            ),
            SupportedLanguage.IGBO: VoiceConfig(
                SupportedLanguage.IGBO, "ig-NG", speech_rate=0.9
            ),
            SupportedLanguage.HAUSA: VoiceConfig(
                SupportedLanguage.HAUSA, "ha-NG", speech_rate=0.9
            ),
            
            # Additional European Languages
            SupportedLanguage.CATALAN: VoiceConfig(
                SupportedLanguage.CATALAN, "ca-ES", speech_rate=0.9
            ),
            SupportedLanguage.BASQUE: VoiceConfig(
                SupportedLanguage.BASQUE, "eu-ES", speech_rate=0.9
            ),
            SupportedLanguage.GALICIAN: VoiceConfig(
                SupportedLanguage.GALICIAN, "gl-ES", speech_rate=0.9
            ),
            SupportedLanguage.WELSH: VoiceConfig(
                SupportedLanguage.WELSH, "cy-GB", speech_rate=0.9
            ),
            SupportedLanguage.IRISH: VoiceConfig(
                SupportedLanguage.IRISH, "ga-IE", speech_rate=0.9
            ),
            SupportedLanguage.ICELANDIC: VoiceConfig(
                SupportedLanguage.ICELANDIC, "is-IS", speech_rate=0.9
            ),
            SupportedLanguage.ESTONIAN: VoiceConfig(
                SupportedLanguage.ESTONIAN, "et-EE", speech_rate=0.9
            ),
            SupportedLanguage.LATVIAN: VoiceConfig(
                SupportedLanguage.LATVIAN, "lv-LV", speech_rate=0.9
            ),
            SupportedLanguage.LITHUANIAN: VoiceConfig(
                SupportedLanguage.LITHUANIAN, "lt-LT", speech_rate=0.9
            ),
        }
    
    def detect_language(self, text: str) -> SupportedLanguage:
        """Simple language detection based on common words and patterns"""
        text_lower = text.lower()
        
        # Language indicators based on common medical terms and greetings
        language_indicators = {
            SupportedLanguage.SPANISH: [
                "dolor", "fiebre", "cabeza", "respirar", "pecho", "hola", "síntomas"
            ],
            SupportedLanguage.HINDI: [
                "दर्द", "बुखार", "सिर", "सांस", "सीने", "नमस्ते", "लक्षण"
            ],
            SupportedLanguage.FRENCH: [
                "douleur", "fièvre", "tête", "respirer", "thoracique", "bonjour", "symptômes"
            ],
            SupportedLanguage.PORTUGUESE: [
                "dor", "febre", "cabeça", "respirar", "peito", "olá", "sintomas"
            ],
            SupportedLanguage.ARABIC: [
                "ألم", "حمى", "رأس", "تنفس", "صدر", "مرحبا", "أعراض"
            ],
            SupportedLanguage.CHINESE: [
                "疼痛", "发烧", "头", "呼吸", "胸", "你好", "症状"
            ],
            SupportedLanguage.BENGALI: [
                "ব্যথা", "জ্বর", "মাথা", "শ্বাস", "বুক", "হ্যালো", "লক্ষণ"
            ],
            SupportedLanguage.RUSSIAN: [
                "боль", "лихорадка", "голова", "дышать", "грудь", "привет", "симптомы"
            ],
            SupportedLanguage.GERMAN: [
                "schmerz", "fieber", "kopf", "atmen", "brust", "hallo", "symptome"
            ]
        }
        
        # Count matches for each language
        language_scores = {}
        for lang, indicators in language_indicators.items():
            score = sum(1 for indicator in indicators if indicator in text_lower)
            if score > 0:
                language_scores[lang] = score
        
        # Return language with highest score, default to English
        if language_scores:
            return max(language_scores.items(), key=lambda x: x[1])[0]
        
        return SupportedLanguage.ENGLISH
    
    def normalize_speech_input(self, speech_text: str, language: SupportedLanguage) -> str:
        """Normalize speech input to handle pronunciation variations"""
        normalized = speech_text.lower().strip()
        
        # Handle common speech recognition errors for medical terms
        corrections = {
            SupportedLanguage.ENGLISH: {
                "chest pane": "chest pain",
                "head egg": "headache", 
                "fever": "fever",
                "difficultly breathing": "difficulty breathing",
                "short of breath": "shortness of breath"
            },
            SupportedLanguage.SPANISH: {
                "dolor de pecho": "dolor en el pecho",
                "dificultad para respirar": "dificultad para respirar"
            },
            SupportedLanguage.HINDI: {
                "सीने में दर्द": "सीने में दर्द",
                "सांस लेने में दिक्कत": "सांस लेने में कठिनाई"
            }
        }
        
        if language in corrections:
            for error, correction in corrections[language].items():
                normalized = normalized.replace(error, correction)
        
        return normalized
    
    def process_voice_input(self, speech_text: str, detected_language: Optional[SupportedLanguage] = None) -> Dict:
        """Process voice input and return structured data for triage"""
        
        # Detect language if not provided
        if detected_language is None:
            detected_language = self.detect_language(speech_text)
        
        # Normalize the input
        normalized_text = self.normalize_speech_input(speech_text, detected_language)
        
        # Translate to English for triage processing if needed
        english_text = normalized_text
        if detected_language != SupportedLanguage.ENGLISH:
            english_text = self.translator.translate_text(
                normalized_text, 
                detected_language.value, 
                SupportedLanguage.ENGLISH.value
            )
        
        return {
            "original_text": speech_text,
            "normalized_text": normalized_text,
            "english_text": english_text,
            "detected_language": detected_language.value,
            "language_confidence": 0.8  # Simple confidence score
        }
    
    def generate_voice_response(self, response_text: str, target_language: SupportedLanguage) -> Dict:
        """Generate voice response data for text-to-speech"""
        
        # Get appropriate voice configuration
        voice_config = self.voice_configs.get(target_language, self.voice_configs[SupportedLanguage.ENGLISH])
        
        # Translate response if needed
        if target_language != SupportedLanguage.ENGLISH:
            # For known phrases, use direct translations
            translated_text = self._translate_response(response_text, target_language)
        else:
            translated_text = response_text
        
        return {
            "text": translated_text,
            "language": target_language.value,
            "voice_name": voice_config.voice_name,
            "speech_rate": voice_config.speech_rate,
            "speech_pitch": voice_config.speech_pitch,
            "ssml": self._generate_ssml(translated_text, voice_config)
        }
    
    def _translate_response(self, text: str, target_language: SupportedLanguage) -> str:
        """Translate response text to target language"""
        text_lower = text.lower()
        
        # Check for known phrases and translate them
        for key, translations in self.translator.translations.items():
            if "en" in translations and translations["en"].lower() in text_lower:
                if target_language.value in translations:
                    return translations[target_language.value]
        
        # For complex sentences, return original (in production, use translation API)
        return text
    
    def _generate_ssml(self, text: str, voice_config: VoiceConfig) -> str:
        """Generate SSML (Speech Synthesis Markup Language) for better voice output"""
        return f"""
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{voice_config.voice_name}">
            <prosody rate="{voice_config.speech_rate}" pitch="{voice_config.speech_pitch}">
                {text}
            </prosody>
        </speak>
        """
    
    def get_emergency_message(self, language: SupportedLanguage) -> str:
        """Get emergency message in specified language"""
        return self.translator.get_translation("emergency", language.value)
    
    def get_supported_languages(self) -> List[Dict]:
        """Get list of supported languages for UI"""
        return [
            {"code": lang.value, "name": self._get_language_name(lang)} 
            for lang in SupportedLanguage
        ]
    
    def _get_language_name(self, language: SupportedLanguage) -> str:
        """Get human-readable language name in native script"""
        # Import from i18n system to get consistent naming
        try:
            from .i18n_system import WorldLanguages
            lang_info = WorldLanguages.get_language(language.value)
            if lang_info:
                return lang_info.native_name
        except ImportError:
            pass
        
        # Fallback names if i18n system not available
        names = {
            # Tier 1: Major Languages
            SupportedLanguage.ENGLISH: "English",
            SupportedLanguage.SPANISH: "Español", 
            SupportedLanguage.HINDI: "हिन्दी",
            SupportedLanguage.FRENCH: "Français",
            SupportedLanguage.PORTUGUESE: "Português",
            SupportedLanguage.ARABIC: "العربية",
            SupportedLanguage.CHINESE: "中文",
            SupportedLanguage.BENGALI: "বাংলা",
            SupportedLanguage.RUSSIAN: "Русский",
            SupportedLanguage.GERMAN: "Deutsch",
            
            # Tier 2: Extended Languages
            SupportedLanguage.JAPANESE: "日本語",
            SupportedLanguage.KOREAN: "한국어",
            SupportedLanguage.ITALIAN: "Italiano",
            SupportedLanguage.DUTCH: "Nederlands",
            SupportedLanguage.TURKISH: "Türkçe",
            SupportedLanguage.POLISH: "Polski",
            SupportedLanguage.THAI: "ไทย",
            SupportedLanguage.VIETNAMESE: "Tiếng Việt",
            SupportedLanguage.SWEDISH: "Svenska",
            SupportedLanguage.NORWEGIAN: "Norsk",
            SupportedLanguage.DANISH: "Dansk",
            SupportedLanguage.FINNISH: "Suomi",
            SupportedLanguage.HEBREW: "עברית",
            
            # Tier 3: Regional Languages
            SupportedLanguage.INDONESIAN: "Bahasa Indonesia",
            SupportedLanguage.MALAY: "Bahasa Melayu",
            SupportedLanguage.FILIPINO: "Filipino",
            SupportedLanguage.CZECH: "Čeština",
            SupportedLanguage.HUNGARIAN: "Magyar",
            SupportedLanguage.ROMANIAN: "Română",
            SupportedLanguage.BULGARIAN: "Български",
            SupportedLanguage.CROATIAN: "Hrvatski",
            SupportedLanguage.SLOVAK: "Slovenčina",
            SupportedLanguage.SLOVENIAN: "Slovenščina",
            SupportedLanguage.UKRAINIAN: "Українська",
            
            # South Asian Languages
            SupportedLanguage.TAMIL: "தமிழ்",
            SupportedLanguage.TELUGU: "తెలుగు",
            SupportedLanguage.GUJARATI: "ગુજરાતી",
            SupportedLanguage.PUNJABI: "ਪੰਜਾਬੀ",
            SupportedLanguage.MARATHI: "मराठी",
            SupportedLanguage.KANNADA: "ಕನ್ನಡ",
            SupportedLanguage.MALAYALAM: "മലയാളം",
            SupportedLanguage.URDU: "اردو",
            SupportedLanguage.NEPALI: "नेपाली",
            SupportedLanguage.SINHALA: "සිංහල",
            
            # Middle Eastern & Central Asian
            SupportedLanguage.PERSIAN: "فارسی",
            SupportedLanguage.KURDISH: "Kurdî",
            SupportedLanguage.AZERBAIJANI: "Azərbaycanca",
            SupportedLanguage.ARMENIAN: "Հայերեն",
            SupportedLanguage.GEORGIAN: "ქართული",
            SupportedLanguage.KAZAKH: "Қазақша",
            SupportedLanguage.UZBEK: "Oʻzbekcha",
            
            # African Languages
            SupportedLanguage.SWAHILI: "Kiswahili",
            SupportedLanguage.AMHARIC: "አማርኛ",
            SupportedLanguage.YORUBA: "Yorùbá",
            SupportedLanguage.IGBO: "Igbo",
            SupportedLanguage.HAUSA: "Hausa",
            
            # Additional European
            SupportedLanguage.CATALAN: "Català",
            SupportedLanguage.BASQUE: "Euskera",
            SupportedLanguage.GALICIAN: "Galego",
            SupportedLanguage.WELSH: "Cymraeg",
            SupportedLanguage.IRISH: "Gaeilge",
            SupportedLanguage.ICELANDIC: "Íslenska",
            SupportedLanguage.ESTONIAN: "Eesti",
            SupportedLanguage.LATVIAN: "Latviešu",
            SupportedLanguage.LITHUANIAN: "Lietuvių",
        }
        return names.get(language, language.value)

# Flask routes for voice assistant API
def setup_voice_routes(app):
    """Setup Flask routes for voice assistant functionality"""
    
    voice_assistant = VoiceAssistant()
    
    @app.route('/api/voice/languages', methods=['GET'])
    def get_supported_languages():
        """Get list of supported languages"""
        try:
            languages = voice_assistant.get_supported_languages()
            return {
                'success': True,
                'languages': languages
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500
    
    @app.route('/api/voice/process', methods=['POST'])
    def process_voice_input():
        """Process voice input for triage"""
        try:
            from flask import request
            data = request.get_json()
            
            speech_text = data.get('speech_text', '')
            language_code = data.get('language_code')
            
            detected_language = None
            if language_code:
                try:
                    detected_language = SupportedLanguage(language_code)
                except ValueError:
                    pass
            
            result = voice_assistant.process_voice_input(speech_text, detected_language)
            
            return {
                'success': True,
                'result': result
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500
    
    @app.route('/api/voice/synthesize', methods=['POST'])
    def synthesize_speech():
        """Generate speech synthesis data"""
        try:
            from flask import request
            data = request.get_json()
            
            text = data.get('text', '')
            language_code = data.get('language_code', 'en')
            
            try:
                target_language = SupportedLanguage(language_code)
            except ValueError:
                target_language = SupportedLanguage.ENGLISH
            
            result = voice_assistant.generate_voice_response(text, target_language)
            
            return {
                'success': True,
                'speech_data': result
            }
            
        except Exception as e:
            return {'success': False, 'error': str(e)}, 500
