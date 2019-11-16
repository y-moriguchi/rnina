/*
 * RegNina
 *
 * Copyright (c) 2019 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 **/
var returnMachine,
    undef = void 0,
    BOUND = -1,
    UP = { x:0, y:-1 },
    RIGHT = { x:1, y:0 },
    DOWN = { x:0, y:1 },
    LEFT = { x:-1, y:0 };

function log(message) {
    //console.log(message);
}

function isNode(ch) {
    return /[\+ES]/.test(ch);
}

function quadro(inputArray) {
    var TURN = [UP, RIGHT, DOWN, LEFT],
        input = inputArray,
        i,
        j,
        xNow = 1,
        yNow = 1,
        direction = 0,
        maxLength = 0,
        cellMatrix = [],
        me;

    function drawBound(y) {
        var j;

        cellMatrix[y] = [];
        for(j = 0; j < maxLength; j++) {
            cellMatrix[y][j] = { ch: BOUND };
        }
        cellMatrix[y][j + 1] = { ch: BOUND };
    }

    for(i = 0; i < input.length; i++) {
        maxLength = maxLength < input[i].length ? input[i].length : maxLength;
    }
    maxLength += 2;

    for(i = 0; i < input.length; i++) {
        cellMatrix[i + 1] = [];
        cellMatrix[i + 1][0] = { ch: BOUND };
        for(j = 0; j < maxLength - 2; j++) {
            cellMatrix[i + 1][j + 1] = {
                ch: j < input[i].length ? input[i].charAt(j) : ' '
            };
        }
        cellMatrix[i + 1][j + 1] = { ch: BOUND };
    }
    drawBound(0);
    drawBound(i + 1);

    me = {
        getChar: function(xoffset, yoffset) {
            return me.get(xoffset, yoffset).ch;
        },

        isWhitespace: function(xoffset, yoffset) {
            var ch = me.getChar(xoffset, yoffset);

            return ch === BOUND || /[ ]/.test(ch);
        },

        get: function(xoffset, yoffset) {
            if(xoffset === undef || yoffset === undef) {
                return cellMatrix[yNow][xNow];
            } else if(xNow + xoffset < 0 || xNow + xoffset >= maxLength || yNow + yoffset < 0 || yNow + yoffset >= cellMatrix.length) {
                return { ch: BOUND };
            } else {
                return cellMatrix[yNow + yoffset][xNow + xoffset];
            }
        },

        getForward: function(offset) {
            return me.get(TURN[direction].x * offset, TURN[direction].y * offset);
        },

        move: function(direction) {
            xNow += direction.x;
            yNow += direction.y;
            if(xNow < 0) {
                xNow = 0;
            } else if(xNow >= maxLength) {
                xNow = maxLength - 1;
            }
            if(yNow < 0) {
                yNow = 0;
            } else if(yNow >= cellMatrix.length) {
                yNow = cellMatrix.length - 1;
            }
            return me;
        },

        moveForward: function() {
            return me.move(TURN[direction]);
        },

        moveBackward: function() {
            return me.move(TURN[(direction + 2) % 4]);
        },

        moveCrLf: function() {
            xNow = 1;
            return me.move(DOWN);
        },

        moveInit: function() {
            xNow = yNow = 1;
            return me;
        },

        direction: function(dir) {
            var i = 0;

            for(i = 0; i < TURN.length; i++) {
                if(TURN[i] === dir) {
                    direction = i;
                    return me;
                }
            }
            throw new Error("invaild direction");
        },

        getDirection: function() {
            return TURN[direction];
        },

        isDirectionHorizontal: function() {
            return me.getDirection() === LEFT || me.getDirection() === RIGHT;
        },

        isDirectionVertical: function() {
            return me.getDirection() === UP || me.getDirection() === DOWN;
        },

        turnRight: function() {
            direction++;
            if(direction >= 4) {
                direction = 0;
            }
            return me;
        },

        turnLeft: function() {
            direction--;
            if(direction < 0) {
                direction = 3;
            }
            return me;
        },

        getPosition: function() {
            return {
                x: xNow,
                y: yNow,
                direction: direction
            };
        },

        setPosition: function(position) {
            xNow = position.x;
            yNow = position.y;
            direction = position.direction;
            return me;
        },

        graph: [],
        currentNodeNo: null,
        currentNode: null,
        currentLabel: null,

        createNode: function() {
            me.graph.push({
                prev: [],
                edges: {}
            });
            return me.graph.length - 1;
        },

        addEdge: function(nodeNo) {
            if(!me.currentNode) {
                throw new Error("Internal error");
            } else if(!me.currentLabel) {
                throw new Error("Label not specified");
            }
            me.currentNode.edges[nodeNo] = me.currentLabel;
            return me;
        },

        setCurrentNode: function(nodeNo, accept) {
            if(me.currentNode) {
                me.currentNode.prev.push(me.currentNodeNo);
            }
            me.currentNodeNo = nodeNo;
            me.currentNode = me.graph[nodeNo];
            me.currnetLabel = null;
            me.currentNode.accept = accept;
            return me;
        },

        getCreateNode: function() {
            var nodeNo = me.get().node;

            if(nodeNo === undef) {
                nodeNo = me.createNode();
                me.get().node = nodeNo;
            }
            return nodeNo;
        },

        setCurrentLabel: function(ch) {
            me.currentLabel = ch;
        }
    };
    return me;
}

function CallMachine(machine, next) {
    if(next === null) {
        throw new Error("Null pointer Exception");
    }
    this.machine = machine;
    this.next = next;
}

function ReturnMachine() {}
var returnMachine = new ReturnMachine();

function engine(quadro, initMachine) {
    var state = [],
        machineResult,
        popState,
        i;

    if(initMachine.init === null) {
        throw new Error("Null pointer Exception");
    }
    state.push({
        state: initMachine.init,
        stateName: initMachine.name
    });
    for(i = 0; state.length > 0; i++) {
        if(i > 100000) {
            throw new Error("Maybe Infinite Loop");
        } else if(typeof state[state.length - 1].state !== "function") {
            throw new Error("Invaild state : " + JSON.stringify(state[state.length - 1]));
        }

        machineResult = state[state.length - 1].state(quadro);
        if(machineResult === null) {
            throw new Error("Null pointer Exception");
        } else if(machineResult instanceof CallMachine) {
            state.push({
                state: machineResult.machine.init,
                stateName: machineResult.machine.name,
                next: machineResult.next,
                position: quadro.getPosition()
            });
            log("entering " + state[state.length - 1].stateName);
        } else if(machineResult instanceof ReturnMachine) {
            log("leaving " + state[state.length - 1].stateName);
            popState = state.pop();
            if(state.length > 0) {
                state[state.length - 1].state = popState.next;
            }
            if(popState.position !== undef) {
                quadro.setPosition(popState.position);
            }
        } else {
            state[state.length - 1].state = machineResult;
        }
    }
}

function regnina(input) {
    var findStart = (function() {
        var me = {
            name: "findStart",

            init: function(quadro) {
                if(quadro.getChar() === "S") {
                    return branchNode.init;
                } else if(quadro.getChar() === BOUND) {
                    quadro.moveCrLf();
                    if(quadro.getChar() === BOUND) {
                        throw new Error("Initial state not found");
                    } else {
                        return me.init;
                    }
                } else {
                    quadro.move(RIGHT);
                    return me.init;
                }
            }
        };
        return me;
    })();

    var branchNode = (function() {
        var me = {
            name: "branchNode",

            init: function(quadro) {
                quadro.setCurrentNode(quadro.getCreateNode(), quadro.getChar() === "E");
                quadro.move(UP);
                if(quadro.getChar() === '|' && !quadro.get().visited) {
                    return new CallMachine(traverseVertical(UP), me.endInit);
                } else {
                    return me.endInit;
                }
            },

            endInit: function(quadro) {
                quadro.move(DOWN);
                return me.right;
            },

            right: function(quadro) {
                quadro.move(RIGHT);
                if(quadro.getChar() === '-' && !quadro.get().visited) {
                    return new CallMachine(traverseHorizontal(RIGHT), me.endRight);
                } else {
                    return me.endRight;
                }
            },

            endRight: function(quadro) {
                quadro.move(LEFT);
                return me.down;
            },

            down: function(quadro) {
                quadro.move(DOWN);
                if(quadro.getChar() === '|' && !quadro.get().visited) {
                    return new CallMachine(traverseVertical(DOWN), me.endDown);
                } else {
                    return me.endDown;
                }
            },

            endDown: function(quadro) {
                quadro.move(UP);
                return me.left;
            },

            left: function(quadro) {
                quadro.move(LEFT);
                if(quadro.getChar() === '-' && !quadro.get().visited) {
                    return new CallMachine(traverseHorizontal(LEFT), me.end);
                } else {
                    return me.end;
                }
            },

            end: function(quadro) {
                return returnMachine;
            }
        };
        return me;
    })();

    function isOneRoute(quadro) {
        var routeCount = 0,
            traversedCount = 0;

        routeCount += quadro.getChar(1, 0) === "-" ? 1 : 0;
        routeCount += quadro.getChar(-1, 0) === "-" ? 1 : 0;
        routeCount += quadro.getChar(0, 1) === "|" ? 1 : 0;
        routeCount += quadro.getChar(0, -1) === "|" ? 1 : 0;
        traversedCount += quadro.get(1, 0).visited ? 1 : 0;
        traversedCount += quadro.get(-1, 0).visited ? 1 : 0;
        traversedCount += quadro.get(0, 1).visited ? 1 : 0;
        traversedCount += quadro.get(0, -1).visited ? 1 : 0;
        return routeCount === 2 && traversedCount === 1;
    }

    function nextRoute(quadro) {
        if(quadro.getChar(1, 0) === "-" && !quadro.get(1, 0).visited) {
            return RIGHT;
        } else if(quadro.getChar(-1, 0) === "-" && !quadro.get(-1, 0).visited) {
            return LEFT;
        } else if(quadro.getChar(0, 1) === "|" && !quadro.get(0, 1).visited) {
            return DOWN;
        } else if(quadro.getChar(0, -1) === "|" && !quadro.get(0, -1).visited) {
            return UP;
        } else {
            throw new Error("Internal Error");
        }
    }

    function traverseVertical(direction) {
        var me = {
            name: "traverseVertical",

            init: function(quadro) {
                var nextDirection;

                if(/[v\^]/.test(quadro.getChar())) {
                    quadro.get().visited = true;
                    quadro.move(direction);
                    if(isNode(quadro.getChar())) {
                        quadro.addEdge(quadro.getCreateNode());
                        return new CallMachine(branchNode, me.end);
                    } else {
                        return me.init;
                    }
                } else if(isNode(quadro.getChar())) {
                    if(!isOneRoute(quadro)) {
                        throw new Error("Invalid node");
                    }
                    nextDirection = nextRoute(quadro);
                    quadro.move(nextDirection);
                    if(nextDirection === UP || nextDirection === DOWN) {
                        return me.init;
                    } else {
                        return traverseHorizontal(nextDirection).init;
                    }
                } else {
                    quadro.get().visited = true;
                    quadro.move(direction);
                    return me.init;
                }
            },

            end: function(quadro) {
                return returnMachine;
            }
        };
        return me;
    }

    function traverseHorizontal(direction) {
        var me = {
            name: "traverseHorizontal",

            init: function(quadro) {
                var nextDirection;

                if(/[<>]/.test(quadro.getChar())) {
                    quadro.get().visited = true;
                    quadro.move(direction);
                    if(isNode(quadro.getChar())) {
                        quadro.addEdge(quadro.getCreateNode());
                        return new CallMachine(branchNode, me.end);
                    } else {
                        return me.init;
                    }
                } else if(isNode(quadro.getChar())) {
                    if(!isOneRoute(quadro)) {
                        throw new Error("Invalid node");
                    }
                    nextDirection = nextRoute(quadro);
                    quadro.move(nextDirection);
                    if(nextDirection === RIGHT || nextDirection === LEFT) {
                        return me.init;
                    } else {
                        return traverseVertical(nextDirection).init;
                    }
                } else if(quadro.getChar() === "'") {
                    quadro.get().visited = true;
                    quadro.move(direction);
                    return me.sqLabel;
                } else {
                    quadro.get().visited = true;
                    quadro.move(direction);
                    return me.init;
                }
            },

            sqLabel: function(quadro) {
                quadro.get().visited = true;
                quadro.setCurrentLabel(quadro.getChar());
                quadro.move(direction);
                quadro.get().visited = true;
                if(quadro.getChar() !== "'") {
                    throw new Error("Invalid label");
                }
                quadro.move(direction);
                return me.init;
            },

            end: function(quadro) {
                return returnMachine;
            }
        };
        return me;
    }

    var quadroObject = quadro(input);
    engine(quadroObject, findStart);
    return quadroObject.graph;
}

module.exports = {
    parse: regnina
};

