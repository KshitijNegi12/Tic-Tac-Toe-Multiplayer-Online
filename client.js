function getname(){
    document.getElementById('start').style.display='none';
    document.getElementById('name').style.display='flex';
    document.getElementById('head').style.display='block';

}

let clientId
let gameId
let isTurn = false
let yourSymbol
let socket;
let board;
let game

const connectBtn = document.getElementById('connectBtn')
const newGameBtn = document.getElementById('newGame')
const currGames = document.getElementById('currGames')
const joinGame = document.querySelector('button[type="submit"]')
const cells = document.querySelectorAll('#cell')
const gameBoard = document.querySelector('#board')
const userCol = document.querySelector('.flex-col1')

connectBtn.addEventListener('click', () => {
    socket = new WebSocket('ws://localhost:8080')
    // socket = new WebSocket('wss://pyrite-sulfuric-twill.glitch.me')

    socket.onopen = function(event) {
        connectBtn.disabled = true;
    }
    newGameBtn.addEventListener('click', () => {
        const payLoad = {
            'method': 'create',
            'clientId': clientId
        }

        socket.send(JSON.stringify(payLoad))
        newGameBtn.disabled = true;
        joinGame.disabled = true;
    })

    socket.onmessage = function(msg) {
        const data = JSON.parse(msg.data)
        switch (data.method) {
            case 'connect':
                clientId = data.clientId
                userCol.innerHTML = `UserId: ${clientId}`
                userCol.classList.add('joinLabel')
                break
            case 'create':
                gameId = data.game.gameId
                yourSymbol = data.game.players[0].symbol
                console.log(`game id is ${gameId} and your symbol is ${yourSymbol}`)
                cells.forEach(cell => {
                    cell.classList.remove('x')
                    cell.classList.remove('circle')
                })
                break
            case 'gamesAvail':
                while (currGames.firstChild) {
                    currGames.removeChild(currGames.lastChild)
                }
                const games = data.games
                games.forEach((game) => {
                    const li = document.createElement('li')
                    li.addEventListener('click', selectGame)
                    li.innerText = game
                    currGames.appendChild(li)
                })
                break
            case 'join':
                gameId = data.game.gameId
                yourSymbol = data.game.players[1].symbol
                console.log(`game id is ${gameId} and your symbol is ${yourSymbol}`)
                cells.forEach(cell => {
                    console.log(`cell classes are ${cell.classList}`)
                    cell.classList.remove('x')
                    cell.classList.remove('circle')
                })
                newGameBtn.disabled = true;
                joinGame.disabled = true;
                break
            case 'updateBoard':
                gameBoard.style.display = "grid"
                console.log(`game updateBoard is ${data.game.board}`)
                game = data.game
                board = game.board
                const symbolClass = yourSymbol == 'x' ? 'x' : 'circle'
                gameBoard.classList.add(symbolClass)
                index = 0
                cells.forEach(cell => {
                    if (board[index] == 'x')
                        cell.classList.add('x')
                    else if (board[index] == 'o')
                        cell.classList.add('circle')
                    else
                        cell.addEventListener('click', clickCell)
                    index++
                })

                game.players.forEach((player) => {
                    if (player.clientId == +clientId && player.isTurn == true) {
                        isTurn = true
                        console.log(`your turn`)
                    }
                })
                break
            case 'gameEnds':
                console.log(`Winner is ${data.winner}`)
                window.alert(`Winner is ${data.winner}`)
                location.reload();  // Refresh the page
                break
            case 'draw':
                alert('Its a draw')
                location.reload();  // Refresh the page
                break
            case 'refresh':
                location.reload();  // Refresh the page
                break
        }
    }

    socket.onclose = function(event) {
        location.reload();  // Refresh the page if connection is closed
    }

    socket.onerror = function(err) {
        console.error(err)
    }
})

function selectGame(src) {
    gameId = +src.target.innerText
    joinGame.addEventListener('click', joingm, { once: true })
}

function joingm() {
    const payLoad = {
        'method': 'join',
        'clientId': clientId,
        'gameId': gameId
    }
    socket.send(JSON.stringify(payLoad))
    newGameBtn.disabled = true;
    joinGame.disabled = true;
}

function clickCell(event) {
    if (!isTurn || event.target.classList.contains('x') || (event.target.classList.contains('circle')))
        return

    const cellclass = yourSymbol == 'x' ? 'x' : 'circle'
    event.target.classList.add(cellclass)

    index = 0
    cells.forEach(cell => {
        if (cell.classList.contains('x'))
            board[index] = 'x'
        if (cell.classList.contains('circle'))
            board[index] = 'o'
        index++
    })
    isTurn = false
    makeMove()
}

function makeMove() {
    index = 0
    cells.forEach((cell) => {
        if (cell.classList.contains('x'))
            game.board[index] == 'x'

        if (cell.classList.contains('circle'))
            game.board[index] == 'o'
        index++
    })
    cells.forEach(cell => cell.removeEventListener('click', clickCell))
    const payLoad = {
        'method': 'makeMove',
        'game': game
    }
    socket.send(JSON.stringify(payLoad))
}
