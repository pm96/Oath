import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeColors {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    muted: string;
    mutedForeground: string;
    accent: string;
    accentForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    input: string;
    ring: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    info: string;
    infoForeground: string;
}

export interface ThemeConfig {
    colors: ThemeColors;
    spacing: {
        xs: number;
        sm: number;
        md: number;
        lg: number;
        xl: number;
    };
    borderRadius: {
        sm: number;
        md: number;
        lg: number;
        full: number;
    };
    typography: {
        fontFamily: string;
        sizes: {
            xs: number;
            sm: number;
            md: number;
            lg: number;
            xl: number;
            xxl: number;
        };
        weights: {
            normal: string;
            medium: string;
            semibold: string;
            bold: string;
        };
    };
}

// Light theme colors matching your actual design specification
const lightColors: ThemeColors = {
    primary: "#0F172A", // slate-900 - your actual primary color
    primaryForeground: "#FFFFFF",
    secondary: "#F1F5F9", // slate-100
    secondaryForeground: "#0F172A", // slate-900
    background: "#F8FAFC", // slate-50 - your actual app background
    foreground: "#020617", // slate-950 - primary text
    card: "#FFFFFF", // white cards
    cardForeground: "#020617", // slate-950
    popover: "#FFFFFF",
    popoverForeground: "#020617",
    muted: "#F1F5F9", // slate-100 - muted surfaces
    mutedForeground: "#475569", // darker slate for better contrast
    accent: "#F1F5F9", // slate-100
    accentForeground: "#0F172A", // slate-900
    destructive: "#EF4444", // red-500 - your error color
    destructiveForeground: "#FFFFFF",
    border: "#E2E8F0", // slate-200 - default border
    input: "#E2E8F0", // slate-200
    ring: "#0F172A", // slate-900 - focus ring
    success: "#22C55E", // green-500 - your success color
    successForeground: "#FFFFFF",
    warning: "#F59E0B", // amber-500 - your warning color
    warningForeground: "#FFFFFF",
    info: "#3B82F6", // blue-500 - your info color
    infoForeground: "#FFFFFF",
};

// Dark theme colors - maintaining the same sophisticated approach
const darkColors: ThemeColors = {
    primary: "#F8FAFC", // slate-50 - inverted for dark mode
    primaryForeground: "#0F172A", // slate-900
    secondary: "#1E293B", // slate-800
    secondaryForeground: "#F8FAFC", // slate-50
    background: "#0F172A", // slate-900 - dark background
    foreground: "#F8FAFC", // slate-50 - primary text in dark
    card: "#1E293B", // slate-800 - dark cards
    cardForeground: "#F8FAFC", // slate-50
    popover: "#1E293B", // slate-800
    popoverForeground: "#F8FAFC", // slate-50
    muted: "#334155", // slate-700 - muted surfaces in dark
    mutedForeground: "#CBD5F5", // brighter slate to keep contrast in dark mode
    accent: "#334155", // slate-700
    accentForeground: "#F8FAFC", // slate-50
    destructive: "#EF4444", // red-500 - consistent
    destructiveForeground: "#FFFFFF",
    border: "#334155", // slate-700 - dark borders
    input: "#334155", // slate-700
    ring: "#F8FAFC", // slate-50 - focus ring in dark
    success: "#22C55E", // green-500 - consistent
    successForeground: "#FFFFFF",
    warning: "#F59E0B", // amber-500 - consistent
    warningForeground: "#FFFFFF",
    info: "#3B82F6", // blue-500 - consistent
    infoForeground: "#FFFFFF",
};

// Base theme configuration
const baseTheme = {
    spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
    },
    borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        full: 9999,
    },
    typography: {
        fontFamily: "System",
        sizes: {
            xs: 12,
            sm: 14,
            md: 16,
            lg: 18,
            xl: 20,
            xxl: 24,
        },
        weights: {
            normal: "400" as const,
            medium: "500" as const,
            semibold: "600" as const,
            bold: "700" as const,
        },
    },
};

// Create theme configurations
export const lightTheme: ThemeConfig = {
    colors: lightColors,
    ...baseTheme,
};

export const darkTheme: ThemeConfig = {
    colors: darkColors,
    ...baseTheme,
};

interface ThemeContextType {
    theme: ThemeConfig;
    themeMode: ThemeMode;
    isDark: boolean;
    setThemeMode: (mode: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@theme_mode";

interface ThemeProviderProps {
    children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const systemColorScheme = useColorScheme();
    const [themeMode, setThemeModeState] = useState<ThemeMode>("system");
    const [isLoading, setIsLoading] = useState(true);

    // Determine if we should use dark theme
    const isDark =
        themeMode === "dark" ||
        (themeMode === "system" && systemColorScheme === "dark");
    const theme = isDark ? darkTheme : lightTheme;

    // Validate color contrast on theme change
    useEffect(() => {
        const validateContrast = () => {
            // TODO: Implement color contrast validation
            // Color contrast validation would be implemented here
            // to ensure WCAG AA compliance for accessibility
        };

        validateContrast();
    }, [theme]);

    // Load theme preference from storage
    useEffect(() => {
        const loadThemeMode = async () => {
            try {
                const savedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedMode && ["light", "dark", "system"].includes(savedMode)) {
                    setThemeModeState(savedMode as ThemeMode);
                }
            } catch (error) {
                console.warn("Failed to load theme preference:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadThemeMode();
    }, []);

    // Save theme preference to storage
    const setThemeMode = async (mode: ThemeMode) => {
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
            setThemeModeState(mode);
        } catch (error) {
            console.warn("Failed to save theme preference:", error);
            // Still update the state even if storage fails
            setThemeModeState(mode);
        }
    };

    // Toggle between light and dark (not system)
    const toggleTheme = () => {
        const newMode = isDark ? "light" : "dark";
        setThemeMode(newMode);
    };

    // Don't render children until theme is loaded
    if (isLoading) {
        return null;
    }

    const value: ThemeContextType = {
        theme,
        themeMode,
        isDark,
        setThemeMode,
        toggleTheme,
    };

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
}

export function useTheme(): ThemeContextType {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}

// Utility hook for getting theme-aware styles
export function useThemeStyles() {
    const { theme, isDark } = useTheme();

    return {
        colors: theme.colors,
        spacing: theme.spacing,
        borderRadius: theme.borderRadius,
        typography: theme.typography,
        isDark,
        // Common style combinations
        card: {
            backgroundColor: theme.colors.card,
            borderRadius: theme.borderRadius.md,
            padding: theme.spacing.md,
        },
        button: {
            borderRadius: theme.borderRadius.sm,
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.sm,
        },
        text: {
            color: theme.colors.foreground,
            fontSize: theme.typography.sizes.md,
        },
    };
}
