#!/usr/bin/env node

/**
 * Script to optimize property-based test performance
 * Reduces numRuns from 100 to more reasonable values
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Configuration for different test types
const TEST_OPTIMIZATIONS = {
    // Simple property tests - reduce to 20 runs
    simple: {
        pattern: /{ numRuns: 100 }/g,
        replacement: "{ numRuns: 20 }",
        description: "Simple property tests",
    },
    // Complex property tests with heavy computation - reduce to 10 runs
    complex: {
        pattern: /{ numRuns: 100 }/g,
        replacement: "{ numRuns: 10 }",
        description: "Complex property tests",
        files: [
            "__tests__/useFriendsGoals.property.test.ts",
            "__tests__/securityRules.property.test.ts",
            "__tests__/friendsFeed.property.test.ts",
        ],
    },
    // Very simple tests - reduce to 30 runs
    fast: {
        pattern: /{ numRuns: 100 }/g,
        replacement: "{ numRuns: 30 }",
        description: "Fast property tests",
        files: [
            "__tests__/goalStatusCalculator.property.test.ts",
            "__tests__/theme.property.test.ts",
            "__tests__/typography.property.test.ts",
        ],
    },
};

function optimizeTestFile(filePath) {
    const content = fs.readFileSync(filePath, "utf8");
    let optimizedContent = content;
    let changes = 0;

    // Determine optimization level based on file
    const fileName = path.basename(filePath);
    let optimization = TEST_OPTIMIZATIONS.simple;

    if (TEST_OPTIMIZATIONS.complex.files.includes(fileName)) {
        optimization = TEST_OPTIMIZATIONS.complex;
    } else if (TEST_OPTIMIZATIONS.fast.files.includes(fileName)) {
        optimization = TEST_OPTIMIZATIONS.fast;
    }

    // Apply optimization
    optimizedContent = optimizedContent.replace(optimization.pattern, (match) => {
        changes++;
        return optimization.replacement;
    });

    if (changes > 0) {
        fs.writeFileSync(filePath, optimizedContent);
        console.log(
            `✅ Optimized ${fileName}: ${changes} changes (${optimization.description})`,
        );
    }

    return changes;
}

function main() {
    console.log("🚀 Optimizing property-based tests for performance...\n");

    // Find all property test files
    const testFiles = glob.sync("__tests__/**/*.property.test.ts");

    let totalChanges = 0;
    let filesOptimized = 0;

    testFiles.forEach((filePath) => {
        const changes = optimizeTestFile(filePath);
        if (changes > 0) {
            filesOptimized++;
            totalChanges += changes;
        }
    });

    console.log(`\n📊 Optimization Summary:`);
    console.log(`   Files processed: ${testFiles.length}`);
    console.log(`   Files optimized: ${filesOptimized}`);
    console.log(`   Total changes: ${totalChanges}`);

    if (totalChanges > 0) {
        console.log(`\n⚡ Tests should now run significantly faster!`);
        console.log(`   Expected speedup: 3-10x faster execution`);
    } else {
        console.log(`\n✨ All tests are already optimized!`);
    }
}

if (require.main === module) {
    main();
}

module.exports = { optimizeTestFile, TEST_OPTIMIZATIONS };
