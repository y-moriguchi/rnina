/*
 * RNina
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var UP = 0,
	RIGHT = 1,
	DOWN = 2,
	LEFT = 3;

function copyObject(obj) {
	var i,
		res = {};
	for(i in obj) {
		if(obj.hasOwnProperty(i)) {
			res[i] = obj[i];
		}
	}
	return res;
}

function createQuadro(init) {
	var me,
		i,
		j,
		maxX = 0,
		quadro = [],
		xPos = 0,
		yPos = 0,
		direction = UP,
		property = {},
		result;
	function initX(y) {
		var j;
		quadro[y] = [];
		quadro[y][0] = { ch: " " };
		quadro[y][maxX + 1] = { ch: " " };
		for(j = 0; j < maxX; j++) {
			quadro[y][j + 1] = { ch: " " };
		}
	}
	for(i = 0; i < init.length; i++) {
		maxX = maxX < init[i].length ? init[i].length : maxX;
	}
	initX(0);
	initX(init.length + 1);
	for(i = 0; i < init.length; i++) {
		initX(i + 1);
		for(j = 0; j < maxX; j++) {
			if(j < init[i].length) {
				quadro[i + 1][j + 1].ch = init[i].charAt(j);
			}
		}
	}
	me = {
		read: function() {
			if(xPos > 0 && xPos <= maxX && yPos > 0 && yPos <= init.length) {
				return quadro[yPos][xPos].ch;
			} else {
				return "";
			}
		},
		isSpace: function() {
			return me.read() === "" || me.read() === " ";
		},
		moveUp: function() {
			yPos = yPos < 1 ? yPos : yPos - 1;
			return me;
		},
		moveDown: function() {
			yPos = yPos > quadro.length - 1 ? yPos : yPos + 1;
			return me;
		},
		moveLeft: function() {
			xPos = xPos < 1 ? xPos : xPos - 1;
			return me;
		},
		moveRight: function() {
			xPos = xPos > maxX ? xPos : xPos + 1;
			return me;
		},
		cr: function() {
			xPos = 1;
			return me.moveDown();
		},
		getDirection: function() {
			return direction;
		},
		setDirection: function(d) {
			direction = d;
			return me;
		},
		turnRight: function() {
			direction = (direction + 1) % 4;
			return me;
		},
		turnLeft: function() {
			direction = (direction + 3) % 4;
			return me;
		},
		moveForward: function() {
			switch(direction) {
			case UP:     return me.moveUp();
			case RIGHT:  return me.moveRight();
			case DOWN:   return me.moveDown();
			case LEFT:   return me.moveLeft();
			}
		},
		moveBackward: function() {
			switch(direction) {
			case DOWN:   return me.moveUp();
			case LEFT:   return me.moveRight();
			case UP:     return me.moveDown();
			case RIGHT:  return me.moveLeft();
			}
		},
		getAttr: function(name) {
			return quadro[yPos][xPos][name];
		},
		setAttr: function(name, val) {
			quadro[yPos][xPos][name] = val;
			return me;
		},
		getProperty: function(name) {
			return property[name];
		},
		setProperty: function(name, val) {
			property[name] = val;
			return me;
		},
		getPosition: function() {
			return {
				xPos: xPos,
				yPos: yPos,
				direction: direction,
				property: copyObject(property)
			};
		},
		setPosition: function(pos) {
			xPos = pos.xPos;
			yPos = pos.yPos;
			direction = pos.direction;
			property = pos.property;
		}
	};
	return me;
}

function Accept(val) {
	this.val = val;
}
function accept(val) {
	return new Accept(val);
}
function Reject() {}
var REJECT = new Reject();
function Transit(state) {
	this.state = state;
}
function transit(state) {
	return new Transit(state);
}
function Fork(stateNow, statesNew) {
	this.stateNow = stateNow;
	this.statesNew = statesNew;
}
function fork(stateNow /*, statesNew*/) {
	return new Fork(stateNow, Array.prototype.slice.call(arguments, 1));
}

function engine(quadro, state) {
	var i,
		stack = [{ state: state, pos: quadro.getPosition() }],
		popped,
		cmd;
	while(stack.length > 0) {
		cmd = stack[stack.length - 1].state(quadro);
		if(cmd instanceof Accept) {
			return cmd.val;
		} else if(cmd instanceof Reject) {
			popped = stack.pop();
			quadro.setPosition(popped.pos);
		} else if(cmd instanceof Transit) {
			stack[stack.length - 1].state = cmd.state;
		} else if(cmd instanceof Fork) {
			stack[stack.length - 1].state = cmd.stateNow;
			for(i = 0; i < cmd.statesNew.length; i++) {
				stack.push({
					state: cmd.statesNew[i],
					pos: quadro.getPosition()
				});
			}
		} else {
			throw new Error("Illegal state");
		}
	}
	return null;
}

function parse(input) {
	var quadro = createQuadro(input),
		automaton = {},
		stateNo = 1,
		branchChar = ["<", "^", ">", "v"],
		states;
	function createState() {
		automaton[stateNo] = {
			prev: [],
			edges: {}
		};
		return stateNo++;
	}
	function getStateBranch(direction) {
		return branchChar[direction];
	}
	states = {
		init: function(quadro) {
			quadro.moveRight();
			if(!quadro.read()) {
				quadro.cr();
			} else if(quadro.read() === "S") {
				quadro.setProperty("stateNo", createState());
				quadro.setDirection(RIGHT);
				return fork(states.inState, states.markState);
			}
			return transit(states.init);
		},
		markState: function(quadro) {
			quadro.setAttr("stateNo", quadro.getProperty("stateNo"));
			quadro.moveForward();
			if(quadro.getAttr("stateNo")) {
				return REJECT;
			} else if(quadro.isSpace()) {
				quadro.moveBackward();
				quadro.turnRight();
				return transit(states.markState);
			} else {
				return transit(states.markState);
			}
		},
		inState: function(quadro) {
			quadro.setAttr("traversed", true);
			quadro.moveForward();
			if(quadro.getAttr("traversed")) {
				return REJECT;
			} else if(quadro.read() === getStateBranch(quadro.getDirection())) {
				return fork(states.inState, states.edgeLeft);
			} else if(quadro.isSpace()) {
				quadro.moveBackward();
				quadro.turnRight();
				return transit(states.inState);
			} else {
				if(quadro.read() === "@") {
					automaton[quadro.getProperty("stateNo")].accept = true;
				}
				return transit(states.inState);
			}
		},
		edgeLeft: function(quadro) {
			quadro.turnLeft();
			return transit(states.edge);
		},
		edgeRight: function(quadro) {
			quadro.turnRight();
			return transit(states.edge);
		},
		edge: function(quadro) {
			var stateTo;
			quadro.setAttr("traversed", true);
			quadro.moveForward();
			if(quadro.isSpace()) {
				return REJECT;
			} else if(quadro.read() === "+") {
				return fork(states.edge, states.edgeLeft, states.edgeRight);
			} else if(/[\^v><]/.test(quadro.read())) {
				stateTo = quadro.getAttr("stateNo");
				if(stateTo) {
					automaton[stateTo].prev.push(quadro.getProperty("stateNo"));
					automaton[quadro.getProperty("stateNo")].edges[stateTo] = quadro.getProperty("edge");
					return REJECT;
				} else {
					stateTo = createState();
					automaton[stateTo].prev.push(quadro.getProperty("stateNo"));
					automaton[quadro.getProperty("stateNo")].edges[stateTo] = quadro.getProperty("edge");
					quadro.setProperty("stateNo", stateTo);
					quadro.turnLeft();
					return fork(states.inState, states.markState);
				}
			} else if(/[\-\|]/.test(quadro.read())) {
				return transit(states.edge);
			} else {
				quadro.setProperty("edge", quadro.read());
				return transit(states.edge);
			}
		}
	};
	result = engine(quadro, states.init);
	if(result) {
		throw new Error(result);
	}
	return automaton;
}

module.exports = {
	parse: parse
};
