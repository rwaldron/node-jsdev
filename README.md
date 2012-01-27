JSDev, A JavaScript Development Tool


Douglas Crockford
douglas@crockford.com

2012-01-05

JSDev is a filter that activates selected comments, making them executable.
This makes it possible to put development, performance, and testing scaffolding
into a source file. The scaffolding is removed by minification, but is activated
by JSDev.

JSDev is a filter that takes a source file and looks for tagged comments in
either of these forms:

    /*<tag> <stuff>*/

    /*<tag>(<condition>) <stuff>*/

There can be no space between the /* and the <tag>. There can be no space
between the <tag> and the (. The content of tagged comment may not include
comments, nor can it contain strings or regular expression literals that
contain */. So, write

    /*debug(/[a-z][a-z0-9]*/.test(variable))
        console.log("*/ test");
    */

as

    /*debug(/[a-z][a-z0-9]*(?:)/.test(variable))
        console.log("*\/ test");
    */

JSDev is given a list the names of the tags that should be activated.
Also, methods can be defined by following the tag name with : and a method
name. There can be no spaces around the :.

    Replacement     /*<tag>         */

    tag form        {               }
    method form     {<method>(      );}

If a condition was included, then the replacement will be preceded with an
if statement.

The implementation in C obtains the input from stdin, and provides the result
to stdout. The tag list is taken from the command line. The command line can
also include a -comment specification. JSDev will exit(1) if there is an error.

In JavaScript, it is available as the JSDEV function that takes a source,
an array of tags, and an optional array of comments. It will throw an
exception if there is an error.

C command line example:

    jsdev -comment "Devel Edition." <input >output test_expose enter:trace.enter exit:trace.exit unless:alert

JavaScript:

    output = JSDEV(input, [
        "test_expose",
        "enter:trace.enter",
        "exit:trace.exit",
        "unless:alert"
    ] , ["Devel Edition."]);

input:

    // This is a sample file.

    function Constructor(number) {
        /*enter 'Constructor'*/
        /*unless(typeof number !== 'number') 'number', "Type error"*/
        function private_method() {
            /*enter 'private_method'*/
            /*exit 'private_method'*/
        }
        /*test_expose
            this.private_method = private_method;
        */
        this.priv = function () {
            /*enter 'priv'*/
            private_method();
            /*exit 'priv'*/
        }
        /*exit "Constructor"*/
    }

output:

    // Devel Edition.
    // This is a sample file.

    function Constructor(number) {
        {trace.enter('Constructor');}
        if (typeof number !== 'number') {alert('number', "Type error");}
        function private_method() {
            {trace.enter('private_method');}
            {trace.exit('private_method');}
        }
        {
            this.private_method = private_method;
        }
        this.priv = function () {
            {trace.enter('priv');}
            private_method();
            {trace.exit('priv');}
        }
        {trace.exit("Constructor");}
    }

lightly minified:

    function Constructor(number) {
        function private_method() {
        }
        this.priv = function () {
            private_method();
        }
    }
