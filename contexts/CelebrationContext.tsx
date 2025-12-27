import React, {
    createContext,
    useCallback,
    useContext,
    useState,
} from "react";
import ConfettiCannon from "react-native-confetti-cannon";
import { getOptimizedConfettiConfig } from "@/utils/celebrations";

type CelebrationType = "goalCompletion" | "streakMilestone" | "dailyComplete";

interface CelebrationConfig {
    type: CelebrationType;
    milestoneDays?: number;
}

interface CelebrationContextType {
    triggerCelebration: (config: CelebrationConfig) => void;
}

const CelebrationContext = createContext<CelebrationContextType | undefined>(
    undefined,
);

export const CelebrationProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [celebration, setCelebration] = useState<CelebrationConfig | null>(null);

    const triggerCelebration = useCallback((config: CelebrationConfig) => {
        setCelebration(config);
    }, []);

    const handleAnimationEnd = () => {
        setCelebration(null); // Reset after animation
    };

    const getConfettiConfig = () => {
        if (!celebration) return null;

        const { type, milestoneDays } = celebration;
        const config = getOptimizedConfettiConfig(type);

        if (!config) return null;

        if (type === "streakMilestone" && milestoneDays) {
            if (milestoneDays >= 365) {
                return { ...config, count: 200, colors: ["#FFD700", "#FFA500", "#FF6347", "#FF1493", "#9370DB", "#00CED1"] };
            } else if (milestoneDays >= 100) {
                return { ...config, count: 150, colors: ["#FFD700", "#FFA500", "#FF6347"] };
            }
        }
        return config;
    };

    const confettiConfig = getConfettiConfig();

    return (
        <CelebrationContext.Provider value={{ triggerCelebration }}>
            {children}
            {celebration && confettiConfig && (
                <ConfettiCannon
                    count={confettiConfig.count}
                    origin={confettiConfig.origin}
                    explosionSpeed={confettiConfig.explosionSpeed}
                    fallSpeed={confettiConfig.fallSpeed}
                    fadeOut={confettiConfig.fadeOut}
                    colors={confettiConfig.colors}
                    autoStart={true}
                    onAnimationEnd={handleAnimationEnd}
                />
            )}
        </CelebrationContext.Provider>
    );
};

export const useCelebration = () => {
    const context = useContext(CelebrationContext);
    if (context === undefined) {
        throw new Error(
            "useCelebration must be used within a CelebrationProvider",
        );
    }
    return context;
};
