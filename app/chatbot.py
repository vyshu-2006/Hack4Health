import uuid
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass, asdict
from .triage_engine import TriageEngine, UrgencyLevel
from .i18n_system import i18n

@dataclass
class ChatMessage:
    id: str
    timestamp: datetime
    sender: str  # 'user' or 'bot'
    message: str
    message_type: str = 'text'  # 'text', 'triage_result', 'options'

@dataclass
class ChatSession:
    session_id: str
    user_id: str
    messages: List[ChatMessage]
    current_state: str
    triage_result: Optional[dict] = None
    created_at: datetime = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class HealthcareChatbot:
    def __init__(self):
        self.triage_engine = TriageEngine()
        self.sessions: Dict[str, ChatSession] = {}
        self.current_language = 'en'  # Default language
        
        # Conversation states
        self.STATES = {
            'GREETING': 'greeting',
            'SYMPTOM_COLLECTION': 'symptom_collection',
            'TRIAGE_ASSESSMENT': 'triage_assessment',
            'FOLLOW_UP': 'follow_up',
            'COMPLETED': 'completed'
        }
        
    def set_language(self, language_code: str):
        """Set current language for responses"""
        self.current_language = language_code
        i18n.set_language(language_code)
        self.triage_engine.set_language(language_code)
    
    def get_translated_message(self, key: str, **kwargs) -> str:
        """Get translated message for current language"""
        return i18n.get_translation(key, self.current_language, **kwargs)
        
    def get_greeting_messages(self) -> List[str]:
        """Get greeting messages in current language"""
        return [
            self.get_translated_message('bot_greeting_1'),
            self.get_translated_message('bot_greeting_2'), 
            self.get_translated_message('bot_greeting_3')
        ]
    
    def get_emergency_messages(self) -> List[str]:
        """Get emergency alert messages in current language"""
        return [
            self.get_translated_message('emergency_alert_1'),
            self.get_translated_message('emergency_alert_2'),
            self.get_translated_message('emergency_alert_3'),
            self.get_translated_message('emergency_alert_4')
        ]

    def create_session(self, user_id: str = None) -> str:
        """Create a new chat session"""
        session_id = str(uuid.uuid4())
        if user_id is None:
            user_id = f"user_{session_id[:8]}"
        
        session = ChatSession(
            session_id=session_id,
            user_id=user_id,
            messages=[],
            current_state=self.STATES['GREETING']
        )
        
        self.sessions[session_id] = session
        
        # Add greeting messages in current language
        greeting_messages = self.get_greeting_messages()
        for msg in greeting_messages:
            self.add_bot_message(session_id, msg)
        
        return session_id

    def add_user_message(self, session_id: str, message: str) -> ChatMessage:
        """Add a user message to the session"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        chat_message = ChatMessage(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            sender='user',
            message=message
        )
        
        session.messages.append(chat_message)
        return chat_message

    def add_bot_message(self, session_id: str, message: str, message_type: str = 'text') -> ChatMessage:
        """Add a bot message to the session"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        chat_message = ChatMessage(
            id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            sender='bot',
            message=message,
            message_type=message_type
        )
        
        session.messages.append(chat_message)
        return chat_message

    def has_session(self, session_id: str) -> bool:
        """Check if session exists"""
        return session_id in self.sessions
    
    def process_user_input(self, session_id: str, user_input: str) -> List[ChatMessage]:
        """Process user input and return bot responses"""
        session = self.sessions.get(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        
        # Add user message
        self.add_user_message(session_id, user_input)
        
        responses = []
        
        # Process based on current state
        if session.current_state == self.STATES['GREETING']:
            responses = self.handle_symptom_input(session_id, user_input)
        elif session.current_state == self.STATES['SYMPTOM_COLLECTION']:
            responses = self.handle_additional_symptoms(session_id, user_input)
        elif session.current_state == self.STATES['FOLLOW_UP']:
            responses = self.handle_follow_up(session_id, user_input)
        else:
            # Default response
            responses = [self.add_bot_message(session_id, self.get_translated_message('default_response'))]
        
        return responses

    def handle_symptom_input(self, session_id: str, symptoms: str) -> List[ChatMessage]:
        """Handle initial symptom input and perform triage"""
        session = self.sessions[session_id]
        responses = []
        
        # Acknowledge the input
        responses.append(self.add_bot_message(session_id, self.get_translated_message('symptom_acknowledge')))
        
        # Perform triage assessment
        triage_result = self.triage_engine.triage(symptoms)
        # Convert triage result to dict with enum values serialized
        session.triage_result = self._serialize_triage_result(triage_result)
        
        # Generate response based on urgency
        if triage_result.urgency == UrgencyLevel.EMERGENCY:
            # Emergency response
            for msg in self.get_emergency_messages():
                responses.append(self.add_bot_message(session_id, msg))
            
            # Add specific emergency guidance
            responses.append(self.add_bot_message(session_id, self.get_translated_message('emergency_services')))
            
        else:
            # Non-emergency response
            responses.append(self.add_bot_message(session_id, self.get_translated_message('assessment_result', condition=triage_result.condition)))
            # Map urgency level to translated text
            urgency_key_map = {
                'emergency': 'emergency',
                'urgent': 'urgent', 
                'outpatient': 'outpatient',
                'self-care': 'self_care'
            }
            urgency_key = urgency_key_map.get(triage_result.urgency.value, 'outpatient')
            translated_urgency = self.get_translated_message(urgency_key)
            responses.append(self.add_bot_message(session_id, self.get_translated_message('urgency_level', urgency=translated_urgency)))
            
            # Add recommendations
            responses.append(self.add_bot_message(session_id, self.get_translated_message('recommendations_header')))
            for rec in triage_result.recommendations:
                responses.append(self.add_bot_message(session_id, f"• {rec}"))
            
            # Add next steps
            responses.append(self.add_bot_message(session_id, self.get_translated_message('next_steps_header')))
            for step in triage_result.next_steps:
                responses.append(self.add_bot_message(session_id, f"• {step}"))
        
        # Add helpful resources
        responses.append(self.add_bot_message(session_id, self.get_helpful_resources(triage_result.urgency)))
        
        # Update state
        session.current_state = self.STATES['FOLLOW_UP']
        
        # Ask for follow-up
        responses.append(self.add_bot_message(session_id, self.get_translated_message('followup_question')))
        
        return responses

    def handle_additional_symptoms(self, session_id: str, symptoms: str) -> List[ChatMessage]:
        """Handle additional symptom information"""
        # For now, treat as new symptom input
        return self.handle_symptom_input(session_id, symptoms)

    def handle_follow_up(self, session_id: str, user_input: str) -> List[ChatMessage]:
        """Handle follow-up questions and additional concerns"""
        session = self.sessions[session_id]
        responses = []
        
        user_input_lower = user_input.lower()
        
        # Check if user has more symptoms to discuss
        symptom_keywords = ['pain', 'ache', 'hurt', 'fever', 'cough', 'nausea', 'dizzy', 'tired', 'bleeding', 'rash']
        has_symptoms = any(keyword in user_input_lower for keyword in symptom_keywords)
        
        if has_symptoms or 'symptom' in user_input_lower:
            # Treat as new symptoms
            return self.handle_symptom_input(session_id, user_input)
        
        # Check for questions about the assessment
        elif any(word in user_input_lower for word in ['why', 'how', 'what', 'when', 'should i', 'can i']):
            responses.append(self.add_bot_message(session_id, 
                self.get_translated_message('followup_assessment_explanation')))
            
            if session.triage_result:
                urgency = session.triage_result['urgency']
                if urgency == 'emergency':
                    responses.append(self.add_bot_message(session_id, 
                        self.get_translated_message('followup_emergency_explanation')))
                elif urgency == 'urgent':
                    responses.append(self.add_bot_message(session_id, 
                        self.get_translated_message('followup_urgent_explanation')))
                else:
                    responses.append(self.add_bot_message(session_id, 
                        self.get_translated_message('followup_manageable_explanation')))
        
        # Check for thanks or goodbye
        elif any(word in user_input_lower for word in ['thank', 'bye', 'goodbye', 'no more', 'that\'s all']):
            responses.append(self.add_bot_message(session_id, 
                self.get_translated_message('followup_goodbye_1')))
            responses.append(self.add_bot_message(session_id, 
                self.get_translated_message('followup_goodbye_2')))
            session.current_state = self.STATES['COMPLETED']
        
        else:
            # General response
            responses.append(self.add_bot_message(session_id, 
                self.get_translated_message('followup_general_1')))
            responses.append(self.add_bot_message(session_id, 
                self.get_translated_message('followup_general_2')))
        
        return responses
    
    def _serialize_triage_result(self, triage_result) -> dict:
        """Convert triage result to JSON-serializable dictionary"""
        result_dict = asdict(triage_result)
        # Convert enum to string value
        if 'urgency' in result_dict and hasattr(result_dict['urgency'], 'value'):
            result_dict['urgency'] = result_dict['urgency'].value
        elif hasattr(triage_result, 'urgency') and hasattr(triage_result.urgency, 'value'):
            result_dict['urgency'] = triage_result.urgency.value
        return result_dict
    
    def get_helpful_resources(self, urgency_level: UrgencyLevel) -> str:
        """Get helpful resources based on urgency level"""
        if urgency_level == UrgencyLevel.EMERGENCY:
            return self.get_translated_message('helpful_emergency')
        elif urgency_level == UrgencyLevel.URGENT:
            return self.get_translated_message('helpful_urgent')
        elif urgency_level == UrgencyLevel.OUTPATIENT:
            return self.get_translated_message('helpful_outpatient')
        else:
            return self.get_translated_message('helpful_selfcare')

    def get_session_summary(self, session_id: str) -> Dict:
        """Get a summary of the chat session for clinician review"""
        session = self.sessions.get(session_id)
        if not session:
            return None
        
        # Extract user messages (symptoms)
        user_messages = [msg for msg in session.messages if msg.sender == 'user']
        symptoms_text = ' '.join([msg.message for msg in user_messages])
        
        return {
            'session_id': session.session_id,
            'user_id': session.user_id,
            'created_at': session.created_at.isoformat(),
            'symptoms': symptoms_text,
            'triage_result': session.triage_result,
            'message_count': len(session.messages),
            'status': session.current_state
        }

    def get_all_sessions(self) -> List[Dict]:
        """Get summaries of all sessions for clinician dashboard"""
        return [self.get_session_summary(sid) for sid in self.sessions.keys()]
