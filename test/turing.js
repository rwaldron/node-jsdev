var fs = require("fs"),
	color = require("colors"),
	jsdev = require("JSDev"),
	input = fs.readFileSync("input.js", "UTF-8"),
	trace, output;

console.log( jsdev );

output = jsdev(input, [
	"test_expose",
	"enter:trace.enter",
	"exit:trace.exit",
	"unless:trace.error"
] , ["Devel Edition."]);


// TODO: DRY out and clean up
trace = {
	error: function() {
		console.log( "Error: ".red, [].slice.call( arguments ).reverse().join(", ") );
	},
	enter: function(arg) {
		console.log( "Entering: ".grey, arg );
	},
	exit: function(arg) {
		console.log( "Exiting: ".grey, arg );
	}
};

eval( output );