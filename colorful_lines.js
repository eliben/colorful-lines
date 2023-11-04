// Colorful Lines game.
//
// Eli Bendersky [https://eli.thegreenplace.net]
// This code is in the public domain.
'use strict';
var DEBUG = false;


// Global game state and settings
//
var Game = {
    canvas: null,
    context: null,

    state: null,
    selected: null,
    score: 0,
    preview_colors: [],

    State: {
        IDLE: 0,
        SELECTED: 1,
        BUSY: 2,
        GAMEOVER: 3
    },

    // The board. A 2D array, each holding either a color name
    // or null (empty).
    //
    board: [],

    Geometry: {
        MAX_COLS: 9,
        MAX_ROWS: 9,

        // Each tile has a ball inside it. The bounding box of the
        // ball is drawn with margin BALL_MARGIN taken from each
        // bounding side, i.e. the ball diameter is:
        // TILE_WIDTH - 2*BALL_MARGIN
        //
        TILE_WIDTH: 30,
        BALL_MARGIN: 3,
        BALL_RADIUS: null,   // computed dynamically

        BOARD_TOPLEFT: [10, 10],

        // these will be computed dynamically
        BOARD_WIDTH: null,
        BOARD_HEIGHT: null,

        CANVAS_WIDTH: 500,
        CANVAS_HEIGHT: 300,

        PREVIEW_TOPLEFT: [380, 25],
        PREVIEW_TILE_WIDTH: 20,
        PREVIEW_BALL_RADIUS: null,  // computed dynamically
    },

    COLORS: ['blue', 'red', 'lightgreen', 'black', 'yellow', 'purple', 'pink'],
    LINE_LEN: 5,
    NUM_PREVIEW: 3,
}


init_clines();


function init_clines() {
    DEBUG && console.log('logging is on...');

    if (!is_canvas_supported()) {
        document.writeln('Sorry, canvas is not supported');
        return;
    }

    Game.canvas = document.getElementById('canvas');

    Game.canvas.addEventListener('click', on_canvas_click, false);
    Game.context = Game.canvas.getContext('2d');

    init_geometry();
    new_game();
    do_draw();
}


function init_geometry() {
    Game.Geometry.BOARD_WIDTH = Game.Geometry.MAX_COLS * Game.Geometry.TILE_WIDTH;
    Game.Geometry.BOARD_HEIGHT = Game.Geometry.MAX_ROWS * Game.Geometry.TILE_WIDTH;
    Game.Geometry.BALL_RADIUS = Math.floor((Game.Geometry.TILE_WIDTH - 2 * Game.Geometry.BALL_MARGIN) / 2);
    Game.Geometry.PREVIEW_BALL_RADIUS = Math.floor((Game.Geometry.PREVIEW_TILE_WIDTH - 2 * Game.Geometry.BALL_MARGIN) / 2);
}


// Start a new game - clear the board, zero the score, etc.
//
function new_game() {
    init_board();

    Game.state = Game.State.IDLE;
    Game.selected = null;
    Game.score = 0;        // ZINIT
    Game.preview_colors = generate_random_colors(Game.NUM_PREVIEW);
    do_draw();
}


function init_board() {
    for (let row = 0; row < Game.Geometry.MAX_ROWS; ++row) {
        Game.board[row] = [];
        for (let col = 0; col < Game.Geometry.MAX_COLS; ++col) {
            Game.board[row][col] = null;
        }
    }

    place_new_balls(Game.board, generate_random_colors(5));
}


// Execute the given function for each cell in the board. The
// function will be called with the row and column numbers as
// arguments.
//
function foreach_board_cell(func) {
    for (let row = 0; row < Game.Geometry.MAX_ROWS; ++row) {
        for (let col = 0; col < Game.Geometry.MAX_COLS; ++col) {
            func(row, col);
        }
    }
}


// Return an array of all the empty cells on the board (each cell
// a Coord).
//
function get_empty_cells(board) {
    let empties = [];
    foreach_board_cell(function (row, col) {
        if (board[row][col] == null) {
            empties.push(new Coord(row, col));
        }
    });

    return empties;
}


function get_all_balls(board) {
    let coords = [];
    foreach_board_cell(function (row, col) {
        if (board[row][col] !== null) {
            coords.push(new Coord(row, col));
        }
    });

    return coords;
}


function is_canvas_supported() {
    canvas = document.getElementById('canvas');
    if (canvas.getContext) {
        return true;
    }

    return false;
}


function do_draw() {
    Game.context.fillStyle = 'black';
    Game.context.fillRect(0, 0, Game.Geometry.CANVAS_WIDTH, Game.Geometry.CANVAS_HEIGHT);

    Game.context.fillStyle = 'white';
    Game.context.font = 'bold 15px sans-serif';
    Game.context.fillText('Preview:', 300, 40);

    Game.context.fillText('Score: ', 300, 70);
    Game.context.fillText(Game.score.toString() + ' ', 380, 70);

    if (Game.state === Game.State.GAMEOVER) {
        Game.context.font = 'bold 20px sans-serif';
        Game.context.fillStyle = 'red';
        Game.context.fillText('Game over! ', 330, 120);
    }

    draw_board_background(Game.context, Game.Geometry.BOARD_TOPLEFT,
        Game.Geometry.MAX_ROWS, Game.Geometry.MAX_COLS,
        Game.Geometry.TILE_WIDTH);

    foreach_board_cell(function (row, col) {
        if (Game.board[row][col] !== null) {
            draw_ball(Game.context, new Coord(row, col), Game.board[row][col]);
        }
    });

    draw_preview();

    if (Game.state === Game.State.SELECTED) {
        draw_selection(Game.context, Game.selected);
    }
}


function draw_preview() {
    draw_board_background(
        Game.context,
        Game.Geometry.PREVIEW_TOPLEFT,
        1, Game.NUM_PREVIEW,
        Game.Geometry.PREVIEW_TILE_WIDTH);

    for (let i = 0; i < Game.preview_colors.length; ++i) {
        let cell_x = Game.Geometry.PREVIEW_TOPLEFT[0] + i * Game.Geometry.PREVIEW_TILE_WIDTH;
        let cell_y = Game.Geometry.PREVIEW_TOPLEFT[1];

        let center_x = cell_x + Game.Geometry.PREVIEW_BALL_RADIUS + Game.Geometry.BALL_MARGIN;
        let center_y = cell_y + Game.Geometry.PREVIEW_BALL_RADIUS + Game.Geometry.BALL_MARGIN;

        Game.context.fillStyle = Game.preview_colors[i];
        Game.context.beginPath();
        Game.context.arc(center_x, center_y, Game.Geometry.PREVIEW_BALL_RADIUS, 0, Math.PI * 2, true);
        Game.context.closePath();
        Game.context.fill();
    }
}


// Draws a board background on the given context object.
// topleft:
//  coordinates of the top-left corner of the board (array of 2)
// nrows: number of rows
// ncols: number of columns
// cellsize: cell square side size in pixels
//
function draw_board_background(ctx, topleft, nrows, ncols, cellsize) {
    let style1 = 'rgba(105, 105, 105, 1)';
    let style2 = 'rgba(130, 130, 130, 1)';
    let even = true;

    for (let row = 0; row < nrows; ++row) {
        for (let col = 0; col < ncols; ++col) {
            let x = topleft[0] + col * cellsize;
            let y = topleft[1] + row * cellsize;
            let style = even ? style1 : style2;

            fill_square(ctx, [x, y], cellsize, style);

            even = !even;
        }
    }
}


// Draws a ball in the coordinate with the given color.
//
function draw_ball(ctx, coord, color) {
    let topleft_xy = coord2xy(coord);
    let center_x = topleft_xy[0] + Game.Geometry.BALL_RADIUS + Game.Geometry.BALL_MARGIN;
    let center_y = topleft_xy[1] + Game.Geometry.BALL_RADIUS + Game.Geometry.BALL_MARGIN;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center_x, center_y, Game.Geometry.BALL_RADIUS, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
}


// Draw the selection of a cell
//
function draw_selection(ctx, coord) {
    let topleft_xy = coord2xy(coord);
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'black';
    ctx.strokeRect(topleft_xy[0] + 1, topleft_xy[1] + 1,
        Game.Geometry.TILE_WIDTH - 2, Game.Geometry.TILE_WIDTH - 2);
    ctx.restore();
}


// Fills a square on the given context object.
//
function fill_square(ctx, topleft, size, style) {
    ctx.fillStyle = style;
    ctx.fillRect(topleft[0], topleft[1], size, size);
}


// Handle user input
//
function on_canvas_click(ev) {
    let x = ev.clientX - Game.canvas.offsetLeft;
    let y = ev.clientY - Game.canvas.offsetTop + $(window).scrollTop();
    let coord = xy2coord(x, y);

    if (coord === null) {
        // not inside board
        return;
    }

    DEBUG && console.log(coord.row, coord.col);

    if (Game.state === Game.State.IDLE) {
        if (Game.board[coord.row][coord.col] !== null) {
            Game.state = Game.State.SELECTED;
            Game.selected = coord;
        }
    } else if (Game.state === Game.State.SELECTED) {
        if (coord.equals(Game.selected)) {
            // Clicked the selected ball - deselect
            //
            Game.state = Game.State.IDLE;
            Game.selected = null;
        } else if (Game.board[coord.row][coord.col] !== null) {
            // Clicked another ball - change selection
            //
            Game.selected = coord;
        } else {
            // Clicked an empty cell - move the ball
            //
            let can_move = move_ball(Game.selected, coord);

            if (can_move) {
                Game.selected = null;
            }
        }
    }

    do_draw();
    DEBUG && console.log('game state:', Game.state);
}


function move_ball(from_coord, to_coord) {
    let path = find_path(from_coord, to_coord, Game.board);

    if (path !== null) {
        path.unshift(from_coord);
        Game.state = Game.State.BUSY;
        setTimeout(move_ball_step, 30, path, 0);
        return true;
    } else {
        return false;
    }
}


// Moves a ball one step, from path[i] to path[i+1]
//
function move_ball_step(path, i) {
    if (i >= path.length - 1) {
        move_ball_finished();
        return;
    }

    let ball_color = Game.board[path[i].row][path[i].col];
    Game.board[path[i].row][path[i].col] = null;
    Game.board[path[i + 1].row][path[i + 1].col] = ball_color;
    do_draw();

    setTimeout(move_ball_step, 30, path, i + 1);
}


function move_ball_finished() {
    Game.state = Game.State.IDLE;

    if (!check_lines()) {
        setTimeout(function () {
            place_new_balls(Game.board, Game.preview_colors);

            Game.preview_colors = generate_random_colors(Game.NUM_PREVIEW);
            do_draw();
            check_lines();

            if (get_empty_cells(Game.board).length === 0) {
                game_over();
            }
        }, 250);
    }
}


function game_over() {
    Game.state = Game.State.GAMEOVER;
    DEBUG && console.log('game over');
    do_draw();
}


// predicate and action are functions.
// Tries to check the predicate. If it's true, executes the
// action. Otherwise, waits for timeout_step and checks again.
// Asynchronous and returns immediately.
//
function do_when(predicate, action, timeout_step) {
    if (predicate()) {
        action();
    } else {
        setTimeout(do_when, timeout_step, predicate, action, timeout_step);
    }
}


// Checks lines of balls on the board - removes the lines and
// assigns points.
//
function check_lines() {
    // The "bag" will hold the coordinates of all the balls that
    // have to be removed. Some coordinates will be repeated when
    // lines longer than 5 or multiple lines are found.
    //
    let bag = [];
    let all_balls = get_all_balls(Game.board);

    for (let i in all_balls) {
        // just a dummy: to access its methods
        //
        let nc = new Coord(0, 0);
        let dir_methods = [nc.to_right, nc.below, nc.to_bottomleft, nc.to_bottomright];

        for (let dir_i in dir_methods) {
            let b = all_balls[i];
            let color = Game.board[b.row][b.col];
            let dir_method = dir_methods[dir_i];

            // We only need to detect a line of length 5, as
            // longer lines will be implicitly detected (a longer
            // line is simply 2 shorted lines in row)
            //
            let seq = [b];
            for (let k = 0; k < Game.LINE_LEN - 1; ++k) {
                let next = dir_method.apply(b);

                if (next === null || Game.board[next.row][next.col] !== color) {
                    break;
                }

                seq.push(next);
                b = next;
            }

            if (seq.length === Game.LINE_LEN) {
                bag = bag.concat(seq);
            }
        }
    }

    // If lines were actually found, "kill" all the balls in them
    // by flashing them out and count the points.
    //
    if (bag.length > 0) {
        let ball_count = 0;
        Game.state = Game.State.BUSY;

        for (let i in bag) {
            let ball = bag[i];

            if (Game.board[ball.row][ball.col] !== null) {
                Game.board[ball.row][ball.col] = null;

                setTimeout(ball_flash_out, 100 + ball_count * 50, ball);
                ball_count++;
            }
        }

        setTimeout(function () {
            Game.state = Game.State.IDLE;
        }, 200 + ball_count * 50);

        Game.score += ball_count;

        if (ball_count > Game.LINE_LEN) {
            Game.score += (ball_count - Game.LINE_LEN) * 5;
        }

        DEBUG && console.log('score', Game.score);
        return true;
    }

    return false;
}


function ball_flash_out(coord) {
    Game.board[coord.row][coord.col] = 'white';
    do_draw();
    setTimeout(function () {
        Game.board[coord.row][coord.col] = null;
        do_draw();
    }, 100);
}


// Attempts to find a path between the source and destination
// coordinates. Returns the path as an array of coordinates if
// successful, or null if there's no path.
//
function find_path(source, dest, board) {
    var empty_cells = get_empty_cells(board);
    let empty_cells_int = [source.to_int()];

    for (let i in empty_cells) {
        empty_cells_int.push(empty_cells[i].to_int());
    }

    let graph = new Graph(empty_cells_int, coord_successors);
    let path = graph.find_path(source.to_int(), dest.to_int());

    return path === null ? null : path.map(Coord.from_int);
}


// Given a coordinate (int-encoded) returns a list of all the
// coordinates reachable in one step from this one (also
// int-encoded).
//
function coord_successors(int_coord) {
    let c = Coord.from_int(int_coord);
    let succ_list = [];
    let dir_methods = [c.to_right, c.to_left, c.above, c.below];

    for (let i in dir_methods) {
        let succ = dir_methods[i].apply(c);

        if (succ !== null) {
            if (Game.board[succ.row][succ.col] === null) {
                succ_list.push(succ.to_int());
            }
        }
    }

    return succ_list;
}


// Translates an (x, y) on the drawing canvas to the cell
// coordinate. Returns null if the coordinates are not
// inside the playing board.
//
function xy2coord(x, y) {
    let dx = x - Game.Geometry.BOARD_TOPLEFT[0];
    let dy = y - Game.Geometry.BOARD_TOPLEFT[1];
    let cellnum = []

    if (dx < 0 || dx >= Game.Geometry.BOARD_WIDTH ||
        dy < 0 || dy >= Game.Geometry.BOARD_HEIGHT) {
        return null;
    }

    return new Coord(Math.floor(dy / Game.Geometry.TILE_WIDTH),
        Math.floor(dx / Game.Geometry.TILE_WIDTH));
}


// Given a board coordiinate, returns the x, y pair of the
// top-left pixel in that board cell.
//
function coord2xy(coord) {
    let x = Game.Geometry.BOARD_TOPLEFT[0] + coord.col * Game.Geometry.TILE_WIDTH;
    let y = Game.Geometry.BOARD_TOPLEFT[1] + coord.row * Game.Geometry.TILE_WIDTH;

    return [x, y];
}


// Get a random element from an array
//
function random_element(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}


// Places new balls on the board. The balls to be placed are
// given in the 'colors' array, each element a color of a ball.
// If there's not enough space on the board, places only the
// first balls from colors that fit.
//
function place_new_balls(board, colors) {
    for (let i = 0; i < colors.length; ++i) {
        let empty_cells = get_empty_cells(board);

        if (empty_cells.length === 0) {
            return;
        }

        let coord = random_element(empty_cells);
        let color = colors[i];

        board[coord.row][coord.col] = color;
    }
}


function generate_random_colors(howmany) {
    let colors = [];
    for (let i = 0; i < howmany; ++i) {
        colors.push(random_element(Game.COLORS));
    }
    return colors;
}


//----------------------------------------------------------------
// Coord object. Represents a cell coordinate, which is just a
// fancy way of having a row, col pair.
//
function Coord(row, col) {
    this.row = row;
    this.col = col;

    this.equals = function (other) {
        return (this.row === other.row && this.col === other.col);
    }

    this.above = function () {
        if (this.row >= 1) {
            return new Coord(this.row - 1, this.col);
        } else {
            return null;
        }
    }

    this.below = function () {
        if (this.row < Game.Geometry.MAX_ROWS - 1) {
            return new Coord(this.row + 1, this.col);
        } else {
            return null;
        }
    }

    this.to_left = function () {
        if (this.col >= 1) {
            return new Coord(this.row, this.col - 1);
        } else {
            return null;
        }
    }

    this.to_right = function () {
        if (this.col < Game.Geometry.MAX_COLS - 1) {
            return new Coord(this.row, this.col + 1);
        } else {
            return null;
        }
    }

    this.to_bottomright = function () {
        if (this.col < Game.Geometry.MAX_COLS - 1 &&
            this.row < Game.Geometry.MAX_ROWS - 1) {
            return new Coord(this.row + 1, this.col + 1);
        } else {
            return null;
        }
    }

    this.to_bottomleft = function () {
        if (this.row < Game.Geometry.MAX_ROWS - 1 &&
            this.col >= 1) {
            return new Coord(this.row + 1, this.col - 1);
        } else {
            return null;
        }
    }

    // Encode a Coord into an integer.
    //
    this.to_int = function () {
        return this.row * 1000 + this.col;
    }
}

// Decode a Coord from an integer
//
Coord.from_int = function (i) {
    return new Coord(Math.floor(i / 1000), i % 1000);
}

