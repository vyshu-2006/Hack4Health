"""
WhatsApp and SMS Integration Module
Provides hooks for connecting the triage bot to messaging platforms
"""

import json
from datetime import datetime
from typing import Optional, Dict, Any
from flask import request, jsonify
from twilio.twiml.messaging_response import MessagingResponse
from app.chatbot import HealthcareChatbot

class MessagingIntegration:
    def __init__(self, chatbot: HealthcareChatbot):
        self.chatbot = chatbot
        self.user_sessions = {}  # Map phone numbers to session IDs

    def handle_whatsapp_webhook(self, request_data: Dict[str, Any]) -> str:
        """
        Handle incoming WhatsApp messages via Twilio webhook
        
        To set up WhatsApp integration:
        1. Get Twilio account and WhatsApp sandbox
        2. Set webhook URL to: https://yourdomain.com/api/whatsapp/webhook
        3. Configure environment variables for Twilio credentials
        """
        try:
            # Extract message info from Twilio webhook
            from_number = request_data.get('From', '')
            message_body = request_data.get('Body', '')
            
            # Get or create session for this user
            session_id = self.get_or_create_session(from_number)
            
            # Process message through triage bot
            responses = self.chatbot.process_user_input(session_id, message_body)
            
            # Create Twilio response
            twilio_response = MessagingResponse()
            
            # Send bot responses back to WhatsApp
            for response in responses:
                msg = twilio_response.message()
                msg.body(response.message)
                
                # Add emergency indicators for urgent cases
                if 'EMERGENCY' in response.message.upper():
                    msg.body(f"🚨 {response.message}")
            
            return str(twilio_response)
            
        except Exception as e:
            error_response = MessagingResponse()
            error_msg = error_response.message()
            error_msg.body("Sorry, I'm having technical difficulties. Please try again later.")
            return str(error_response)

    def handle_sms_webhook(self, request_data: Dict[str, Any]) -> str:
        """
        Handle incoming SMS messages via Twilio webhook
        
        Similar setup to WhatsApp but for regular SMS
        Webhook URL: https://yourdomain.com/api/sms/webhook
        """
        try:
            from_number = request_data.get('From', '')
            message_body = request_data.get('Body', '')
            
            session_id = self.get_or_create_session(from_number)
            responses = self.chatbot.process_user_input(session_id, message_body)
            
            twilio_response = MessagingResponse()
            
            # For SMS, we might need to combine responses to avoid multiple messages
            combined_response = self.combine_responses_for_sms(responses)
            
            msg = twilio_response.message()
            msg.body(combined_response)
            
            return str(twilio_response)
            
        except Exception as e:
            error_response = MessagingResponse()
            error_msg = error_response.message()
            error_msg.body("Error processing your message. Please try again.")
            return str(error_response)

    def get_or_create_session(self, phone_number: str) -> str:
        """Get existing session or create new one for phone number"""
        if phone_number in self.user_sessions:
            return self.user_sessions[phone_number]
        
        # Create new session with phone number as user ID
        session_id = self.chatbot.create_session(user_id=f"phone_{phone_number}")
        self.user_sessions[phone_number] = session_id
        return session_id

    def combine_responses_for_sms(self, responses) -> str:
        """Combine multiple bot responses into a single SMS message"""
        if not responses:
            return "Thank you for your message."
        
        # Take the first few responses and combine them
        combined = []
        char_count = 0
        max_chars = 1400  # Leave room for SMS limits
        
        for response in responses:
            if char_count + len(response.message) < max_chars:
                combined.append(response.message)
                char_count += len(response.message)
            else:
                break
        
        result = '\n\n'.join(combined)
        
        # Add truncation notice if needed
        if len(responses) > len(combined):
            result += "\n\n[Message truncated - reply for more info]"
        
        return result

    def send_proactive_sms(self, phone_number: str, message: str) -> bool:
        """
        Send proactive SMS (for follow-ups, reminders, etc.)
        Requires Twilio client setup
        """
        try:
            # This would require actual Twilio client setup
            # from twilio.rest import Client
            # client = Client(account_sid, auth_token)
            # client.messages.create(to=phone_number, from_=twilio_number, body=message)
            
            print(f"Would send SMS to {phone_number}: {message}")
            return True
        except Exception as e:
            print(f"Failed to send SMS: {e}")
            return False

class OfflineCapability:
    """
    Provides basic offline functionality for low-connectivity areas
    """
    
    def __init__(self):
        self.cached_responses = self.load_cached_responses()

    def load_cached_responses(self) -> Dict[str, str]:
        """Load common responses for offline use"""
        return {
            'greeting': "Hello! I'm your health assistant. Describe your symptoms.",
            'emergency_keywords': {
                'chest pain': "🚨 EMERGENCY: Call 911/108 immediately for chest pain!",
                'difficulty breathing': "🚨 EMERGENCY: Call 911/108 for breathing problems!",
                'severe bleeding': "🚨 EMERGENCY: Call 911/108 for severe bleeding!",
                'unconscious': "🚨 EMERGENCY: Call 911/108 immediately!"
            },
            'common_conditions': {
                'headache': "For mild headaches: Rest, hydrate, consider over-the-counter pain relief. See doctor if severe or persistent.",
                'fever': "For fever: Rest, fluids, monitor temperature. See doctor if over 101°F or lasting >3 days.",
                'cough': "For cough: Stay hydrated, honey for throat. See doctor if persistent >2 weeks or with fever.",
                'nausea': "For nausea: Small sips of clear fluids, bland foods. See doctor if severe or with other symptoms."
            },
            'fallback': "I cannot fully assess your symptoms right now. If serious, call emergency services. Otherwise, see a healthcare provider."
        }

    def get_offline_response(self, message: str) -> str:
        """Generate response using cached information when offline"""
        message_lower = message.lower()
        
        # Check for emergency keywords
        for keyword, response in self.cached_responses['emergency_keywords'].items():
            if keyword in message_lower:
                return response
        
        # Check for common conditions
        for condition, response in self.cached_responses['common_conditions'].items():
            if condition in message_lower:
                return response
        
        return self.cached_responses['fallback']

# Flask routes for webhook integration
def setup_messaging_routes(app, chatbot):
    """Setup Flask routes for messaging platform webhooks"""
    
    integration = MessagingIntegration(chatbot)
    
    @app.route('/api/whatsapp/webhook', methods=['POST'])
    def whatsapp_webhook():
        """Handle WhatsApp messages from Twilio"""
        try:
            return integration.handle_whatsapp_webhook(request.form.to_dict())
        except Exception as e:
            return str(e), 500
    
    @app.route('/api/sms/webhook', methods=['POST'])
    def sms_webhook():
        """Handle SMS messages from Twilio"""
        try:
            return integration.handle_sms_webhook(request.form.to_dict())
        except Exception as e:
            return str(e), 500
    
    @app.route('/api/offline/response', methods=['POST'])
    def offline_response():
        """Provide basic response when main system is offline"""
        try:
            data = request.get_json()
            message = data.get('message', '')
            
            offline = OfflineCapability()
            response = offline.get_offline_response(message)
            
            return jsonify({
                'success': True,
                'response': response,
                'offline': True
            })
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

# Configuration template
INTEGRATION_CONFIG = {
    'twilio': {
        'account_sid': 'your_twilio_account_sid',
        'auth_token': 'your_twilio_auth_token',
        'whatsapp_number': 'whatsapp:+14155238886',  # Twilio sandbox number
        'sms_number': '+1234567890'  # Your Twilio phone number
    },
    'webhook_urls': {
        'whatsapp': 'https://yourdomain.com/api/whatsapp/webhook',
        'sms': 'https://yourdomain.com/api/sms/webhook'
    }
}

# Installation and setup instructions
SETUP_INSTRUCTIONS = """
WhatsApp/SMS Integration Setup:

1. Twilio Account Setup:
   - Sign up for Twilio account
   - Get Account SID and Auth Token
   - For WhatsApp: Join Twilio Sandbox for WhatsApp
   - For SMS: Purchase a phone number

2. Environment Variables:
   export TWILIO_ACCOUNT_SID="your_account_sid"
   export TWILIO_AUTH_TOKEN="your_auth_token"
   export TWILIO_PHONE_NUMBER="+1234567890"

3. Webhook Configuration:
   - Set webhook URLs in Twilio console
   - WhatsApp: https://yourdomain.com/api/whatsapp/webhook
   - SMS: https://yourdomain.com/api/sms/webhook

4. Testing:
   - For WhatsApp: Send "join <sandbox_name>" to Twilio WhatsApp number
   - For SMS: Text your Twilio number directly

5. Production Deployment:
   - Use HTTPS for webhook URLs (required by Twilio)
   - Consider using ngrok for local development
   - Apply for WhatsApp Business API for production
"""
