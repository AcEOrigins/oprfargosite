// BattleMetrics API Configuration
// Update interval in milliseconds (30 seconds)
const UPDATE_INTERVAL = 30000;

// State
let updateIntervals = {};

// Load servers from database (shared with admin.js)
async function loadServers() {
    try {
        const response = await fetch('/php/api.php?action=get_servers');
        const servers = await response.json();
        // Convert database format to frontend format
        return Array.isArray(servers) ? servers.map(s => ({
            id: s.battlemetrics_id,
            name: s.name,
            displayName: s.display_name || s.name
        })) : [];
    } catch (error) {
        console.error('Error loading servers:', error);
        return [];
    }
}

// Initialize all servers
async function initializeServers() {
    const servers = await loadServers();
    const serversGrid = document.getElementById('serversGrid');

    if (!serversGrid) return;

    // Clear existing intervals
    Object.values(updateIntervals).forEach(interval => clearInterval(interval));
    updateIntervals = {};

    if (servers.length === 0) {
        serversGrid.innerHTML = '<div class="empty-state">No servers configured. Click "Admin" to add servers.</div>';
        return;
    }

    serversGrid.innerHTML = '';
    
    // Create a card for each server and fetch its data
    servers.forEach(server => {
        createServerCard(server);
        fetchServerData(server.id, server.displayName || server.name);
    });
}

// Create a server card element
function createServerCard(server) {
    const serversGrid = document.getElementById('serversGrid');
    const cardId = `server-${server.id}`;
    
    const card = document.createElement('div');
    card.className = 'server-card';
    card.id = cardId;
    card.innerHTML = `
        <div class="server-status-line" id="statusLine-${server.id}"></div>
        <div class="server-card-header">
            <h2 class="server-card-title">${escapeHtml(server.displayName || server.name)}</h2>
            <div class="status-indicator" id="status-${server.id}">
                <span class="status-dot"></span>
                <span class="status-text">Loading...</span>
            </div>
        </div>
        <div class="server-card-content">
            <div class="players-pair">
                <div class="info-card square-card">
                    <div class="info-label">Players</div>
                    <div class="info-value" id="players-${server.id}">-</div>
                </div>
                <div class="info-card square-card">
                    <div class="info-label">Max Players</div>
                    <div class="info-value" id="maxPlayers-${server.id}">-</div>
                </div>
            </div>
            <div class="server-info-grid">
                <div class="info-card">
                    <div class="info-label">Map</div>
                    <div class="info-value" id="map-${server.id}">-</div>
                </div>
                <div class="info-card">
                    <div class="info-label">Game Mode</div>
                    <div class="info-value" id="gameMode-${server.id}">-</div>
                </div>
            </div>
            <div class="uptime-card-container">
                <div class="info-card uptime-card">
                    <div class="info-label">Uptime</div>
                    <div class="info-value" id="uptime-${server.id}">-</div>
                </div>
            </div>
            <div class="server-connect-section">
                <div class="server-ip-display" id="serverIP-${server.id}">
                    <span>Server IP: </span>
                    <span class="ip-address" id="ipAddress-${server.id}">Loading...</span>
                    <button class="copy-btn" onclick="copyIP('${server.id}')">Copy</button>
                </div>
            </div>
        </div>
    `;
    
    serversGrid.appendChild(card);
}

// Fetch server data from BattleMetrics
async function fetchServerData(serverId, displayName) {
    try {
        const apiUrl = `https://api.battlemetrics.com/servers/${serverId}?include=player,session`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        updateServerDisplay(data, serverId, displayName);
    } catch (error) {
        console.error(`Error fetching server data for ${serverId}:`, error);
        displayError(serverId, displayName);
    }
}

// Update the UI with server data
function updateServerDisplay(data, serverId, displayName) {
    const attributes = data.data.attributes;
    const relationships = data.data.relationships;
    
    // Update status indicator
    const statusIndicator = document.getElementById(`status-${serverId}`);
    if (!statusIndicator) return; // Server card might have been removed
    
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    // Update status line
    const statusLine = document.getElementById(`statusLine-${serverId}`);
    if (statusLine) {
        if (attributes.status === 'online') {
            statusLine.classList.add('online');
            statusLine.classList.remove('offline');
        } else {
            statusLine.classList.add('offline');
            statusLine.classList.remove('online');
        }
    }
    
    if (attributes.status === 'online') {
        statusDot.classList.add('online');
        statusDot.classList.remove('offline');
        statusText.textContent = 'Online';
    } else {
        statusDot.classList.add('offline');
        statusDot.classList.remove('online');
        statusText.textContent = 'Offline';
    }
    
    // Update server information
    const playersEl = document.getElementById(`players-${serverId}`);
    const maxPlayersEl = document.getElementById(`maxPlayers-${serverId}`);
    const mapEl = document.getElementById(`map-${serverId}`);
    const gameModeEl = document.getElementById(`gameMode-${serverId}`);
    const uptimeEl = document.getElementById(`uptime-${serverId}`);
    const ipEl = document.getElementById(`ip-${serverId}`);
    const ipAddressEl = document.getElementById(`ipAddress-${serverId}`);
    
    if (playersEl) playersEl.textContent = attributes.players || 0;
    if (maxPlayersEl) maxPlayersEl.textContent = attributes.maxPlayers || 0;
    
    // Get map and game mode from details
    const details = attributes.details || {};
    if (mapEl) mapEl.textContent = details.map || 'Unknown';
    if (gameModeEl) gameModeEl.textContent = details.mode || details.gameMode || 'Unknown';
    
    // Calculate and display uptime
    if (uptimeEl) {
        if (attributes.details?.uptime) {
            uptimeEl.textContent = formatUptime(attributes.details.uptime);
        } else if (attributes.startTime) {
            const startTime = new Date(attributes.startTime);
            const uptime = calculateUptime(startTime);
            uptimeEl.textContent = uptime;
        } else {
            uptimeEl.textContent = 'N/A';
        }
    }
    
    // Update server IP
    const ip = attributes.ip || 'N/A';
    const port = attributes.port || 'N/A';
    const ipPort = `${ip}:${port}`;
    if (ipAddressEl) ipAddressEl.textContent = ipPort;
    
    // Fetch and display players
    if (relationships.players?.data && relationships.players.data.length > 0) {
        fetchPlayersList(relationships.players.data, serverId);
    } else {
        // Try to fetch players using the included data
        if (data.included) {
            const players = data.included.filter(item => item.type === 'player');
            if (players.length > 0) {
                displayPlayersList(players, serverId);
            } else {
                displayPlayersList([], serverId);
            }
        } else {
            displayPlayersList([], serverId);
        }
    }
}

// Fetch players list
async function fetchPlayersList(playerIds, serverId) {
    try {
        if (!playerIds || playerIds.length === 0) {
            displayPlayersList([], serverId);
            return;
        }
        
        // BattleMetrics API endpoint for players
        const playerIdsParam = playerIds.map(p => p.id).join(',');
        const playersUrl = `https://api.battlemetrics.com/players?filter[ids]=${playerIdsParam}`;
        
        const response = await fetch(playersUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            displayPlayersList(data.data, serverId);
        } else {
            displayPlayersList([], serverId);
        }
    } catch (error) {
        console.error(`Error fetching players for ${serverId}:`, error);
        displayPlayersList([], serverId);
    }
}

// Display players list
function displayPlayersList(players, serverId) {
    const playersList = document.getElementById(`playersList-${serverId}`);
    if (!playersList) return; // Server card might have been removed
    
    if (players.length === 0) {
        playersList.innerHTML = '<div class="empty-state">No players online</div>';
        return;
    }
    
    playersList.innerHTML = players.map(player => {
        const playerName = player.attributes?.name || 'Unknown';
        // Get play time from session if available, otherwise use timePlayed
        const sessionTime = player.attributes?.session?.time || 0;
        const playTime = formatPlayTime(sessionTime);
        
        return `
            <div class="player-item">
                <span class="player-name">${escapeHtml(playerName)}</span>
                <span class="player-time">${playTime}</span>
            </div>
        `;
    }).join('');
}

// Calculate uptime
function calculateUptime(startDate) {
    const now = new Date();
    const start = new Date(startDate);
    const diff = now - start;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
        return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Format play time
function formatPlayTime(seconds) {
    if (!seconds) return '0m';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Format uptime from seconds
function formatUptime(seconds) {
    if (!seconds) return 'N/A';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
        return `${days}d ${hours}h`;
    } else if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else {
        return `${minutes}m`;
    }
}

// Display error state
function displayError(serverId, displayName) {
    const statusIndicator = document.getElementById(`status-${serverId}`);
    if (!statusIndicator) return;
    
    const statusDot = statusIndicator.querySelector('.status-dot');
    const statusText = statusIndicator.querySelector('.status-text');
    
    if (statusDot) {
        statusDot.classList.add('offline');
        statusDot.classList.remove('online');
    }
    if (statusText) {
        statusText.textContent = 'Error';
    }
    
    const playersList = document.getElementById(`playersList-${serverId}`);
    if (playersList) {
        playersList.innerHTML = '<div class="empty-state">Unable to load players</div>';
    }
}

// Copy IP to clipboard
function copyIP(serverId) {
    const ipAddressEl = document.getElementById(`ipAddress-${serverId}`);
    if (!ipAddressEl) return;
    
    const ipAddress = ipAddressEl.textContent;
    
    navigator.clipboard.writeText(ipAddress).then(() => {
        const copyBtns = document.querySelectorAll(`#server-${serverId} .copy-btn`);
        copyBtns.forEach(btn => {
            const originalText = btn.textContent;
            btn.textContent = 'Copied!';
            btn.disabled = true;
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        });
    }).catch(err => {
        console.error('Failed to copy IP:', err);
        alert('Failed to copy IP address');
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeServers();
    // Set up auto-refresh for all servers
    setInterval(async () => {
        const servers = await loadServers();
        servers.forEach(server => {
            fetchServerData(server.id, server.displayName || server.name);
        });
    }, UPDATE_INTERVAL);
});

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

