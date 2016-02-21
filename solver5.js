/*jshint curly: true, globals: true, nocomma: true, newcap: true, nonew: true, quotmark: single, undef: true, unused: true, indent: 3*/
(function () {
   'use strict';

   function Piece() {}

   Piece.CPU = 1;
   Piece.PLAYER = 2;
   Piece.EMPTY = 0;
   Piece.MASK = 3;

   function Board() {
      this.state = Array.apply(null, Array(100)).map(Number.prototype.valueOf, 0);
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

      insideBoard: function (x, y) {
         return x >= 0 && x < Board.BOARD_WIDTH && 
                 y >= 0 && y < Board.BOARD_HEIGHT;
      },

      isTerminal: function () {
         var x;
         var y;
         var nx;
         var i;
         var cell1;
         var cell2;
         var cell;
         var vertical;
         var horizontal;
         var diagonal1;
         var diagonal2;
         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            for (x = 0; x < Board.BOARD_WIDTH; x++) { 
               cell1 = this.getPiece(y, x);
               cell2 = this.getPiece(y + 4, x);
               if (cell1 != Piece.EMPTY || cell2 != Piece.EMPTY) {
                  vertical = horizontal = diagonal1 = 0;
                  if (cell1 != Piece.EMPTY) {
                     vertical = horizontal = diagonal1 = 1;
                  }
                  diagonal2 = cell2 != Piece.EMPTY ? 1 : 0;
                  for (i = 1; i <= 4; i++) {
                     if (this.insideBoard(y + i, x) && 
                         this.getPiece(y + i, x) == cell1) {
                        vertical++;
                     }
                     if (this.insideBoard(y, x + i) && 
                         this.getPiece(y, x + i) == cell1) {
                        horizontal++;
                     }
                     if (this.insideBoard(y + i, x + i) &&
                         this.getPiece(y + i, x + i) == cell1) {
                        diagonal1++;
                     }
                     if (this.insideBoard(y + 4 - i, x + i) && 
                         this.getPiece(y + 4 - i, x + i) == cell2) {
                        diagonal2++;
                     }
                  }
                  if (vertical == 5 || horizontal == 5 || 
                      diagonal1 == 5 || diagonal2 == 5) {
                      return true;
                  }
               }
            }
         }
         return false;
      },

      evaluate: function (depthLevel) {
         var x;
         var y;
         var cell;
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

               // 'factor' changes the sign of whatever result we got during 
               // the evaluation of the board, we want negative numbers to be 
               // results more favorale for the computer and positive numbers 
               // for the player
               factor = (cell == Piece.CPU) ? -1 : 1;

               direction = Board._CHECK_VERTICAL;
               for (; direction <= Board._CHECK_LEFT_DIAGONAL; direction++) {
                  totalScore += factor * this._check(x, y, cell, direction);

                  if (totalScore >= Board.WINNER) {
                     return this.punishDepthLevel(Board.WINNER, depthLevel);
                  }

                  if (totalScore <= -Board.WINNER) {
                     return this.punishDepthLevel(-Board.WINNER, depthLevel);
                  }
               }
            }
         }
         return this.punishDepthLevel(totalScore, depthLevel);
      },

      punishDepthLevel: function (totalScore, depthLevel) {
         if (totalScore != 0) {
            if (totalScore < 0) {
               return Math.min(totalScore + depthLevel * 10, 0);
            } else {
               return Math.max(totalScore - depthLevel * 10, 0);
            }
         }
         return totalScore;
      },

      _toString: function (x, y, p) {
         this.setPiece(y, x, p);
         var s = this.toString();
         this.setPiece(y, x, Piece.EMPTY);
         return s;
      },

      toHtml: function () {
         var html = '<table class="board">';
         var x;
         var y;
         var cell;

         for (y = 0; y < Board.BOARD_HEIGHT; y++) {
            html += '<tr>';
            for (x = 0; x < Board.BOARD_WIDTH; x++) {
               html += '<td class="board-cell" onclick="play(' + y + ', ' + x + ')">';
               cell = this.getPiece(y, x);
               switch (cell) {
                  case Piece.PLAYER:
                     html += 'X';
                  break;
                  case Piece.CPU:
                     html += 'O';
                  break;
               }
               html += '</td>';
            }
            html += '</tr>';
         }

         html += '</table>';
         return html;
      }
   };

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
                     // If node is maximizer we ask for betha
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
         ai.play(board, x, y);
         div.className = '';
         div.innerHTML = board.toHtml();
         processing = false;
      }
   }

   window.initBoard = function (divId) { 
      div = document.getElementById(divId);
      div.innerHTML = board.toHtml();
   }
})();


