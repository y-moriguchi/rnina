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

function executeReduce(ast) {
	return reduceAst(ast);
}

function computeRegex(automaton) {
	var i,
		r,
		rb = null,
		j,
		result = {};
	function getEdge(r, i, j) {
		if(r) {
			return result[r][i][j];
		} else if(!automaton[i].edges[j]) {
			return i === j ? EPS : PHI;
		} else if(i === j) {
			return {
				type: "alter",
				left: EPS,
				right: automaton[i].edges[j]
			};
		} else {
			return automaton[i].edges[j];
		}
	}
	for(r in automaton) {
		if(automaton.hasOwnProperty(r)) {
			result[r] = {};
			for(i in automaton) {
				if(automaton.hasOwnProperty(i)) {
					result[r][i] = {};
					for(j in automaton) {
						if(automaton.hasOwnProperty(j)) {
							result[r][i][j] = executeReduce({
								type: "alter",
								left: getEdge(rb, i, j),
								right: {
									type: "concat",
									left: getEdge(rb, i, r),
									right: {
										type: "concat",
										left: {
											type: "star",
											body: getEdge(rb, r, r)
										},
										right: getEdge(rb, r, j)
									}
								}
							});
						}
					}
				}
			}
			rb = r;
		}
	};
	return result[rb];
}

function generateRegexAST(automaton, init) {
	var i,
		computed,
		result = null;
	function alter(x) {
		result = !result ? x : {
			type: "alter",
			left: result,
			right: x
		};
	};
	computed = computeRegex(automaton);
	for(i in automaton) {
		if(automaton.hasOwnProperty(i) && automaton[i].accept) {
			alter(computed[init][i])
		}
	}
	return executeReduce(result);
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
			"type": A.eqv("star"),
			"body": A.eqv(EPS)
		},
		action: function(element) {
			return EPS;
		}
	},
	{
		pattern: {
			"type": A.eqv("star"),
			"body": {
				"type": A.eqv("option")
			}
		},
		action: function(element) {
			return {
				"type": "star",
				"body": element.body.body
			};
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
	},
	{
		pattern: {
			"type": A.eqv("alter"),
			"left": A.memory("mem"),
			"right": A.refer("mem")
		},
		action: function(element) {
			return element.left;
		}
	},
	{
		pattern: {
			"type": A.eqv("alter"),
			"left": A.eqv(EPS)
		},
		action: function(element) {
			return {
				"type": "option",
				"body": element.right
			};
		}
	},
	{
		pattern: {
			"type": A.eqv("concat"),
			"left": {
				"type": A.eqv("star"),
				"body": A.memory("mem2")
			},
			"right": {
				"type": A.eqv("option"),
				"body": A.refer("mem2")
			}
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
	if(regexAst === PHI) {
		return PHI;
	} else if(regexAst === EPS) {
		return "";
	} else if(typeof regexAst === "string") {
		return regexAst;
	}
	switch(regexAst.type) {
	case "concat":
		if(regexAst.left !== PHI && regexAst.right !== PHI) {
			return parenConcat(regexAst.left) + parenConcat(regexAst.right);
		} else {
			return PHI;
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
	case "option":
		return regexAst.body === PHI ? "" : parenStar(regexAst.body) + "?";
	}
}

module.exports = {
	generateRegexAST: generateRegexAST,
	reduceAst: reduceAst,
	serializeRegex: serializeRegex
};
