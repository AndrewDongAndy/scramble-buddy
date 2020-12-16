/*
Functions for generating scramble strings.
*/


const Jimp = require('jimp');
const fs = require('fs');
const { randInt } = require('./util.js');

// image-related stuff
const { MAKE_SCRAMBLE_IMAGES } = require('../config.js');
const S = 16; // square side length of a sticker
const LIGHT = 2; // weight of a light line
const HEAVY = 4; // weight of a heavy line

const SIDES = ['U', 'L', 'F', 'R', 'B', 'D'];
const DIR = ['', '2', "'"];
const COLORS = [ // taken from https://colorhunt.co/palettes/white, etc.
  0xf9f6f7ff, // white
  0xfc8621ff, // orange
  0x4fa54cff, // green
  0xec0101ff, // red
  0x0e49b5ff, // blue
  0xcad315ff, // yellow
];

// below: adapted from my submission to https://dmoj.ca/problem/rubik
const CYCLES = [
  [ // U
    [0, 2, 4, 6],
    [1, 3, 5, 7],
    [8, 32, 24, 16],
    [9, 33, 25, 17],
    [10, 34, 26, 18],
  ],
  [ // L
    [8, 10, 12, 14],
    [9, 11, 13, 15],
    [0, 16, 40, 36],
    [7, 23, 47, 35],
    [6, 22, 46, 34],
  ],
  [ // F
    [16, 18, 20, 22],
    [17, 19, 21, 23],
    [4, 30, 40, 10],
    [5, 31, 41, 11],
    [6, 24, 42, 12],
  ],
  [ // R
    [24, 26, 28, 30],
    [25, 27, 29, 31],
    [2, 38, 42, 18],
    [3, 39, 43, 19],
    [4, 32, 44, 20],
  ],
  [ // B
    [32, 34, 36, 38],
    [33, 35, 37, 39],
    [0, 14, 44, 26],
    [1, 15, 45, 27],
    [2, 8, 46, 28],
  ],
  [ // D
    [40, 42, 44, 46],
    [41, 43, 45, 47],
    [12, 20, 28, 36],
    [13, 21, 29, 37],
    [14, 22, 30, 38],
  ],
];

const OPPOSITE_FACE = [5, 3, 4, 1, 2, 0];

async function _getScramble(numMoves, filename) {
  // ok[i]: whether it is ok to add the move SIDES[i] next
  const ok = new Array(SIDES.length);
  ok.fill(true);
  let moves = new Array(numMoves);
  for (let i = 0; i < numMoves; ++i) {
    let x;
    do {
      x = randInt(0, SIDES.length - 1);
    } while (!ok[x]);
    ok[x] = false;
    for (let j = 0; j < SIDES.length; ++j) {
      if (j != x && j != OPPOSITE_FACE[x]) {
        ok[j] = true;
      }
    }
    moves[i] = SIDES[x] + DIR[randInt(0, 2)];
  }
  if (MAKE_SCRAMBLE_IMAGES) { // generate the image with the given id
    // initialize the cube
    const cube = new Array(48);
    for (let c = 0; c < 6; c++) {
      for (let i = 8 * c; i < 8 * (c + 1); i++) {
        cube[i] = c;
      }
    }
    // do the turns
    for (const move of moves) {
      const f = SIDES.indexOf(move[0]);
      const turns = DIR.indexOf(move.slice(1)) + 1;
      for (const cycle of CYCLES[f]) {
        const newColors = new Array(4);
        for (let i = 0; i < 4; i++) {
          newColors[(i + turns) % 4] = cube[cycle[i]];
        }
        for (let i = 0; i < 4; i++) {
          cube[cycle[i]] = newColors[i];
        }
      }
    }
    const height = 9 * S + 4 * HEAVY + 6 * LIGHT;
    const width = 12 * S + 5 * HEAVY + 8 * LIGHT;
    fs.openSync(filename, 'w');
    new Jimp(width, height, 0x000000ff, (error, image) => {
      for (let f = 0; f < 6; f++) {
        for (let i = 0; i < 9; i++) {
          let p = -1;
          if (i < 3) {
            p = i;
          } else if (i >= 6) {
            p = 12 - i;
          } else if (i == 3) {
            p = 7;
          } else if (i == 5) {
            p = 3;
          }
          let color = (p != -1 ? cube[8 * f + p] : f);
          let row = Math.floor(i / 3);
          if (f == 5) {
            row += 6;
          } else if (f >= 1) {
            row += 3;
          }
          let col = i % 3;
          if (row < 3 || row >= 6) {
            col += 3;
          } else {
            col += 3 * (f - 1);
          }
          let y1 = (row + 1) * LIGHT + Math.ceil((row + 1) / 3) * (HEAVY - LIGHT) + row * S;
          let x1 = (col + 1) * LIGHT + Math.ceil((col + 1) / 3) * (HEAVY - LIGHT) + col * S;
          for (let x = x1; x < x1 + S; x++) {
            for (let y = y1; y < y1 + S; y++) {
              image.setPixelColor(COLORS[color], x, y);
            }
          }
        }
      }
      image.write(filename);
    });
    // new Jimp({
    //   data: b.buffer,
    //   width: width,
    //   height: height,
    // }, (error, image) => {
    //   image.write(filename);
    // });

    // let image = new Jimp()
    // image.write(filename);
    // const b = new Uint8Array(height * width * 4);
    // let ptr = 0;
    // for (let i = 0; i < height; i++) {
    //   for (let j = 0; j < width; j++) {
    //     for (let k = 0; k < 4; k++) {
    //     // for (let k = 3; k >= 0; k--) {
    //       b[ptr++] = a[i][j][k];
    //     }
    //   }
    // }
  }
  return moves.join(' ');
}

async function getScramble(filename) {
  return _getScramble(randInt(17, 20), filename);
}


exports.getScramble = getScramble;
