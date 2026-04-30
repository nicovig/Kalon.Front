import * as i0 from '@angular/core';
import { inject, ElementRef, Renderer2, ChangeDetectorRef, input, forwardRef, Directive, HostBinding, Component, ApplicationRef, createComponent } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { FloatingMenuPlugin } from '@tiptap/extension-floating-menu';
import { BubbleMenuPlugin } from '@tiptap/extension-bubble-menu';
import { NodeView, getRenderedAttributes } from '@tiptap/core';

class TiptapEditorDirective {
    elRef = inject(ElementRef);
    renderer = inject(Renderer2);
    changeDetectorRef = inject(ChangeDetectorRef);
    editor = input.required();
    outputFormat = input('html');
    onChange = () => { };
    onTouched = () => { };
    // Writes a new value to the element.
    // This methods is called when programmatic changes from model to view are requested.
    writeValue(value) {
        this.editor().chain().setContent(value, { emitUpdate: false }).run();
    }
    // Registers a callback function that is called when the control's value changes in the UI.
    registerOnChange(fn) {
        this.onChange = fn;
    }
    // Registers a callback function that is called by the forms API on initialization to update the form model on blur.
    registerOnTouched(fn) {
        this.onTouched = fn;
    }
    // Called by the forms api to enable or disable the element
    setDisabledState(isDisabled) {
        this.editor().setEditable(!isDisabled);
        this.renderer.setProperty(this.elRef.nativeElement, 'disabled', isDisabled);
    }
    handleChange = ({ editor, transaction }) => {
        if (!transaction.docChanged) {
            return;
        }
        // Needed for ChangeDetectionStrategy.OnPush to get notified about changes
        this.changeDetectorRef.markForCheck();
        if (this.outputFormat() === 'html') {
            this.onChange(editor.getHTML());
            return;
        }
        this.onChange(editor.getJSON());
    };
    ngOnInit() {
        const editor = this.editor();
        // take the inner contents and clear the block
        const { innerHTML } = this.elRef.nativeElement;
        this.elRef.nativeElement.innerHTML = '';
        // insert the editor in the dom
        this.elRef.nativeElement.append(...Array.from(editor.options.element?.childNodes || []));
        // update the options for the editor
        editor.setOptions({ element: this.elRef.nativeElement });
        // update content to the editor
        if (innerHTML) {
            editor.chain().setContent(innerHTML, { emitUpdate: false }).run();
        }
        // register blur handler to update `touched` property
        editor.on('blur', () => {
            this.onTouched();
        });
        // register update handler to listen to changes on update
        editor.on('update', this.handleChange);
        // Needed for ChangeDetectionStrategy.OnPush to get notified
        editor.on('selectionUpdate', () => this.changeDetectorRef.markForCheck());
    }
    ngAfterViewInit() {
        this.changeDetectorRef.detectChanges();
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapEditorDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "20.0.6", type: TiptapEditorDirective, isStandalone: true, selector: "tiptap[editor], [tiptap][editor], tiptap-editor[editor], [tiptapEditor][editor]", inputs: { editor: { classPropertyName: "editor", publicName: "editor", isSignal: true, isRequired: true, transformFunction: null }, outputFormat: { classPropertyName: "outputFormat", publicName: "outputFormat", isSignal: true, isRequired: false, transformFunction: null } }, providers: [{
                provide: NG_VALUE_ACCESSOR,
                useExisting: forwardRef(() => TiptapEditorDirective),
                multi: true,
            }], ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapEditorDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: 'tiptap[editor], [tiptap][editor], tiptap-editor[editor], [tiptapEditor][editor]',
                    providers: [{
                            provide: NG_VALUE_ACCESSOR,
                            useExisting: forwardRef(() => TiptapEditorDirective),
                            multi: true,
                        }],
                }]
        }] });

class TiptapFloatingMenuDirective {
    elRef = inject(ElementRef);
    pluginKey = input('NgxTiptapFloatingMenu');
    editor = input.required();
    options = input({});
    shouldShow = input(null);
    ngOnInit() {
        const editor = this.editor();
        if (!editor) {
            throw new Error('Required: Input `editor`');
        }
        const floatingMenuElement = this.elRef.nativeElement;
        floatingMenuElement.style.visibility = 'hidden';
        floatingMenuElement.style.position = 'absolute';
        editor.registerPlugin(FloatingMenuPlugin({
            pluginKey: this.pluginKey(),
            editor,
            element: floatingMenuElement,
            options: this.options(),
            shouldShow: this.shouldShow(),
        }));
    }
    ngOnDestroy() {
        this.editor().unregisterPlugin(this.pluginKey());
        window.requestAnimationFrame(() => {
            if (this.elRef.nativeElement.parentNode) {
                this.elRef.nativeElement.parentNode.removeChild(this.elRef.nativeElement);
            }
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapFloatingMenuDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "20.0.6", type: TiptapFloatingMenuDirective, isStandalone: true, selector: "tiptap-floating-menu[editor], [tiptapFloatingMenu][editor]", inputs: { pluginKey: { classPropertyName: "pluginKey", publicName: "pluginKey", isSignal: true, isRequired: false, transformFunction: null }, editor: { classPropertyName: "editor", publicName: "editor", isSignal: true, isRequired: true, transformFunction: null }, options: { classPropertyName: "options", publicName: "options", isSignal: true, isRequired: false, transformFunction: null }, shouldShow: { classPropertyName: "shouldShow", publicName: "shouldShow", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapFloatingMenuDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: 'tiptap-floating-menu[editor], [tiptapFloatingMenu][editor]',
                }]
        }] });

class TiptapBubbleMenuDirective {
    elRef = inject(ElementRef);
    editor = input.required();
    pluginKey = input('NgxTiptapBubbleMenu');
    options = input({});
    shouldShow = input(null);
    updateDelay = input();
    ngOnInit() {
        const editor = this.editor();
        if (!editor) {
            throw new Error('Required: Input `editor`');
        }
        const bubbleMenuElement = this.elRef.nativeElement;
        bubbleMenuElement.style.visibility = 'hidden';
        bubbleMenuElement.style.position = 'absolute';
        editor.registerPlugin(BubbleMenuPlugin({
            pluginKey: this.pluginKey(),
            editor,
            element: bubbleMenuElement,
            options: this.options(),
            shouldShow: this.shouldShow(),
            updateDelay: this.updateDelay(),
        }));
    }
    ngOnDestroy() {
        this.editor().unregisterPlugin(this.pluginKey());
        window.requestAnimationFrame(() => {
            if (this.elRef.nativeElement.parentNode) {
                this.elRef.nativeElement.parentNode.removeChild(this.elRef.nativeElement);
            }
        });
    }
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapBubbleMenuDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "17.1.0", version: "20.0.6", type: TiptapBubbleMenuDirective, isStandalone: true, selector: "tiptap-bubble-menu[editor], [tiptapBubbleMenu][editor]", inputs: { editor: { classPropertyName: "editor", publicName: "editor", isSignal: true, isRequired: true, transformFunction: null }, pluginKey: { classPropertyName: "pluginKey", publicName: "pluginKey", isSignal: true, isRequired: false, transformFunction: null }, options: { classPropertyName: "options", publicName: "options", isSignal: true, isRequired: false, transformFunction: null }, shouldShow: { classPropertyName: "shouldShow", publicName: "shouldShow", isSignal: true, isRequired: false, transformFunction: null }, updateDelay: { classPropertyName: "updateDelay", publicName: "updateDelay", isSignal: true, isRequired: false, transformFunction: null } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapBubbleMenuDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: 'tiptap-bubble-menu[editor], [tiptapBubbleMenu][editor]',
                }]
        }] });

class TiptapDraggableDirective {
    draggable = true;
    handle = '';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapDraggableDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "20.0.6", type: TiptapDraggableDirective, isStandalone: true, selector: "[tiptapDraggable]", host: { properties: { "attr.draggable": "this.draggable", "attr.data-drag-handle": "this.handle" } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapDraggableDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[tiptapDraggable]',
                }]
        }], propDecorators: { draggable: [{
                type: HostBinding,
                args: ['attr.draggable']
            }], handle: [{
                type: HostBinding,
                args: ['attr.data-drag-handle']
            }] } });

class TiptapNodeViewContentDirective {
    handle = '';
    whiteSpace = 'pre-wrap';
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapNodeViewContentDirective, deps: [], target: i0.ɵɵFactoryTarget.Directive });
    static ɵdir = i0.ɵɵngDeclareDirective({ minVersion: "14.0.0", version: "20.0.6", type: TiptapNodeViewContentDirective, isStandalone: true, selector: "[tiptapNodeViewContent]", host: { properties: { "attr.data-node-view-content": "this.handle", "style.white-space": "this.whiteSpace" } }, ngImport: i0 });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: TiptapNodeViewContentDirective, decorators: [{
            type: Directive,
            args: [{
                    selector: '[tiptapNodeViewContent]',
                }]
        }], propDecorators: { handle: [{
                type: HostBinding,
                args: ['attr.data-node-view-content']
            }], whiteSpace: [{
                type: HostBinding,
                args: ['style.white-space']
            }] } });

class AngularNodeViewComponent {
    editor = input.required();
    node = input.required();
    decorations = input.required();
    innerDecorations = input.required();
    view = input.required();
    selected = input.required();
    extension = input.required();
    HTMLAttributes = input.required();
    getPos = input.required();
    updateAttributes = input.required();
    deleteNode = input.required();
    static ɵfac = i0.ɵɵngDeclareFactory({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: AngularNodeViewComponent, deps: [], target: i0.ɵɵFactoryTarget.Component });
    static ɵcmp = i0.ɵɵngDeclareComponent({ minVersion: "17.1.0", version: "20.0.6", type: AngularNodeViewComponent, isStandalone: true, selector: "ng-component", inputs: { editor: { classPropertyName: "editor", publicName: "editor", isSignal: true, isRequired: true, transformFunction: null }, node: { classPropertyName: "node", publicName: "node", isSignal: true, isRequired: true, transformFunction: null }, decorations: { classPropertyName: "decorations", publicName: "decorations", isSignal: true, isRequired: true, transformFunction: null }, innerDecorations: { classPropertyName: "innerDecorations", publicName: "innerDecorations", isSignal: true, isRequired: true, transformFunction: null }, view: { classPropertyName: "view", publicName: "view", isSignal: true, isRequired: true, transformFunction: null }, selected: { classPropertyName: "selected", publicName: "selected", isSignal: true, isRequired: true, transformFunction: null }, extension: { classPropertyName: "extension", publicName: "extension", isSignal: true, isRequired: true, transformFunction: null }, HTMLAttributes: { classPropertyName: "HTMLAttributes", publicName: "HTMLAttributes", isSignal: true, isRequired: true, transformFunction: null }, getPos: { classPropertyName: "getPos", publicName: "getPos", isSignal: true, isRequired: true, transformFunction: null }, updateAttributes: { classPropertyName: "updateAttributes", publicName: "updateAttributes", isSignal: true, isRequired: true, transformFunction: null }, deleteNode: { classPropertyName: "deleteNode", publicName: "deleteNode", isSignal: true, isRequired: true, transformFunction: null } }, ngImport: i0, template: '', isInline: true });
}
i0.ɵɵngDeclareClassMetadata({ minVersion: "12.0.0", version: "20.0.6", ngImport: i0, type: AngularNodeViewComponent, decorators: [{
            type: Component,
            args: [{
                    template: '',
                }]
        }] });

class AngularRenderer {
    applicationRef;
    componentRef;
    constructor(ViewComponent, injector, props) {
        this.applicationRef = injector.get(ApplicationRef);
        this.componentRef = createComponent(ViewComponent, {
            environmentInjector: this.applicationRef.injector,
            elementInjector: injector,
        });
        // set input props to the component
        this.updateProps(props);
        this.applicationRef.attachView(this.componentRef.hostView);
    }
    get instance() {
        return this.componentRef.instance;
    }
    get elementRef() {
        return this.componentRef.injector.get(ElementRef);
    }
    get dom() {
        return this.elementRef.nativeElement;
    }
    updateProps(props) {
        Object.entries(props).forEach(([key, value]) => {
            this.componentRef.setInput(key, value);
        });
    }
    updateAttributes(attributes) {
        Object.keys(attributes).forEach((key) => {
            this.dom.setAttribute(key, attributes[key]);
        });
    }
    detectChanges() {
        this.componentRef.changeDetectorRef.detectChanges();
    }
    destroy() {
        this.componentRef.destroy();
        this.applicationRef.detachView(this.componentRef.hostView);
    }
}

class AngularNodeView extends NodeView {
    mount() {
        const injector = this.options.injector;
        const props = {
            editor: this.editor,
            node: this.node,
            decorations: this.decorations,
            innerDecorations: this.innerDecorations,
            view: this.view,
            selected: false,
            extension: this.extension,
            HTMLAttributes: this.HTMLAttributes,
            getPos: () => this.getPos(),
            updateAttributes: (attributes = {}) => this.updateAttributes(attributes),
            deleteNode: () => this.deleteNode(),
        };
        this.handleSelectionUpdate = this.handleSelectionUpdate.bind(this);
        // create renderer
        this.renderer = new AngularRenderer(this.component, injector, props);
        // Register drag handler
        if (this.extension.config.draggable) {
            this.renderer.elementRef.nativeElement.ondragstart = (e) => {
                this.onDragStart(e);
            };
        }
        if (this.node.isLeaf) {
            this.contentDOMElement = null;
        }
        else if (this.options.contentDOMElementTag) {
            this.contentDOMElement = document.createElement(this.options.contentDOMElementTag);
        }
        else {
            this.contentDOMElement = document.createElement(this.node.isInline ? 'span' : 'div');
        }
        if (this.contentDOMElement) {
            this.contentDOMElement.dataset['nodeViewContentAngular'] = '';
            // For some reason the whiteSpace prop is not inherited properly in Chrome and Safari
            // With this fix it seems to work fine
            // See: https://github.com/ueberdosis/tiptap/issues/1197
            this.contentDOMElement.style.whiteSpace = 'inherit';
            // Required for editable node views
            // The content won't be rendered if `editable` is set to `false`
            this.renderer.detectChanges();
        }
        this.appendContendDom();
        this.editor.on('selectionUpdate', this.handleSelectionUpdate);
        this.updateElementAttributes();
    }
    get dom() {
        return this.renderer.dom;
    }
    get contentDOM() {
        if (this.node.isLeaf) {
            return null;
        }
        return this.contentDOMElement;
    }
    appendContendDom() {
        const contentElement = this.dom.querySelector('[data-node-view-content]');
        if (this.contentDOMElement
            && contentElement
            && !contentElement.contains(this.contentDOMElement)) {
            contentElement.appendChild(this.contentDOMElement);
        }
    }
    handleSelectionUpdate() {
        const { from, to } = this.editor.state.selection;
        const pos = this.getPos();
        if (typeof pos !== 'number') {
            return;
        }
        if (from <= pos && to >= pos + this.node.nodeSize) {
            if (this.renderer.instance.selected()) {
                return;
            }
            this.selectNode();
        }
        else {
            if (!this.renderer.instance.selected()) {
                return;
            }
            this.deselectNode();
        }
    }
    update(node, decorations, innerDecorations) {
        const updateProps = (props) => {
            this.renderer.updateProps(props);
            if (typeof this.options.attrs === 'function') {
                this.updateElementAttributes();
            }
        };
        if (this.options.update) {
            const oldNode = this.node;
            const oldDecorations = this.decorations;
            const oldInnerDecorations = this.innerDecorations;
            this.node = node;
            this.decorations = decorations;
            this.innerDecorations = innerDecorations;
            return this.options.update({
                oldNode,
                oldDecorations,
                oldInnerDecorations,
                newNode: node,
                newDecorations: decorations,
                innerDecorations: this.innerDecorations,
                updateProps: () => updateProps({
                    node,
                    decorations: decorations,
                    innerDecorations,
                }),
            });
        }
        if (node.type !== this.node.type) {
            return false;
        }
        if (node === this.node
            && this.decorations === decorations
            && this.innerDecorations === innerDecorations) {
            return true;
        }
        this.node = node;
        this.decorations = decorations;
        this.innerDecorations = innerDecorations;
        updateProps({
            node,
            decorations: decorations,
            innerDecorations,
        });
        return true;
    }
    selectNode() {
        this.renderer.updateProps({ selected: true });
        this.renderer.dom.classList.add('ProseMirror-selectednode');
    }
    deselectNode() {
        this.renderer.updateProps({ selected: false });
        this.renderer.dom.classList.remove('ProseMirror-selectednode');
    }
    destroy() {
        this.renderer.destroy();
        this.editor.off('selectionUpdate', this.handleSelectionUpdate);
        this.contentDOMElement = null;
    }
    /**
   * Update the attributes of the top-level element that holds the React component.
   * Applying the attributes defined in the `attrs` option.
   */
    updateElementAttributes() {
        if (this.options.attrs) {
            let attrsObj = {};
            if (typeof this.options.attrs === 'function') {
                const extensionAttributes = this.editor.extensionManager.attributes;
                const HTMLAttributes = getRenderedAttributes(this.node, extensionAttributes);
                attrsObj = this.options.attrs({ node: this.node, HTMLAttributes });
            }
            else {
                attrsObj = this.options.attrs;
            }
            this.renderer.updateAttributes(attrsObj);
        }
    }
}
const AngularNodeViewRenderer = (ViewComponent, options) => {
    return (props) => {
        return new AngularNodeView(ViewComponent, props, options);
    };
};

/*
 * Public API Surface of ngx-tiptap
 */

/**
 * Generated bundle index. Do not edit.
 */

export { AngularNodeViewComponent, AngularNodeViewRenderer, AngularRenderer, TiptapBubbleMenuDirective, TiptapDraggableDirective, TiptapEditorDirective, TiptapFloatingMenuDirective, TiptapNodeViewContentDirective };
//# sourceMappingURL=ngx-tiptap.mjs.map
