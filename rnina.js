/*
 * RNina
 *
 * Copyright (c) 2018 Yuichiro MORIGUCHI
 *
 * This software is released under the MIT License.
 * http://opensource.org/licenses/mit-license.php
 */
var P = require("./rnina-parser.js"),
    T = require("./rnina-traverser.js"),
    fs = require('fs');

common = {
    version: "0.0.0"
};

function readFileToEnd(file) {
    if(!file) {
        console.error('No file is specified');
        process.exit(2);
    }
    try {
        return fs.readFileSync(file, 'utf8');
    } catch(err) {
        console.error('File %s can not read', file);
        process.exit(2);
    }
}

function printUsage() {
    var toPrint = readFileToEnd("./usage.txt").replace("@version@", common.version);
    console.error(toPrint);
    process.exit(1);
}

function processFile(file) {
    var i,
        input = null,
        matchFile = /^(.*)\.rnina$/.exec(file),
        matchLine,
        regexName,
        regexes = {},
        source,
        outLine,
        output = "",
        outFile,
        automaton,
        ast;

    if(!matchFile) {
        console.error("invalid extension: " + file);
        process.exit(2);
    }

    source = readFileToEnd(file).split(/\n/);
    if(/\.[^\.]+/.test(matchFile[1])) {
        for(i = 0; i < source.length; i++) {
            if(input) {
                matchLine = /^<\/rnina>$/.exec(source[i]);
                if(matchLine) {
                    automaton = P.parse(input);
                    ast = T.generateRegexAST(automaton, "1");
                    regexes[regexName] = T.serializeRegex(T.reduceAst(ast));
                    input = null;
                } else {
                    input.push(source[i]);
                }
            } else {
                if(!!(matchLine = /^<rnina name="([^\"]+)">$/.exec(source[i]))) {
                    regexName = matchLine[1];
                    input = [];
                } else {
                    outLine = source[i].replace(/\$<([^>]+)>/g, function(mt, name) {
                        var line = regexes[name];
                        if(!line) {
                            throw new Error("regex not found: " + name);
                        }
                        return "/" + line + "/";
                    });
                    output += outLine + "\n";
                }
            }
        }
        outFile = matchFile[1];
        fs.writeFileSync(outFile, output);
    } else {
        automaton = P.parse(source);
        ast = T.generateRegexAST(automaton, "0");
        console.log(T.serializeRegex(T.reduceAst(ast)));
    }
}

function main() {
    var i;
    if(process.argv.length <= 2) {
        printUsage();
    } else {
        for(i = 2; i < process.argv.length; i++) {
            processFile(process.argv[i]);
        }
    }
}

main();
