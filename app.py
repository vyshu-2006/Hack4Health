from flask import Flask, render_template, request, jsonify, session, make_response
from datetime import datetime
import os
import sys
sys.path.append(os.path.dirname(__file__))

from app.chatbot import HealthcareChatbot
from app.triage_engine import UrgencyLevel
from app.voice_assistant import setup_voice_routes
from app.i18n_system import setup_i18n_routes, i18n

app = Flask(__name__)
app.secret_key = 'healthcare-triage-secret-key-2023'  # Change in production

# Configure session security
app.config['SESSION_COOKIE_SECURE'] = not app.debug  # Secure cookies in production
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'

# Configure security headers and UTF-8
@app.after_request
def after_request(response):
    # Ensure UTF-8 content-type
    if response.content_type.startswith('text/html'):
        response.content_type = 'text/html; charset=utf-8'
    elif response.content_type.startswith('application/json'):
        response.content_type = 'application/json; charset=utf-8'
    
    # Security headers
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'DENY'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    
    # Content Security Policy
    csp = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
        "font-src 'self' https://cdnjs.cloudflare.com; "
        "img-src 'self' data: https:; "
        "connect-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com;"
    )
    response.headers['Content-Security-Policy'] = csp
    
    # Secure cookie settings in production
    if not app.debug:
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        
        # Set secure flag on cookies
        if 'Set-Cookie' in response.headers:
            cookies = response.headers.getlist('Set-Cookie')
            response.headers.clear()
            for cookie in cookies:
                if 'Secure' not in cookie:
                    cookie += '; Secure'
                if 'SameSite' not in cookie:
                    cookie += '; SameSite=Strict'
                response.headers.add('Set-Cookie', cookie)
    
    return response

# Initialize the chatbot
chatbot = HealthcareChatbot()

@app.route('/')
def index():
    """Main chat interface"""
    return render_template('index.html')

@app.route('/clinician')
def clinician_dashboard():
    """Clinician review dashboard"""
    return render_template('clinician.html')

@app.route('/debug')
def debug_language():
    """Debug page for language switching"""
    from flask import send_from_directory
    import os
    return send_from_directory(os.getcwd(), 'debug_language.html')

@app.route('/test')
def test_language():
    """Test page for language switching"""
    from flask import send_from_directory
    import os
    return send_from_directory(os.getcwd(), 'test_language.html')

@app.route('/api/start_session', methods=['POST'])
def start_session():
    """Start a new chat session"""
    try:
        # Set chatbot language from session
        language = session.get('language', 'en')
        chatbot.set_language(language)
        
        session_id = chatbot.create_session()
        session['session_id'] = session_id
        
        # Get initial greeting messages
        chat_session = chatbot.sessions[session_id]
        messages = []
        for msg in chat_session.messages:
            messages.append({
                'id': msg.id,
                'sender': msg.sender,
                'message': msg.message,
                'timestamp': msg.timestamp.isoformat(),
                'message_type': msg.message_type
            })
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'messages': messages
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/send_message', methods=['POST'])
def send_message():
    """Send a message to the chatbot"""
    try:
        # Set chatbot language from session
        language = session.get('language', 'en')
        chatbot.set_language(language)
        
        data = request.get_json()
        user_message = data.get('message', '').strip()
        session_id = session.get('session_id')
        
        if not session_id:
            return jsonify({'success': False, 'error': 'No active session', 'needs_new_session': True}), 400
        
        # Check if session exists in chatbot, if not create a new one
        if not chatbot.has_session(session_id):
            # Session was lost, create a new one and return error to trigger frontend restart
            return jsonify({
                'success': False, 
                'error': f'Session {session_id} not found', 
                'needs_new_session': True
            }), 400
        
        if not user_message:
            return jsonify({'success': False, 'error': 'Empty message'}), 400
        
        # Process the message
        bot_responses = chatbot.process_user_input(session_id, user_message)
        
        # Format response messages
        messages = []
        for response in bot_responses:
            messages.append({
                'id': response.id,
                'sender': response.sender,
                'message': response.message,
                'timestamp': response.timestamp.isoformat(),
                'message_type': response.message_type
            })
        
        # Check if this was an emergency
        chat_session = chatbot.sessions[session_id]
        is_emergency = (chat_session.triage_result and 
                       chat_session.triage_result.get('urgency') == UrgencyLevel.EMERGENCY.value)
        
        return jsonify({
            'success': True,
            'messages': messages,
            'is_emergency': is_emergency
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/session_history')
def get_session_history():
    """Get the complete message history for the current session"""
    try:
        # Set chatbot language from session
        language = session.get('language', 'en')
        chatbot.set_language(language)
        
        session_id = session.get('session_id')
        if not session_id or not chatbot.has_session(session_id):
            return jsonify({'success': False, 'error': 'No active session'}), 400
        
        chat_session = chatbot.sessions[session_id]
        messages = []
        
        for msg in chat_session.messages:
            messages.append({
                'id': msg.id,
                'sender': msg.sender,
                'message': msg.message,
                'timestamp': msg.timestamp.isoformat(),
                'message_type': msg.message_type
            })
        
        return jsonify({
            'success': True,
            'messages': messages,
            'triage_result': chat_session.triage_result
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clinician/sessions')
def get_all_sessions():
    """Get all chat sessions for clinician review"""
    try:
        sessions_summary = chatbot.get_all_sessions()
        return jsonify({
            'success': True,
            'sessions': sessions_summary
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clinician/session/<session_id>')
def get_session_detail(session_id):
    """Get detailed session information for clinician review"""
    try:
        if session_id not in chatbot.sessions:
            return jsonify({'success': False, 'error': 'Session not found'}), 404
        
        chat_session = chatbot.sessions[session_id]
        
        # Format all messages
        messages = []
        for msg in chat_session.messages:
            messages.append({
                'id': msg.id,
                'sender': msg.sender,
                'message': msg.message,
                'timestamp': msg.timestamp.isoformat(),
                'message_type': msg.message_type
            })
        
        session_detail = {
            'session_id': chat_session.session_id,
            'user_id': chat_session.user_id,
            'created_at': chat_session.created_at.isoformat(),
            'current_state': chat_session.current_state,
            'triage_result': chat_session.triage_result,
            'messages': messages
        }
        
        return jsonify({
            'success': True,
            'session': session_detail
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


# Setup voice assistant routes
setup_voice_routes(app)

# Setup internationalization routes
setup_i18n_routes(app)

# Add favicon route to prevent 404
@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
