/** CodeMirror Extended Syntax: use upstream's editor-ready hook. */
const version = new URL(import.meta.url).search;
const [{extendMode}, {getDefinitions}] = await Promise.all([
    import('./mode.js' + version),
    import('./definitions.js' + version),
]);
const definitions = getDefinitions(window.dokuCodeMirrorSyntaxPlugins || []);

let installed = false;
const attached = new WeakSet();
function attach(cm) {
    const CM = window.CodeMirror;
    if (!definitions.length || !cm || !CM || !CM.modes.doku || attached.has(cm)) return;
    if (!installed) {
        const original = CM.modes.doku;
        CM.defineMode('doku', (config, spec) => extendMode(original(config, spec), definitions));
        installed = true;
    }
    attached.add(cm);
    // Rebuild the current mode. Later language loads and highlighting toggles also
    // use the registered factory, so the integration survives those changes.
    cm.setOption('mode', cm.getOption('mode'));
    if (definitions.some(rule => rule.comments) && typeof cm.toggleComment === 'function') {
        const toggleComment = editor => {
            if (editor.getOption('readOnly')) return CM.Pass;
            editor.toggleComment();
        };
        cm.addKeyMap({'Ctrl-/': toggleComment, 'Cmd-/': toggleComment});
    }
}

window.jQuery(document).on('codemirror_ready.codemirrorsyntax', (event, cm) => attach(cm));
attach(window.plugin_codemirror?.cm);
