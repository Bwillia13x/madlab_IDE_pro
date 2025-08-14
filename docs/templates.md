# Templates

Templates let you save the current sheet’s layout and widgets, then quickly create new sheets from them.

- Storage: templates are stored locally in `localStorage` under the key `madlab-templates`.
- Save: use the + menu in `SheetTabs` → Save current sheet as template, or the Command Palette command.
- Create: use the “New Sheet from Template…” entry in the Command Palette to open the picker dialog and select a template.
- Manage: in the template picker you can rename or delete templates.

Notes:
- Saving a template overwrites an existing template with the same name.
- Creating from a template generates fresh widget IDs and preserves widget props.


