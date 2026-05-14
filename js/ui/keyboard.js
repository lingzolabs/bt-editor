/**
 * Keyboard Shortcuts Module
 * Handles all keyboard shortcuts for the editor
 */
const Keyboard = {
  /**
   * Initialize keyboard shortcuts
   */
  init() {
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + S: Export
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        Panels.handleExport();
      }

      // Ctrl/Cmd + C: Copy
      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        e.preventDefault();
        App.editor.copySelection();
        App.showMessage("已复制到剪贴板");
      }

      // Ctrl/Cmd + V: Paste
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        e.preventDefault();
        App.editor.pasteSelection();
        App.showMessage("已粘贴");
      }

      // Delete/Backspace: Delete selected
      if (e.key === "Delete" || e.key === "Backspace") {
        const selected = App.editor.getSelectedNodes();
        if (selected.length > 0) {
          e.preventDefault();
          App.editor.deleteSelection();
          App.showMessage("已删除选中节点");
        }
      }

      // Escape: Clear selection
      if (e.key === "Escape") {
        App.editor.clearSelection();
      }
    });
  },
};
