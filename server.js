const http = require('http');
const WebSocket = require('websocket').server;
const games = {};
const clients = {};
const CROSS_SYMBOL = 'x';
const CIRCLE_SYMBOL = 'o';
const WIN_STATES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], 
  [0, 3, 6], [1, 4, 7], [2, 5, 8], 
  [0, 4, 8], [2, 4, 6]
];

const httpServer = http.createServer((request, response) => {
  //
});

const socketServer = new WebSocket({ 'httpServer': httpServer });
socketServer.on('request', request => {
  const connection = request.accept(null, request.origin);
  const clientId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100);
  clients[clientId] = { 'clientId': clientId, 'connection': connection };

  connection.on('open', connectionOpened);
  connection.on('close', () => {
    for (const gameId in games) {
      if (games[gameId].players[0].clientId === clientId) {
        delete games[gameId];
        sendAvailableGames();
        break;
      }
    }
    delete clients[clientId];
  });
  connection.on('message', messageHandler);

  connection.send(JSON.stringify({ 'method': 'connect', 'clientId': clients[clientId].clientId }));
  sendAvailableGames();
});

httpServer.listen(8080, () => { console.log('server listening on port 8080') });

function connectionOpened() {
  connection.send('connection with server opened');
}

function messageHandler(message) {
  const msg = JSON.parse(message.utf8Data);
  let player = {};
  switch (msg.method) {
    case 'create':
      player = {
        'clientId': msg.clientId,
        'symbol': CROSS_SYMBOL,
        'isTurn': true,
        'wins': 0,
        'lost': 0
      };
      const gameId = Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100);
      const board = ['', '', '', '', '', '', '', '', ''];
      games[gameId] = {
        'gameId': gameId,
        'players': [player],
        'board': board
      };
      const createPayLoad = {
        'method': 'create',
        'game': games[gameId]
      };
      const conn = clients[msg.clientId].connection;
      conn.send(JSON.stringify(createPayLoad));
      sendAvailableGames();
      break;
    case 'join':
      player = {
        'clientId': msg.clientId,
        'symbol': CIRCLE_SYMBOL,
        'isTurn': false,
        'wins': 0,
        'lost': 0
      };
      games[msg.gameId].players.push(player);

      clients[msg.clientId].connection.send(JSON.stringify({
        'method': 'join',
        'game': games[msg.gameId]
      }));

      makeMove(games[msg.gameId]);
      sendAvailableGames(); // Add this line to refresh the available games list
      break;
    case 'makeMove':
      games[msg.game.gameId].board = msg.game.board;

      let currPlayer;
      let playerSymbol;
      msg.game.players.forEach((player) => {
        if (player.isTurn) {
          currPlayer = player.clientId;
          playerSymbol = player.symbol;
        }
      });
      let isWinner = false;
      isWinner = WIN_STATES.some((row) => {
        return row.every((cell) => games[msg.game.gameId].board[cell] === playerSymbol);
      });
      if (isWinner) {
        const winPayLoad = {
          'method': 'gameEnds',
          'winner': playerSymbol
        };
        games[msg.game.gameId].players.forEach(player => {
          if (clients[player.clientId]) {
            clients[player.clientId].connection.send(JSON.stringify(winPayLoad));
          }
        });
        setTimeout(() => {
          refreshGame(msg.game.gameId);
        }, 3000); // Ensure this delay is enough for message to be processed
        break;
      } else {
        const isDraw = games[msg.game.gameId].board.every(cell => cell === 'x' || cell === 'o');
        if (isDraw) {
          const drawPayLoad = {
            'method': 'draw'
          };
          games[msg.game.gameId].players.forEach(player => {
            if (clients[player.clientId]) {
              clients[player.clientId].connection.send(JSON.stringify(drawPayLoad));
            }
          });
          setTimeout(() => {
            refreshGame(msg.game.gameId);
          }, 3000); // Ensure this delay is enough for message to be processed
          break;
        }
      }
      games[msg.game.gameId].players.forEach((player) => {
        player.isTurn = !player.isTurn;
      });
      makeMove(games[msg.game.gameId]);
      break;
  }
}

function refreshGame(gameId) {
  if (games[gameId]) {
    games[gameId].players.forEach(player => {
      if (clients[player.clientId]) {
        clients[player.clientId].connection.send(JSON.stringify({ 'method': 'refresh' }));
      }
    });
  }
}

function makeMove(game) {
  const payLoad = {
    'method': 'updateBoard',
    'game': game
  };
  game.board.forEach(cell => console.log(`  ${cell}`));
  game.players.forEach((player) => {
    console.log(`player ${player.clientId}`);
    if (clients[player.clientId]) {
      clients[player.clientId].connection.send(JSON.stringify(payLoad));
    }
  });
}

function sendAvailableGames() {
  const allGames = [];
  for (const k of Object.keys(games)) {
    if (games[k].players.length < 2) {
      allGames.push(games[k].gameId);
    }
  }
  const payLoad = { 'method': 'gamesAvail', 'games': allGames };
  for (const c of Object.keys(clients)) {
    clients[c].connection.send(JSON.stringify(payLoad));
  }
}
