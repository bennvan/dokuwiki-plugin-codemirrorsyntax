/** Syntax definitions for the custom plugins supported by CodeMirror Extended Syntax. */
// Match the environments protected by MathJax's protecttex syntax component.
const mathEnvironments = [
    'math', 'displaymath', 'equation', 'equation*', 'eqnarray', 'eqnarray*',
    'align', 'align*', 'flalign', 'flalign*', 'alignat', 'alignat*',
    'multline', 'multline*', 'gather', 'gather*',
];

const definitions = {
    approve: {
        tokens: [{match: /^@APPROVE_(?:VERSION|DATE|USER|NAME|MESSAGE)@/, style: "variable-2"}],
        blocks: [{open: /^----+ *approve (?:table|history) *-+/, close: /^----+/, style: "meta", sol: true}],
    },
    bootswrapper: {
        tags: ["ALERT", "BADGE", "BOOTSTRAP", "JUMBOTRON", "LABEL", "TEXT", "WRAPPER", "accordion", "affix", "alert", "badge", "bar", "bscaption", "btn", "button", "callout", "card", "card-body", "carousel", "col", "collapse", "grid", "hidden", "image", "invisible", "jumbotron", "label", "lead", "list-group", "modal", "nav", "page-header", "page-nav", "pane", "panel", "panel-body", "pills", "popover", "progress", "ribbon", "row", "show", "slide", "tabs", "text", "thumbnail", "tooltip", "well", "wrapper"],
        tokens: [{match: /^~~(?:CLEARFIX|PAGEBREAK|NOBREAD|NOPAGEICONS|NOPAGEINFO|NOPAGETOOLS)~~/, style: "meta"}],
    },
    codehighlightjs: {
        // The built-in mode handles code/file languages and filenames.
        // Permit this plugin's additional options after the filename.
        codeOptions: true,
    },
    commentsyntax: {
        comments: {blockCommentStart: '/*', blockCommentEnd: '*/'},
        blocks: [
            {open: /^\/\*/, close: '*/', style: 'comment'},
            {open: /^<!--/, close: '-->', style: 'comment'},
        ],
    },
    datatables: {
        tags: ["datatables", "datatable", "DATATABLES", "DATATABLE"],
    },
    diagrams: {
        mediaExtensions: ["svg"],
    },
    gallery: {
        tags: ["gallery"],
        braces: ["gallery"],
    },
    icons: {
        braces: ["flag", "glyphicon", "ra", "icon", "fl", "typcn", "fugue", "oxygen", "silk", "fa", "mdi", "breeze"],
    },
    iframe: {
        braces: ["iframe"],
    },
    latexcaption: {
        tags: ["figure", "subfigure", "table", "subtable", "caption", "codeblock", "fileblock"],
        braces: ["ref", "autoref", "setcounter"],
    },
    mathjax: {
        // Monokai has no string-2 colour; string supplies a theme-native fallback.
        blocks: [
            {open: /^\$\$/, close: '$$', style: 'string string-2'},
            {open: /^\$(?=[^$\r\n]+\$)/, close: '$', style: 'string string-2', singleLine: true},
            {open: /^\\\(/, close: '\\)', style: 'string string-2'},
            {open: /^\\\[/, close: '\\]', style: 'string string-2'},
            ...mathEnvironments.map(environment => ({
                open: new RegExp('^\\\\begin\\{' + environment.replace('*', '\\*') + '\\}'),
                close: '\\end{' + environment + '}',
                style: 'string string-2',
            })),
        ],
    },
    meta: {
        blocks: [{open: /^~~META:/, close: '~~', keyValue: true}],
    },
    pageredirect: {
        tokens: [
            {match: /^~~REDIRECT>.*?~~/, style: 'meta'},
            {match: /^#redirect\s+.*$/i, style: 'meta', sol: true},
        ],
    },
    qrcodephp: {
        braces: ["QRCODE"],
    },
    threejs: {
        mediaExtensions: ["3mf", "stl", "vrml", "wrl"],
    },
};

/** Only enable rules for installed, enabled plugins reported by DokuWiki. */
export function getDefinitions(enabledPlugins) {
    return Object.entries(definitions)
        .filter(([plugin]) => enabledPlugins.includes(plugin))
        .map(([, definition]) => definition);
}
