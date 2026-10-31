import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {extendMode} from '../mode.js';
import {getDefinitions} from '../definitions.js';

// Use the installed CodeMirror StringStream and DokuWiki tokenizer, without a DOM.
const cmRoot = new URL('../../codemirror/', import.meta.url);
const cmSource = await readFile(new URL('lib/codemirror/lib/codemirror.js', cmRoot), 'utf8');
const streamSource = cmSource.slice(cmSource.indexOf('  var StringStream = function'),
    cmSource.indexOf('  // Find the line object corresponding'));
const StringStream = vm.runInNewContext(streamSource + '\nStringStream;');
globalThis.window = {CodeMirror: {copyState: (mode, state) => ({...state})}};
const {dokuMode} = await import(new URL('mode.js', cmRoot));
const plugins = [
    'bootswrapper', 'latexcaption', 'icons', 'datatables', 'gallery', 'iframe',
    'diagrams', 'threejs', 'approve', 'codehighlightjs', 'mathjax', 'meta', 'pageredirect', 'qrcodephp',
];
const definitions = getDefinitions(plugins);
assert.equal(definitions.length, plugins.length);
assert.deepEqual(getDefinitions([]), []);
assert.deepEqual(getDefinitions(['unknown-plugin', '__proto__']), []);
assert.equal(getDefinitions(['icons']).length, 1);
function makeMode(rules = definitions) {
    return extendMode(dokuMode({}, {
        smileys: [], acronyms: [], entities: [], schemes: ['http', 'https'],
        validLang: () => true,
        loadMode: () => ({token(stream) {stream.next(); return 'embedded';}}),
    }), rules);
}
function tokenize(text, mode = makeMode()) {
    let state = mode.startState();
    const tokens = [];
    for (const line of text.split('\n')) {
        const stream = new StringStream(line);
        if (!line) mode.blankLine?.(state);
        let steps = 0;
        while (!stream.eol()) {
            if (++steps > line.length * 5 + 10) throw Error('Tokenizer stalled: ' + line);
            stream.start = stream.pos;
            const style = mode.token(stream, state);
            if (stream.current()) tokens.push({text: stream.current(), style});
        }
        // CodeMirror caches copies between lines; exercise the same path.
        state = mode.copyState(state);
    }
    return tokens;
}
let checks = 0;
function has(source, text, style, mode) {
    const tokens = tokenize(source, mode);
    assert(tokens.some(token => token.text === text && token.style?.split(' ').includes(style)),
        JSON.stringify({source, expected: {text, style}, tokens}));
    checks++;
}
has('<card type="spl">**Title**</card>', '<card', 'tag');
has('<card type="spl">**Title**</card>', 'type', 'attribute');
has('<card type="spl">**Title**</card>', '"spl"', 'string');
has('<card type="spl">**Title**</card>', '**', 'strong');
has('<grid>\n<col lg="6">\n<figure noprefix|label>\n<caption>Hi</caption>\n</figure>\n</col></grid>', 'noprefix', 'keyword');
has('<figure noprefix|label>', 'label', 'keyword');
has('<page-nav next="details"></page-nav>', 'next', 'attribute');
has('~~NOPAGETOOLS~~', '~~NOPAGETOOLS~~', 'meta');
has('{{fa>wrench?42}}', '42', 'number');
has('[[start|{{fa>home?24}}]]', '{{fa>', 'tag');
has('{{autoref>equipment}}', '{{autoref>', 'tag');
has('{{setcounter>figure=3}}', '3', 'number');
has('<datatables paging="false">\n^ Name ^ Value ^\n| A | B |\n</datatables>', '^', 'def');
has('{{gallery>photos?200x150}}', '200x150', 'number');
has('<gallery>\n{{image.png}}\n</gallery>', '<gallery', 'tag');
has('{{iframe>https://example.test?width=100%}}', 'width', 'attribute');
has('{{drawing.svg?width=100%|Diagram}}', '100%', 'number');
has('{{model.stl?width=400&color=blue}}', 'color', 'attribute');
has('@APPROVE_VERSION@', '@APPROVE_VERSION@', 'variable-2');
has('---- approve table ----\ncolumns: title,version\n----\n<card>', 'columns: title,version', 'meta');
has('---- approve table ----\ncolumns: title,version\n----\n<card>', '<card', 'tag');
has('<code js nowrap [demo.js] | Title>\nconst x = 1;\n</code>', '[demo.js]', 'string');
has('$x^2$', '$x^2$', 'string-2');
has('$$x\n\n+ y$$\n<card>', '<card', 'tag');
has('\\(x\\)', '\\(x\\)', 'string-2');
has('\\[x\\]', '\\[x\\]', 'string-2');
has('~~REDIRECT>start~~', '~~REDIRECT>start~~', 'meta');
has('#redirect start', '#redirect start', 'meta');
has('~~META:title=Example&description abstract=A summary~~', '~~META:', 'tag');
has('~~META:\ntitle = Process Outline\n~~', 'title', 'attribute');
has('~~META:\ntitle = Process Outline\n~~', '=', 'operator');
has('~~META:\ntitle = Process Outline\n~~', 'Process Outline', 'string');
has('~~META:\ntitle = Process Outline\n~~', '~~', 'tag');
has('~~META:\ntitle=Example\n\n&description abstract=A summary\n~~\n<card>', 'description abstract', 'attribute');
has('~~META:\ntitle=Example\n\n&description abstract=A summary\n~~\n<card>', 'A summary', 'string');
has('~~META:title=**literal** {{ref>example}}~~', '**literal** {{ref>example}}', 'string');
has('~~META:title=Example~~<card>', '<card', 'tag');
has('~~META:\ntitle=Example\n~~\n**Title**', '**', 'strong');
for (const source of [
    '<nowiki>~~META:title=Example~~</nowiki>',
    '<code text>\n~~META:title=Example~~\n</code>',
]) {
    assert(!tokenize(source).some(token => token.text === '~~META:' && token.style === 'tag'));
    checks++;
}
assert(!tokenize('~~META:title=Example~~', makeMode([])).some(token => token.text === '~~META:' && token.style === 'tag'));
checks++;
has('{{QRCODE 150>https://example.test}}', '{{QRCODE 150>', 'tag');
has('<card title="a > b">', '"a > b"', 'string');
has('<card title="two\nlines">', 'lines"', 'string');
has('<code js>\n<card> {{fa>home}} @APPROVE_USER@\n</code><card>', '<card', 'tag');
for (const source of [
    '<code js>\n<card> {{fa>home}} @APPROVE_USER@\n</code>',
    '<file text>\n<card> {{ref>x}}\n</file>',
    '<nowiki><card>{{fa>home}}</nowiki>',
    '%%<card>{{ref>x}}%%',
    '  <card>{{ref>x}}',
]) {
    assert(!tokenize(source).some(token => ['<card', '{{ref>', '{{fa>', '@APPROVE_USER@'].includes(token.text)));
    checks++;
}
assert(!tokenize('<card>', makeMode([])).some(token => token.text === '<card' && token.style === 'tag'));
checks++;
assert(!tokenize('<card>', makeMode(getDefinitions(['icons']))).some(token => token.text === '<card' && token.style === 'tag'));
checks++;
has('{{fa>wrench?42}}', '42', 'number', makeMode(getDefinitions(['icons'])));
for (const source of ['**bold** //italic//', '[[start|Home]]', '{{photo.png?200|Caption}}', '^ A ^ B ^\n| 1 | 2 |']) {
    assert.deepEqual(tokenize(source), tokenize(source, makeMode([])));
    checks++;
}
console.log('PASS: ' + checks + ' highlighting and regression checks across ' + plugins.length + ' plugin definitions');
