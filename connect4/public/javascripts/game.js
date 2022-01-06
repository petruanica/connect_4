'use strict';
// @ts-check

import { resetTurnTimer, stopTimers } from "./timer.js";
import { Board } from "./board.js";

const resetButton = document.querySelector('#rematch-button');
const wonMessageText = document.querySelector('#win-message');
const winMethodText = document.querySelector("#win-method");
const circleYou = document.querySelectorAll(".player-turn")[0]; // you
const circleOpponent = document.querySelectorAll(".player-turn")[1]; // other
const warningYou = document.querySelectorAll(".player-info")[0]; // you
const warningOpponent = document.querySelectorAll(".player-info")[1]; // other

warningOpponent.style.display = "none";
warningYou.style.display = 'none';


function endAnimation(element) {
    element.style.display = "none";
    element.className = "player-info";
    console.log("animation ended!");
}

warningYou.addEventListener('webkitAnimationEnd', (e) => endAnimation(warningYou), false); // sa termin animatia
warningOpponent.addEventListener('webkitAnimationEnd', (e) => endAnimation(warningOpponent), false); // sa termin animatia

export class Game {
    constructor(socket, turnColor) {
        this.socket = socket;
        this.board = new Board();
        this.board.initializeBoard();
        this.gameEnded = false;
        this.addClickEvents();
        this.myTurnColor = turnColor;
        this.generalTurnColor = 'red';

        if (turnColor == "red")
            this.board.makeBoardActive();
        this.timePenalties = {
            "red": 0,
            "orange": 0
        };
        this.updateCirclesBasedOnColor('red'); // red is the first player
    }


    /**
     * Moves the circle display based on the current game color turn
     * @param {string} newColor 
     */
    updateCirclesBasedOnColor(newColor) {
        circleYou.style.display = "none";
        circleOpponent.style.display = "none";
        console.log("Current color is:", newColor);
        if (newColor == this.myTurnColor){
            circleYou.style.display = "block";
        }
        else{
            circleOpponent.style.display = "block";
        }
    }



    /**
     * add click events to the board columns
     */
    addClickEvents() {
        const columns = document.querySelectorAll('.board-column');
        let columnIndex = 0;
        for (const column of columns) {
            const click = this.clickColumn.bind(this, columnIndex);
            column.addEventListener('click', click);
            columnIndex++;
        }
    }



    /**
     * Changes the style of the winning pieces by applying an animation to them
     *
     * @param {number} column
     * @param {number} row
     */
    changeWinningPieceStyle(column, row) {
        let winColor = this.board.boardPieces[column][row].currentColor;
        this.board.boardPieces[column][row].className += ' win-animation-' + winColor;
    }

    /**
     * fuction triggered when the game was won
     * it displays the win message and the player who won and highlights the won positions
     * @param {Array} positions an array of the winning piece positions
     * @param {String} winningColor the color that won the game
     */
    handleWonGame(positions, winningColor) {
        this.gameEnded = true;
        for (const pos of positions) {
            this.changeWinningPieceStyle(pos.col, pos.row);
        }
        wonMessageText.style.display = 'block';
        winMethodText.innerHTML = "Click the rematch button to play again. ";
        document.querySelector('#win-player').innerHTML = winningColor;
        stopTimers();
        this.board.makeBoardInactive();
    }


    handleGameEndByTimePenalty() {
        this.gameEnded = true;
        wonMessageText.style.display = 'block';
        resetButton.style.display = "none";
        if (this.generalTurnColor == this.myTurnColor) {
            winMethodText.innerHTML = "Your opponent ran out of time and was kicked out of the game. ";
        } else {
            winMethodText.innerHTML = "You ran out of time and were kicked out of the game. ";
        }
        document.querySelector('#win-player').innerHTML = this.generalTurnColor;
        stopTimers();
        this.board.makeBoardInactive();
    }

    handleGameEndByDisconnect() {
        this.gameEnded = true;
        wonMessageText.style.display = 'block';
        resetButton.style.display = "none";
        winMethodText.innerHTML = "Your opponent abandoned the match. ";
        document.querySelector('#win-player').innerHTML = this.myTurnColor;
        stopTimers();
        this.board.makeBoardInactive();
    }


    /**
     * Click made by me or by a random move because my turn has passed
     * @param {number} column 
     * @param {boolean} randomClicked boolean that says if the click was random or not
     */
    clickColumn(column, randomClicked = false) {
        // player clicks on the column

        if (this.gameEnded == true) {
            return;
        }
        if (this.generalTurnColor != this.myTurnColor) {
            console.log(`You can't click because is not your turn!. General turn color is ${this.generalTurnColor} and your color is ${this.myTurnColor}`);
            return;
        }
        const row = this.placeColumn(column);
        if (row == undefined)
            return; // it did not change the board

        let data = {
            "event": "move",
            "column": column,
            "randomClicked": randomClicked
        }
        console.log("I am sending the move to the other player", data);
        this.socket.send(JSON.stringify(data));

        const [outcome, positions] = this.board.checkWin(column, row, this.myTurnColor);
        console.log('Game ended is: ', outcome);
        if (outcome == true) {
            this.handleWonGame(positions, this.myTurnColor);
            data = {
                "event": "gameWon",
                "positions": positions,
                "color": this.myTurnColor,
            }
            this.socket.send(JSON.stringify(data));
        }
    }

    /**
     * Handles click event on column made by the opponent that either clicked or the time passed
     * @param {number} column
     * @return {function} a function that manages the click
     */
    placeColumn(column,randomClicked) {
        const row = this.board.placePiece(column, this.generalTurnColor);
        console.log("Placing on column!",randomClicked);
        if(randomClicked == true){
            console.log('%c Display warning for other', 'color: #bada55');
            this.displayWarningForOther(); // display warning for other player
        }
        this.changeGlobalTurn();
        if (row == undefined) {
            return undefined;
        }
        return row;
    }

    opponentColor(){
        if(this.myTurnColor == 'red')
            return 'orange';
        return 'red';
    }
    /**
     * Places a piece on a random column on my board 
     */
    clickRandomColumn() {
        let randomIndex;
        do {
            randomIndex = Math.floor(Math.random() * this.board.columns);
        } while (this.board.lastCellColumn[randomIndex] >= this.board.rows);
        this.clickColumn(randomIndex,true);
    }

    displayWarningForMe(){
        this.timePenalties[this.myTurnColor]++;
        const count = this.timePenalties[this.myTurnColor];
        console.log(this.timePenalties);
        warningYou.firstElementChild.innerText = this.getStringFromCount(count);
        warningYou.className += ' fadeInOut';
        warningYou.style.display = 'block';
        this.checkGameEndedByPenalties(count);

    }

    displayWarningForOther(){
        this.timePenalties[this.opponentColor()]++;
        const count = this.timePenalties[this.opponentColor()];
        console.log(this.timePenalties);
        warningOpponent.firstElementChild.innerText = this.getStringFromCount(count);
        warningOpponent.className += ' fadeInOut';
        warningOpponent.style.display = 'block';
        this.checkGameEndedByPenalties(count);
    }

    getStringFromCount(count){
        const warning = "warning";
        if(count == 1)
            return "1st warning";
        else if(count == 2)
            return "2nd warning";
        else if(count == 3){
            return "Game ended!";
        }
    }

    checkGameEndedByPenalties(count){
        if (count == 3) {
            this.handleGameEndByTimePenalty();
            const data = {
                "event": "timePenalty",
                "message": "ran out of time",
            }
            this.socket.send(JSON.stringify(data));
            console.log("ended game due to time penalty");
        }
    }

    /**
     * Adds a penalty to me
     * If a player has 3 penalties, the game ends and the other player wins
     */
    addTimePenalty() {
        if (this.myTurnColor == this.generalTurnColor) {
            this.displayWarningForMe();
            this.clickRandomColumn();
        }


    }

    /**
     * changes the player's turn
     */
    changeGlobalTurn() {
        console.log("Change global turn");
        if (this.generalTurnColor == 'red')
            this.generalTurnColor = 'orange';
        else
            this.generalTurnColor = 'red';
        this.updateCirclesBasedOnColor(this.generalTurnColor);
        
        if (this.myTurnColor == this.generalTurnColor) {
            console.log("changed hover");
            this.board.makeBoardActive();
        } else {
            this.board.makeBoardInactive();
        }
        resetTurnTimer();
    }

    /**
     * resets the game by clearing the board and resting the player's turn
     */
    resetGame() {
        this.gameEnded = false;
        this.board.clearBoard();
        this.myTurnColor = 'red';
        wonMessageText.style.display = 'none';
        this.timePenalties = 0;
        this.timePenalties = {
            'red': 0,
            'orange': 0
        };
    }
}