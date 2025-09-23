// Clinician Dashboard JavaScript

class ClinicianDashboard {
    constructor() {
        this.sessions = [];
        this.filteredSessions = [];
        this.currentSessionId = null;
        
        this.init();
    }

    init() {
        // Event listeners
        document.getElementById('refreshButton').addEventListener('click', () => this.loadSessions());
        document.getElementById('urgencyFilter').addEventListener('change', () => this.filterSessions());
        document.getElementById('searchInput').addEventListener('input', () => this.filterSessions());
        document.getElementById('exportSessionButton').addEventListener('click', () => this.exportCurrentSession());
        
        // Load initial data
        this.loadSessions();
        
        // Auto-refresh every 30 seconds
        setInterval(() => this.loadSessions(), 30000);
    }

    async loadSessions() {
        try {
            const response = await fetch('/api/clinician/sessions');
            const data = await response.json();
            
            if (data.success) {
                this.sessions = data.sessions;
                this.updateStatistics();
                this.filterSessions();
            } else {
                this.showError('Failed to load sessions: ' + data.error);
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    updateStatistics() {
        let totalSessions = this.sessions.length;
        let emergencyCases = 0;
        let urgentCases = 0;
        let selfCareCases = 0;
        
        this.sessions.forEach(session => {
            if (session.triage_result) {
                const urgency = session.triage_result.urgency;
                switch (urgency) {
                    case 'emergency':
                        emergencyCases++;
                        break;
                    case 'urgent':
                        urgentCases++;
                        break;
                    case 'self-care':
                        selfCareCases++;
                        break;
                }
            }
        });

        document.getElementById('totalSessions').textContent = totalSessions;
        document.getElementById('emergencyCases').textContent = emergencyCases;
        document.getElementById('urgentCases').textContent = urgentCases;
        document.getElementById('selfCareCases').textContent = selfCareCases;
    }

    filterSessions() {
        const urgencyFilter = document.getElementById('urgencyFilter').value;
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        
        this.filteredSessions = this.sessions.filter(session => {
            // Filter by urgency
            if (urgencyFilter && session.triage_result) {
                if (session.triage_result.urgency !== urgencyFilter) {
                    return false;
                }
            }
            
            // Filter by search term
            if (searchTerm) {
                const searchableText = [
                    session.session_id,
                    session.user_id,
                    session.symptoms || '',
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            return true;
        });
        
        this.displaySessions();
    }

    displaySessions() {
        const loadingElement = document.getElementById('sessionsLoading');
        const containerElement = document.getElementById('sessionsContainer');
        const noSessionsElement = document.getElementById('noSessions');
        
        loadingElement.classList.add('d-none');
        
        if (this.filteredSessions.length === 0) {
            containerElement.classList.add('d-none');
            noSessionsElement.classList.remove('d-none');
            return;
        }
        
        noSessionsElement.classList.add('d-none');
        containerElement.classList.remove('d-none');
        
        // Sort sessions by created date (newest first)
        const sortedSessions = [...this.filteredSessions].sort((a, b) => 
            new Date(b.created_at) - new Date(a.created_at)
        );
        
        const sessionsHtml = sortedSessions.map(session => this.createSessionCard(session)).join('');
        containerElement.innerHTML = sessionsHtml;
        
        // Add click event listeners to session cards
        containerElement.querySelectorAll('.session-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const sessionId = e.currentTarget.getAttribute('data-session-id');
                this.viewSessionDetail(sessionId);
            });
        });
    }

    createSessionCard(session) {
        const createdDate = new Date(session.created_at).toLocaleString();
        const urgency = session.triage_result ? session.triage_result.urgency : 'unknown';
        const urgencyBadgeClass = this.getUrgencyBadgeClass(urgency);
        const urgencyIcon = this.getUrgencyIcon(urgency);
        
        // Truncate symptoms for display
        const symptoms = session.symptoms ? 
            (session.symptoms.length > 100 ? session.symptoms.substring(0, 100) + '...' : session.symptoms) 
            : 'No symptoms recorded';
        
        return `
            <div class="session-card card mb-3" data-session-id="${session.session_id}" style="cursor: pointer;">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title mb-1">
                                <i class="fas fa-user me-2" aria-hidden="true"></i>
                                ${session.user_id}
                                <span class="badge ${urgencyBadgeClass} ms-2">
                                    ${urgencyIcon} ${urgency.toUpperCase()}
                                </span>
                            </h6>
                            <p class="card-text text-muted mb-2">
                                <strong>Symptoms:</strong> ${symptoms}
                            </p>
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1" aria-hidden="true"></i>
                                ${createdDate}
                                <span class="ms-3">
                                    <i class="fas fa-comments me-1" aria-hidden="true"></i>
                                    ${session.message_count} messages
                                </span>
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="status-badge badge bg-secondary mb-2">
                                ${session.status}
                            </div>
                            <br>
                            <small class="text-muted">
                                Session: ${session.session_id.substring(0, 8)}...
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getUrgencyBadgeClass(urgency) {
        switch (urgency) {
            case 'emergency': return 'bg-danger';
            case 'urgent': return 'bg-warning text-dark';
            case 'outpatient': return 'bg-info';
            case 'self-care': return 'bg-success';
            default: return 'bg-secondary';
        }
    }

    getUrgencyIcon(urgency) {
        switch (urgency) {
            case 'emergency': return '<i class="fas fa-exclamation-triangle" aria-hidden="true"></i>';
            case 'urgent': return '<i class="fas fa-clock" aria-hidden="true"></i>';
            case 'outpatient': return '<i class="fas fa-hospital" aria-hidden="true"></i>';
            case 'self-care': return '<i class="fas fa-home" aria-hidden="true"></i>';
            default: return '<i class="fas fa-question" aria-hidden="true"></i>';
        }
    }

    async viewSessionDetail(sessionId) {
        this.currentSessionId = sessionId;
        const modal = new bootstrap.Modal(document.getElementById('sessionModal'));
        
        // Show loading state
        document.getElementById('sessionDetailLoading').classList.remove('d-none');
        document.getElementById('sessionDetailContent').classList.add('d-none');
        
        modal.show();
        
        try {
            const response = await fetch(`/api/clinician/session/${sessionId}`);
            const data = await response.json();
            
            if (data.success) {
                this.displaySessionDetail(data.session);
            } else {
                this.showError('Failed to load session detail: ' + data.error);
            }
        } catch (error) {
            this.showError('Network error: ' + error.message);
        }
    }

    displaySessionDetail(session) {
        document.getElementById('sessionDetailLoading').classList.add('d-none');
        document.getElementById('sessionDetailContent').classList.remove('d-none');
        
        const modalTitle = document.getElementById('sessionModalLabel');
        modalTitle.innerHTML = `
            <i class="fas fa-eye me-2" aria-hidden="true"></i>
            Session Details - ${session.user_id}
        `;
        
        const content = document.getElementById('sessionDetailContent');
        
        let triageHtml = '';
        if (session.triage_result) {
            const result = session.triage_result;
            const urgencyBadgeClass = this.getUrgencyBadgeClass(result.urgency);
            
            triageHtml = `
                <div class="card mb-3">
                    <div class="card-header">
                        <h6><i class="fas fa-stethoscope me-2" aria-hidden="true"></i>Triage Assessment</h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <p><strong>Urgency Level:</strong> 
                                   <span class="badge ${urgencyBadgeClass}">${result.urgency.toUpperCase()}</span>
                                </p>
                                <p><strong>Condition:</strong> ${result.condition}</p>
                                <p><strong>Confidence:</strong> ${(result.confidence * 100).toFixed(1)}%</p>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Red Flags:</strong></p>
                                <ul class="list-unstyled">
                                    ${result.red_flags.length > 0 
                                        ? result.red_flags.map(flag => `<li class="text-danger"><i class="fas fa-exclamation-triangle me-1" aria-hidden="true"></i>${flag}</li>`).join('')
                                        : '<li class="text-muted"><i class="fas fa-check me-1" aria-hidden="true"></i>None detected</li>'
                                    }
                                </ul>
                            </div>
                        </div>
                        
                        <div class="row mt-3">
                            <div class="col-md-6">
                                <p><strong>Recommendations:</strong></p>
                                <ul class="list-unstyled">
                                    ${result.recommendations.map(rec => `<li><i class="fas fa-chevron-right me-1" aria-hidden="true"></i>${rec}</li>`).join('')}
                                </ul>
                            </div>
                            <div class="col-md-6">
                                <p><strong>Next Steps:</strong></p>
                                <ul class="list-unstyled">
                                    ${result.next_steps.map(step => `<li><i class="fas fa-arrow-right me-1" aria-hidden="true"></i>${step}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        
        const messagesHtml = `
            <div class="card">
                <div class="card-header">
                    <h6><i class="fas fa-comments me-2" aria-hidden="true"></i>Conversation History</h6>
                </div>
                <div class="card-body" style="max-height: 400px; overflow-y: auto;">
                    ${session.messages.map(msg => this.createMessageDetailHtml(msg)).join('')}
                </div>
            </div>
        `;
        
        content.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <p><strong>Session ID:</strong> ${session.session_id}</p>
                    <p><strong>User ID:</strong> ${session.user_id}</p>
                </div>
                <div class="col-md-6">
                    <p><strong>Created:</strong> ${new Date(session.created_at).toLocaleString()}</p>
                    <p><strong>Status:</strong> <span class="badge bg-secondary">${session.current_state}</span></p>
                </div>
            </div>
            
            ${triageHtml}
            ${messagesHtml}
        `;
    }

    createMessageDetailHtml(message) {
        const timestamp = new Date(message.timestamp).toLocaleTimeString();
        const senderClass = message.sender === 'user' ? 'bg-primary text-white' : 'bg-light';
        const alignClass = message.sender === 'user' ? 'text-end' : '';
        const icon = message.sender === 'user' ? '<i class="fas fa-user me-1" aria-hidden="true"></i>' : '<i class="fas fa-robot me-1" aria-hidden="true"></i>';
        
        return `
            <div class="mb-3 ${alignClass}">
                <div class="d-inline-block p-2 rounded ${senderClass}" style="max-width: 80%;">
                    <small class="d-block mb-1">
                        ${icon}${message.sender === 'user' ? 'Patient' : 'Bot'} 
                        <span class="ms-2 opacity-75">${timestamp}</span>
                    </small>
                    <div>${message.message}</div>
                </div>
            </div>
        `;
    }

    exportCurrentSession() {
        if (!this.currentSessionId) return;
        
        const session = this.sessions.find(s => s.session_id === this.currentSessionId);
        if (!session) return;
        
        // Create export data
        const exportData = {
            session_id: session.session_id,
            user_id: session.user_id,
            created_at: session.created_at,
            symptoms: session.symptoms,
            triage_result: session.triage_result,
            conversation: session.messages
        };
        
        // Download as JSON file
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `session_${session.session_id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showError(message) {
        // You could implement a toast notification system here
        console.error('Dashboard Error:', message);
        
        // Simple alert for now
        alert('Error: ' + message);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new ClinicianDashboard();
});
