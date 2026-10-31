<?php

use dokuwiki\Extension\ActionPlugin;
use dokuwiki\Extension\Event;
use dokuwiki\Extension\EventHandler;

class action_plugin_codemirrorsyntax extends ActionPlugin
{
    public function register(EventHandler $controller)
    {
        $controller->register_hook('TPL_METAHEADER_OUTPUT', 'BEFORE', $this, 'addScripts');
    }

    public function addScripts(Event $event)
    {
        global $ACT;
        if (plugin_isdisabled('codemirror') || !in_array($ACT, [
            'edit', 'create', 'source', 'preview', 'locked', 'draft', 'recover'
        ], true)) return;

        $event->data['script'][] = [
            '_data' => 'window.dokuCodeMirrorSyntaxPlugins = ' . json_encode(plugin_list(),
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
}
