import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';  

const app = express();
const port = 8080;
const games = {};
const clients = {};
const CROSS_SYMBOL = 'x';
const CIRCLE_SYMBOL = 'o';
const WIN_STATES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const httpServer = http.createServer(app);
const socketServer = new WebSocketServer({ server: httpServer });

socketServer.on('connection', (connection) => {
  const clientId = generateClientId();
  clients[clientId] = { 'clientId': clientId, 'connection': connection };

  connection.send(JSON.stringify({ 'method': 'connect', 'clientId': clientId }));
  sendAvailableGames();

  connection.on('message', (message) => messageHandler(message, clientId));

  connection.on('close', () => handleDisconnection(clientId));

  connection.on('error', (err) => console.error('WebSocket error:', err));
});

httpServer.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

function generateClientId() {
  return Math.round(Math.random() * 100) + Math.round(Math.random() * 100) + Math.round(Math.random() * 100);
}

function handleDisconnection(clientId) {
  for (const gameId in games) {
    if (games[gameId].players[0].clientId === clientId) {
      delete games[gameId];
      sendAvailableGames();
      break;
    }
  }
  delete clients[clientId];
}

function messageHandler(message, clientId) {
  const msg = JSON.parse(message.toString());
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
      const gameId = generateClientId();
      const board = ['', '', '', '', '', '', '', '', ''];
      games[gameId] = {
        'gameId': gameId,
        'players': [player],
        'board': board
      };
      const createPayLoad = { 'method': 'create', 'game': games[gameId] };
      clients[msg.clientId].connection.send(JSON.stringify(createPayLoad));
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
      sendAvailableGames();
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

      if (checkWinCondition(playerSymbol, msg.game.gameId)) {
        declareWinner(playerSymbol, msg.game.gameId);
      } else if (checkDrawCondition(msg.game.gameId)) {
        declareDraw(msg.game.gameId);
      } else {
        switchTurns(msg.game.gameId);
        makeMove(games[msg.game.gameId]);
      }
      break;
  }
}

function checkWinCondition(symbol, gameId) {
  return WIN_STATES.some((row) => row.every((cell) => games[gameId].board[cell] === symbol));
}

function checkDrawCondition(gameId) {
  return games[gameId].board.every(cell => cell === 'x' || cell === 'o');
}

function declareWinner(symbol, gameId) {
  const winPayLoad = { 'method': 'gameEnds', 'winner': symbol };
  games[gameId].players.forEach(player => {
    if (clients[player.clientId]) {
      clients[player.clientId].connection.send(JSON.stringify(winPayLoad));
    }
  });
  setTimeout(() => refreshGame(gameId), 3000);
}

function declareDraw(gameId) {
  const drawPayLoad = { 'method': 'draw' };
  games[gameId].players.forEach(player => {
    if (clients[player.clientId]) {
      clients[player.clientId].connection.send(JSON.stringify(drawPayLoad));
    }
  });
  setTimeout(() => refreshGame(gameId), 3000);
}

function switchTurns(gameId) {
  games[gameId].players.forEach(player => player.isTurn = !player.isTurn);
}

function makeMove(game) {
  const payLoad = { 'method': 'updateBoard', 'game': game };
  game.players.forEach((player) => {
    if (clients[player.clientId]) {
      clients[player.clientId].connection.send(JSON.stringify(payLoad));
    }
  });
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
