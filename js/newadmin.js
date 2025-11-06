// Consolidated admin logic (merged from admin.js and admin-content.js)
// This file contains authentication, server/admin UI, and content management logic.

// --- Admin Panel Functions (from admin.js) ---

// Admin Password - Change this to your desired password
const ADMIN_PASSWORD = 'PQ81377CAS2024!'; // Change this to your secure password

// Check if user is authenticated
function isAuthenticated() {
    return sessionStorage.getItem('adminAuthenticated') === 'true';
}

// Check password and authenticate
function checkPassword() {
    const passwordInput = document.getElementById('passwordInput');
    const passwordError = document.getElementById('passwordError');
    const enteredPassword = passwordInput.value.trim();

    if (enteredPassword === ADMIN_PASSWORD) {
        sessionStorage.setItem('adminAuthenticated', 'true');
        
        const passwordModal = document.getElementById('passwordModal');
        const passwordModalContent = passwordModal.querySelector('.password-modal-content');
        const passwordModalLogo = passwordModal.querySelector('.password-modal-logo');
        const loadingScreen = document.getElementById('loadingScreen');
        const loadingLogo = document.getElementById('loadingLogo');
        
        // Show loading screen immediately (logo will transition smoothly)
        if (loadingScreen) loadingScreen.style.display = 'flex';
        
        // Collapse the login box content (everything except logo)
        if (passwordModalContent) passwordModalContent.classList.add('collapsing');
        
        // Start logo transition
        if (passwordModalLogo) passwordModalLogo.classList.add('transitioning');
        
        // After collapse animation (0.5s), hide password modal
        setTimeout(() => {
            if (passwordModal) passwordModal.style.display = 'none';
            
            // Start trace animation for each line sequentially
            if (loadingScreen) loadingScreen.classList.add('rotating');
            
            // After 5 seconds (all traces complete), hide loading screen and show admin panel
            setTimeout(() => {
                if (loadingScreen) {
                    loadingScreen.style.display = 'none';
                    loadingScreen.classList.remove('rotating');
                }
                const adminContent = document.getElementById('adminContent');
                if (adminContent) {
                    adminContent.style.display = 'block';
                    // Small delay to ensure DOM is ready
                    setTimeout(() => {
                        // Initialize admin panel after authentication
                        if (typeof displayAdminServers === 'function') displayAdminServers();
                        if (typeof initSidebar === 'function') initSidebar();
                        if (typeof loadContentIntoForms === 'function') loadContentIntoForms();
                        if (typeof ensureAdminUI === 'function') ensureAdminUI();
                    }, 100);
                }
            }, 5000);
        }, 500);
    } else {
        passwordError.textContent = 'Incorrect password. Please try again.';
        passwordError.style.display = 'block';
        passwordInput.value = '';
        passwordInput.focus();
    }
}

// Load servers from database
async function loadServers() {
    try {
        const servers = await getServers();
        return servers.map(s => ({
            id: s.battlemetrics_id,
            dbId: s.id,
            name: s.name,
            displayName: s.display_name || s.name
        }));
    } catch (error) {
        console.error('Error loading servers:', error);
        return [];
    }
}

// Open add server modal
function openAddServerModal() {
    const modal = document.getElementById('addServerModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            const serverNameInput = document.getElementById('serverName');
            if (serverNameInput) serverNameInput.focus();
        }, 100);

        const closeOnBackground = function(e) {
            if (e.target === modal) {
                closeAddServerModal();
                modal.removeEventListener('click', closeOnBackground);
            }
        };
        modal.addEventListener('click', closeOnBackground);

        const closeOnEscape = function(e) {
            if (e.key === 'Escape') {
                closeAddServerModal();
                document.removeEventListener('keydown', closeOnEscape);
            }
        };
        document.addEventListener('keydown', closeOnEscape);
    }
}

function closeAddServerModal() {
    const modal = document.getElementById('addServerModal');
    if (modal) {
        modal.style.display = 'none';
        const serverName = document.getElementById('serverName');
        const battlemetricsId = document.getElementById('battlemetricsId');
        if (serverName) serverName.value = '';
        if (battlemetricsId) battlemetricsId.value = '';
    }
}

async function addServer() {
    const serverNameEl = document.getElementById('serverName');
    const battlemetricsIdEl = document.getElementById('battlemetricsId');
    const serverName = serverNameEl ? serverNameEl.value.trim() : '';
    const battlemetricsId = battlemetricsIdEl ? battlemetricsIdEl.value.trim() : '';

    if (!serverName || !battlemetricsId) {
        alert('Please fill in all fields');
        return;
    }
    if (isNaN(battlemetricsId)) {
        alert('BattleMetrics Server ID must be a number');
        return;
    }

    try {
        const existingServers = await loadServers();
        if (existingServers.some(s => s.id === battlemetricsId)) {
            alert('Server with this BattleMetrics ID already exists');
            return;
        }

        await apiCall('add_server', 'POST', {
            name: serverName,
            displayName: serverName,
            battlemetricsId: battlemetricsId,
            ipAddress: ''
        });

        if (serverNameEl) serverNameEl.value = '';
        if (battlemetricsIdEl) battlemetricsIdEl.value = '';

        await displayAdminServers();
        closeAddServerModal();

        if (typeof showToast === 'function') showToast('Server Added', 'Server added successfully!', 'success');
        else alert('Server added successfully!');
    } catch (error) {
        console.error('Error adding server:', error);
        alert('Error adding server. Please try again.');
    }
}

async function removeServer(serverId) {
    try {
        await deleteServer(serverId);
        await displayAdminServers();
    } catch (error) {
        console.error('Error removing server:', error);
        alert('Error removing server. Please try again.');
    }
}

// Display servers in admin panel
async function displayAdminServers() {
    const servers = await loadServers();
    const adminList = document.getElementById('adminServersList');
    if (!adminList) return;
    if (servers.length === 0) {
        adminList.innerHTML = '<div class="empty-state">No servers added yet. Add your first server above.</div>';
        return;
    }
    adminList.innerHTML = '';
    servers.forEach(server => {
        const card = document.createElement('div');
        card.className = 'server-card admin-server-card';
        card.id = `admin-server-${server.id}`;
        card.innerHTML = `
            <button class="admin-remove-x" onclick="confirmRemoveServer('${server.dbId}', '${server.id}')" aria-label="Remove server">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
            <div class="server-status-line" id="admin-statusLine-${server.id}"></div>
            <div class="server-card-header">
                <h2 class="server-card-title">${escapeHtml(server.displayName || server.name)}</h2>
                <div class="status-indicator" id="admin-status-${server.id}">
                    <span class="status-dot"></span>
                    <span class="status-text">Loading...</span>
                </div>
            </div>
            <div class="server-card-content">
                <div class="players-pair">
                    <div class="info-card square-card">
                        <div class="info-label">Players</div>
                        <div class="info-value" id="admin-players-${server.id}">-</div>
                    </div>
                    <div class="info-card square-card">
                        <div class="info-label">Max Players</div>
                        <div class="info-value" id="admin-maxPlayers-${server.id}">-</div>
                    </div>
                </div>
                <div class="server-info-grid">
                    <div class="info-card">
                        <div class="info-label">Map</div>
                        <div class="info-value" id="admin-map-${server.id}">-</div>
                    </div>
                    <div class="info-card">
                        <div class="info-label">Game Mode</div>
                        <div class="info-value" id="admin-gameMode-${server.id}">-</div>
                    </div>
                </div>
                <div class="uptime-card-container">
                    <div class="info-card uptime-card">
                        <div class="info-label">Uptime</div>
                        <div class="info-value" id="admin-uptime-${server.id}">-</div>
                    </div>
                </div>
                <div class="server-connect-section">
                    <div class="server-ip-display" id="admin-serverIP-${server.id}">
                        <span>Server IP: </span>
                        <span class="ip-address" id="admin-ipAddress-${server.id}">Loading...</span>
                        <button class="copy-btn" onclick="copyIP('${server.id}')">Copy</button>
                    </div>
                </div>
            </div>
        `;
        adminList.appendChild(card);
        fetchAdminServerData(server.id, server.displayName || server.name);
    });
}

async function fetchAdminServerData(serverId, displayName) {
    try {
        const apiUrl = `https://api.battlemetrics.com/servers/${serverId}?include=player,session`;
        const response = await fetch(apiUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        updateAdminServerDisplay(data, serverId, displayName);
    } catch (error) {
        console.error(`Error fetching server data for ${serverId}:`, error);
        displayAdminError(serverId, displayName);
    }
}

function updateAdminServerDisplay(data, serverId, displayName) {
    const attributes = data.data.attributes;
    const statusIndicator = document.getElementById(`admin-status-${serverId}`);
    if (!statusIndicator) return;
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    const statusLine = document.getElementById(`admin-statusLine-${server.id}`);
    if (statusLine) {
        if (attributes.status === 'online') { statusLine.classList.add('online'); statusLine.classList.remove('offline'); }
        else { statusLine.classList.add('offline'); statusLine.classList.remove('online'); }
    }
    if (attributes.status === 'online') { statusDot.classList.add('online'); statusDot.classList.remove('offline'); statusText.textContent = 'Online'; }
    else { statusDot.classList.add('offline'); statusDot.classList.remove('online'); statusText.textContent = 'Offline'; }

    const playersEl = document.getElementById(`admin-players-${serverId}`);
    const maxPlayersEl = document.getElementById(`admin-maxPlayers-${serverId}`);
    const mapEl = document.getElementById(`admin-map-${serverId}`);
    const gameModeEl = document.getElementById(`admin-gameMode-${serverId}`);
    const uptimeEl = document.getElementById(`admin-uptime-${serverId}`);
    const ipAddressEl = document.getElementById(`admin-ipAddress-${serverId}`);
    if (playersEl) playersEl.textContent = attributes.players || 0;
    if (maxPlayersEl) maxPlayersEl.textContent = attributes.maxPlayers || 0;
    const details = attributes.details || {};
    if (mapEl) mapEl.textContent = details.map || 'Unknown';
    if (gameModeEl) gameModeEl.textContent = details.mode || details.gameMode || 'Unknown';
    if (uptimeEl) {
        if (attributes.details?.uptime) uptimeEl.textContent = formatUptime(attributes.details.uptime);
        else if (attributes.startTime) uptimeEl.textContent = calculateUptime(new Date(attributes.startTime));
        else uptimeEl.textContent = 'N/A';
    }
    const ip = attributes.ip || 'N/A';
    const port = attributes.port || 'N/A';
    if (ipAddressEl) ipAddressEl.textContent = `${ip}:${port}`;
}

function displayAdminError(serverId, displayName) {
    const statusIndicator = document.getElementById(`admin-status-${serverId}`);
    if (statusIndicator) {
        const statusText = statusIndicator.querySelector('.status-text');
        if (statusText) statusText.textContent = 'Error';
    }
}

function formatUptime(seconds) {
    if (typeof calculateUptime === 'function') {
        const date = new Date(Date.now() - seconds * 1000);
        return calculateUptime(date);
    }
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function calculateUptime(startTime) {
    const now = new Date();
    const diff = now - startTime;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function showToast(title, message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let iconSvg = '';
    if (type === 'error') iconSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    else if (type === 'success') iconSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>';
    else if (type === 'warning') iconSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>';
    else iconSvg = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>';
    toast.innerHTML = `
        <div class="toast-icon">${iconSvg}</div>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()" aria-label="Close">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300); }, 5000);
}

let pendingDeleteServerId = null;

async function confirmRemoveServer(dbId, battlemetricsId) {
    const servers = await loadServers();
    const server = servers.find(s => s.dbId == dbId);
    const serverName = server ? (server.displayName || server.name) : 'Server';
    pendingDeleteServerId = dbId;
    const el = document.getElementById('deleteServerName');
    if (el) el.textContent = `"${serverName}"`;
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'flex';
}

function closeDeleteModal() {
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) deleteModal.style.display = 'none';
    pendingDeleteServerId = null;
}

async function confirmDelete() {
    if (pendingDeleteServerId) {
        const servers = await loadServers();
        const server = servers.find(s => s.dbId == pendingDeleteServerId);
        const serverName = server ? (server.displayName || server.name) : 'Server';
        await removeServer(pendingDeleteServerId);
        showToast('Server Removed', `"${serverName}" has been removed successfully.`, 'success');
        closeDeleteModal();
    }
}

function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text; return div.innerHTML; }
function logout() { sessionStorage.removeItem('adminAuthenticated'); window.location.reload(); }

// DOMContentLoaded: central initialization
document.addEventListener('DOMContentLoaded', () => {
    // Password input enter handler
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) { passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); }); }
    // Battlemetrics input enter handler
    const battlemetricsIdInput = document.getElementById('battlemetricsId');
    if (battlemetricsIdInput) { battlemetricsIdInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') addServer(); }); }

    // Delete modal overlay handler
    const deleteModal = document.getElementById('deleteModal');
    const overlay = deleteModal?.querySelector('.delete-modal-overlay');
    if (overlay) overlay.addEventListener('click', closeDeleteModal);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && deleteModal && deleteModal.style.display === 'flex') closeDeleteModal(); });

    // If already authenticated, show admin content and init modules
    if (isAuthenticated()) {
        const passwordModal = document.getElementById('passwordModal');
        const adminContent = document.getElementById('adminContent');
        if (passwordModal) passwordModal.style.display = 'none';
        if (adminContent) {
            adminContent.style.display = 'block';
            setTimeout(() => {
                if (typeof displayAdminServers === 'function') displayAdminServers();
                if (typeof initSidebar === 'function') initSidebar();
                if (typeof loadContentIntoForms === 'function') loadContentIntoForms();
                if (typeof ensureAdminUI === 'function') ensureAdminUI();
            }, 100);
        }
    } else {
        setTimeout(() => { if (passwordInput) passwordInput.focus(); }, 100);
    }

    // Run ensureAdminUI at short intervals to catch late inits
    setTimeout(() => { if (typeof ensureAdminUI === 'function') ensureAdminUI(); }, 50);
    setTimeout(() => { if (typeof ensureAdminUI === 'function') ensureAdminUI(); }, 500);
});

// --- Content Management / Sidebar (from admin-content.js) ---

// Load site content from database (for compatibility)
async function loadSiteContent() {
    try {
        const settings = await getSettings();
        return {
            slideshow: {}, // Slideshow handled separately
            settings: {
                updateInterval: parseInt(settings.updateInterval) || 30
            }
        };
    } catch (error) {
        console.error('Error loading site content:', error);
        return {
            slideshow: {},
            settings: {
                updateInterval: 30
            }
        };
    }
}

// Save site content to database (for compatibility)
async function saveSiteContent(content) {
    try {
        if (content.settings) {
            await saveSetting('updateInterval', content.settings.updateInterval || 30);
        }
    } catch (error) {
        console.error('Error saving site content:', error);
    }
}

// Sidebar navigation
// Tab titles mapping
const tabTitles = {
    'servers': 'Server Management',
    'slideshow': 'Slideshow',
    'events': 'Events',
    'settings': 'Settings'
};

function initSidebar() {
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const floatingAddBtn = document.getElementById('floatingAddBtn');
    const headerBarTitle = document.getElementById('headerBarTitle');
    const mainHeaderBar = document.getElementById('mainHeaderBar');
    
    // Ensure header bar is visible
    if (mainHeaderBar) {
        mainHeaderBar.style.display = 'block';
    }
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items
            sidebarItems.forEach(i => i.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');
            
            // Hide all sections
            const sections = document.querySelectorAll('.admin-section');
            sections.forEach(section => section.style.display = 'none');
            
            // Hide servers display section
            const serversDisplaySection = document.getElementById('servers-display-section');
            
            if (serversDisplaySection) {
                serversDisplaySection.style.display = 'none';
            }
            
            // Show selected section
            const sectionName = item.getAttribute('data-section');
            const section = document.getElementById(`${sectionName}-section`);
            if (section) {
                section.style.display = 'block';
            }
            
            // Update header bar title
            if (headerBarTitle && tabTitles[sectionName]) {
                headerBarTitle.textContent = tabTitles[sectionName];
            }
            
            // Ensure header bar is visible
            if (mainHeaderBar) {
                mainHeaderBar.style.display = 'block';
            }
            
            // Show/hide floating add button and servers display section (only for servers tab)
            const floatingAddImageBtn = document.getElementById('floatingAddImageBtn');
            if (floatingAddBtn) {
                if (sectionName === 'servers') {
                    floatingAddBtn.style.display = 'flex';
                    // Show servers display section
                    if (serversDisplaySection) {
                        serversDisplaySection.style.display = 'block';
                    }
                } else {
                    floatingAddBtn.style.display = 'none';
                }
            }
            
            // Show/hide floating add image button (only for slideshow tab)
            if (floatingAddImageBtn) {
                if (sectionName === 'slideshow') {
                    floatingAddImageBtn.style.display = 'flex';
                    // Load and display images when slideshow tab is opened
                    if (typeof displayImages === 'function') {
                        displayImages();
                    }
                } else {
                    floatingAddImageBtn.style.display = 'none';
                }
            }
        });
    });
    
    // Show add button and servers sections on initial load if servers section is active
    const activeItem = document.querySelector('.sidebar-item.active');
    if (activeItem) {
        const sectionName = activeItem.getAttribute('data-section');
        
        // Update header bar title on initial load
        if (headerBarTitle && tabTitles[sectionName]) {
            headerBarTitle.textContent = tabTitles[sectionName];
        }
        
        // Ensure header bar is visible on initial load
        if (mainHeaderBar) {
            mainHeaderBar.style.display = 'block';
        }
        
        if (sectionName === 'servers') {
            if (floatingAddBtn) floatingAddBtn.style.display = 'flex';
            const serversDisplaySection = document.getElementById('servers-display-section');
            if (serversDisplaySection) serversDisplaySection.style.display = 'block';
        } else {
            if (floatingAddBtn) floatingAddBtn.style.display = 'none';
        }
        
        // Show/hide floating add image button on initial load
        const floatingAddImageBtn = document.getElementById('floatingAddImageBtn');
        if (floatingAddImageBtn) {
            if (sectionName === 'slideshow') {
                floatingAddImageBtn.style.display = 'flex';
                // Load and display images when slideshow tab is opened
                if (typeof displayImages === 'function') {
                    displayImages();
                }
            } else {
                floatingAddImageBtn.style.display = 'none';
            }
        }
    } else {
        // If no active item, default to servers section
        const serversItem = document.querySelector('.sidebar-item[data-section="servers"]');
        if (serversItem) {
            serversItem.classList.add('active');
            if (headerBarTitle && tabTitles['servers']) {
                headerBarTitle.textContent = tabTitles['servers'];
            }
            if (mainHeaderBar) {
                mainHeaderBar.style.display = 'block';
            }
            if (floatingAddBtn) floatingAddBtn.style.display = 'flex';
            const serversDisplaySection = document.getElementById('servers-display-section');
            if (serversDisplaySection) serversDisplaySection.style.display = 'block';
        }
    }
}

// Load content into forms
async function loadContentIntoForms() {
    try {
        // Wait a bit to ensure DOM is ready and admin content is visible
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Check if admin content is visible
        const adminContent = document.getElementById('adminContent');
        if (!adminContent || adminContent.style.display === 'none') {
            console.warn('Admin content not visible yet, skipping form load');
            return;
        }
        
        const content = await loadSiteContent();
        
        // Settings
        if (content && content.settings) {
            const updateIntervalEl = document.getElementById('updateInterval');
            if (updateIntervalEl) {
                updateIntervalEl.value = content.settings.updateInterval || 30;
            } else {
                console.warn('updateInterval element not found in DOM');
            }
        }
        
        // Display events in admin panel
        await displayAdminEvents();
    } catch (error) {
        console.error('Error in loadContentIntoForms:', error);
    }
}

// Save settings
async function saveSettings() {
    const updateIntervalEl = document.getElementById('updateInterval');
    if (!updateIntervalEl) {
        console.error('updateInterval element not found');
        return;
    }
    const interval = parseInt(updateIntervalEl.value);
    if (isNaN(interval) || interval < 10 || interval > 300) {
        alert('Update interval must be between 10 and 300 seconds');
        return;
    }
    
    try {
        await saveSetting('updateInterval', interval);
        alert('Settings saved successfully!');
    } catch (error) {
        console.error('Error saving settings:', error);
        alert('Error saving settings. Please try again.');
    }
}

// Events Management
async function loadEvents() {
    try {
        const events = await getEvents();
        return Array.isArray(events) ? events : [];
    } catch (error) {
        console.error('Error loading events:', error);
        return [];
    }
}

async function addEvent() {
    const titleEl = document.getElementById('eventTitle');
    const dateEl = document.getElementById('eventDate');
    const descriptionEl = document.getElementById('eventDescription');
    
    if (!titleEl || !dateEl) {
        console.error('Event form elements not found');
        return;
    }
    
    const title = titleEl.value.trim();
    const date = dateEl.value;
    const description = descriptionEl ? descriptionEl.value.trim() : '';
    
    if (!title || !date) {
        alert('Please fill in event title and date');
        return;
    }
    
    try {
        // Use the API function from api.js
        const response = await fetch('/php/api.php?action=add_event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: title,
                date: date,
                description: description || ''
            })
        });
        const result = await response.json();
        
        if (result.success) {
            // Clear form
            if (titleEl) titleEl.value = '';
            if (dateEl) dateEl.value = '';
            if (descriptionEl) descriptionEl.value = '';
            
            // Refresh display
            await displayAdminEvents();
            alert('Event added successfully!');
        } else {
            alert('Error adding event: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding event:', error);
        alert('Error adding event. Please try again.');
    }
}

async function removeEvent(eventId) {
    if (!confirm('Are you sure you want to remove this event?')) {
        return;
    }
    
    try {
        await deleteEvent(eventId);
        await displayAdminEvents();
    } catch (error) {
        console.error('Error removing event:', error);
        alert('Error removing event. Please try again.');
    }
}

async function displayAdminEvents() {
    const events = await loadEvents();
    const adminList = document.getElementById('adminEventsList');
    
    if (!adminList) return;
    
    if (events.length === 0) {
        adminList.innerHTML = '<div class="empty-state">No events added yet. Add your first event above.</div>';
        return;
    }
    
    // Sort by date
    const sortedEvents = [...events].sort((a, b) => {
        return new Date(a.date) - new Date(b.date);
    });
    
    adminList.innerHTML = sortedEvents.map(event => {
        const eventDate = new Date(event.date);
        const dateStr = eventDate.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
        
        return `
            <div class="admin-server-item">
                <div class="admin-server-info">
                    <strong>${escapeHtml(event.title)}</strong>
                    <span class="admin-server-id">${dateStr}</span>
                    ${event.description ? `<span style="display: block; margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9rem;">${escapeHtml(event.description)}</span>` : ''}
                </div>
                <button class="remove-server-btn" onclick="removeEvent('${event.id}')">Remove</button>
            </div>
        `;
    }).join('');
}

// Ensure admin UI elements (header, floating add buttons, server section) are visible
// This is a non-invasive initializer to run after DOM/content loads and after auth flows.
function ensureAdminUI(){
    try{
        const adminContent = document.getElementById('adminContent');
        const mainHeaderBar = document.getElementById('mainHeaderBar');
        const floatingAddBtn = document.getElementById('floatingAddBtn');
        const floatingAddImageBtn = document.getElementById('floatingAddImageBtn');
        const serversDisplaySection = document.getElementById('servers-display-section');

        if(!adminContent) return;

        // If adminContent is shown, ensure header is visible
        if (adminContent.style.display !== 'none'){
            if (mainHeaderBar) mainHeaderBar.style.display = 'block';

            // Determine active section
            const activeItem = document.querySelector('.sidebar-item.active') || document.querySelector('.sidebar-item[data-section="servers"]');
            const sectionName = activeItem ? activeItem.getAttribute('data-section') : 'servers';

            // Toggle servers display and floating add button
            if (sectionName === 'servers'){
                if (serversDisplaySection) serversDisplaySection.style.display = 'block';
                if (floatingAddBtn) floatingAddBtn.style.display = 'flex';
            } else {
                if (floatingAddBtn) floatingAddBtn.style.display = 'none';
            }

            // Toggle slideshow add image button
            if (sectionName === 'slideshow'){
                if (floatingAddImageBtn) floatingAddImageBtn.style.display = 'flex';
            } else {
                if (floatingAddImageBtn) floatingAddImageBtn.style.display = 'none';
            }
        }
    }catch(e){
        console.warn('ensureAdminUI error', e);
    }
}

// Expose ensureAdminUI for other modules if needed
window.ensureAdminUI = ensureAdminUI;
