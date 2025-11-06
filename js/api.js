// API Helper Functions
const API_URL = '/php/api.php';

// Generic API call function
async function apiCall(action, method = 'GET', data = null) {
    try {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        let url = `${API_URL}?action=${action}`;
        
        if (method === 'GET' && data) {
            // Add data as query parameters for GET requests
            const params = new URLSearchParams(data);
            url += '&' + params.toString();
        } else if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(url, options);
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return result;
    } catch (error) {
        console.error(`API Error (${action}):`, error);
        throw error;
    }
}

// Servers API
async function getServers() {
    return await apiCall('get_servers');
}

async function addServer(serverData) {
    return await apiCall('add_server', 'POST', serverData);
}

async function updateServer(serverData) {
    return await apiCall('update_server', 'POST', serverData);
}

async function deleteServer(id) {
    return await apiCall('delete_server', 'GET', { id });
}

// Events API
async function getEvents() {
    return await apiCall('get_events');
}

async function addEvent(eventData) {
    return await apiCall('add_event', 'POST', eventData);
}

async function deleteEvent(id) {
    return await apiCall('delete_event', 'GET', { id });
}

// Settings API
async function getSettings() {
    return await apiCall('get_settings');
}

async function saveSetting(key, value) {
    return await apiCall('save_setting', 'POST', { key, value });
}

