import * as _angular_core from '@angular/core';
import { OnInit, AfterViewInit, ElementRef, Renderer2, ChangeDetectorRef, OnDestroy, Type, Injector } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';
import * as _tiptap_core from '@tiptap/core';
import { Editor, Content, EditorEvents, NodeViewProps, NodeViewRendererOptions, NodeViewRenderer } from '@tiptap/core';
import * as prosemirror_view from 'prosemirror-view';
import * as _floating_ui_dom from '@floating-ui/dom';
import * as prosemirror_state from 'prosemirror-state';
import * as prosemirror_model from 'prosemirror-model';
import { Decoration, DecorationSource } from '@tiptap/pm/view';
import { Node } from '@tiptap/pm/model';

declare class TiptapEditorDirective implements OnInit, AfterViewInit, ControlValueAccessor {
    protected elRef: ElementRef<HTMLElement>;
    protected renderer: Renderer2;
    protected changeDetectorRef: ChangeDetectorRef;
    readonly editor: _angular_core.InputSignal<Editor>;
    readonly outputFormat: _angular_core.InputSignal<"json" | "html">;
    protected onChange: (value: Content) => void;
    protected onTouched: () => void;
    writeValue(value: Content): void;
    registerOnChange(fn: () => void): void;
    registerOnTouched(fn: () => void): void;
    setDisabledState(isDisabled: boolean): void;
    protected handleChange: ({ editor, transaction }: EditorEvents["transaction"]) => void;
    ngOnInit(): void;
    ngAfterViewInit(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<TiptapEditorDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<TiptapEditorDirective, "tiptap[editor], [tiptap][editor], tiptap-editor[editor], [tiptapEditor][editor]", never, { "editor": { "alias": "editor"; "required": true; "isSignal": true; }; "outputFormat": { "alias": "outputFormat"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class TiptapFloatingMenuDirective implements OnInit, OnDestroy {
    private elRef;
    readonly pluginKey: _angular_core.InputSignal<string | prosemirror_state.PluginKey<any>>;
    readonly editor: _angular_core.InputSignal<Editor>;
    readonly options: _angular_core.InputSignal<{
        strategy?: "absolute" | "fixed";
        placement?: "top" | "right" | "bottom" | "left" | "top-start" | "top-end" | "right-start" | "right-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end";
        offset?: Parameters<typeof _floating_ui_dom.offset>[0] | boolean;
        flip?: Parameters<typeof _floating_ui_dom.flip>[0] | boolean;
        shift?: Parameters<typeof _floating_ui_dom.shift>[0] | boolean;
        arrow?: Parameters<typeof _floating_ui_dom.arrow>[0] | false;
        size?: Parameters<typeof _floating_ui_dom.size>[0] | boolean;
        autoPlacement?: Parameters<typeof _floating_ui_dom.autoPlacement>[0] | boolean;
        hide?: Parameters<typeof _floating_ui_dom.hide>[0] | boolean;
        inline?: Parameters<typeof _floating_ui_dom.inline>[0] | boolean;
        onShow?: () => void;
        onHide?: () => void;
        onUpdate?: () => void;
        onDestroy?: () => void;
    } | undefined>;
    readonly shouldShow: _angular_core.InputSignal<((props: {
        editor: Editor;
        view: prosemirror_view.EditorView;
        state: prosemirror_state.EditorState;
        oldState?: prosemirror_state.EditorState;
        from: number;
        to: number;
    }) => boolean) | null | undefined>;
    ngOnInit(): void;
    ngOnDestroy(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<TiptapFloatingMenuDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<TiptapFloatingMenuDirective, "tiptap-floating-menu[editor], [tiptapFloatingMenu][editor]", never, { "pluginKey": { "alias": "pluginKey"; "required": false; "isSignal": true; }; "editor": { "alias": "editor"; "required": true; "isSignal": true; }; "options": { "alias": "options"; "required": false; "isSignal": true; }; "shouldShow": { "alias": "shouldShow"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class TiptapBubbleMenuDirective implements OnInit, OnDestroy {
    private elRef;
    readonly editor: _angular_core.InputSignal<Editor>;
    readonly pluginKey: _angular_core.InputSignal<string | prosemirror_state.PluginKey<any>>;
    readonly options: _angular_core.InputSignal<{
        strategy?: "absolute" | "fixed";
        placement?: "top" | "right" | "bottom" | "left" | "top-start" | "top-end" | "right-start" | "right-end" | "bottom-start" | "bottom-end" | "left-start" | "left-end";
        offset?: Parameters<typeof _floating_ui_dom.offset>[0] | boolean;
        flip?: Parameters<typeof _floating_ui_dom.flip>[0] | boolean;
        shift?: Parameters<typeof _floating_ui_dom.shift>[0] | boolean;
        arrow?: Parameters<typeof _floating_ui_dom.arrow>[0] | false;
        size?: Parameters<typeof _floating_ui_dom.size>[0] | boolean;
        autoPlacement?: Parameters<typeof _floating_ui_dom.autoPlacement>[0] | boolean;
        hide?: Parameters<typeof _floating_ui_dom.hide>[0] | boolean;
        inline?: Parameters<typeof _floating_ui_dom.inline>[0] | boolean;
        onShow?: () => void;
        onHide?: () => void;
        onUpdate?: () => void;
        onDestroy?: () => void;
    } | undefined>;
    readonly shouldShow: _angular_core.InputSignal<((props: {
        editor: Editor;
        element: HTMLElement;
        view: prosemirror_view.EditorView;
        state: prosemirror_state.EditorState;
        oldState?: prosemirror_state.EditorState;
        from: number;
        to: number;
    }) => boolean) | null | undefined>;
    readonly updateDelay: _angular_core.InputSignal<number | undefined>;
    ngOnInit(): void;
    ngOnDestroy(): void;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<TiptapBubbleMenuDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<TiptapBubbleMenuDirective, "tiptap-bubble-menu[editor], [tiptapBubbleMenu][editor]", never, { "editor": { "alias": "editor"; "required": true; "isSignal": true; }; "pluginKey": { "alias": "pluginKey"; "required": false; "isSignal": true; }; "options": { "alias": "options"; "required": false; "isSignal": true; }; "shouldShow": { "alias": "shouldShow"; "required": false; "isSignal": true; }; "updateDelay": { "alias": "updateDelay"; "required": false; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class TiptapDraggableDirective {
    draggable: boolean;
    handle: string;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<TiptapDraggableDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<TiptapDraggableDirective, "[tiptapDraggable]", never, {}, {}, never, never, true, never>;
}

declare class TiptapNodeViewContentDirective {
    handle: string;
    whiteSpace: string;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<TiptapNodeViewContentDirective, never>;
    static ɵdir: _angular_core.ɵɵDirectiveDeclaration<TiptapNodeViewContentDirective, "[tiptapNodeViewContent]", never, {}, {}, never, never, true, never>;
}

type Inputs = 'editor' | 'node' | 'decorations' | 'innerDecorations' | 'view' | 'selected' | 'extension' | 'HTMLAttributes' | 'getPos' | 'updateAttributes' | 'deleteNode';
type NodeViewPropsWithoutInputs = Omit<NodeViewProps, Inputs>;
declare class AngularNodeViewComponent implements NodeViewPropsWithoutInputs {
    readonly editor: _angular_core.InputSignal<_tiptap_core.Editor>;
    readonly node: _angular_core.InputSignal<prosemirror_model.Node>;
    readonly decorations: _angular_core.InputSignal<readonly _tiptap_core.DecorationWithType[]>;
    readonly innerDecorations: _angular_core.InputSignal<prosemirror_view.DecorationSource>;
    readonly view: _angular_core.InputSignal<prosemirror_view.EditorView>;
    readonly selected: _angular_core.InputSignal<boolean>;
    readonly extension: _angular_core.InputSignal<_tiptap_core.Node<any, any>>;
    readonly HTMLAttributes: _angular_core.InputSignal<Record<string, any>>;
    readonly getPos: _angular_core.InputSignal<() => number | undefined>;
    readonly updateAttributes: _angular_core.InputSignal<(attributes: Record<string, any>) => void>;
    readonly deleteNode: _angular_core.InputSignal<() => void>;
    static ɵfac: _angular_core.ɵɵFactoryDeclaration<AngularNodeViewComponent, never>;
    static ɵcmp: _angular_core.ɵɵComponentDeclaration<AngularNodeViewComponent, "ng-component", never, { "editor": { "alias": "editor"; "required": true; "isSignal": true; }; "node": { "alias": "node"; "required": true; "isSignal": true; }; "decorations": { "alias": "decorations"; "required": true; "isSignal": true; }; "innerDecorations": { "alias": "innerDecorations"; "required": true; "isSignal": true; }; "view": { "alias": "view"; "required": true; "isSignal": true; }; "selected": { "alias": "selected"; "required": true; "isSignal": true; }; "extension": { "alias": "extension"; "required": true; "isSignal": true; }; "HTMLAttributes": { "alias": "HTMLAttributes"; "required": true; "isSignal": true; }; "getPos": { "alias": "getPos"; "required": true; "isSignal": true; }; "updateAttributes": { "alias": "updateAttributes"; "required": true; "isSignal": true; }; "deleteNode": { "alias": "deleteNode"; "required": true; "isSignal": true; }; }, {}, never, never, true, never>;
}

declare class AngularRenderer<C, P> {
    private applicationRef;
    private componentRef;
    constructor(ViewComponent: Type<C>, injector: Injector, props: Partial<P>);
    get instance(): C;
    get elementRef(): ElementRef;
    get dom(): HTMLElement;
    updateProps<T extends P>(props: Partial<T>): void;
    updateAttributes(attributes: Record<string, string>): void;
    detectChanges(): void;
    destroy(): void;
}

interface RendererUpdateProps {
    oldNode: Node;
    oldDecorations: readonly Decoration[];
    oldInnerDecorations: DecorationSource;
    newNode: Node;
    newDecorations: readonly Decoration[];
    innerDecorations: DecorationSource;
    updateProps: () => void;
}
type AttrProps = Record<string, string> | ((props: {
    node: Node;
    HTMLAttributes: Record<string, unknown>;
}) => Record<string, string>);
interface AngularNodeViewRendererOptions extends NodeViewRendererOptions {
    update?: ((props: RendererUpdateProps) => boolean) | null;
    injector: Injector;
    attrs?: AttrProps;
}
declare const AngularNodeViewRenderer: (ViewComponent: Type<AngularNodeViewComponent>, options: Partial<AngularNodeViewRendererOptions>) => NodeViewRenderer;

export { AngularNodeViewComponent, AngularNodeViewRenderer, AngularRenderer, TiptapBubbleMenuDirective, TiptapDraggableDirective, TiptapEditorDirective, TiptapFloatingMenuDirective, TiptapNodeViewContentDirective };
