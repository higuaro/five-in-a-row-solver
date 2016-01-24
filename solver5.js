/*jshint curly: true, globals: true, nocomma: true, newcap: true, nonew: true, quotmark: single, undef: true, unused: true, indent: 3*/
(function () {
   'use strict';

   function Piece() {}

   Piece.CPU = 1;
   Piece.PLAYER = 2;
   Piece.EMPTY = 0;
   Piece.MASK = 3;

   function Board() {
      this.state = [0, 0, 0, 0, 0, 0, 0];
   }

   Board.BOARD_WIDTH = 10;
   Board.BOARD_HEIGHT = 10;
   Board._INT_SIZE = 32;

   // Scores for the evaluation function
   Board.WINNER = 10000000;
   Board.WITH_4_PIECES_SPACE_BOTH_SIDES = 100000;
   Board.WITH_4_PIECES_SPACE_ONE_SIDE = 50000;
   Board.WITH_3_PIECES_SPACE_BOTH_SIDES = 10000;
   Board.WITH_3_PIECES_SPACE_ONE_SIDE = 5000;
   Board.WITH_2_PIECES_SPACE_BOTH_SIDES = 100;
   Board.WITH_2_PIECES_SPACE_ONE_SIDE = 20;
   Board.WITH_1_PIECE_SPACE_BOTH_SIDES = 2;
   Board.WITH_1_PIECE_SPACE_ONE_SIDE = 1;

   Board.SCORES = [ Board.WITH_4_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_4_PIECES_SPACE_ONE_SIDE,
                    Board.WITH_3_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_3_PIECES_SPACE_ONE_SIDE,
                    Board.WITH_2_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_2_PIECES_SPACE_ONE_SIDE, 
                    Board.WITH_1_PIECE_SPACE_BOTH_SIDES, 
                    Board.WITH_1_PIECE_SPACE_ONE_SIDE ];

   // Directions for the check
   Board._CHECK_VERTICAL = 1;
   Board._CHECK_HORIZONTAL = 2;
   Board._CHECK_RIGHT_DIAGONAL = 3;
   Board._CHECK_LEFT_DIAGONAL = 4;

   Board.prototype = {
      constructor: Board,

      copy: function (board) {
         this.state = Array.apply(null, Array(100)).map(Number.prototype.valueOf, 0);
      },

      setPiece: function (row, col, piece) {
         this.state[(row * 10) + col] = piece;
      },

      getPiece: function (row, col) {
         return this.state[(row * 10) + col];
      },

      fromString: function (boardStr) {
         var lines = boardStr.split('\n');
         var i;
         var j;
         var cells;
         var cell;
         for (i = 0; i < lines.length; i++) {
            cells = lines[i].split(' ');
            for (j = 0; j < cells.length; j++) {
               this.setPiece(i, j, parseInt(cells[j], 10));
            }
         }
      },

      toString: function () {
         var x;
         var y;
         var result = '';
         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               result += this.getPiece(y, x) + ' ';
            }
            result += '\n';
         }
         return result;
      },

      _clamp: function (value, min, max) {
         return value < min ? min : (value > max ? max : v);
      },

      _explore: function (x, y, cell, directionOffset, getPieceFromStep) {
         var enemy = cell ^ Piece.MASK;
         var currentStep;
         var limit;
         var continuousPieces = 0;
         var spaces = 0;
         var piecesFound = 0;
         var continuous = true;

         limit = directionOffset < 0 ? -5 : 5;

         for (currentStep = directionOffset; currentStep != limit; currentStep += directionOffset) {
            var c = getPieceFromStep(this, x, y, currentStep);
            if (c == -1 || c == enemy) {
               break;
            } else {
               if (c == Piece.EMPTY) {
                  continuous = false;
                  spaces++;
               } else {
                  if (continuous) {
                     continuousPieces++;
                  }
                  piecesFound++;
               }
            }
         }
         return [continuousPieces, piecesFound, spaces];
      },

      _getVerticalPieceFromStep: function (board, x, y, step) {
         y += step;
         if (y < 0 || y >= Board.BOARD_HEIGHT) {
            return -1;
         }
         return board.getPiece(y, x);
      },

      _getHorizontalPieceFromStep: function (board, x, y, step) {
         x += step;
         if (x < 0 || x >= Board.BOARD_WIDTH) {
            return -1;
         }
         return board.getPiece(y, x);
      },

      _getRightDiagonalPieceFromStep: function (board, x, y, step) {
         y += step;
         x += step;
         if (x < 0|| x >= Board.BOARD_WIDTH || y < 0 || y >= Board.BOARD_HEIGHT) {
            return -1;
         }
         return board.getPiece(y, x);
      },

      _getLeftDiagonalPieceFromStep: function (board, x, y, step) {
         y -= step;
         x += step;
         if (x < 0 || x >= Board.BOARD_WIDTH || y < 0 || y >= Board.BOARD_HEIGHT) {
            return -1;
         }
         return board.getPiece(y, x);
      },

      _check: function (x, y, cell, direction) {
         var getPieceFromStep;

         var piecesFoundUp = 0;
         var spacesUp = 0;
         var continuous = 0;
         var piecesFoundDown = 0;
         var spacesDown = 0;

         var continuous = 1;
         var c;
         var pieces;

         switch (direction) {
            case Board._CHECK_VERTICAL:
               getPieceFromStep = this._getVerticalPieceFromStep;
            break;
            case Board._CHECK_HORIZONTAL:
               getPieceFromStep = this._getHorizontalPieceFromStep;
            break;
            case Board._CHECK_RIGHT_DIAGONAL:
               getPieceFromStep = this._getRightDiagonalPieceFromStep;
            break;
            case Board._CHECK_LEFT_DIAGONAL:
               getPieceFromStep = this._getLeftDiagonalPieceFromStep;
            break;
         }

         var UP = -1;
         var DOWN = 1;

         var t = this._explore(x, y, cell, UP, getPieceFromStep);
         continuous += t[0];
         piecesFoundUp = t[1];
         spacesUp = t[2];
         t = this._explore(x, y, cell, DOWN, getPieceFromStep);
         continuous += t[0];
         piecesFoundDown = t[1];
         spacesDown = t[2];

         if (continuous == 1 && (spacesDown + spacesUp) < 6) {
            continuous = 0;
         }

         if (continuous >= 5) {
            // Winner board
            return Board.WINNER;
         } else {
            for (c = 4; c >= 1; c--) {
               pieces = c;
               if (pieces === continuous) {
                  if (piecesFoundDown + piecesFoundUp + 1 > continuous) {
                     pieces = Math.min(piecesFoundDown + piecesFoundUp + 1, 4);
                  }
                  if (spacesUp > 0 && spacesDown > 0) {
                     return Board.SCORES[(4 - pieces) * 2];
                  } else if (spacesUp + spacesDown > 0) {
                     return Board.SCORES[(4 - pieces) * 2 + 1];
                  }
               }
            }
         }
         return 0;
      },

      evaluate: function () {
         var x;
         var y;
         var cell;
         var score;
         var totalScore = 0;
         var factor;
         var direction;
         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               cell = this.getPiece(y, x);
               if (cell == Piece.EMPTY) {
                  // We ignore the empty cells as they don't add value to the 
                  // board (wow, that was so easy to explain)
                  continue;
               }
               
               // Ok, this is not that easy to explain, 'factor' changes the 
               // sign of whatever result we got during the evaluation of the 
               // board, we want negative numbers to be results more favorale 
               // for the computer and positive numbers for the player
               factor = (cell == Piece.CPU) ? -1 : 1;

               direction = Board._CHECK_VERTICAL;
               for (; direction <= Board._CHECK_LEFT_DIAGONAL; direction++) {
                  score = factor * this._check(x, y, cell, direction);

                  if (score >= Board.WINNER) {
                     return Board.WINNER;
                  }
                  totalScore += score;
               }
            }
         }
         return totalScore;
      },

      readFromHtml: function (tableId) {
         
      },

      draw: function (tableId) {
         var html = '<table id="' + tableId + '">';
         var x;
         var y;
         var cell;

         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            html += '<tr>';
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               html += '<td>';
               cell = this.getPiece(y, x);
               switch (cell) {
                  case Piece.PLAYER:
                     html += 'X';
                  break;
                  case Piece.PLAYER:
                     html += 'O';
                  break;
               }
               html += '<td>';
            }
            html += '</tr>';
         }

         html += '</table>';
      }
   };

   function AI() {
   }
   
   AI.prototype = {
      constructor: AI,

      _best: function (bestMoveSoFar, move, piece) {
         if (!move) {
            return bestMoveSoFar;
         }
         if (!bestMoveSoFar) {
            return move;
         }
         if (piece == Piece.PLAYER) {
            if (move.score > bestMoveSoFar.score) {
               return move;
            }
         } else {
            if (move.score < bestMoveSoFar.score) {
               return move;
            }
         }
         return bestMoveSoFar;
      },

      simulatePlay: function (board, piece, x, y, depthLevel) {
//debugger;
         var y;
         var x;
         var piece;
         var bestMove;
         var move;

         var enemy = piece ^ Piece.MASK;

         if (depthLevel == 0) {
            return { 
                       'score': board.evaluate(),
                       'row': y,
                       'column': x,
                       'piece': enemy
                    }
         }

         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               if (board.getPiece(y, x) == Piece.EMPTY) {
                  board.setPiece(y, x, piece);
                  move = this.simulatePlay(board, enemy, x, y, depthLevel - 1);

                  // this._moves.push({'board': board.toString(), 'value': move.score});

                  bestMove = this._best(bestMove, move, piece);
                  board.setPiece(y, x, Piece.EMPTY);
               }
            }
         }

         return bestMove;
      },

      play: function (board, x, y) {
         var DEPTH_LEVEL = 2;
         var y;
         var x;
         var piece;
         var bestMove;
         
         piece = board.getPiece(y, x);
         if (piece == Piece.EMPTY) {
            board.setPiece(y, x, Piece.PLAYER);
            bestMove = this.simulatePlay(board, Piece.CPU, x, y, DEPTH_LEVEL);
            board.setPiece(bestMove.row, bestMove.column, bestMove.piece);
         }
      }
   };

   var emptyBoardString = '0 0 0 0 0 0 0 0 0 0\n' + // 0
                          '0 0 0 0 0 0 0 0 0 0\n' + // 1
                          '0 0 0 0 0 0 0 0 0 0\n' + // 2
                          '0 0 0 0 0 0 0 0 0 0\n' + // 3
                          '0 0 0 0 0 0 0 0 0 0\n' + // 4
                          '0 0 0 0 1 0 0 0 0 0\n' + // 5
                          '0 0 0 0 0 0 0 0 0 0\n' + // 6
                          '0 0 0 0 0 0 0 0 0 0\n' + // 7
                          '0 0 0 0 0 0 0 0 0 0\n' + // 8
                          '0 0 0 0 0 0 0 0 0 0\n';

   var b = new Board();
   b.fromString(emptyBoardString);

   var ai = new AI();
   ai.play(b, 4, 1);

   console.log(b.toString());
   // console.log(b.evaluate());
   
})();

/*
 b.fromString('0 0 0 0 0 0 0 0 0 0\n' +  // 0
 '0 0 0 0 0 0 0 0 0 0\n' +  // 1
 '0 0 0 0 0 0 0 0 0 0\n' +  // 2
 '0 0 2 0 0 0 0 0 0 0\n' +  // 3
 '0 0 1 0 0 1 0 0 0 0\n' +  // 4
 '0 0 0 0 1 0 0 0 0 0\n' +  // 5
 '0 0 0 1 0 0 0 0 0 0\n' +  // 6
 '0 0 2 0 0 0 0 0 0 0\n' +  // 7
 '0 2 0 0 0 0 0 0 0 0\n' +  // 8
 '1 0 0 0 0 0 0 0 0 0\n' ); // 9
 */

