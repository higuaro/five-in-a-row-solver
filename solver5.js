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

   Board.SCORES = [ Board.WITH_4_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_4_PIECES_SPACE_ONE_SIDE,
                    Board.WITH_3_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_3_PIECES_SPACE_ONE_SIDE,
                    Board.WITH_2_PIECES_SPACE_BOTH_SIDES,
                    Board.WITH_2_PIECES_SPACE_ONE_SIDE ];

   // Directions for the check
   Board._CHECK_VERTICAL = 1;
   Board._CHECK_HORIZONTAL = 2;
   Board._CHECK_RIGHT_DIAGONAL = 3;
   Board._CHECK_LEFT_DIAGONAL = 4;

   Board.prototype = {
      constructor: Board,

      copy: function (board) {
         this.state = board.state.slice();
      },

      _getBoardCoordinates: function (row, col) {
         var offset = (row * Board.BOARD_WIDTH + col) * 2;
         var wordIndex = (offset / Board._INT_SIZE) | 0;
         var bitIndex = offset % Board._INT_SIZE;
         if (bitIndex > 0) {
            wordIndex++;
         }
         return [wordIndex, bitIndex];
      },

      setPiece: function (row, col, piece) {
         var coord = this._getBoardCoordinates(row, col);
         var wordIndex = coord[0];
         var bitIndex = coord[1];
         this.state[wordIndex] |= (piece & Piece.MASK) << bitIndex;
      },

      getPiece: function (row, col) {
         var coord = this._getBoardCoordinates(row, col);
         var wordIndex = coord[0];
         var bitIndex = coord[1];
         return (this.state[wordIndex] >> bitIndex) & Piece.MASK;
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

         if (continuous >= 5) {
            // Winner board
            return Board.WINNER;
         } else {
            for (c = 4; c >= 2; c--) {
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
                  continue;
               }
               factor = (cell == Piece.CPU) ? -1 : 1;
               for (direction = Board._CHECK_VERTICAL; direction <= Board._CHECK_LEFT_DIAGONAL; direction++) {

                  score = factor * this._check(x, y, cell, direction);

                  if (score == Board.WINNER) {
                     return score;
                  }
                  totalScore += score;
               }
            }
         }
         return totalScore;
      },
   };

   var emptyBoardString = '0 0 0 0 0 0 0 0 0 0\n' + // 0
                          '0 0 0 0 0 0 0 0 0 0\n' + // 1
                          '0 0 0 0 0 0 0 0 0 0\n' + // 2
                          '0 0 0 0 0 0 0 0 0 0\n' + // 3
                          '0 0 0 0 0 0 0 0 0 0\n' + // 4
                          '0 0 0 0 0 0 0 0 0 0\n' + // 5
                          '0 0 0 0 0 0 0 0 0 0\n' + // 6
                          '0 0 0 0 0 0 0 0 0 0\n' + // 7
                          '0 0 0 0 0 0 0 0 0 0\n' + // 8
                          '0 0 0 0 0 0 0 0 0 0\n';

   var b = new Board();
   b.fromString(emptyBoardString); // 9
   console.log(b.toString());

   var b2 = new Board();
   b2.copy(b);
   console.log(b2.toString());

   console.log(b2.evaluate());

   function encodeBoardChange(x, y, piece) {
      return y << 6 | x << 2 | piece;
   }

   function decodeAndApplyBoardChange(board, change) {
      var y = change >> 6;
      var x = (change >> 2) & 0xf;
      board.setPiece(y, x, change & 3);
   }

   function simulatePlay(board, depthLevel) {
      var y;
      var x;
      var changes = [];
      var change;
      var piece;

      if (depthLevel == Board.MIN_MAX_DEPTH_LEVEL) {
         return board.evaluate();
      }

      for (y = 0; y < Board.BOARD_HEIGHT; y++) {
         for (x = 0; x < Board.BOARD_WIDTH; x++) {
            piece = board.getPiece(y, x);
            if (piece == Piece.EMPTY) {
               change = encodeBoardChange(x, y, Piece.PLAYER);
               board.setPiece(y, x, Piece.PLAYER);
            }
            return simulateCpu(board, depthLevel + 1);
         }
      }
   }

   function play(board) {
      var y;
      var x;
      var changes = [];

      for (y = 0; y < Board.BOARD_HEIGHT; y++) {
         for (x = 0; x < Board.BOARD_WIDTH; x++) {
            board.getPiece(x, y)
         }
      }
   }
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

