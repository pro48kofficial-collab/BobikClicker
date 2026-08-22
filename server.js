const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Робимо корінь доступним для статичних файлів (index.html)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let players = {};

io.on('connection', (socket) => {
    console.log(`Гравець підключився: ${socket.id}`);

    socket.on('join-game', (data) => {
        players[socket.id] = { id: socket.id, ...data };
    });

    socket.on('update-stats', (data) => {
        if (players[socket.id]) {
            players[socket.id] = { ...players[socket.id], ...data };
        }
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
        console.log(`Гравець вийшов: ${socket.id}`);
    });
});

// Глобальний таймер для пасивного доходу та топів (кожну секунду)
setInterval(() => {
    let list = Object.values(players);
    if (list.length === 0) return;

    let topCoins = [...list].sort((a, b) => b.coins - a.coins);
    let topPassive = [...list].sort((a, b) => b.passive - a.passive);
    let kingId = topCoins.length > 0 ? topCoins[0].id : null;

    list.forEach(p => {
        let mult = (p.id === kingId) ? 2 : 1;
        if (p.passive > 0) {
            p.coins += Math.floor(p.passive * mult);
        }
    });

    io.emit('game-state', {
        players: players,
        kingId: kingId,
        topCoins: topCoins.slice(0, 10),
        topPassive: topPassive.slice(0, 10)
    });
}, 1000);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Сервер успішно запущено на порту ${PORT}`);
});
