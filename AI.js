/*jshint curly: true, globals: true, nocomma: true, newcap: true, nonew: true, quotmark: single, undef: true, unused: true, indent: 3*/
(function () {
   'use strict';

   function AI() {
      this.DEPTH_LEVEL = 4;
      this._INFINITY = 9999999999;
   }
   
   AI.prototype = {
      constructor: AI,

      _best: function (bestMoveSoFar, move, piece, currentX, currentY) {
         if (!move) {
            return bestMoveSoFar;
         } else if (!bestMoveSoFar) {
            return move;
         } else if (piece == Piece.PLAYER) {
            if (move.score > bestMoveSoFar.score) {
               bestMoveSoFar = move;
               bestMoveSoFar.column = currentX; 
               bestMoveSoFar.row = currentY;
            }
         } else {
            if (move.score < bestMoveSoFar.score) {
               bestMoveSoFar = move;
               bestMoveSoFar.column = currentX; 
               bestMoveSoFar.row = currentY;
            }
         }
         return bestMoveSoFar;
      },

      simulatePlay: function (board, piece, x, y, depthLevel, alpha, betha) {
         var y;
         var x;
         var piece;
         var bestMove;
         var move;
         var enemy = piece ^ Piece.MASK;

         if (depthLevel == this.DEPTH_LEVEL || board.isTerminal()) {
            return { 
                       'score': board.evaluate(depthLevel),
                       'row': y,
                       'column': x,
                       'piece': enemy,
                       'b': board._toString(x, y, enemy)
                    };
         }

         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               if (board.getPiece(y, x) == Piece.EMPTY) {
                  board.setPiece(y, x, piece);

                  move = this.simulatePlay(board, enemy, x, y, depthLevel + 1, alpha, betha);

                  bestMove = this._best(bestMove, move, piece, x, y);

                  board.setPiece(y, x, Piece.EMPTY);

                  // If node is minimizer
                  if (piece == Piece.CPU) {
                     // We ask for alpha
                     if (move.score < alpha) {
                        return bestMove;
                     } else {
                        betha = Math.min(betha, move.score);
                     }
                  } else {
                     // If node is maximizer
                     //
                     // we ask for betha
                     if (move.score > betha) {
                        return bestMove;
                     } else {
                        alpha = Math.max(alpha, move.score);
                     }
                  }
               }
            }
         }

         if (depthLevel == 0) { 
            console.log(bestMove);
         }
         return bestMove;
      },

      play: function (board, x, y) {
         var y;
         var x;
         var piece;
         var bestMove;

         piece = board.getPiece(y, x);
         if (piece == Piece.EMPTY) {
            board.setPiece(y, x, Piece.PLAYER);
            bestMove = this.simulatePlay(board, Piece.CPU, x, y, 0, -this._INFINITY, this._INFINITY);
            console.log('best move:', bestMove);
            board.setPiece(bestMove.row, bestMove.column, Piece.CPU);

            return [bestMove.row, bestMove.column];
         }
      }
   };

   var board = new Board();
   var ai = new AI();
   var div = null;
   var processing = false;

   window.play = function (y, x) {
      if (processing) return;
      if (board.getPiece(y, x) == Piece.EMPTY) {
         div.className += 'board-loading';
         processing = true;
         setTimeout(setPiece, 100);
      }
      
      function setPiece() { 
         var move = ai.play(board, x, y);
         div.innerHTML = board.toHtml(move[0], move[1]);
         div.className = '';
         processing = false;
      }
   }

   window.initBoard = function (divId) { 
      div = document.getElementById(divId);
      div.innerHTML = board.toHtml();
   }
})();


