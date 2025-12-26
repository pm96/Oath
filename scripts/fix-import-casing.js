#!/usr/bin/env node

/**
 * Script to fix import casing issues across the codebase
 * Standardizes all imports to use proper PascalCase component names
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Map of incorrect imports to correct ones
const IMPORT_FIXES = {
    // Button imports
    'from "@/components/ui/button"': 'from "@/components/ui/Button"',

    // Text imports
    'from "@/components/ui/text"': 'from "@/components/ui/Text"',
    'from "@/components/ui/heading"': 'from "@/components/ui/Text"',

    // Input imports
    'from "@/components/ui/input"': 'from "@/components/ui/Input"',

    // Other common ones
    'from "@/components/ui/modal"': 'from "@/components/ui/Modal"',
    'from "@/components/ui/card"': 'from "@/components/ui/Card"',
};

// Components that should be removed from imports
const COMPONENTS_TO_REMOVE = [
    "ButtonText",
    "ButtonSpinner",
    "InputField",
    "InputIcon",
    "InputSlot",
    "VStack",
];

function fixFileImports(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    let hasChanges = false;

    // Fix import paths
    Object.entries(IMPORT_FIXES).forEach(([incorrect, correct]) => {
        if (content.includes(incorrect)) {
            content = content.replace(
                new RegExp(incorrect.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
                correct,
            );
            hasChanges = true;
        }
    });

    // Remove problematic component imports
    COMPONENTS_TO_REMOVE.forEach((component) => {
        // Remove from import statements
        const importRegex = new RegExp(
            `(import\\s*{[^}]*),\\s*${component}([^}]*})`,
            "g",
        );
        const importRegex2 = new RegExp(
            `(import\\s*{)\\s*${component}\\s*,([^}]*})`,
            "g",
        );
        const importRegex3 = new RegExp(
            `(import\\s*{[^}]*${component})\\s*,([^}]*})`,
            "g",
        );

        if (
            content.match(importRegex) ||
            content.match(importRegex2) ||
            content.match(importRegex3)
        ) {
            content = content.replace(importRegex, "$1$2");
            content = content.replace(importRegex2, "$1$2");
            content = content.replace(importRegex3, "$1$2");
            hasChanges = true;
        }
    });

    // Clean up empty imports
    content = content.replace(/import\s*{\s*}\s*from\s*"[^"]*";\s*/g, "");

    if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed imports in ${path.basename(filePath)}`);
        return true;
    }

    return false;
}

function main() {
    console.log("🔧 Fixing import casing issues...\n");

    // Find all TypeScript React files
    const files = glob.sync("**/*.{ts,tsx}", {
        ignore: ["node_modules/**", ".git/**", "dist/**", "build/**"],
    });

    let totalFixed = 0;

    files.forEach((filePath) => {
        try {
            if (fixFileImports(filePath)) {
                totalFixed++;
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Files processed: ${files.length}`);
    console.log(`   Files fixed: ${totalFixed}`);

    if (totalFixed > 0) {
        console.log(`\n✨ Import casing issues have been fixed!`);
        console.log(
            `   You may need to update component usage to match the new imports.`,
        );
    } else {
        console.log(`\n✅ No import casing issues found!`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixFileImports, IMPORT_FIXES, COMPONENTS_TO_REMOVE };
