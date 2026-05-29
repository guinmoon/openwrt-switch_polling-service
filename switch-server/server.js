/**
 * Switch Server
 * 
 * Simple HTTP server for managing switches with state persistence.
 * 
 * Usage:
 *   1. Copy config.example.json to config.json and edit settings
 *   2. node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'switches.json');
const LOG_FILE = path.join(__dirname, 'log.txt');

// Load configuration
let config;
try {
    config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
} catch (e) {
    console.error('Failed to load config.json:', e.message);
    process.exit(1);
}

// Logging function
function log(message) {
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${message}\n`;
    fs.appendFileSync(LOG_FILE, entry, 'utf8');
    console.log(entry.trim());
}

// Parse JSON body from request
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (e) {
                reject(e);
            }
        });
        req.on('error', reject);
    });
}

// Send JSON response
function sendJSON(res, statusCode, data) {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // --- GET /switches - Get all switches ---
    if (req.method === 'GET' && pathname === '/switches') {
        const key = url.searchParams.get('key');
        if (key !== config.secretKey) {
            log(`GET /switches - Unauthorized (bad/missing key)`);
            return sendJSON(res, 401, { error: 'Unauthorized' });
        }
        log(`GET /switches - Returning all switches`);
        return sendJSON(res, 200, { switches: config.switches });
    }

    // --- GET /switch/:id - Get single switch ---
    if (req.method === 'GET' && pathname.startsWith('/switch/') && !pathname.endsWith('/set')) {
        const key = url.searchParams.get('key');
        if (key !== config.secretKey) {
            log(`GET /switch - Unauthorized (bad/missing key)`);
            return sendJSON(res, 401, { error: 'Unauthorized' });
        }
        const id = pathname.split('/switch/')[1];
        const sw = config.switches.find(s => s.id === id);
        log(`GET /switch/${id} - ${sw ? 'Found' : 'Not found'}`);
        if (!sw) {
            return sendJSON(res, 404, { error: 'Switch not found' });
        }
        return sendJSON(res, 200, { switch: sw });
    }

    // --- POST /switch - Toggle switch state ---
    if (req.method === 'POST' && pathname === '/switch') {
        try {
            const body = await parseBody(req);
            log(`POST /switch - Request received for switch "${body.id}"`);

            if (body.key !== config.secretKey) {
                log(`POST /switch - Unauthorized (bad/missing key)`);
                return sendJSON(res, 401, { error: 'Unauthorized' });
            }

            const sw = config.switches.find(s => s.id === body.id);
            if (!sw) {
                log(`POST /switch - Switch "${body.id}" not found`);
                return sendJSON(res, 404, { error: 'Switch not found' });
            }

            const oldState = sw.state;
            sw.state = !sw.state;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

            log(`POST /switch - Switch "${sw.id}" toggled: ${oldState} -> ${sw.state}`);
            return sendJSON(res, 200, { switch: sw });
        } catch (e) {
            log(`POST /switch - Error: ${e.message}`);
            return sendJSON(res, 400, { error: 'Invalid request body' });
        }
    }

    // --- POST /switch/:id/set - Set switch to specific state (on/off) ---
    if (req.method === 'POST' && pathname.startsWith('/switch/') && pathname.endsWith('/set')) {
        try {
            const id = pathname.split('/switch/')[1].split('/set')[0];
            const body = await parseBody(req);
            log(`POST /switch/${id}/set - Request received`);

            if (body.key !== config.secretKey) {
                log(`POST /switch/${id}/set - Unauthorized (bad/missing key)`);
                return sendJSON(res, 401, { error: 'Unauthorized' });
            }

            const sw = config.switches.find(s => s.id === id);
            if (!sw) {
                log(`POST /switch/${id}/set - Switch not found`);
                return sendJSON(res, 404, { error: 'Switch not found' });
            }

            const newState = body.on === true || body.on === 'on';
            const oldState = sw.state;
            sw.state = newState;
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');

            log(`POST /switch/${id}/set - Switch "${sw.id}" set to ${newState} (was ${oldState})`);
            return sendJSON(res, 200, { switch: sw });
        } catch (e) {
            log(`POST /switch/${id}/set - Error: ${e.message}`);
            return sendJSON(res, 400, { error: 'Invalid request body' });
        }
    }

    // --- GET /log - Get last N log entries ---
    if (req.method === 'GET' && pathname === '/log') {
        const key = url.searchParams.get('key');
        if (key !== config.secretKey) {
            log(`GET /log - Unauthorized (bad/missing key)`);
            return sendJSON(res, 401, { error: 'Unauthorized' });
        }
        const limit = parseInt(url.searchParams.get('limit')) || 50;
        let logContent = '';
        try {
            logContent = fs.readFileSync(LOG_FILE, 'utf8');
        } catch (e) {
            // Log file doesn't exist yet
        }
        const lines = logContent.trim().split('\n').filter(l => l).slice(-limit);
        log(`GET /log - Returning last ${lines.length} entries`);
        return sendJSON(res, 200, { log: lines });
    }

    // --- 404 ---
    log(`${req.method} ${req.url} - Not found`);
    sendJSON(res, 404, { error: 'Not found' });
});

server.listen(config.port, config.host, () => {
    log(`Server started on http://${config.host}:${config.port}`);
});
