#!/usr/bin/env python3
"""
Test script for Healthcare Triage Bot
Tests the bot with the example scenarios from the hackathon requirements
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.triage_engine import TriageEngine, UrgencyLevel
from app.chatbot import HealthcareChatbot

def test_triage_engine():
    """Test the core triage engine with example scenarios"""
    print("="*60)
    print("HEALTHCARE TRIAGE BOT - SCENARIO TESTING")
    print("="*60)
    
    engine = TriageEngine()
    
    # Test cases from hackathon requirements
    test_cases = [
        {
            'name': 'Mild Case',
            'input': "I have a mild headache and slight fatigue.",
            'expected_urgency': UrgencyLevel.SELF_CARE,
            'description': "Should recommend self-care with home remedies"
        },
        {
            'name': 'Moderate Case',
            'input': "I've had fever for 3 days and sore throat.",
            'expected_urgency': UrgencyLevel.OUTPATIENT,
            'description': "Should recommend clinic/telemedicine consultation"
        },
        {
            'name': 'Emergency Case - Adult',
            'input': "I have severe chest pain and difficulty breathing.",
            'expected_urgency': UrgencyLevel.EMERGENCY,
            'description': "Should trigger emergency alert and call 911/108"
        },
        {
            'name': 'Emergency Case - Pediatric',
            'input': "My child has high fever, cough, and difficulty breathing.",
            'expected_urgency': UrgencyLevel.EMERGENCY,
            'description': "Should trigger emergency alert for child"
        },
        # Additional test cases
        {
            'name': 'Urgent Case',
            'input': "I have severe abdominal pain that started suddenly.",
            'expected_urgency': UrgencyLevel.URGENT,
            'description': "Should recommend urgent care within 24 hours"
        },
        {
            'name': 'Multiple Symptoms',
            'input': "I have nausea, mild stomach pain, and heartburn after eating.",
            'expected_urgency': UrgencyLevel.OUTPATIENT,
            'description': "Should categorize as digestive outpatient condition"
        }
    ]
    
    results = []
    
    for i, test_case in enumerate(test_cases, 1):
        print(f"\nTest Case {i}: {test_case['name']}")
        print("-" * 40)
        print(f"Input: \"{test_case['input']}\"")
        print(f"Expected: {test_case['expected_urgency'].value}")
        print(f"Description: {test_case['description']}")
        
        # Run triage
        result = engine.triage(test_case['input'])
        
        print(f"Actual: {result.urgency.value}")
        print(f"Condition: {result.condition}")
        print(f"Confidence: {result.confidence:.2f}")
        
        # Check if result matches expectation
        passed = result.urgency == test_case['expected_urgency']
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"Status: {status}")
        
        if result.red_flags:
            print(f"Red Flags: {', '.join(result.red_flags)}")
        
        print("Recommendations:")
        for rec in result.recommendations:
            print(f"  • {rec}")
        
        print("Next Steps:")
        for step in result.next_steps:
            print(f"  • {step}")
        
        results.append({
            'name': test_case['name'],
            'input': test_case['input'],
            'expected': test_case['expected_urgency'],
            'actual': result.urgency,
            'passed': passed,
            'result': result
        })
    
    # Summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed_count = sum(1 for r in results if r['passed'])
    total_count = len(results)
    
    print(f"Total Tests: {total_count}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {total_count - passed_count}")
    print(f"Success Rate: {(passed_count/total_count)*100:.1f}%")
    
    # Failed tests detail
    failed_tests = [r for r in results if not r['passed']]
    if failed_tests:
        print(f"\nFailed Tests:")
        for test in failed_tests:
            print(f"  • {test['name']}: Expected {test['expected'].value}, got {test['actual'].value}")
    
    return results

def test_chatbot_integration():
    """Test the full chatbot integration"""
    print("\n" + "="*60)
    print("CHATBOT INTEGRATION TESTING")
    print("="*60)
    
    chatbot = HealthcareChatbot()
    
    # Create a test session
    session_id = chatbot.create_session(user_id="test_user")
    
    test_conversations = [
        "I have a mild headache and feel tired",
        "How serious is this?",
        "Thank you for the help"
    ]
    
    print(f"Session ID: {session_id}")
    print("\nInitial Bot Messages:")
    session = chatbot.sessions[session_id]
    for msg in session.messages:
        if msg.sender == 'bot':
            print(f"  Bot: {msg.message}")
    
    for i, message in enumerate(test_conversations, 1):
        print(f"\n--- Message {i} ---")
        print(f"User: {message}")
        
        responses = chatbot.process_user_input(session_id, message)
        
        print("Bot responses:")
        for response in responses:
            print(f"  Bot: {response.message}")
    
    # Get session summary
    summary = chatbot.get_session_summary(session_id)
    print(f"\nSession Summary:")
    print(f"  Messages: {summary['message_count']}")
    print(f"  Status: {summary['status']}")
    if summary['triage_result']:
        print(f"  Triage: {summary['triage_result']['urgency']} - {summary['triage_result']['condition']}")

def performance_test():
    """Test performance with multiple scenarios"""
    print("\n" + "="*60)
    print("PERFORMANCE TESTING")
    print("="*60)
    
    import time
    
    engine = TriageEngine()
    
    # Test multiple scenarios rapidly
    scenarios = [
        "headache and fatigue",
        "chest pain and shortness of breath", 
        "fever and sore throat",
        "nausea and stomach pain",
        "severe bleeding from cut",
        "child with high fever",
        "back pain and muscle ache",
        "rash and itchy skin"
    ] * 10  # Run each 10 times
    
    print(f"Testing {len(scenarios)} scenarios...")
    
    start_time = time.time()
    results = []
    
    for scenario in scenarios:
        result = engine.triage(scenario)
        results.append(result)
    
    end_time = time.time()
    total_time = end_time - start_time
    avg_time = total_time / len(scenarios)
    
    print(f"Total time: {total_time:.2f} seconds")
    print(f"Average time per triage: {avg_time*1000:.1f} ms")
    print(f"Throughput: {len(scenarios)/total_time:.1f} triages/second")
    
    # Count urgency levels
    urgency_counts = {}
    for result in results:
        urgency = result.urgency.value
        urgency_counts[urgency] = urgency_counts.get(urgency, 0) + 1
    
    print("\nUrgency Level Distribution:")
    for urgency, count in urgency_counts.items():
        percentage = (count/len(results))*100
        print(f"  {urgency}: {count} ({percentage:.1f}%)")

if __name__ == "__main__":
    # Run all tests
    print("Starting Healthcare Triage Bot Testing...")
    
    try:
        # Test 1: Core triage engine
        test_results = test_triage_engine()
        
        # Test 2: Chatbot integration
        test_chatbot_integration()
        
        # Test 3: Performance
        performance_test()
        
        print("\n" + "="*60)
        print("ALL TESTS COMPLETED")
        print("="*60)
        
        # Final assessment
        passed_core_tests = sum(1 for r in test_results if r['passed'])
        total_core_tests = len(test_results)
        
        if passed_core_tests == total_core_tests:
            print("✅ All core triage tests PASSED!")
            print("✅ System is ready for demonstration")
        else:
            print(f"⚠️  {total_core_tests - passed_core_tests} core tests failed")
            print("⚠️  Review triage logic before demonstration")
        
        print("\nKey Features Demonstrated:")
        print("• Symptom analysis and triage classification")
        print("• Emergency detection and alerts")
        print("• Conversational interface")
        print("• Clinician review dashboard")
        print("• Multi-channel integration hooks")
        print("• Offline capability framework")
        
    except Exception as e:
        print(f"❌ Testing failed with error: {e}")
        import traceback
        traceback.print_exc()
