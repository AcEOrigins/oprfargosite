// Events Management Functions

// Load events from database
async function loadEvents() {
    try {
        const response = await fetch('/php/api.php?action=get_events');
        const events = await response.json();
        return Array.isArray(events) ? events : [];
    } catch (error) {
        console.error('Error loading events:', error);
        return [];
    }
}

// Save events to localStorage
function saveEvents(events) {
    localStorage.setItem('oprFargoEvents', JSON.stringify(events));
}

// Format date for display
function formatEventDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const dateStr = date.toLocaleDateString('en-US', options);
    
    const timeStr = date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
    });
    
    return {
        full: `${dateStr} at ${timeStr}`,
        day: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        time: timeStr
    };
}

// Calculate countdown
function calculateCountdown(dateString) {
    const eventDate = new Date(dateString);
    const now = new Date();
    const diff = eventDate - now;
    
    if (diff <= 0) {
        return null; // Event is past
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return { days, hours, minutes, seconds };
}

// Display events on main page
async function displayEvents() {
    const events = await loadEvents();
    const eventsList = document.getElementById('eventsList');
    
    if (!eventsList) return;
    
    if (events.length === 0) {
        eventsList.innerHTML = '<div class="empty-state">No upcoming events scheduled. Check back soon!</div>';
        return;
    }
    
    // Sort events by date (soonest first)
    const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    
    eventsList.innerHTML = sortedEvents.map((event, index) => {
        const dateInfo = formatEventDate(event.date);
        const countdown = calculateCountdown(event.date);
        const isPast = countdown === null;
        
        let countdownHtml = '';
        if (!isPast) {
            countdownHtml = `
                <div class="event-countdown">
                    ${countdown.days > 0 ? `
                        <div class="countdown-item">
                            <div class="countdown-value">${countdown.days}</div>
                            <div class="countdown-label">Days</div>
                        </div>
                    ` : ''}
                    <div class="countdown-item">
                        <div class="countdown-value">${countdown.hours}</div>
                        <div class="countdown-label">Hours</div>
                    </div>
                    <div class="countdown-item">
                        <div class="countdown-value">${countdown.minutes}</div>
                        <div class="countdown-label">Minutes</div>
                    </div>
                </div>
            `;
        }
        
        return `
            <div class="event-card ${isPast ? 'event-past' : ''}">
                <div class="event-header">
                    <div>
                        <h3 class="event-title">${escapeHtml(event.title)}</h3>
                        <div class="event-date-time">${dateInfo.full}</div>
                    </div>
                    <div class="event-date">
                        <div>
                            <div class="event-date-day">${dateInfo.day}</div>
                            <div class="event-date-month">${dateInfo.month}</div>
                        </div>
                    </div>
                </div>
                ${event.description ? `<div class="event-description">${escapeHtml(event.description)}</div>` : ''}
                ${countdownHtml}
            </div>
        `;
    }).join('');
    
    // Update countdown every minute for active events
    if (sortedEvents.some(e => calculateCountdown(e.date) !== null)) {
        setTimeout(async () => {
            await displayEvents();
        }, 60000); // Update every minute
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize events on page load
document.addEventListener('DOMContentLoaded', async () => {
    await displayEvents();
});

