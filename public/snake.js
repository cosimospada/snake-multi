(() => {
    const canvas = document.getElementById('game');
    const ctx = canvas.getContext('2d');
    const scoreEl = document.getElementById('score');
    const nameEl = document.getElementById('playerName');
    const resetBtn = document.getElementById('resetBtn');
    const explosionSound = new Audio('explosion.mp3');
    explosionSound.volume = 0.5; // adjust as needed

    const FRUIT_TYPES = [
        'apple.png', 'banana.png', 'cake.png', 'cherries.png', 'chicken.png',
        'doughnut.png', 'firecracker.png', 'hamburger.png', 'hotdog.png', 'pizza.png'
    ];
    const fruitImages = {};
    for (const fruit of FRUIT_TYPES) {
        const img = new Image();
        img.src = 'food/' + fruit;
        fruitImages[fruit] = img;
    }

    // Warn if opened locally instead of over HTTP(S)
    if (location.protocol !== 'http:' && location.protocol !== 'https:') {
        alert('Open the shared HTTPS ngrok URL. Do not open this file directly.');
    }

    // Connect explicitly to the same origin the page came from (works with ngrok)
    const socket = io(window.location.origin, {
        // Allow fallbacks (polling) in case WebSockets are blocked by a proxy
        // transports: ['websocket'],
        path: '/socket.io'
    });

    let state = null; // { grid, food, players: [{id,color,body,alive,score}] }
    let me = {id: null, color: '#6cf'};
    let paused = false;

    let nextStateTime = 0;
    let serverTickInterval = 100; // fallback, will be updated

    let ring = null; // {x, y, start: timestamp}
    const RING_DURATION = 400; // ms

    // Mouse click: emit le bomb event to server
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const gridX = state.grid.x;
        const gridY = state.grid.y;
        const cellX = canvas.width / gridX;
        const cellY = canvas.height / gridY;
        const gx = x / cellX;
        const gy = y / cellY;
        socket.emit('ring', {gx, gy});
    });

    // Listen for ring events from server (from any player)
    socket.on('ring', ({gx, gy}) => {
        // Play explosion sound"
        try {
            explosionSound.pause();
            explosionSound.currentTime = 0;
            explosionSound.play();
        } catch (e) {}
        const gridX = state.grid.x;
        const gridY = state.grid.y;
        const cellX = canvas.width / gridX;
        const cellY = canvas.height / gridY;
        const x = gx * cellX;
        const y = gy * cellY;
        ring = {x, y, start: performance.now()};
        requestAnimationFrame(drawRingAnim);
    });


    // Socket diagnostics
    socket.on('connect', () => console.log('[socket] connected', socket.id));
    socket.on('disconnect', (reason) => console.log('[socket] disconnected', reason));
    socket.on('connect_error', (err) => console.error('[socket] connect_error', err));
    socket.on('serverInfo', (info) => console.log('[serverInfo]', info));

    // UI events
    resetBtn.addEventListener('click', () => socket.emit('respawn'));

    function sendDir(x, y) {
        socket.emit('input', {x, y});
    }

    // Keyboard input
    window.addEventListener('keydown', (e) => {
        switch (e.key) {
            case 'ArrowUp':
            case 'w':
            case 'W':
                sendDir(0, -1);
                break;
            case 'ArrowDown':
            case 's':
            case 'S':
                sendDir(0, 1);
                break;
            case 'ArrowLeft':
            case 'a':
            case 'A':
                sendDir(-1, 0);
                break;
            case 'ArrowRight':
            case 'd':
            case 'D':
                sendDir(1, 0);
                break;
        }
    });

    // Touch (swipe)
    let touchStart = null;
    canvas.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
    }, {passive: true});
    canvas.addEventListener('touchend', (e) => {
        if (!touchStart) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - touchStart.x;
        const dy = t.clientY - touchStart.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
            if (Math.abs(dx) > Math.abs(dy)) sendDir(Math.sign(dx), 0);
            else sendDir(0, Math.sign(dy));
        }
        touchStart = null;
    });

    // Lifecycle events from server
    socket.on('joined', (info) => {
        me.id = info.playerId;
        me.color = info.color;
        if (info.name) {
            const playerNameEl = document.getElementById('playerName');
            if (playerNameEl) playerNameEl.textContent = info.name;
        }
        console.log('[joined]', info);
    });

    // Set canvas size so that grid cells are always square, but the canvas is rectangular
    function resizeCanvasToGrid() {
        if (!state || !state.grid) return;
        const gridX = state.grid.x;
        const gridY = state.grid.y;
        // Use the available window size, but keep cells square
        // Use the smaller cell size that fits both width and height
        const maxWidth = Math.min(window.innerWidth - 40, 900);
        const maxHeight = Math.min(window.innerHeight - 180, 900);
        const cellSize = Math.floor(Math.min(maxWidth / gridX, maxHeight / gridY));
        canvas.width = cellSize * gridX;
        canvas.height = cellSize * gridY;
    }

    // Call resize on state update and window resize
    window.addEventListener('resize', resizeCanvasToGrid);

    socket.on('state', (s) => {
        state = s;
        resizeCanvasToGrid();
        const meState = s.players.find(p => p.id === me.id);
        if (meState) scoreEl.textContent = meState.score;
        updateLeaderboard(s.leaderboard);
        if (!paused) draw();
    });

    socket.on('full', () => {
        alert('Room is full (max 12 players). Try again later.');
    });

    function drawExplosionRing(x, y, radius, alpha) {
        // Jagged explosion outline
        const points = 32;
        const jag = 0.18; // jaggedness factor (0-1)
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = (i / points) * 2 * Math.PI;
            // Randomize radius for jagged effect
            const r = radius * (1 + (Math.random() - 0.5) * jag);
            const px = x + Math.cos(angle) * r;
            const py = y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        // Radial gradient for fiery color
        const grad = ctx.createRadialGradient(x, y, radius * 0.2, x, y, radius);
        grad.addColorStop(0, `rgba(255,255,180,${alpha})`); // white/yellow
        grad.addColorStop(0.3, `rgba(255,200,40,${alpha})`); // yellow/orange
        grad.addColorStop(0.7, `rgba(255,80,0,${alpha * 0.8})`); // orange/red
        grad.addColorStop(1, `rgba(180,30,0,${alpha * 0.5})`); // dark red
        ctx.strokeStyle = grad;
        ctx.lineWidth = 6;
        ctx.shadowColor = `rgba(255,120,0,${alpha * 0.7})`;
        ctx.shadowBlur = 18;
        ctx.stroke();
        ctx.restore();
    }

    function draw() {
        if (!state) return;
        const gridX = state.grid.x;
        const gridY = state.grid.y;
        const cellX = canvas.width / gridX;
        const cellY = canvas.height / gridY;

        // background
        ctx.fillStyle = '#283c09';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // grid lines
        ctx.strokeStyle = '#486c11';
        ctx.lineWidth = 1;
        for (let i = 1; i < gridX; i++) {
            const p = i * cellX;
            ctx.beginPath();
            ctx.moveTo(p, 0);
            ctx.lineTo(p, canvas.height);
            ctx.stroke();
        }
        for (let i = 1; i < gridY; i++) {
            const p = i * cellY;
            ctx.beginPath();
            ctx.moveTo(0, p);
            ctx.lineTo(canvas.width, p);
            ctx.stroke();
        }

        // fruits (draw each as an image)
        if (Array.isArray(state.food)) {
            for (const fruit of state.food) {
                const img = fruitImages[fruit.type];
                if (img && img.complete) {
                    ctx.drawImage(
                        img,
                        fruit.x * cellX - cellX * 0.25,
                        fruit.y * cellY - cellY * 0.25,
                        cellX * 1.5,
                        cellY * 1.5
                    );
                } else {
                    // fallback: draw a colored square if image not loaded
                    ctx.fillStyle = '#ef4444';
                    roundRect(ctx, fruit.x * cellX, fruit.y * cellY, cellX, cellY, 4, true);
                }
            }
        } else if (state.food) {
            // fallback for old state: draw a red square
            ctx.fillStyle = '#ef4444';
            roundRect(ctx, state.food.x * cellX, state.food.y * cellY, cellX, cellY, 4, true);
        }
        // snakes
        let imSoDead = false;
        for (const pl of state.players) {
            if (pl.id === me.id && !pl.alive) imSoDead = true;
            if (!pl.alive) continue; // Only draw alive snakes
            for (let i = 0; i < pl.body.length; i++) {
                const seg = pl.body[i];
                // Skeuomorphic gradient for snake segments
                const grad = ctx.createLinearGradient(
                    seg.x * cellX, seg.y * cellY, (seg.x + 1) * cellX, (seg.y + 1) * cellY
                );
                // Main color
                grad.addColorStop(0, shadeColor(pl.color, -18));
                grad.addColorStop(0.4, pl.color);
                grad.addColorStop(0.7, shadeColor(pl.color, 18));
                grad.addColorStop(1, shadeColor(pl.color, 32));
                ctx.fillStyle = grad;
                roundRect(ctx, seg.x * cellX, seg.y * cellY, cellX, cellY, 5, true);
                // Optional: subtle inner shadow
                ctx.save();
                ctx.globalAlpha = 0.18;
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 2;
                roundRect(ctx, seg.x * cellX + 1, seg.y * cellY + 1, cellX - 2, cellY - 2, 4, false);
                ctx.restore();
            }
        }
        // My death overlay (draw after all snakes, if I'm dead)
        if (imSoDead) {
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 28px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('You Died', canvas.width / 2, canvas.height / 2 - 10);
            ctx.font = '16px system-ui, sans-serif';
            ctx.fillText('Press Respawn to rejoin', canvas.width / 2, canvas.height / 2 + 20);
        }
    }

    function roundRect(ctx, x, y, w, h, r, fill) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        if (fill) ctx.fill();
    }

    function drawRingAnim(now) {
        if (!ring) return;
        const elapsed = now - ring.start;
        if (elapsed > RING_DURATION) {
            ring = null;
            if (!paused && state) draw(); // Redraw to clear ring
            return;
        }
        if (!paused && state) draw(); // Redraw game
        // Draw explosion ring on top
        const progress = elapsed / RING_DURATION;
        const maxRadius = 40;
        const radius = 16 + progress * (maxRadius - 16);
        const alpha = 1 - progress;
        drawExplosionRing(ring.x, ring.y, radius, alpha);
        requestAnimationFrame(drawRingAnim);
    }

    function updateLeaderboard(leaderboard) {
        const el = document.getElementById('leaderboard');
        if (!el) return;
        if (!Array.isArray(leaderboard)) {
            el.innerHTML = '';
            return;
        }
        let html = '<h2>Leaderboard</h2><table><thead><tr><th></th><th>Segments</th><th>Respawns</th></tr></thead><tbody>';
        for (const entry of leaderboard) {
            html += `<tr${entry.alive ? '' : ' class="dead"'}>`;
            html += `<td><span style="display:inline-block;width:1em;height:1em;background:${entry.color};border-radius:50%;margin-right:0.5em;"></span>${entry.name ? entry.name : entry.id.slice(0, 6)}</td>`;
            html += `<td>${entry.segments}</td>`;
            html += `<td>${entry.respawns}</td>`;
            html += '</tr>';
        }
        html += '</tbody></table>';
        el.innerHTML = html;
    }

    // Utility: shade a color by percent (positive=lighter, negative=darker)
    function shadeColor(color, percent) {
        // Accepts color as hsl() or hex
        let r, g, b;
        if (color.startsWith('hsl')) {
            // Parse hsl(h s% l%)
            const m = color.match(/hsl\((\d+)[^\d]+(\d+)%[^\d]+(\d+)%/);
            if (m) {
                let h = +m[1], s = +m[2], l = +m[3];
                l = Math.max(0, Math.min(100, l + percent));
                return `hsl(${h} ${s}% ${l}%)`;
            }
        } else if (color[0] === '#') {
            // Parse hex
            let c = color.substring(1);
            if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
            r = parseInt(c.substring(0, 2), 16);
            g = parseInt(c.substring(2, 4), 16);
            b = parseInt(c.substring(4, 6), 16);
            r = Math.min(255, Math.max(0, r + Math.round(2.55 * percent)));
            g = Math.min(255, Math.max(0, g + Math.round(2.55 * percent)));
            b = Math.min(255, Math.max(0, b + Math.round(2.55 * percent)));
            return `rgb(${r},${g},${b})`;
        }
        return color;
    }

})();
