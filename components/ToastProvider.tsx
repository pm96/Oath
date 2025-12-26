import { useToast } from "@/components/ui/toast";
import { setGlobalToast } from "@/utils/toast";
import React from "react";

/**
 * ToastProvider component
 * Initializes the global toast instance for the app
 * Requirement 9.4: Enable toast notifications throughout the app
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const toast = useToast();

    React.useEffect(() => {
        setGlobalToast(toast);
    }, [toast]);

    return <>{children}</>;
}
