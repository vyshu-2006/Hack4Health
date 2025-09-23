import re
import json
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum
from .i18n_system import i18n

class UrgencyLevel(Enum):
    SELF_CARE = "self-care"
    OUTPATIENT = "outpatient"
    URGENT = "urgent"
    EMERGENCY = "emergency"

@dataclass
class TriageResult:
    urgency: UrgencyLevel
    condition: str
    confidence: float
    recommendations: List[str]
    next_steps: List[str]
    red_flags: List[str]

class TriageEngine:
    def __init__(self, language='en'):
        self.language = language
        # Emergency red flags that always escalate to emergency
        self.red_flags = {
            'chest_pain': [
                'chest pain', 'chest tightness', 'crushing chest pain',
                'squeezing chest', 'pressure in chest'
            ],
            'breathing': [
                'difficulty breathing', 'shortness of breath', 'can\'t breathe',
                'gasping for air', 'wheezing severely'
            ],
            'neurological': [
                'sudden weakness', 'facial drooping', 'slurred speech',
                'severe headache', 'confusion', 'loss of consciousness',
                'seizure', 'stroke symptoms'
            ],
            'bleeding': [
                'severe bleeding', 'uncontrolled bleeding', 'heavy bleeding',
                'bleeding that won\'t stop'
            ],
            'trauma': [
                'head injury', 'severe injury', 'broken bone visible',
                'deep cut', 'severe burn'
            ],
            'allergic': [
                'severe allergic reaction', 'anaphylaxis', 'swollen throat',
                'difficulty swallowing due to swelling'
            ],
            'pediatric_emergency': [
                'infant fever over 100.4', 'baby not responding',
                'child difficulty breathing', 'severe dehydration in child'
            ]
        }
        
        # Urgent conditions requiring clinic visit within 24 hours
        self.urgent_conditions = {
            'infection': [
                'high fever', 'fever over 101', 'fever for more than 3 days',
                'severe sore throat', 'difficulty swallowing'
            ],
            'pain': [
                'severe abdominal pain', 'intense pain', 'unbearable pain',
                'sudden severe pain'
            ],
            'respiratory': [
                'persistent cough with fever', 'coughing up blood',
                'chest congestion with fever'
            ],
            'pediatric_urgent': [
                'child fever over 102', 'child vomiting repeatedly',
                'child severe cough', 'child rash with fever'
            ]
        }
        
        # Outpatient conditions for telemedicine or clinic visit
        self.outpatient_conditions = {
            'mild_infection': [
                'sore throat', 'mild fever', 'runny nose', 'congestion',
                'cough without fever', 'ear pain'
            ],
            'digestive': [
                'nausea', 'mild stomach pain', 'indigestion', 'heartburn'
            ],
            'skin': [
                'rash', 'itchy skin', 'minor cut', 'bruise'
            ],
            'musculoskeletal': [
                'muscle ache', 'joint pain', 'back pain', 'strain'
            ]
        }
        
        # Self-care conditions
        self.self_care_conditions = {
            'minor': [
                'mild headache', 'fatigue', 'tired', 'stress',
                'minor ache', 'slight discomfort'
            ]
        }

    def extract_symptoms(self, text: str) -> List[str]:
        """Extract symptoms from natural language input"""
        text = text.lower().strip()
        
        # Handle common voice recognition errors and variations
        text = self._normalize_voice_input(text)
        
        # Common symptom patterns
        symptom_patterns = [
            r'(pain|ache|hurt|sore|tender|pane|acking)',
            r'(fever|temperature|hot|chills|feverish|fevers)',
            r'(cough|coughing|coffing|kogh)',
            r'(nausea|vomit|throw up|throwing up|nauseous)',
            r'(headache|head pain|head ache|migraine)',
            r'(breathing|breath|breathe|shortness of breath)',
            r'(bleeding|blood|hemorrhage)',
            r'(rash|itchy|itch|skin irritation)',
            r'(dizzy|dizziness|lightheaded|vertigo)',
            r'(weakness|weak|tired|fatigue|exhausted)'
        ]
        
        symptoms = []
        for pattern in symptom_patterns:
            matches = re.findall(pattern, text)
            symptoms.extend(matches)
        
        # Also return the full text for comprehensive analysis
        return [text] + symptoms
    
    def _normalize_voice_input(self, text: str) -> str:
        """Normalize voice input to handle common speech recognition errors"""
        # Common speech-to-text errors for medical terms
        corrections = {
            'chest pane': 'chest pain',
            'chest pain': 'chest pain',
            'difficultly breathing': 'difficulty breathing',
            'shortness of breathe': 'shortness of breath',
            'head egg': 'headache',
            'head ache': 'headache',
            'stomach egg': 'stomach ache',
            'feel dizzy': 'dizzy',
            'throwing up': 'vomiting',
            'can\'t breath': 'difficulty breathing',
            'cannot breath': 'difficulty breathing',
            'high temperature': 'fever',
            'running temperature': 'fever',
            'blood pressure': 'blood pressure',
            'heart attack': 'chest pain',
            'stroke symptoms': 'sudden weakness',
        }
        
        # Apply corrections
        for error, correction in corrections.items():
            text = text.replace(error, correction)
        
        return text
    
    def set_language(self, language: str):
        """Set language for triage responses"""
        self.language = language
    
    def get_translated_text(self, key: str, **kwargs) -> str:
        """Get translated text for current language"""
        return i18n.get_translation(key, self.language, **kwargs)

    def check_red_flags(self, symptoms_text: str) -> Tuple[bool, List[str]]:
        """Check for emergency red flags"""
        symptoms_text = symptoms_text.lower()
        found_flags = []
        
        for category, flags in self.red_flags.items():
            for flag in flags:
                if flag.lower() in symptoms_text:
                    found_flags.append(flag)
        
        return len(found_flags) > 0, found_flags

    def assess_urgency(self, symptoms_text: str) -> Tuple[UrgencyLevel, str, float]:
        """Assess the urgency level of symptoms"""
        symptoms_text = symptoms_text.lower()
        
        # Check for red flags first
        has_red_flags, red_flags = self.check_red_flags(symptoms_text)
        if has_red_flags:
            return UrgencyLevel.EMERGENCY, self.get_translated_text('condition_emergency'), 0.9
        
        # Check urgent conditions
        for condition, keywords in self.urgent_conditions.items():
            for keyword in keywords:
                if keyword.lower() in symptoms_text:
                    return UrgencyLevel.URGENT, self.get_translated_text(f'condition_urgent_{condition}'), 0.8
        
        # Check outpatient conditions
        for condition, keywords in self.outpatient_conditions.items():
            for keyword in keywords:
                if keyword.lower() in symptoms_text:
                    return UrgencyLevel.OUTPATIENT, self.get_translated_text(f'condition_outpatient_{condition}'), 0.7
        
        # Check self-care conditions
        for condition, keywords in self.self_care_conditions.items():
            for keyword in keywords:
                if keyword.lower() in symptoms_text:
                    return UrgencyLevel.SELF_CARE, self.get_translated_text(f'condition_selfcare_{condition}'), 0.6
        
        # Default to outpatient if unsure
        return UrgencyLevel.OUTPATIENT, self.get_translated_text('condition_general'), 0.5

    def generate_recommendations(self, urgency: UrgencyLevel, condition: str, red_flags: List[str]) -> Tuple[List[str], List[str]]:
        """Generate recommendations and next steps based on urgency"""
        recommendations = []
        next_steps = []
        
        if urgency == UrgencyLevel.EMERGENCY:
            recommendations = [
                self.get_translated_text('emergency_rec_1'),
                self.get_translated_text('emergency_rec_2'),
                self.get_translated_text('emergency_rec_3')
            ]
            next_steps = [
                self.get_translated_text('emergency_step_1'),
                self.get_translated_text('emergency_step_2'),
                self.get_translated_text('emergency_step_3')
            ]
        
        elif urgency == UrgencyLevel.URGENT:
            recommendations = [
                self.get_translated_text('urgent_rec_1'),
                self.get_translated_text('urgent_rec_2'),
                self.get_translated_text('urgent_rec_3')
            ]
            next_steps = [
                self.get_translated_text('urgent_step_1'),
                self.get_translated_text('urgent_step_2'),
                self.get_translated_text('urgent_step_3'),
                self.get_translated_text('urgent_step_4')
            ]
        
        elif urgency == UrgencyLevel.OUTPATIENT:
            recommendations = [
                self.get_translated_text('outpatient_rec_1'),
                self.get_translated_text('outpatient_rec_2'),
                self.get_translated_text('outpatient_rec_3')
            ]
            next_steps = [
                self.get_translated_text('outpatient_step_1'),
                self.get_translated_text('outpatient_step_2'),
                self.get_translated_text('outpatient_step_3'),
                self.get_translated_text('outpatient_step_4')
            ]
        
        else:  # SELF_CARE
            recommendations = [
                self.get_translated_text('selfcare_rec_1'),
                self.get_translated_text('selfcare_rec_2'),
                self.get_translated_text('selfcare_rec_3')
            ]
            next_steps = [
                self.get_translated_text('selfcare_step_1'),
                self.get_translated_text('selfcare_step_2'),
                self.get_translated_text('selfcare_step_3'),
                self.get_translated_text('selfcare_step_4')
            ]
        
        return recommendations, next_steps

    def triage(self, symptoms_text: str) -> TriageResult:
        """Main triage function that processes symptoms and returns assessment"""
        # Extract symptoms
        symptoms = self.extract_symptoms(symptoms_text)
        
        # Check for red flags
        has_red_flags, red_flags = self.check_red_flags(symptoms_text)
        
        # Assess urgency
        urgency, condition, confidence = self.assess_urgency(symptoms_text)
        
        # Generate recommendations
        recommendations, next_steps = self.generate_recommendations(urgency, condition, red_flags)
        
        return TriageResult(
            urgency=urgency,
            condition=condition,
            confidence=confidence,
            recommendations=recommendations,
            next_steps=next_steps,
            red_flags=red_flags
        )

# Test the engine with example scenarios
if __name__ == "__main__":
    engine = TriageEngine()
    
    test_cases = [
        "I have a mild headache and slight fatigue.",
        "I've had fever for 3 days and sore throat.",
        "I have severe chest pain and difficulty breathing.",
        "My child has high fever, cough, and difficulty breathing."
    ]
    
    for case in test_cases:
        print(f"\nInput: {case}")
        result = engine.triage(case)
        print(f"Urgency: {result.urgency.value}")
        print(f"Condition: {result.condition}")
        print(f"Recommendations: {result.recommendations}")
        print(f"Next steps: {result.next_steps}")
        if result.red_flags:
            print(f"Red flags: {result.red_flags}")
