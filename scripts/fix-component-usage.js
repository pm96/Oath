#!/usr/bin/env node

/**
 * Script to fix component usage after import changes
 * Removes ButtonText, ButtonSpinner, InputField usage and replaces VStack with View
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

function fixComponentUsage(filePath) {
    let content = fs.readFileSync(filePath, "utf8");
    let hasChanges = false;

    // Fix ButtonText usage - remove wrapper and use children directly
    const buttonTextRegex = /<ButtonText[^>]*>(.*?)<\/ButtonText>/gs;
    if (content.match(buttonTextRegex)) {
        content = content.replace(buttonTextRegex, "$1");
        hasChanges = true;
    }

    // Fix ButtonSpinner usage - remove it entirely for now
    const buttonSpinnerRegex =
        /<ButtonSpinner[^>]*\/?>|<ButtonSpinner[^>]*>.*?<\/ButtonSpinner>/gs;
    if (content.match(buttonSpinnerRegex)) {
        content = content.replace(buttonSpinnerRegex, "");
        hasChanges = true;
    }

    // Fix InputField usage - move props to Input component
    const inputFieldRegex =
        /<Input[^>]*>\s*<InputField([^>]*)\s*\/>\s*<\/Input>/gs;
    if (content.match(inputFieldRegex)) {
        content = content.replace(inputFieldRegex, "<Input$1 />");
        hasChanges = true;
    }

    // Fix InputSlot and InputIcon usage - remove them
    const inputSlotRegex = /<InputSlot[^>]*>.*?<\/InputSlot>/gs;
    const inputIconRegex =
        /<InputIcon[^>]*\/?>|<InputIcon[^>]*>.*?<\/InputIcon>/gs;
    if (content.match(inputSlotRegex) || content.match(inputIconRegex)) {
        content = content.replace(inputSlotRegex, "");
        content = content.replace(inputIconRegex, "");
        hasChanges = true;
    }

    // Fix VStack usage - replace with View and add proper imports
    if (content.includes("<VStack")) {
        // Add View import if not present
        if (!content.includes("import") || !content.includes("View")) {
            const importMatch = content.match(/import.*from ['"]react-native['"];?/);
            if (importMatch) {
                const existingImport = importMatch[0];
                if (!existingImport.includes("View")) {
                    const newImport = existingImport.replace(
                        /}(\s*from\s*['"]react-native['"])/,
                        ", View }$1",
                    );
                    content = content.replace(existingImport, newImport);
                    hasChanges = true;
                }
            } else {
                // Add new import
                const firstImport = content.match(/^import.*$/m);
                if (firstImport) {
                    content = content.replace(
                        firstImport[0],
                        `${firstImport[0]}\nimport { View } from "react-native";`,
                    );
                    hasChanges = true;
                }
            }
        }

        // Replace VStack with View
        content = content.replace(/<VStack/g, "<View");
        content = content.replace(/<\/VStack>/g, "</View>");
        hasChanges = true;
    }

    // Fix heading import casing
    content = content.replace(
        /from "@\/components\/ui\/Heading"/g,
        'from "@/components/ui/Text"',
    );
    content = content.replace(/import { Heading }/g, "import { Heading }");

    // Fix action prop usage (not supported in our Button component)
    content = content.replace(/action="[^"]*"/g, "");
    content = content.replace(/action='[^']*'/g, "");

    // Fix className prop usage (not supported in React Native)
    content = content.replace(/className="[^"]*"/g, "");
    content = content.replace(/className='[^']*'/g, "");

    if (hasChanges) {
        fs.writeFileSync(filePath, content);
        console.log(`✅ Fixed component usage in ${path.basename(filePath)}`);
        return true;
    }

    return false;
}

function main() {
    console.log("🔧 Fixing component usage issues...\n");

    // Focus on the files with errors from lint output
    const problematicFiles = [
        "app/(tabs)/friends.tsx",
        "app/(tabs)/home.tsx",
        "app/(tabs)/profile.tsx",
        "components/ErrorBoundary.tsx",
        "components/friends/FriendRequests.tsx",
        "components/friends/FriendsList.tsx",
        "components/friends/UserSearch.tsx",
        "components/goals/GoalForm.tsx",
        "components/goals/GoalItem.tsx",
        "components/habits/HabitCreationModal.tsx",
        "components/social/FriendsDashboard.tsx",
        "components/social/FriendsFeed.tsx",
    ];

    let totalFixed = 0;

    problematicFiles.forEach((filePath) => {
        try {
            if (fs.existsSync(filePath) && fixComponentUsage(filePath)) {
                totalFixed++;
            }
        } catch (error) {
            console.error(`❌ Error processing ${filePath}:`, error.message);
        }
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Files processed: ${problematicFiles.length}`);
    console.log(`   Files fixed: ${totalFixed}`);

    if (totalFixed > 0) {
        console.log(`\n✨ Component usage issues have been fixed!`);
    } else {
        console.log(`\n✅ No component usage issues found!`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { fixComponentUsage };
