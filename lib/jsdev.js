// jsdev.js
// Douglas Crockford
// 2012-01-08
//
// Public Domain
//
// JSDev is a simple JavaScript preprocessor. It implements a tiny macro
// language that is written in the form of tagged comments. These comments are
// normally ignored, and will be removed by JSMin. But JSDev will activate
// these comments, replacing them with executable forms that can be used to do
// debugging, testing, logging, or tracing. JSDev scans a source looking for
// and replacing patterns. A pattern is a slashstar comment containing a
// tag and some stuff, and optionally a condition wrapped in parens.
// There must be no space between the slashstar and the <tag>.
//
//     /*<tag> <stuff>*/
//     /*<tag>(<condition>) <stuff>*/
//
// The command line will contain a list of <tag> names, each of which can
// optionally be followed by a colon and <method> name. There must not be
// any spaces around the colon.
//
// A <tag> may contain any short sequence of ASCII letters, digits,
// underbar (_), dollar ($), and period(.). The active <tag> strings are
// declared in the method line. All <tag>s that are not declared in the
// command line are ignored.
//
// The <condition> and <stuff> may not include a string or regexp containing
// starslash, or a comment.
//
// If a <tag> does not have a :<method>, then it will expand into
//
//     {<stuff>}
//
// Effectively, the outer part of the comment is replaced with braces, turning
// an inert comment into an executable block. If a <condition> was included,
// it will expand into
//
//     if (<condition>) {<stuff>}
//
// Note that there can be no space between the <tag> and the paren that
// encloses the <condition>. If there is a space, then everything is <stuff>.
//
// If <tag> was declared with :<method>, then it will expand into
//
//     {<method>(<stuff>);}
//
// A function call is constructed, invoking the <method>, and using the
// <stuff> as the arguments. If a condition was included, it will expand into
//
//     if (<condition>) {<method>(<stuff>);}
//
// The JSDEV function takes a program text (either a string or an array of
// string), an array of tag strings, and optionally, an array of comment
// strings.
//
// Sample invocation:
//
//     output = JSDEV(source, [
//         "debug", "log:console.log", "alarm:alert"
//     ], "Devel Edition");
//
// That will enable
//
//     /*debug <stuff>*/
//
// comments that expand into
//
//     {<stuff>;}
//
// as well as
//
//     /*log <stuff>*/
//
// comments that expand into
//
//     {console.log(<stuff>);}
//
// and
//
//     /*alarm(<condition>) <stuff>*/
//
// comments that expand into
//
//     if (<condition>) {alert(<stuff>);}
//
// It will also insert the comment
//
//     // Devel Edition
//
// at the top of the output file.

function JSDEV(source, tags, comments) {
    'use strict';

    var line,
        line_nr = -1,
        lines,
        methods,
        outputs = [],
        preview,
        tagx = /^([0-9A-Za-z_$.]+)(?::([0-9A-Za-z_$.]+))?$/;


    function error(message) {
        throw new Error("JSDev: " + ((line_nr + 1) || "bad tag") + ' ' + message);
    }


    function is_alphanum(c) {

// Return true if the character is a letter, digit, underscore,
// dollar sign, or period.

        return ((c >= 'a' && c <= 'z') ||
                (c >= '0' && c <= '9') ||
                (c >= 'A' && c <= 'Z') ||
                 c === '_' || c === '$' || c === '.');
    }


    function emit(string) {
        if (string) {
            outputs.push(string);
        }
        return string;
    }


    function get(echo) {

// Return the next character from the input. If the echo argument is true,
// then the character will also be emitted.

        var c;
        if (preview) {
            c = preview;
            preview = null;
        } else {
            if (!line) {
                if (typeof line === 'string') {
                    c = '\n';
                    line = null;
                } else {
                    line_nr += 1;
                    line = lines[line_nr];
                    if (!line) {
                        if (typeof line === 'string') {
                            c = '\n';
                            line = null;
                        } else {
                            c = null;
                        }
                    } else {
                        c = line.charAt(0);
                        line = line.slice(1);
                    }
                }
            } else {
                c = line.charAt(0);
                line = line.slice(1);
            }
        }
        if (echo) {
            emit(c);
        }
        return c;
    }


    function peek() {
        if (!preview) {
            preview = get(false);
        }
        return preview;
    }


    function unget(c) {
        preview = c;
    }


    function string(quote, in_comment) {
        var c, was = line_nr;
        for (;;) {
            c = get(true);
            if (c === quote) {
                return;
            }
            if (c === '\\') {
                c = get(true);
            }
            if (in_comment && c === '*' && peek() === '/') {
                error("unexpected close comment in string.");
            }
            if (c === null) {
                line_nr = was;
                error("unterminated string literal.");
            }
        }
    }


    function pre_regexp(left) {
        return (left === '(' || left === ',' || left === '=' ||
                left === ':' || left === '[' || left === '!' ||
                left === '&' || left === '|' || left === '?' ||
                left === '{' || left === '}' || left === ';');
    }


    function regexp(in_comment) {
        var c, was = line_nr;
        for (;;) {
            c = get(true);
            if (c === '[') {
                for (;;) {
                    c = get(true);
                    if (c === ']') {
                        break;
                    }
                    if (c === '\\') {
                        c = get(true);
                    }
                    if (in_comment && c === '*' && peek() === '/') {
                        error("unexpected close comment in regexp.");
                    }
                    if (c === null) {
                        error("unterminated set in Regular Expression literal.");
                    }
                }
            } else if (c === '/') {
                if (in_comment && (peek() === '/' || peek() === '*')) {
                    error("unexpected comment.");
                }
                return;
            } else if (c === '\\') {
                c = get(true);
            }
            if (in_comment && c === '*' && peek() === '/') {
                error("unexpected comment.");
            }
            if (c === null) {
                line_nr = was;
                error("unterminated regexp literal.");
            }
        }
    }


    function condition() {
        var c, left = '{', paren = 0;
        for (;;) {
            c = get(true);
            if (c === '(' || c === '{' || c === '[') {
                paren += 1;
            } else if (c === ')' || c === '}' || c === ']') {
                paren -= 1;
                if (paren === 0) {
                    return;
                }
            } else if (c === null) {
                error("Unterminated condition.");
            } else if (c === '\'' || c === '"' || c === '`') {
                string(c, true);
            } else if (c === '/') {
                if (peek() === '/' || peek() === '*') {
                    error("unexpected comment.");
                }
                if (pre_regexp(left)) {
                    regexp(true);
                }
            } else if (c === '*' && peek() === '/') {
                error("unclosed condition.");
            }
            if (c > ' ') {
                left = c;
            }
        }
    }


    function stuff() {
        var c, left = '{', paren = 0;
        while (peek() === ' ') {
            get(false);
        }
        for (;;) {
            while (peek() === '*') {
                get(false);
                if (peek() === '/') {
                    get(false);
                    if (paren > 0) {
                        error("Unbalanced stuff");
                    }
                    return;
                }
                emit('*');
            }
            c = get(true);
            if (c === null) {
                error("Unterminated stuff.");
            } else if (c === '\'' || c === '"' || c === '`') {
                string(c, true);
            } else if (c === '(' || c === '{' || c === '[') {
                paren += 1;
            } else if (c === ')' || c === '}' || c === ']') {
                paren -= 1;
                if (paren < 0) {
                    error("Unbalanced stuff");
                }
            } else if (c === '/') {
                if (peek() === '/' || peek() === '*') {
                    error("unexpected comment.");
                }
                if (pre_regexp(left)) {
                    regexp(true);
                }
            }
            if (c > ' ') {
                left = c;
            }
        }
    }


    function expand(tag_nr) {
        var c;

        c = peek();
        if (c === '(') {
            emit("if ");
            condition();
            emit(' ');
        }
        emit('{');
        if (methods[tag_nr]) {
            emit(methods[tag_nr] + '(');
            stuff();
            emit(");}");
        } else {
            stuff();
            emit('}');
        }
    }


    function process() {

// Loop through the program text, looking for patterns.

        var c = get(false), i, left = 0, tag;
        for (;;) {
            if (c === null) {
                break;
            } else if (c === '\'' || c === '"' || c === '`') {
                emit(c);
                string(c, false);
                c = 0;

// The most complicated case is the slash. It can mean division or a regexp
// literal or a line comment or a block comment. A block comment can also be
// a pattern to be expanded.

            } else if (c === '/') {

//  A slash slash comment skips to the end of the file.

                if (peek() === '/') {
                    emit('/');
                    for (;;) {
                        c = get(true);
                        if (c === '\n' || c === '\r' || c === null) {
                            break;
                        }
                    }
                    c = get(false);

//  The first component of a slash star comment might be the tag.

                } else {
                    if (peek() === '*') {
                        get(false);
                        tag = '';
                        for (;;) {
                            c = get(false);
                            if (!is_alphanum(c)) {
                                break;
                            }
                            tag += c;
                        }
                        unget(c);

//  Did the tag matches something?

                        i = !tag ? -1 : tags.indexOf(tag);
                        if (i >= 0) {
                            expand(i);
                            c = get(false);
                        } else {

// If the tag didn't match, then echo the comment.

                            emit("/*");
                            emit(tag);
                            for (;;) {
                                if (c === null) {
                                    error("unterminated comment.");
                                }
                                if (c === '/') {
                                    c = get(true);
                                    if (c === '*' || c === '/') {
                                        error("nested comment.");
                                    }
                                } else if (c === '*') {
                                    c = get(true);
                                    if (c === '/') {
                                        break;
                                    }
                                } else {
                                    c = get(true);
                                }
                            }
                            c = get(false);
                        }
                    } else {
                        emit('/');

// We are looking at a single slash. Is it a division operator, or is it the
// start of a regexp literal? If is not possible to tell for sure without doing
// a complete parse of the program, and we are not going to do that. Instead,
// we are adopting the convention that a regexp literal must have one of a
// small set of characters to its left.

                        if (pre_regexp(left)) {
                            regexp(false);
                        }
                        left = '/';
                        c = get(false);
                    }
                }
            } else {

// The character was nothing special, to just echo it.
// If it wasn't whitespace, remember it as the character to the left of the
// next character.

                emit(c);
                if (c > ' ') {
                    left = c;
                }
                c = get(false);
            }
        }
    }


// Begin. If there is a comments argument, then make each string into a
// comment at the top of the output.

    if (typeof comments === 'string') {
        emit("// " + comments + "\n");
    } else if (Array.isArray(comments)) {
        comments.forEach(function (value) {
            emit("// " + value + "\n");
        });
    }

// Inspect the tags for well formedness, and parse out the methods.

    if (Array.isArray(tags)) {
        methods = tags.map(function (value, i) {
            var result = tagx.exec(value);
            if (!result) {
                error(value);
            }
            if (result[2]) {
                tags[i] = result[1];
            }
            return result[2];
        });
    } else {
        error("no tags");
    }

// If the source is a string, bust it into lines.

    if (typeof source === 'string') {
        lines = source.split(/\n|\r\n?/);
    } else {
        lines = source;
    }

// Process the stuff, and return the output as a string.

    process();
    return outputs.join('');
}
