/*
 * RNina
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var A = require("astraia");
var PHI = "phi",
	EPS = "epsilon";

function nvp(val) {
	return val ? val : PHI;
}
function isArray(obj) {
	return Object.prototype.toString.call(obj) === '[object Array]';
}
function deepCopy(obj) {
	var i,
		res;
	if(isArray(obj)) {
		res = [];
		for(i = 0; i < obj.length; i++) {
			res[i] = deepCopy(obj[i]);
		}
	} else if(typeof obj === "object") {
		res = {};
		for(i in obj) {
			if(obj.hasOwnProperty(i)) {
				res[i] = deepCopy(obj[i]);
			}
		}
	} else {
		res = obj;
	}
	return res;
}

function linkState(automaton, stateFrom, stateTo, stateRemove) {
	var edgeFT = nvp(automaton[stateFrom].edges[stateTo]),
		edgeFR = nvp(automaton[stateFrom].edges[stateRemove]),
		edgeRR = nvp(automaton[stateRemove].edges[stateRemove]),
		edgeRT = nvp(automaton[stateRemove].edges[stateTo]);
	automaton[stateFrom].edges[stateTo] = {
		type: "alter",
		left: edgeFT,
		right: {
			type: "concat",
			left: edgeFR,
			right: {
				type: "concat",
				left: {
					type: "star",
					body: edgeRR
				},
				right: edgeRT
			}
		}
	};
}

function removeState(automaton, stateRemove) {
	var i,
		j,
		statesFrom = automaton[stateRemove].prev,
		edges = automaton[stateRemove].edges;
	for(i = 0; i < statesFrom.length; i++) {
		for(j in edges) {
			if(edges.hasOwnProperty(j)) {
				linkState(automaton, statesFrom[i], j, stateRemove);
			}
		}
	}
	delete automaton[stateRemove];
}

function removeAllStatesExcept(automaton, pred) {
	var i;
	for(i in automaton) {
		if(automaton.hasOwnProperty(i) && pred(automaton[i], i)) {
			removeState(automaton, i);
		}
	}
}

function removeNotAcceptStates(automaton, init) {
	removeAllStatesExcept(automaton, function(state, no) {
		return no !== init && !state.accept;
	});
}

function removeAllStatesExceptNo(automaton, init, accept) {
	removeAllStatesExcept(automaton, function(state, no) {
		return no !== init && no !== accept;
	});
}

function generateRegexAST(automaton, init) {
	var i,
		reduceNotAccept = deepCopy(automaton),
		copyReduced,
		result;
	function alter(x) {
		result = !result ? x : {
			type: alter,
			left: result,
			right: x
		};
	};
	removeNotAcceptStates(reduceNotAccept, init);
	for(i in automaton) {
		if(automaton.hasOwnProperty(i) && automaton[i].accept) {
			copyReduced = deepCopy(reduceNotAccept);
			removeAllStatesExceptNo(copyReduced, init, i);
			if(init === i) {
				alter({
					type: "star",
					body: nvp(copyReduced[i].edges[i])
				});
			} else {
				alter({
					type: "concat",
					left: {
						type: "star",
						body: {
							type: "alter",
							left: nvp(copyReduced[init].edges[init]),
							right: {
								type: "concat",
								left: nvp(copyReduced[init].edges[i]),
								right: {
									type: "concat",
									left: nvp(copyReduced[i].edges[i]),
									right: nvp(copyReduced[i].edges[init])
								}
							}
						}
					},
					right: {
						type: "concat",
						left: nvp(copyReduced[init].edges[i]),
						right: {
							type: "star",
							body: nvp(copyReduced[i].edges[i])
						}
					}
				});
			}
		}
	}
	return result;
}

var reduceRules = [
	{
		pattern: {
			"type": A.eqv("star"),
			"body": A.eqv(PHI)
		},
		action: function(element) {
			return EPS;
		}
	},
	{
		pattern: {
			"type": A.eqv("concat"),
			"left": A.eqv(PHI)
		},
		action: function(element) {
			return PHI;
		}
	},
	{
		pattern: {
			"type": A.eqv("concat"),
			"right": A.eqv(PHI)
		},
		action: function(element) {
			return PHI;
		}
	},
	{
		pattern: {
			"type": A.eqv("concat"),
			"left": A.eqv(EPS)
		},
		action: function(element) {
			return element.right;
		}
	},
	{
		pattern: {
			"type": A.eqv("concat"),
			"right": A.eqv(EPS)
		},
		action: function(element) {
			return element.left;
		}
	},
	{
		pattern: {
			"type": A.eqv("alter"),
			"left": A.eqv(PHI)
		},
		action: function(element) {
			return element.right;
		}
	},
	{
		pattern: {
			"type": A.eqv("alter"),
			"right": A.eqv(PHI)
		},
		action: function(element) {
			return element.left;
		}
	}
];

function reduceAst(regexAst) {
	var result = A.scan(reduceRules, regexAst);
	return result;
}

function serializeRegex(regexAst) {
	function parenConcat(element) {
		function walk(element) {
			if(typeof element === "string") {
				return false;
			} else if(element.type === "alter") {
				return true;
			} else if(element.type === "concat") {
				return walk(element.left) && walk(element.right);
			} else {
				return walk(element.body);
			}
		}
		return walk(element) ? "(?:" + serializeRegex(element) + ")" : serializeRegex(element);
	}
	function parenStar(element) {
		function walk(element) {
			if(typeof element === "string") {
				return false;
			} else if(element.type === "alter" || element.type === "concat") {
				return true;
			} else {
				return walk(element.body);
			}
		}
		return walk(element) ? "(?:" + serializeRegex(element) + ")" : serializeRegex(element);
	}
	if(regexAst === "phi") {
		return "";
	} else if(typeof regexAst === "string") {
		return regexAst;
	}
	switch(regexAst.type) {
	case "concat":
		if(regexAst.left !== PHI && regexAst.right !== PHI) {
			return parenConcat(regexAst.left) + parenConcat(regexAst.right);
		} else {
			return "";
		}
	case "alter":
		if(regexAst.left === PHI) {
			return serializeRegex(regexAst.right);
		} else if(regexAst.right === PHI) {
			return serializeRegex(regexAst.left);
		} else {
			return serializeRegex(regexAst.left) + "|" + serializeRegex(regexAst.right);
		}
	case "star":
		return regexAst.body === PHI ? "" : parenStar(regexAst.body) + "*";
	}
}

module.exports = {
	generateRegexAST: generateRegexAST,
	reduceAst: reduceAst,
	serializeRegex: serializeRegex
};
