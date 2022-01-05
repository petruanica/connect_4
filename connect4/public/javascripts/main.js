'use strict';
// @ts-check

import { Game } from "./game.js";
import { config } from "./config.js";

// check if page was reloaded; if yes, redirect to splash screen
if (window.performance.getEntriesByType('navigation').map((nav) => nav.type).includes('reload')) {
    window.location.href = "./";
}


const message = document.querySelector("#message");

const socket = new WebSocket(config.WEB_SOCKET_URL);

let game;

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log(data);
    if (data.event == "playersConnected") {
        message.innerHTML = data.playersGame;
    } else if (data.event == "makeMove") {
        console.log("I have to make a move at column", data.column);
        game.placeColumn(data.column);
    } else if (data.event == "setColor") {
        console.log("I am " + data.color);
        const playerColor = data.color;
        const playerNames = document.querySelectorAll(".player-div span");

        if (playerColor == 'red') {
            playerNames[0].innerHTML = "You";
            playerNames[1].innerHTML = "Other";
        } else {
            playerNames[0].innerHTML = "Other";
            playerNames[1].innerHTML = "You";
        }
        startGame(playerColor);
    } else if (data.event == "gameWonByOTher") {
        game.handleWonGame(data.positions, data.color);
    }
    // else if (data.event == "gameEndedByDisconnect") {
    //     game.gameEnded = true;
    //     game.handleWonGame();
    //     console.log("gameEndedByDisconnect");
    // }
}

socket.onopen = () => {
    const data = {
        "event": "gameStart",
        "message": "Hello from a game!"
    }
    socket.send(JSON.stringify(data));
};


function startGame(playerColor) {
    console.log(playerColor);

    game = new Game(socket, playerColor);

    const resetButton = document.querySelector('#reset-board');
    resetButton.addEventListener('click', () => game.resetGame()); // don't lose this https://javascript.info/bind
}


export function turnTimePenalty() {
    game.addTimePenalty();
}