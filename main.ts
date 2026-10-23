import { Editor, Plugin } from "obsidian";
import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view";

import {
	TASK_PREFIX_LENGTH,
	type TaskStatus,
	parseTask,
	toPlain,
	toTask,
	setStatus,
} from "./lib/tasks";

/** Line classes for colored statuses; `[ ]` and non-tasks stay unstyled. */
const STATUS_LINE_CLASS: Record<Exclude<TaskStatus, "empty">, string> = {
	done: "deeds-status-done",
	cancelled: "deeds-status-cancelled",
	partial: "deeds-status-partial",
};

/** ViewPlugin that adds line decorations to visible task lines (design decision 5). */
const deedsLineHighlight = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildLineDecorations(view);
		}

		update(update: ViewUpdate) {
			if (update.docChanged || update.viewportChanged) {
				this.decorations = buildLineDecorations(update.view);
			}
		}
	},
	{ decorations: (plugin) => plugin.decorations },
);

function buildLineDecorations(view: EditorView): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();
	for (const { from, to } of view.visibleRanges) {
		const startLine = view.state.doc.lineAt(from).number;
		const endLine = view.state.doc.lineAt(to).number;
		for (let n = startLine; n <= endLine; n++) {
			const line = view.state.doc.line(n);
			const task = parseTask(line.text);
			if (task === null || task.status === "empty") continue;
			builder.add(line.from, line.from, Decoration.line({ class: STATUS_LINE_CLASS[task.status] }));
		}
	}
	return builder.finish();
}

export default class DeedsPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "deeds-toggle-task",
			name: "Toggle task on current line",
			hotkeys: [{ modifiers: ["Alt"], key: "Enter" }],
			editorCallback: (editor) => this.toggleTask(editor),
		});
		this.addCommand({
			id: "deeds-set-done",
			name: "Set current task status to done",
			hotkeys: [{ modifiers: ["Alt"], key: "d" }],
			editorCallback: (editor) => this.toggleStatus(editor, "done"),
		});
		this.addCommand({
			id: "deeds-set-cancelled",
			name: "Set current task status to cancelled",
			hotkeys: [{ modifiers: ["Alt"], key: "c" }],
			editorCallback: (editor) => this.toggleStatus(editor, "cancelled"),
		});
		this.addCommand({
			id: "deeds-set-partial",
			name: "Set current task status to partial",
			hotkeys: [{ modifiers: ["Alt"], key: "s" }],
			editorCallback: (editor) => this.toggleStatus(editor, "partial"),
		});

		this.registerEditorExtension(deedsLineHighlight);
	}

	onunload() {}

	/** Alt-Enter: plain line → task (`- [ ] ` prefix added), task → plain text. */
	private toggleTask(editor: Editor) {
		const cursor = editor.getCursor();
		const line = cursor.line;
		const text = editor.getLine(line);
		const task = parseTask(text);
		const newLine = task === null ? toTask(text) : toPlain(text);
		// Keep the cursor on the same fragment of text: shift ±6 characters
		// with the prefix, never left of the line start.
		const shift = task === null ? TASK_PREFIX_LENGTH : -TASK_PREFIX_LENGTH;
		const newCh = Math.max(0, Math.min(cursor.ch + shift, newLine.length));
		editor.transaction({
			changes: [{ from: { line, ch: 0 }, to: { line, ch: text.length }, text: newLine }],
			selection: { from: { line, ch: newCh } },
		});
	}

	/** Alt-D / Alt-C / Alt-S: switch status; already in target status resets to `[ ]`.
	 *  Line length does not change, so the remembered selections stay valid
	 *  character for character and are restored inside the same transaction. */
	private toggleStatus(editor: Editor, target: TaskStatus) {
		const { line } = editor.getCursor();
		const text = editor.getLine(line);
		const newLine = setStatus(text, target);
		if (newLine === text) return; // not a task — no transaction, the cursor does not move
		const selections = editor.listSelections().map((sel) =>
			sel.anchor.ch === sel.head.ch && sel.anchor.line === sel.head.line
				? { from: sel.anchor }
				: { from: sel.anchor, to: sel.head },
		);
		editor.transaction({
			changes: [{ from: { line, ch: 0 }, to: { line, ch: text.length }, text: newLine }],
			selections,
		});
	}
}
