<?php

use dokuwiki\Extension\ActionPlugin;
use dokuwiki\Extension\Event;
use dokuwiki\Extension\EventHandler;

class action_plugin_codemirrorsyntax extends ActionPlugin
{
    public function register(EventHandler $controller)
    {
        // Run after CodeMirror so we can detect resources it already supplied.
        $controller->register_hook('TPL_METAHEADER_OUTPUT', 'BEFORE', $this, 'addScripts', null, 100);
    }

    public function addScripts(Event $event)
    {
        global $ACT;
        if (plugin_isdisabled('codemirror') || !in_array($ACT, [
            'edit', 'create', 'source', 'preview', 'changes', 'locked', 'draft', 'recover'
        ], true)) return;

        if ($ACT === 'changes' && !plugin_isdisabled('diffpreview')) {
            $this->addChangesEditor($event);
        }

        $plugins = plugin_list();
        if (in_array('commentsyntax', $plugins, true)) {
            $event->data['script'][] = [
                'src' => DOKU_BASE . 'lib/plugins/codemirrorsyntax/vendor/codemirror/comment.js?v=' .
                    filemtime(__DIR__ . '/vendor/codemirror/comment.js'),
                'defer' => 'defer',
            ];
        }

        $event->data['script'][] = [
            '_data' => 'window.dokuCodeMirrorSyntaxPlugins = ' . json_encode($plugins,
                JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';',
        ];
        $event->data['script'][] = [
            'type' => 'module',
            'src' => DOKU_BASE . 'lib/plugins/codemirrorsyntax/loader.js?v=' . max(
                filemtime(__DIR__ . '/loader.js'), filemtime(__DIR__ . '/mode.js'),
                filemtime(__DIR__ . '/definitions.js')
            ),
        ];
    }

    /** Reuse CodeMirror's editor resources for DiffPreview's custom action. */
    private function addChangesEditor(Event $event)
    {
        global $ACT;

        // A future CodeMirror release may support this action itself.
        foreach ($event->data['script'] ?? [] as $script) {
            if (str_starts_with($script['src'] ?? '', DOKU_BASE . 'lib/plugins/codemirror/init.js')) return;
        }
        $codemirror = plugin_load('action', 'codemirror');
        if (!is_callable([$codemirror, 'handleTplMetaheaderOutput'])) return;

        // Only its resource loader sees "preview". Keep the actual Changes
        // action intact for rendering, permissions and all other plugins.
        $action = $ACT;
        try {
            $ACT = 'preview';
            $codemirror->handleTplMetaheaderOutput($event, null);
        } finally {
            $ACT = $action;
        }
    }
}
