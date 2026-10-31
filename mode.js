/**
 * Extend DokuWiki's mode without changing the renderer or saved source.
 * Definitions use standard CodeMirror token styles, so editor themes still apply.
 */
export function extendMode(base, definitions) {
    const tags = new Set(definitions.flatMap(rule => rule.tags || []));
    const braces = new Set(definitions.flatMap(rule => rule.braces || []));
    const extensions = new Set(definitions.flatMap(rule => rule.mediaExtensions || []));
    const tokens = definitions.flatMap(rule => rule.tokens || []);
    const blocks = definitions.flatMap(rule => rule.blocks || []);
    const codeOptions = definitions.some(rule => rule.codeOptions);

    function consumeUntil(stream, end) {
        while (!stream.eol()) {
            if (stream.match(end)) return true;
            stream.next();
        }
        return false;
    }

    function parameters(stream, extra) {
        if (extra.quote) {
            while (!stream.eol()) {
                const ch = stream.next();
                if (ch === extra.quote) {
                    extra.quote = null;
                    break;
                }
            }
            return 'string';
        }
        if (stream.match(extra.end)) {
            extra.end = null;
            return 'tag';
        }
        if (stream.eatSpace()) return null;
        if (stream.peek() === '"' || stream.peek() === "'") {
            extra.quote = stream.next();
            parameters(stream, extra);
            return 'string';
        }
        if (stream.match(/^[?&|=,]/)) return 'operator';
        if (stream.match(/^\d+(?:\.\d+)?(?:x\d+)?(?:%|px|em|rem)?(?=[\s}|>,&]|$)/)) return 'number';
        if (stream.match(/^[\w:-]+(?=\s*=)/)) return 'attribute';
        if (stream.match(/^[^\s}"'<>?&|=,]+/)) return extra.kind === 'brace' ? 'link' : 'keyword';
        stream.next();
        return null;
    }

    return {
        ...base,
        startState() {
            const state = base.startState();
            state.pluginSyntax = {};
            return state;
        },
        copyState(state) {
            const copy = base.copyState(state);
            copy.pluginSyntax = {...state.pluginSyntax};
            return copy;
        },
        blankLine(state) {
            // Comments/math keep their state across blank lines.
            if (!state.pluginSyntax.block && !state.pluginSyntax.end) return base.blankLine?.(state);
        },
        token(stream, state) {
            const extra = state.pluginSyntax;
            if (extra.block) {
                const rule = extra.block;
                if (consumeUntil(stream, rule.close) || rule.singleLine) extra.block = null;
                return rule.style || 'comment';
            }
            if (extra.end) return parameters(stream, extra);

            // The core mode leaves an exited construct on its stack until the next
            // token. Look through it when deciding whether plugin syntax is allowed.
            const current = state.exit ? state.stack[state.stack.length - 1] : state.current;
            if (codeOptions && ['code', 'file'].includes(current?.name) && !state.exit &&
                !state.innerMode && state.codeFilename && !stream.match(/^\s*>/, false)) {
                if (stream.eatSpace()) return null;
                if (stream.match(/^[\w-]+(?==)/)) return 'attribute';
                if (stream.match('=')) return 'operator';
                if (stream.match(/^[^\s>]+/)) return 'string';
            }
            const protectedMode = current && (['protected', 'disabled'].includes(current.type) ||
                ['media', 'rss'].includes(current.name) ||
                (current.name === 'internallink' && !state.linkTitle));
            if (protectedMode) return base.token(stream, state);

            for (const rule of blocks) {
                if (rule.sol && !stream.sol()) continue;
                if (stream.match(rule.open)) {
                    if (!consumeUntil(stream, rule.close) && !rule.singleLine) extra.block = rule;
                    return rule.style || 'comment';
                }
            }
            for (const rule of tokens) {
                if (rule.sol && !stream.sol()) continue;
                if (stream.match(rule.match)) return rule.style || 'meta';
            }

            const tag = stream.match(/^<\/?([\w-]+)(?=[\s/>|]|$)/, false);
            if (tag && tags.has(tag[1])) {
                stream.match(tag[0]);
                Object.assign(extra, {end: '>', kind: 'tag', quote: null});
                return 'tag';
            }
            const brace = stream.match(/^\{\{\s*([\w-]+)(?:\s+\d+)?(?=>)/, false);
            if (brace && braces.has(brace[1])) {
                stream.match(brace[0] + '>');
                Object.assign(extra, {end: '}}', kind: 'brace', quote: null});
                return 'tag';
            }
            const media = stream.match(/^\{\{\s*[^}\n?|]+\.([a-z0-9]+)(?=[?\s|}])/, false);
            if (media && extensions.has(media[1].toLowerCase())) {
                stream.match(media[0]);
                Object.assign(extra, {end: '}}', kind: 'brace', quote: null});
                return 'link';
            }
            return base.token(stream, state);
        },
    };
}
