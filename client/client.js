// Prevents text selection
document.addEventListener('selectstart', function(event) {
    event.preventDefault(); 
});

document.querySelector('.end button').addEventListener('click', (e)=>{
    location.reload();
})

function startGame(){
    document.getElementsByClassName('first-page')[0].style.display='none';
    document.getElementById('head').style.display='block';
    document.getElementsByClassName('main-page')[0].style.display='flex';
}

let clientId;
let gameId;
let isTurn = false;
let yourSymbol;
let socket;
let board;
let game;
let move = 0;

const connectBtn = document.querySelector('.first-page>button');
const newGameBtn = document.getElementById('new-game');
const currGames = document.getElementById('currGames');
const joinGame = document.querySelector('#join');
const cells = document.querySelectorAll('.cell');
const gameBoard = document.querySelector('#board');
const userCol = document.querySelector('.user-info');
const selected = document.getElementById('selected');
const endPage = document.getElementsByClassName('end')[0];
const endMsg = document.querySelector('.end p');
const gameStatus = document.getElementsByClassName('gameStatus')[0];


connectBtn.addEventListener('click', () => {
    socket = new WebSocket('ws://vine-wandering-vertebra.glitch.me');

    socket.onopen = function(event) {
        // console.log('connected');
        connectBtn.disabled = true;
    }

    newGameBtn.addEventListener('click', () => {
        const payLoad = {
            'method': 'createGame',
            'clientId': clientId
        }        
        socket.send(JSON.stringify(payLoad));
        disableButtons();
    })

    socket.onmessage = function(msg) {
        const data = JSON.parse(msg.data);
        switch (data.method) {
            case 'newClient':
                clientId = data.clientId;
                userCol.innerHTML = `User ID: ${clientId}`
                break
            case 'create':
                gameId = data.game.gameId
                yourSymbol = data.game.players[0].symbol
                break
            case 'gamesAvail':
                while (currGames.firstChild) {
                    currGames.removeChild(currGames.lastChild)
                }
                const games = data.games
                if(games.length == 0){
                    const nogame = document.createElement('li')
                    nogame.setAttribute('class','nogame')
                    nogame.innerText = 'No Games'
                    currGames.appendChild(nogame)
                }
                games.forEach((game) => {
                    const newgame = document.createElement('li')
                    newgame.setAttribute('class',game)
                    newgame.addEventListener('click', selectGame)
                    newgame.innerText = game
                    currGames.appendChild(newgame)
                })
                break
            case 'join':
                gameId = data.game.gameId
                yourSymbol = data.game.players[1].symbol
                cells.forEach(cell => {
                    cell.classList.remove('x')
                    cell.classList.remove('o')
                })
                disableButtons()
                break
            case 'updateBoard':
                if(move%2 == 0){
                    gameStatus.textContent = 'X to Move.'
                }
                else{
                    gameStatus.textContent = 'O to Move.'
                }
                move++
                game = data.game
                board = game.board
                const symbolClass = yourSymbol == 'x' ? 'x' : 'o'
                gameBoard.classList.add(symbolClass)
                index = 0
                cells.forEach(cell => {
                    if (board[index] == 'x')
                        cell.classList.add('x')
                    else if (board[index] == 'o')
                        cell.classList.add('o')
                    else
                        cell.addEventListener('click', clickCell)
                    index++
                })

                game.players.forEach((player) => {
                    if (player.clientId == +clientId && player.isTurn == true) {
                        isTurn = true
                    }
                })

                break
            case 'gameEnds':
                endMsg.textContent = `Bravo, Winner is 🏆${data.winner} 🏆`
                endPage.style.display = 'flex'
                break
            case 'draw':
                endMsg.textContent = 'Oh, Its a draw';
                endPage.style.display = 'flex';
                break
            case 'taken':
                endMsg.textContent = 'Game has already started. Please try again.'
                endPage.style.display = 'flex';
                break;
            case 'surrender':
                endMsg.textContent ='You Won, Opponent has surrendered.'
                endPage.style.display = 'flex';
                break;
        }
    }

    
    socket.onerror = function(err) {
        console.error(err)
        endMsg.textContent = 'Error in Connection, Please Try Again Later.'
        endPage.style.display = 'flex';
    }

    socket.onclose = function(event) {   
        // location.reload();
    }
})

function selectGame(src) {
    gameId = +src.target.innerText;
    selected.textContent = gameId;
    joinGame.addEventListener('click', joingm, { once: true });
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
    if (!isTurn || event.target.classList.contains('x') || (event.target.classList.contains('o')))
        return

    const cellclass = yourSymbol == 'x' ? 'x' : 'o'
    event.target.classList.add(cellclass)

    index = 0
    cells.forEach(cell => {
        if (cell.classList.contains('x'))
            board[index] = 'x'
        if (cell.classList.contains('o'))
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

        if (cell.classList.contains('o'))
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

function disableButtons(){
    newGameBtn.disabled = true;
    newGameBtn.style.opacity = .7;
    newGameBtn.style.cursor = 'not-allowed';
    joinGame.disabled = true;
    joinGame.style.opacity = .7;
    joinGame.style.cursor = 'not-allowed';
    currGames.style.pointerEvents = 'none';
    selected.textContent = 'None';
}