/*jshint curly: true, globals: true, nocomma: true, newcap: true, nonew: true, quotmark: single, undef: true, unused: true, indent: 3*/
var Piece = (function () {
   'use strict';

   function Piece() {}

   Piece.CPU = 1;
   Piece.PLAYER = 2;
   Piece.EMPTY = 0;
   Piece.MASK = 3;

   return Piece;
})();
