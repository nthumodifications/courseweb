# @courseweb/dict-manager

Dictionary management tools for CourseWeb's i18n system.

## Overview

This package provides command-line utilities for managing translation dictionaries in the CourseWeb application. It allows you to create, update, move, and delete dictionary entries across multiple languages (English and Chinese).

## Features

- **Create** new dictionary entries with English and Chinese translations
- **Remove** existing dictionary entries
- **Move/Rename** dictionary keys to new locations
- **Nested key support** using dot notation (e.g., `user.profile.name`)
- **Automatic dictionary file management** for both `en.json` and `zh.json`

## Installation

This tool is part of the CourseWeb monorepo and is automatically available when you install dependencies.

## Usage

### From Root Workspace

```bash
# Create a new dictionary entry
npm run dict:create -- "user.welcome" "歡迎" "Welcome"

# Remove a dictionary entry
npm run dict:remove -- "user.welcome"

# Move/rename a dictionary entry
npm run dict:move -- "user.welcome" "common.welcome"
```

### From Dict-Manager Workspace

```bash
# Navigate to the dict-manager directory
cd tools/dict-manager

# Create entry
npm run create -- "user.welcome" "歡迎" "Welcome"

# Remove entry
npm run remove -- "user.welcome"

# Move entry
npm run move -- "user.welcome" "common.welcome"
```

### Direct CLI Usage

```bash
# Using tsx (recommended for development)
npm run dict -- create "user.profile.name" "姓名" "Name"
npm run dict -- remove "user.profile.name"
npm run dict -- move "user.profile.name" "form.name"

# Using built version
node dist/dict.js create "user.welcome" "歡迎" "Welcome"
```

## Commands

### Create (`create`, `c`)

Creates a new dictionary entry with Chinese and English translations.

```bash
npm run dict:create -- <key> <chinese_text> <english_text>
```

**Parameters:**

- `key`: Dictionary key using dot notation (e.g., `user.profile.name`)
- `chinese_text`: Chinese translation text
- `english_text`: English translation text

**Examples:**

```bash
npm run dict:create -- "button.save" "保存" "Save"
npm run dict:create -- "error.validation.required" "此欄位為必填" "This field is required"
```

### Remove (`remove`, `r`)

Removes an existing dictionary entry from both language files.

```bash
npm run dict:remove -- <key>
```

**Parameters:**

- `key`: Dictionary key to remove

**Examples:**

```bash
npm run dict:remove -- "button.save"
npm run dict:remove -- "user.profile.name"
```

### Move (`move`, `m`)

Moves/renames a dictionary entry to a new key location.

```bash
npm run dict:move -- <current_key> <new_key>
```

**Parameters:**

- `current_key`: Existing dictionary key
- `new_key`: New dictionary key location

**Examples:**

```bash
npm run dict:move -- "button.save" "form.save"
npm run dict:move -- "user.name" "user.profile.name"
```

## Key Format

Dictionary keys use dot notation to represent nested objects:

- `user.name` → `{ user: { name: "value" } }`
- `form.validation.required` → `{ form: { validation: { required: "value" } } }`
- `common.button.save` → `{ common: { button: { save: "value" } } }`

### Key Prefixes

- If a key starts with `dict.`, the prefix will be automatically removed
- Keys are case-sensitive
- Use descriptive, hierarchical naming for better organization

## File Structure

The tool manages dictionary files located at:

```
apps/web/src/dictionaries/
├── en.json    # English translations
└── zh.json    # Chinese translations
```

## Error Handling

- **Overwrite Protection**: When creating entries, the tool will warn if a key already exists and overwrite it
- **Missing Key Protection**: When removing or moving entries, the tool will error if the key doesn't exist
- **Validation**: Keys cannot be empty and must be valid dot-notation strings

## Programmatic Usage

You can also use the dict-manager programmatically:

```typescript
import {
  createDictItem,
  removeDictItem,
  moveDictItem,
} from "@courseweb/dict-manager";

// Create a dictionary entry
await createDictItem("user.welcome", "歡迎", "Welcome");

// Remove a dictionary entry
await removeDictItem("user.welcome");

// Move a dictionary entry
await moveDictItem("user.welcome", "common.welcome");
```

## Development

```bash
# Build the package
npm run build

# Development mode with watch
npm run dev

# Clean build artifacts
npm run clean

# Lint code
npm run lint

# Type check
npm run type-check
```

## Dependencies

- `commander`: CLI framework for building command-line interfaces
- `tsx`: TypeScript execution for development

## Notes

- Dictionary files are automatically formatted with 2-space indentation
- Changes are immediately written to the filesystem
- The tool preserves the structure of existing nested objects
- Both language files are always updated together to maintain consistency
