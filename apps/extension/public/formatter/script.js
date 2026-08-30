const BUTTON_ID = 'format-button';
const BUTTON_OWNER = 'problem-prism';
const SUPPORTED_LANGUAGES = new Set([
    'cpp',
    'dart',
    'java',
    'javascript',
    'typescript',
]);

let formatButton = null;
let formatting = false;
let mountFrame = null;
let feedbackTimer = null;
const formatterModulePromises = new Map();

function loadFormatterModule(path) {
    const cached = formatterModulePromises.get(path);
    if (cached) return cached;

    const promise = import(path).catch((error) => {
        // A transient extension-resource failure should not permanently poison
        // formatting for the rest of the page session.
        formatterModulePromises.delete(path);
        throw error;
    });
    formatterModulePromises.set(path, promise);
    return promise;
}

async function loadPrettierPlugin(path) {
    const [, plugin] = await Promise.all([
        loadFormatterModule('./standalone.js'),
        loadFormatterModule(path),
    ]);
    if (!globalThis.prettier) {
        throw new Error('The JavaScript formatter runtime is unavailable');
    }
    return plugin.default;
}

function normalizeLanguage(language) {
    const normalized = String(language ?? '').trim().toLowerCase();
    return normalized === 'c++' ? 'cpp' : normalized;
}

function languageName(language) {
    const names = {
        cpp: 'C++',
        dart: 'Dart',
        java: 'Java',
        javascript: 'JavaScript',
        typescript: 'TypeScript',
    };
    return names[normalizeLanguage(language)] ?? String(language ?? 'code');
}

function isVisible(element) {
    if (!(element instanceof HTMLElement)) return false;
    const style = window.getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        bounds.width > 0 &&
        bounds.height > 0;
}

function findVisibleEditorRoot() {
    return Array.from(document.querySelectorAll('[data-mode-id]')).find(
        (element) => isVisible(element) && element.querySelector('.monaco-editor')
    ) ?? null;
}

function findEditorToolbar(editorRoot) {
    let ancestor = editorRoot.parentElement;

    while (ancestor && ancestor !== document.body) {
        const children = Array.from(ancestor.children);
        const editorChild = children.find((child) => child.contains(editorRoot));
        const toolbar = children.find((child) => {
            if (child === editorChild || !isVisible(child) || !child.querySelector('button')) {
                return false;
            }
            const height = child.getBoundingClientRect().height;
            return height >= 24 && height <= 64;
        });

        if (toolbar) return toolbar;
        ancestor = ancestor.parentElement;
    }

    return null;
}

function modelLanguage(model) {
    return normalizeLanguage(
        typeof model?.getLanguageId === 'function'
            ? model.getLanguageId()
            : model?._languageId
    );
}

function findEditorContext() {
    const editorRoot = findVisibleEditorRoot();
    const monacoApi = globalThis.monaco?.editor;
    if (!editorRoot || !monacoApi) return null;

    const editors = typeof monacoApi.getEditors === 'function'
        ? monacoApi.getEditors()
        : [];
    const editor = editors.find((candidate) => candidate.hasTextFocus?.()) ??
        editors.find((candidate) => {
            const node = candidate.getDomNode?.();
            return node && editorRoot.contains(node) && isVisible(node);
        }) ??
        null;

    const rootLanguage = normalizeLanguage(editorRoot.getAttribute('data-mode-id'));
    const model = editor?.getModel?.() ??
        monacoApi.getModels?.().find((candidate) => modelLanguage(candidate) === rootLanguage) ??
        monacoApi.getModels?.().find((candidate) => SUPPORTED_LANGUAGES.has(modelLanguage(candidate))) ??
        null;

    if (!model) return null;

    return {
        editor: editor?.getModel?.() === model ? editor : null,
        language: modelLanguage(model) || rootLanguage,
        model,
    };
}

function setButtonState(state, detail) {
    if (!formatButton?.isConnected) return;

    window.clearTimeout(feedbackTimer);
    formatButton.dataset.formatState = state;
    formatButton.setAttribute('aria-busy', String(state === 'loading'));

    if (state === 'loading') {
        formatButton.title = 'Formatting code…';
        return;
    }

    if (state === 'error') {
        formatButton.title = detail || 'Unable to format this code';
    } else if (state === 'success') {
        formatButton.title = detail || 'Code formatted';
    } else {
        formatButton.title = 'Format code (Ctrl+Alt+F)';
    }

    if (state !== 'idle') {
        feedbackTimer = window.setTimeout(() => setButtonState('idle'), 1800);
    }
}

function replaceModelText({ editor, model }, text) {
    const edit = {
        forceMoveMarkers: true,
        range: model.getFullModelRange(),
        text,
    };

    if (editor?.executeEdits) {
        editor.pushUndoStop?.();
        editor.executeEdits('problem-prism-format', [edit]);
        editor.pushUndoStop?.();
        return;
    }

    if (model.pushEditOperations) {
        model.pushStackElement?.();
        model.pushEditOperations([], [edit], () => null);
        model.pushStackElement?.();
        return;
    }

    model.setValue(text);
}

async function formatCurrentEditor() {
    if (formatting) return false;

    const context = findEditorContext();
    if (!context || !SUPPORTED_LANGUAGES.has(context.language)) return false;

    formatting = true;
    setButtonState('loading');

    try {
        const source = context.model.getValue();
        const formatted = await Promise.resolve(formatCode(source, context.language));
        if (typeof formatted !== 'string') {
            throw new Error(`Formatting is unavailable for ${languageName(context.language)}`);
        }

        if (formatted !== source) replaceModelText(context, formatted);
        setButtonState('success', `${languageName(context.language)} formatted`);
        return true;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('ProblemPrism could not format the active editor', error);
        setButtonState('error', message);
        return false;
    } finally {
        formatting = false;
    }
}

function createFormatButton() {
    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.dataset.formatterOwner = BUTTON_OWNER;
    button.type = 'button';
    button.className = [
        'relative',
        'inline-flex',
        'items-center',
        'justify-center',
        'cursor-pointer',
        'transition-colors',
        'bg-transparent',
        'text-caption',
        'text-text-primary',
        'group',
        'aspect-1',
        'h-full',
        'p-1',
    ].join(' ');
    button.setAttribute('aria-label', 'Format code');
    button.innerHTML = `
        <span class="inline-flex h-7 w-7 items-center justify-center rounded
            transition-colors group-hover:bg-fill-secondary group-active:bg-fill-primary"
            style="align-items:center;border-radius:6px;display:inline-flex;height:28px;
                justify-content:center;width:28px">
            <svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"
                fill="none" stroke="currentColor" stroke-width="1.8"
                stroke-linecap="round" stroke-linejoin="round">
                <path d="m8 8-4 4 4 4" />
                <path d="m16 8 4 4-4 4" />
                <path d="m14 5-4 14" />
            </svg>
        </span>`;
    button.style.background = 'transparent';
    button.style.border = '0';
    button.style.borderRadius = '0';
    button.style.boxSizing = 'border-box';
    button.style.color = 'inherit';
    button.style.cursor = 'pointer';
    button.style.display = 'inline-flex';
    button.style.flex = '0 0 32px';
    button.style.justifyContent = 'center';
    button.style.height = '32px';
    button.style.padding = '0';
    button.style.pointerEvents = 'auto';
    button.style.position = 'relative';
    button.style.touchAction = 'manipulation';
    button.style.width = '32px';
    button.style.zIndex = '1';
    const visualSurface = button.firstElementChild;
    visualSurface.style.pointerEvents = 'none';
    let hovered = false;
    let pressed = false;

    const updateVisualState = () => {
        const active = hovered || button === document.activeElement;
        visualSurface.style.backgroundColor = pressed
            ? 'color-mix(in srgb, currentColor 16%, transparent)'
            : active
                ? 'color-mix(in srgb, currentColor 10%, transparent)'
                : 'transparent';
    };

    button.addEventListener('pointerenter', () => {
        hovered = true;
        updateVisualState();
    });
    button.addEventListener('pointerleave', () => {
        hovered = false;
        pressed = false;
        updateVisualState();
    });
    button.addEventListener('pointerdown', () => {
        pressed = true;
        updateVisualState();
    });
    button.addEventListener('pointerup', () => {
        pressed = false;
        updateVisualState();
    });
    button.addEventListener('focus', updateVisualState);
    button.addEventListener('blur', updateVisualState);
    button.addEventListener('click', (event) => {
        event.stopPropagation();
        void formatCurrentEditor();
    });
    formatButton = button;
    setButtonState('idle');
    return button;
}

function findActionGroup(toolbar) {
    return Array.from(toolbar.children)
        .filter((child) => isVisible(child) && child.querySelector('button'))
        .at(-1) ?? toolbar;
}

function mountFormatButton() {
    const editorRoot = findVisibleEditorRoot();
    if (!editorRoot) return;

    const toolbar = findEditorToolbar(editorRoot);
    if (!toolbar) return;

    const existing = document.getElementById(BUTTON_ID);
    if (existing && existing.dataset.formatterOwner !== BUTTON_OWNER) return;

    const button = existing ?? formatButton ?? createFormatButton();
    const actionGroup = findActionGroup(toolbar);
    if (button.parentElement !== actionGroup) actionGroup.appendChild(button);

    const language = normalizeLanguage(editorRoot.getAttribute('data-mode-id'));
    const supported = SUPPORTED_LANGUAGES.has(language);
    button.hidden = !supported;
    button.style.display = supported ? 'inline-flex' : 'none';
}

function scheduleMount() {
    if (mountFrame !== null) return;
    mountFrame = window.requestAnimationFrame(() => {
        mountFrame = null;
        mountFormatButton();
    });
}

function mutationAffectsEditor(mutation) {
    if (mutation.type === 'attributes') return true;

    const touchesEditor = (node) => node instanceof Element && (
        node.matches('[data-mode-id], #format-button') ||
        node.querySelector('[data-mode-id], #format-button')
    );

    return Array.from(mutation.addedNodes).some(touchesEditor) ||
        Array.from(mutation.removedNodes).some(touchesEditor);
}

window.addEventListener('keydown', (event) => {
    if (!event.ctrlKey || !event.altKey || event.metaKey || event.repeat) return;
    if (event.key.toLowerCase() !== 'f') return;

    const context = findEditorContext();
    if (!context || !SUPPORTED_LANGUAGES.has(context.language)) return;

    event.preventDefault();
    void formatCurrentEditor();
});

new MutationObserver((mutations) => {
    if (mutations.some(mutationAffectsEditor)) scheduleMount();
}).observe(document.documentElement, {
    attributeFilter: ['data-mode-id'],
    attributes: true,
    childList: true,
    subtree: true,
});

scheduleMount();

async function formatCode(codeText, language) {
    const normalizedLanguage = normalizeLanguage(language);

    if (normalizedLanguage === 'javascript') {
        const parser = await loadPrettierPlugin('./parser-babel.mjs');
        return prettier.format(codeText, {
            parser: 'babel',
            plugins: [parser],
        });
    }

    if (normalizedLanguage === 'typescript') {
        const parser = await loadPrettierPlugin('./parser-typescript.mjs');
        return prettier.format(codeText, {
            parser: 'typescript',
            plugins: [parser],
        });
    }

    if (normalizedLanguage === 'java') {
        const { default: prettierJava } = await loadFormatterModule('./parser-java.js');
        return prettierJava.formatCode(codeText, {
            printWidth: 200,
            tabWidth: 4,
        });
    }

    if (normalizedLanguage === 'cpp') {
        await loadFormatterModule('./beautify.js');
        if (typeof globalThis.js_beautify !== 'function') {
            throw new Error('The C++ formatter runtime is unavailable');
        }
        return applyCustomRules(js_beautify(codeText, {
            indent_size: 4,
            brace_style: 'expand',
        }));
    }

    if (normalizedLanguage === 'dart') {
        await loadFormatterModule('./dart-style.js');
        if (!globalThis.dartfmt?.formatCode) {
            throw new Error('The Dart formatter runtime is unavailable');
        }
        return dartfmt.formatCode(codeText).code;
    }

    return undefined;
}

function applyCustomRules(formatted) {
    return formatted
        .replace(/\}\r\n/g, '}\n\n')
        .replace(/\<\s([a-zA-Z0-9_,: *&<>]+)\s>/g, '<$1>')
        .replace(/\<\s([a-zA-Z0-9_,: *&<>]+)>/g, '<$1>')
        .replace(/\<([a-zA-Z0-9_:*]+)\s>/g, '<$1>')
        .replace(/iterator\s</g, 'iterator<')
        .replace(/ = \{\s*([0-9 ,-.]+)\s+};/g, ' = { $1 };')
        .replace(/\n\s*\n/g, '\n\n')
        .replace(/,\n\n/g, ',\n')
        .replace(/\r\n\t{}/g, ' {}')
        .replace(/\{\r\n\n/g, '{\r\n')
        .replace(/\r\n\tconst & /g, ' const &')
        .replace(/,\s+const /g, ', const ')
        .replace(/#\r\ndefine/g, '#define')
        .replace(/#\ndefine/g, '#define')
        .replace(/# define/g, '\r\n#define')
        .replace(/;#define/g, ';\r\n#define')
        .replace(/#define/g, '\n#define')
        .replace(/\n\s*\n#define/g, '\n#define')
        .replace(/;\r\n#define/g, ';\r\n\r\n#define')
        .replace(/;\n#define/g, ';\n\n#define')
        .replace(/\r\n#include/g, '#include')
        .replace(/\n#include/g, '#include')
        .replace(
            /([a-zA-Z0-9\t ./<>?;:"'`!@#$%^&*()\[\]{}_+=|\\-]+)#include/g,
            '$1\r\n#include'
        )
        .replace(/vector </g, 'vector<')
        .replace(/set </g, 'set<')
        .replace(/map </g, 'map<')
        .replace(/queue </g, 'queue<')
        .replace(/stack </g, 'stack<')
        .replace(/deque </g, 'deque<')
        .replace(/list </g, 'list<')
        .replace(/array </g, 'array<')
        .replace(/ - > /g, '->')
        .replace(/\(\s+\{\s+/g, '({ ')
        .replace(/\s+\}\)/g, ' })')
        .replace(/\tpublic_colon/g, 'public:')
        .replace(/\tprivate_colon/g, 'private:')
        .replace(/\tprotected_colon/g, 'protected:')
        .replace(/^#define(.*)$/, '#define')
        .replace(/xxxx/g, 'const')
        .replace(/\*(\s+)const/g, '*const')
        .replace(/operator (\W+) /g, 'operator$1')
        .replace(/operator<= >/g, 'operator<=>')
        .replace(/=(\s+)default/g, '= default')
        .replace(/; \}/g, ';\n}')
        .replace(/{\n\t\t\t/g, '{ ')
        .replace(/= { {/g, '= {\n\t\t{')
        .replace(/} };/g, '}\n\t};')
        .replace(/(\W+)\* /g, '$1*')
        .replace(/;\*/g, '; *')
        .replace(/(\w+) \*(\w+);/g, '$1 * $2;')
        .replace(/(\w+) \*(\w+)\)/g, '$1 * $2)')
        .replace(/(\w+) \*(\w+)\(/g, '$1 * $2(')
        .replace(/(\w+)(\s*)\*(\w+)(\s*)\</g, '$1 * $3 <')
        .replace(/(\w+)(\s*)\*(\w+)(\s*)\>/g, '$1 * $3 >')
        .replace(/(\w+)(\s*)\*(\w+)(\s*)\=/g, '$1 * $3 =')
        .replace(/(\d+)(\s*)\*(\d+)/g, '$1 * $3')
        .replace(/(\W) \* (\w)/g, '$1 *$2')
        .replace(/->\* /g, '->*')
        .replace(/ \[ &/g, ' [&')
        .replace(/\r\n\r\nusing/g, '\r\nusing')
        .replace(/\n\nusing/g, '\nusing')
        .replace(/\s,\s/g, ', ')
        .replace(/> ::/g, '>::')
        .replace(/(\s+)&\s+/g, '$1&')
        .replace(/\s\[/g, '[')
        .replace(/\(\s/g, '(')
        .replace(/\s\)/g, ')')
        .replace(/int \* /g, 'int *')
        .replace(/char \* /g, 'char *')
        .replace(/double \* /g, 'double *')
        .replace(/float \* /g, 'float *')
        .replace(/bool \* /g, 'bool *')
        .replace(/void \* /g, 'void *')
        .replace(/wchar_t \* /g, 'wchar_t *')
        .replace(/(\w+) \*\* /g, '$1 **')
        .replace(/\((\w+) \*\)/g, '($1*)')
        .replace(/(\w+) \*\>/g, '$1*>')
        .replace(/(\s)\<= /g, '$1 <= ')
        .replace(/\((\w+) &(\w+)\)/g, '($1 & $2)')
        .replace(/\[(\w+) &(\w+)\]/g, '[$1 & $2]')
        .replace(/\s<\s/g, '<')
        .replace(/\s<([^<])/g, '<$1')
        .replace(
            /([A-Za-z0-9_,\.\(\)\[\]\-\>]+)<([A-Za-z0-9_,\.\(\)\[\]\-\>]+)([\s\;\)])/g,
            '$1 < $2$3'
        )
        .replace(/<(\s+)const/g, '<const')
        .replace(/#include</g, '#include <')
        .replace(/#include < /g, '#include <')
        .replace(/(\w)\> /g, '$1 > ')
        .replace(/(\w)\>= /g, '$1 >= ')
        .replace(/\s+{}/g, ' {}')
        .replace(/\s+{\s+}/g, ' {}')
        .replace(/\s\<\s(\w+)\s\*,/g, '<$1*,')
        .replace(/\[ \*/g, '[*')
        .replace(/\<(\w+)\s\>/g, '<$1>')
        .replace(/, (\w+)\s\>/g, ', $1>')
        .replace(/\/\/TEMPLATE/g, 'template <')
        .replace(/\[ = \]/g, '[=]')
        .replace(/\}\n\n}/g, '}\n}')
        .replace(/\}\n\n(\s*)\}/g, '}\n$1}')
        .replace(/\}\n\n(\s+)\}/g, '}\n$1}')
        .replace(/\}\n\n(\s+)else/g, '}\n$1else')
        .replace(/\n\}\)\;/g, '\n\t});')
        .replace(/\,\[/g, ', [')
        .replace(/\;\n\n(\s+)\}/g, ';\n$1}')
        .replace(/(\s+)\{([ \t]+)(\w+)/g, '$1{$1\t$3')
        .replace(/(\s+)\{([ \t]+)\/\//g, '$1{$1$2//')
        .replace(/=\s{(\s+)/g, '= { ')
        .replace(/\{\r\n\s+([0-9,-\s.]+)\r\n\s+\}/g, '{ $1 }')
        .replace(/\{\n\s+([0-9,-\s.]+)\n\s+\}/g, '{ $1 }')
        .replace(/\{ \{/g, '{\n\t\t{')
        .replace(/ \/\//g, '\t//')
        .replace(/(['"])(\s+)\}/g, '$1 }')
        .replace(/(\w+) \* (\w+) =/g, '$1 *$2 =')
        .replace(/(\w+) \* (\w+)\)/g, '$1 *$2)')
        .replace(/(\w+) \* (\w+)\(/g, '$1* $2(')
        .replace(/(\w+) \*\& (\w+)/g, '$1* &$2')
        .replace(/\s\<\s(\w+)\s\>/g, '<$1>')
        .replace(/\s\<\s(\w+)\,/g, '<$1,')
        .replace(/\{\}~/g, '{}\n\t~')
        .replace(/_cast </g, '_cast<')
        .replace(/\>\s+\{\s*([A-Za-z0-9 ,-.\"]+)\s+\}\;/g, '> { $1 };');
}
