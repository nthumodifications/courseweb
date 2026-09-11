# Calendar accessibility pass

## Changes by file

- `apps/web/src/components/Calendar/AddEventButton.tsx` — added a localized `DialogDescription`, edit-aware dialog title, conditional trigger rendering for controlled dialogs, and explicit return-focus support for pointer-free empty-slot creation.
- `apps/web/src/components/Calendar/EventForm.tsx` — made picker buttons non-submitting, forwarded field/error semantics through repeat controls, localized the inline date validation error, and replaced the pointer-only color picker with an accessible roving radio group.
- `apps/web/src/components/Calendar/EventLabelPicker.tsx` — forwarded `FormControl` props/ref to its real button, localized the fixed label display, and exposed the popover as a combobox/listbox interaction.
- `apps/web/src/components/Calendar/EventPopover.tsx` — made event triggers native-button-compatible (with a role/tab/key fallback for legacy callers), localized all calendar-owned icon labels, added explicit focus restoration for repeated-event dialogs, and focused a stable calendar target after deletion.
- `apps/web/src/components/Calendar/CalendarDateSelector.tsx` — replaced the implicit trigger wrapper with a real keyboard-focusable button and guarded undefined date selections.
- `apps/web/src/components/Calendar/Calendar.tsx` — attached the existing navigation shortcuts to a labeled, focusable calendar region, documented them with `aria-describedby`/`aria-keyshortcuts`, labeled icon-only controls, and moved the mobile Add trigger earlier in DOM order.
- `apps/web/src/components/Calendar/CalendarWeekContainer.tsx` — changed timed/all-day event chips to buttons, made empty day columns keyboard-operable with localized names, wired the empty-slot opener ref, and applied `getContrastColor` to overlay event text.
- `apps/web/src/components/Calendar/CalendarMonthContainer.tsx` — changed timed/all-day event chips and month date navigation to buttons with localized names and visible focus styling.
- `apps/web/src/dictionaries/en.json` — added the matching calendar accessibility, event-action, color, label, dialog-description, and validation strings in English.
- `apps/web/src/dictionaries/zh.json` — added the identical key tree in Traditional Chinese (Taiwan usage).

## Audit findings and verification

### Dead keyboard shortcuts

The audit finding at `Calendar.tsx:228-245` is addressed by attaching `handleKeyPress` to the focusable calendar `role="region"` (`Calendar.tsx:406-419`). Text fields, buttons, links, contenteditable elements, and already-prevented events are ignored. Arrow Up/Down scroll by `HOUR_HEIGHT`; Arrow Left/Right call the existing period movers; T/W/M call the existing today/week/month handlers. The region exposes the same shortcuts through `aria-keyshortcuts` and a localized visually-hidden description.

Source verification: Tab to the calendar region, then ArrowUp/ArrowDown reaches the week scroll container and ArrowLeft/ArrowRight changes the period; T, W, and M call their existing handlers. A focused native event/button does not bubble those shortcuts because the guard returns for `button`/`a` targets.

### Empty cells, month dates, and event triggers

The audit finding at `CalendarWeekContainer.tsx:487-510` is addressed with one focusable `role="button"` day-column empty-slot target per day (`tabIndex={0}`, localized `aria-label`, Enter/Space handler). Pointer activation retains the existing time-from-pointer behavior. Enter/Space selects the current nearest 10-minute time on that day and opens the existing controlled `AddEventButton`; its `returnFocusRef` points back to the day column.

The audit finding at `CalendarMonthContainer.tsx:259-270` is addressed with a native `button type="button"` for each date. Enter/Space invokes the existing `onChangeView("week", day)` path, and its accessible name is localized with the concrete date.

The audit finding at `CalendarWeekContainer.tsx:218-255`, `CalendarMonthContainer.tsx:148-170`, and `EventPopover.tsx:160-210` is addressed by making week/month timed and all-day chips native buttons. `EventPopover` also clones a non-native legacy child (the existing upcoming-event row) with `role="button"`, `tabIndex={0}`, a localized event name, and Enter/Space activation through its Radix PopoverTrigger click path.

Source verification: the DOM order is now header controls, mobile/desktop Add trigger as applicable, calendar region, all-day event buttons, empty day targets/timed event buttons in week view, or month date buttons followed by event buttons in month view. All native buttons have `type="button"` where they are inside the event form, so opening a date/color/label picker cannot submit the form.

### Labels, roles, dialog title/description, and validation

The audit finding at `EventPopover.tsx:174-208` and `EventPopover.tsx:35-38` is addressed with dictionary-backed labels for course-date, edit, delete, close, and event-delete triggers. Calendar navigation, view tabs, today, color, and mobile Add controls also have localized names. Decorative Lucide icons are marked `aria-hidden` where they sit in icon-only controls.

`AddEventButton` now renders both `DialogTitle` and `DialogDescription` from the dictionary. The repeated update/delete dialogs already had descriptions; their controlled roots now omit the empty `DialogTrigger` and use `DialogContent.onCloseAutoFocus` with an explicit trigger ref. These remain the Radix-based `Dialog` and `Popover` primitives rather than hand-written dialog/focus logic.

The existing `FormControl` primitive supplies the generated `id`, `aria-invalid`, and error `aria-describedby` to native controls. This pass fixes the custom `EventLabelPicker` by forwarding those props/ref to its actual Button, moves `FormControl` to the SelectTrigger and RadioGroup roots, and adds `FormControl`/`FormMessage` to both repeat-value controls. Repeat count/date labels now target their actual controls. The inline end-date error uses `dict.calendar.form.end_before_start`.

Source verification: title/location/time inputs, date buttons, repeat interval/radio/value controls, select, color trigger, label combobox, details, and Save are all native/form-controlled focus stops. A repeat-value error renders through the nested `FormMessage` ID referenced by that value control. The schema-owned Zod messages remain outside this change and are called out below.

### Focus management and delete behavior

`Dialog modal={true}` and `Popover modal={true}` continue to provide Radix focus containment and Escape handling. Radix `DialogContent` auto-focuses the first dialog control on open and normally returns focus to its `DialogTrigger` on cancel/Escape. Controlled empty-slot dialogs use the passed day-column ref; controlled repeated-event dialogs use the edit/delete trigger refs and `onCloseAutoFocus`.

For deletion, non-repeating deletion closes through `DialogClose`; repeated deletion closes its controlled dialog. Both paths schedule focus on `[data-calendar-root]`, a labeled focusable calendar region, after the event is removed, avoiding restoration to a detached event trigger. If `EventPopover` is reused outside the calendar region, it falls back to the trigger's stable parent and gives that fallback a temporary programmatic focus target.

Source verification: create from the mobile/desktop Add trigger returns to that trigger; create from an empty week day returns to the originating day target; edit cancel/Escape returns to the edit button; repeated update/delete decision cancel/Escape returns to its initiating button; closing the event popover returns to the event trigger; deletion schedules the stable calendar target instead of the removed event node. Browser timing and actual focus-ring behavior still need manual QA.

### Color/label picker keyboard operation and contrast

The color picker now exposes `role="radiogroup"` with `role="radio"` swatches and a roving tab stop. On an eight-color list, ArrowRight from index 0 focuses/selects index 1, ArrowLeft from index 0 wraps to index 7, ArrowUp/Down move by the five-column visual row, and Home/End move to the first/last swatch. Enter/Space selects the focused swatch. The popover remains modal, and the selected swatch is focused when it opens.

The label picker remains the existing `Command` primitive inside a modal Radix Popover. Its input and CommandItem list are keyboard-operable through cmdk arrow-key selection and Enter, and Escape closes the popover. Its field ID/error props now reach the Button trigger. Stored label values remain unchanged; only their display text is localized by the existing label ordering.

Week timed/all-day events and month timed/all-day events use the existing `getContrastColor(event.color)` helper. The week timetable overlay text now uses it as well. No second contrast implementation was added.

### Remaining i18n

The new user-visible copy in the owned calendar dialog/interaction paths is dictionary-backed in both locales. The fixed label source itself is still the English-value array in `calendar_hook.tsx`; that file is explicitly outside this agent's ownership, so `EventLabelPicker` maps those stored values to dictionary text without changing storage/data shape. The broader audit findings in `CalendarPage.tsx`, `CalendarTimetableSyncDialog.tsx`, `OthersTimetablePanel.tsx`, `dateLocale.ts`, and other unowned calendar paths were not changed.

## Deliberately not done

- No recurrence, edit-all/delete-following, storage, schema, replication, timezone, or data-shape changes were made. Those are owned by other agents or explicitly excluded.
- No edits were made to `calendar_hook.tsx`, `eventFormSchema.tsx`, `calendar_utils.tsx`, shared UI primitives, or components outside the ownership list.
- The schema's source messages (`eventFormSchema.tsx:7-9`) are still English. Localizing those messages would require a schema change or a resolver-level message map owned by the recurrence agent; this report recommends that agent change the refinement message to use the same dictionary contract or pass a localized resolver error.
- The shared `packages/ui` `DialogContent` close control still has its pre-existing visually-hidden English `Close` text. It is outside ownership and cannot receive a dictionary prop from these components without changing the shared primitive. All calendar-owned icon-only close/delete/edit/color/add controls are dictionary-backed.
- No browser, screen reader, or integration focus test was available, so the source traces above are construction-level verification, not a claim of tested browser keyboard behavior.
- No migration or environment variable is needed.

## Verification

- `cd apps/web && bunx tsc --noEmit` — fails with exactly 8 pre-existing errors: `shops/page.tsx` (1), `GenericIssueFormDialog.tsx` (3), `IssueFormDialog.tsx` (3), and `worker.ts` (1). No changed calendar file appears in the output.
- `cd apps/web && bun test src/features/campusMap` — 9 pass, 0 fail.
- `cd apps/web && bun test src/hooks/syncedStorage.test.ts` — 4 pass, 0 fail.
- `cd apps/web && bunx vite build` — passes; 6,408 modules transformed and PWA generation completed with 125 precache entries. Only existing Browserslist, Tailwind `@variants`, pdfjs eval, and chunk-size warnings were emitted.
- Dictionary JSON parse and recursive key comparison — passes; 1,158 keys in each dictionary, identical key trees.
- `git diff --check` — passes; Git only reports the existing LF/CRLF normalization warnings for changed files.
- Targeted ESLint invocation — not runnable in this junction worktree because the configured `@typescript-eslint/recommended` package cannot be resolved. No dependency installation was attempted.

## Manual QA checklist

- [ ] With a keyboard only, Tab through desktop and mobile calendar header/Add controls; verify each icon-only control is named in English and zh-TW.
- [ ] Focus the calendar region and verify ArrowUp/Down scroll, ArrowLeft/Right changes the period, T goes today, W week, and M month; verify typing in a form input does not invoke shortcuts.
- [ ] In week view, Tab to an empty day target and activate it with Enter and Space; verify the event dialog opens, focus enters the first form control, Escape closes it, and focus returns to that day target.
- [ ] In week and month views, activate an event chip with Enter/Space; verify the popover action order, localized names, Escape return to the chip, and visible focus rings.
- [ ] Open edit, delete, and repeated-event decision dialogs; verify title/description announcements, modal Tab containment, Escape/cancel return focus, and no focus loss after deletion.
- [ ] In the event form, Tab through every field; verify labels, `aria-invalid`, and validation messages are announced for end-before-start and any schema validation errors.
- [ ] Open the color picker and verify the selected swatch receives focus, arrows move/select swatches, Home/End work, Enter/Space select, and Escape returns focus to the color trigger.
- [ ] Open the label picker and verify Command input/list arrow navigation, Enter selection, Escape close, and localized label names.
- [ ] Exercise light/dark and several user colors, including overlay events, and confirm event text remains legible; verify no visual layout regression from the native-button conversion.
