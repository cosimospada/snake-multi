const express = require('express');
const http = require('http');
const {Server} = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    // CORS is fine when served from same origin (ngrok). Kept permissive for safety.
    cors: {origin: '*'}
});

const PORT = process.env.PORT || 3000;
const SERVER_STARTED_AT = new Date().toISOString();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ok: true, startedAt: SERVER_STARTED_AT}));

// --- Game settings ---
const GRID_X = 48; // arena width
const GRID_Y = 32; // arena height
const TICK_MS = 150;
const START_LEN = 4;
const MAX_PLAYERS = 12; // shared arena capacity

// Map<roomId, Room>
const rooms = new Map();

const SNAKEY_NAMES = ['Slinky','Venom','Anaconda','Medusa','Kaa','Slytherin','Mamba','Rattler','Python','Basilisk','Hydra','Quetzalcoatl','Snakey McSnakeface','Sir Väs'];
function assignSnakeyName(room, playerId) {
    if (!room.playerNames) room.playerNames = {};
    if (!room.playerNames[playerId]) {
        const used = Object.values(room.playerNames);
        const available = SNAKEY_NAMES.filter(n => !used.includes(n));
        room.playerNames[playerId] = available.length ? available[Math.floor(Math.random() * available.length)] : SNAKEY_NAMES[Math.floor(Math.random() * SNAKEY_NAMES.length)];
    }
    return room.playerNames[playerId];
}

const FRUIT_TYPES = [
    'apple.png', 'banana.png', 'cake.png', 'cherries.png', 'chicken.png',
    'doughnut.png', 'firecracker.png', 'hamburger.png', 'hotdog.png', 'pizza.png'
];
const MIN_FRUITS = 4;

function randomFruitType() {
    return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
}

function randomFruit(occupied, grid_x, grid_y) {
    const pos = randomFood(occupied, grid_x, grid_y);
    return {x: pos.x, y: pos.y, type: randomFruitType()};
}

function createRoom(roomId) {
    const room = {
        id: roomId,
        snakes: new Map(),
        inputs: new Map(),
        food: [],
        running: true,
    };
    // Place initial fruits (only non-firecrackers count toward MIN_FRUITS)
    const occupied = [];
    while (room.food.filter(f => f.type !== 'firecracker.png').length < MIN_FRUITS) {
        const fruit = randomFruit(occupied, GRID_X, GRID_Y);
        room.food.push(fruit);
        occupied.push(fruit);
    }
    rooms.set(roomId, room);
    return room;
}

function randomFood(occupied, grid_x, grid_y) {
    while (true) {
        const x = Math.floor(Math.random() * grid_x);
        const y = Math.floor(Math.random() * grid_y);
        if (!occupied.some(p => p.x === x && p.y === y)) return {x, y};
    }
}

function spawnSnake(grid_x, grid_y, len) {
    // Start at a random location, heading right; head is at index 0
    const cx = Math.floor(Math.random() * grid_x);
    const cy = Math.floor(Math.random() * grid_y);
    const body = [];
    for (let i = 0; i < len; i++) {
        body.push({x: cx + (len - 1 - i), y: cy});
    }
    return {
        body,
        dir: {x: 1, y: 0},
        alive: true,
        score: 0,
        color: randomColor(),
        bombs: 0,
        respawns: 0,
    };
}

function randomColor() {
    const hues = [20, 40, 80, 120, 160, 180, 200, 220, 260, 280, 300, 320];
    const h = hues[Math.floor(Math.random() * hues.length)];
    return `hsl(${h} 80% 55%)`;
}

function wrap(v, grid) {
    return (v + grid) % grid;
}

function wrapX(v) { return (v + GRID_X) % GRID_X; }
function wrapY(v) { return (v + GRID_Y) % GRID_Y; }


function stepRoom(room) {
    // Apply pending inputs
    for (const [pid, input] of room.inputs) {
        const s = room.snakes.get(pid);
        if (!s || !s.alive) continue;
        const {x, y} = input;
        // Disallow 180s
        if (x === -s.dir.x && y === -s.dir.y) continue;
        s.dir = {x, y};
    }

    // Move snakes and track occupied head cells after move
    const occupiedAfterMove = new Map(); // key "x,y" → [playerId]

    for (const [pid, s] of room.snakes) {
        if (!s.alive) continue;
        const head = {x: wrapX(s.body[0].x + s.dir.x, GRID_X), y: wrapY(s.body[0].y + s.dir.y, GRID_Y)};
        s.body.unshift(head);
        const grow = Array.isArray(room.food) && room.food.some(f => f.x === head.x && f.y === head.y);
        if (!grow) s.body.pop(); // tail removed before collision checks

        const key = head.x + ',' + head.y;
        const list = occupiedAfterMove.get(key) || [];
        list.push(pid);
        occupiedAfterMove.set(key, list);
    }

    // Self-collision
    for (const [, s] of room.snakes) {
        if (!s.alive) continue;
        const head = s.body[0];
        for (let i = 1; i < s.body.length; i++) {
            if (s.body[i].x === head.x && s.body[i].y === head.y) {
                s.alive = false;
                break;
            }
        }
    }

    // Other-body collisions
    const bodyCells = new Map(); // key → owner pid
    for (const [pid, s] of room.snakes) {
        if (!s.alive) continue;
        for (let i = 1; i < s.body.length; i++) {
            const key = s.body[i].x + ',' + s.body[i].y;
            if (!bodyCells.has(key)) bodyCells.set(key, pid);
        }
    }
    for (const [pid, s] of room.snakes) {
        if (!s.alive) continue;
        const headKey = s.body[0].x + ',' + s.body[0].y;
        const owner = bodyCells.get(headKey);
        if (owner && owner !== pid) s.alive = false;
    }

    // Head-on collisions (multiple heads in same cell)
    for (const [, pids] of occupiedAfterMove) {
        if (pids.length > 1) {
            for (const pid of pids) {
                const s = room.snakes.get(pid);
                if (s) s.alive = false;
            }
        }
    }

    // Food eaten? place new food and update scores
    const eaters = [];
    const eatenFruits = [];
    for (const [pid, s] of room.snakes) {
        if (!s.alive) continue;
        for (let i = 0; i < room.food.length; i++) {
            const f = room.food[i];
            if (s.body[0].x === f.x && s.body[0].y === f.y) {
                eaters.push({pid, fruit: f});
                eatenFruits.push(i);
            }
        }
    }
    // Remove eaten fruits and respawn
    eatenFruits.sort((a, b) => b - a); // remove from end
    for (const idx of eatenFruits) room.food.splice(idx, 1);
    if (eaters.length) {
        for (const {pid, fruit} of eaters) {
            const s = room.snakes.get(pid);
            if (s) {
                s.score += 1;
                s.bombs = (s.bombs || 0) + 1;
                // Firecracker logic: if the fruit is a firecracker, treat as bomb hit
                if (fruit.type === 'firecracker.png' && s.body.length > 1) {
                    // Cut the snake in half, but always leave at least the head
                    const newLen = Math.max(0, s.body.length - 2);
                    s.body = s.body.slice(0, newLen);
                    // Trigger the explosion ring for all clients at this location
                    const CANVAS_SIZE_X = 700; // must match client canvas width
                    const CANVAS_SIZE_Y = 700; // must match client canvas height
                    const gridCellX = CANVAS_SIZE_X / GRID_X;
                    const gridCellY = CANVAS_SIZE_Y / GRID_Y;
                    const x = (fruit.x + 0.5) * gridCellX;
                    const y = (fruit.y + 0.5) * gridCellY;
                    io.to(room.id).emit('ring', {x, y});

                    if (s.body.length < 1) {
                        s.alive = false;
                    }
                }
                // If snake runs out of segments, it's game over
                if (s.body.length < 1) {
                    s.alive = false;
                }
            }
        }
        // Add new fruits to maintain minimum (excluding firecrackers)
        const occupied = [];
        for (const [, s] of room.snakes) {
            if (!s.alive) continue;
            occupied.push(...s.body);
        }
        occupied.push(...room.food);
        while (room.food.filter(f => f.type !== 'firecracker.png').length < MIN_FRUITS) {
            const fruit = randomFruit(occupied, GRID_X, GRID_Y);
            // Only count non-firecrackers toward the minimum
            if (fruit.type !== 'firecracker.png') {
                room.food.push(fruit);
                occupied.push(fruit);
            } else {
                // Firecrackers can be added without limit
                room.food.push(fruit);
                occupied.push(fruit);
            }
        }
    }
}

// Tick + broadcast state
setInterval(() => {
    for (const room of rooms.values()) {
        if (!room.running) continue;
        stepRoom(room);
        const payload = {
            grid: {x: GRID_X, y: GRID_Y},
            food: room.food,
            players: [...room.snakes].map(([playerId, s]) => ({
                id: playerId,
                name: room.playerNames ? room.playerNames[playerId] : undefined,
                color: s.color,
                body: s.body,
                alive: s.alive,
                score: s.score,
                respawns: s.respawns || 0,
                segments: s.body.length
            })),
            leaderboard: [...room.snakes].map(([playerId, s]) => ({
                id: playerId,
                name: room.playerNames ? room.playerNames[playerId] : undefined,
                respawns: s.respawns || 0,
                segments: s.body.length,
                alive: s.alive,
                color: s.color
            })).sort((a, b) => b.segments - a.segments || b.respawns - a.respawns)
        };
        io.to(room.id).emit('state', payload);
    }
}, TICK_MS);

io.on('connection', (socket) => {
    const roomId = 'lobby'; // shared arena
    const room = rooms.get(roomId) || createRoom(roomId);

    // Enforce max live players
    const aliveCount = [...room.snakes.values()].filter(s => s.alive).length;
    if (aliveCount >= MAX_PLAYERS) {
        socket.emit('full');
        socket.disconnect(true);
        return;
    }

    socket.join(roomId);

    const snake = spawnSnake(GRID_X, GRID_Y, START_LEN);
    room.snakes.set(socket.id, snake);
    room.inputs.set(socket.id, snake.dir);

    console.log(`[JOIN] ${socket.id} from ${(socket.handshake.headers['x-forwarded-for'] || socket.handshake.address || '').toString()} | room=${roomId}`);

    // helper to share basic server/room info with clients
    function broadcastInfo(rm) {
        const payload = {
            serverStartedAt: SERVER_STARTED_AT,
            roomId,
            playerCount: [...rm.snakes.values()].filter(s => s.alive).length,
            sockets: [...rm.snakes.keys()],
        };
        io.to(rm.id).emit('serverInfo', payload);
    }

    assignSnakeyName(room, socket.id);

    broadcastInfo(room);

    socket.emit('joined', {playerId: socket.id, color: snake.color});

    socket.on('input', (dir) => {
        if (!dir || typeof dir.x !== 'number' || typeof dir.y !== 'number') return;
        room.inputs.set(socket.id, {x: Math.sign(dir.x), y: Math.sign(dir.y)});
    });

    socket.on('respawn', () => {
        const s = room.snakes.get(socket.id);
        if (!s || s.alive) return; // only respawn if dead
        const newSnake = spawnSnake(GRID_X, GRID_Y, START_LEN);
        newSnake.respawns = (s.respawns || 0) + 1;
        newSnake.score = s.score; // optionally preserve score
        newSnake.bombs = s.bombs; // optionally preserve bombs
        newSnake.color = s.color; // preserve color
        room.snakes.set(socket.id, newSnake);
        room.inputs.set(socket.id, {x: 1, y: 0});
        broadcastInfo(room);
    });

    socket.on('ring', ({gx, gy}) => {
        const snake = room.snakes.get(socket.id);
        if (!snake || !snake.alive || !snake.bombs || snake.bombs < 1) return; // must have at least 1 bomb
        snake.bombs -= 1;
        // Bomb effect: only snakes whose HEAD is within the ring lose two segments
        const RING_RADIUS_CELLS = 2; // radius in grid cells
        for (const s of room.snakes.values()) {
            if (!s.alive) continue;
            const seg = s.body[0];
            const dx = seg.x + 0.5 - gx;
            const dy = seg.y + 0.5 - gy;
            if (Math.sqrt(dx * dx + dy * dy) <= RING_RADIUS_CELLS && s.body.length > 1) {
                const newLen = Math.max(0, s.body.length - 2);
                s.body = s.body.slice(0, newLen);
            }
            if (s.body.length < 1) {
                s.alive = false;
            }
        }
        // For the explosion ring animation, send pixel coordinates for display
        const CANVAS_SIZE_X = 700;
        const CANVAS_SIZE_Y = 700;
        const gridCellX = CANVAS_SIZE_X / GRID_X;
        const gridCellY = CANVAS_SIZE_Y / GRID_Y;
        io.to(roomId).emit('ring', {gx, gy});
    });

    socket.on('disconnect', () => {
        const r = rooms.get(roomId);
        if (!r) return;
        r.snakes.delete(socket.id);
        r.inputs.delete(socket.id);
        console.log(`[LEAVE] ${socket.id} | room=${roomId}`);
        broadcastInfo(r);
    });
});

server.listen(PORT, () => {
    console.log(`Multiplayer Snake on http://localhost:${PORT}`);
});
