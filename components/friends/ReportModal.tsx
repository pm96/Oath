import React, { useState } from "react";
import { View, ScrollView } from "react-native";
import { Modal, VStack, HStack, Heading, Body, Caption, Button, Card } from "../ui";
import { useThemeStyles } from "@/hooks/useTheme";
import { AlertTriangle } from "lucide-react-native";
import { db } from "@/firebaseConfig";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { showErrorToast, showSuccessToast } from "@/utils/toast";

export interface ReportModalProps {
    visible: boolean;
    targetUserId: string;
    targetUserName: string;
    onClose: () => void;
}

const REPORT_REASONS = [
    "Inappropriate Content",
    "Harassment",
    "Spam",
    "Fake Account",
    "Other"
];

export function ReportModal({ visible, targetUserId, targetUserName, onClose }: ReportModalProps) {
    const { colors, spacing } = useThemeStyles();
    const [loading, setLoading] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    const handleReport = async () => {
        if (!selectedReason) return;

        setLoading(true);
        try {
            await addDoc(collection(db, "reports"), {
                targetUserId,
                targetUserName,
                reason: selectedReason,
                timestamp: serverTimestamp(),
                status: "pending"
            });
            
            showSuccessToast("Report submitted. Thank you for keeping the community safe.");
            onClose();
        } catch (error) {
            showErrorToast("Failed to submit report. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} onClose={onClose} title="Report User" size="md">
            <VStack spacing="xl" style={{ padding: 20 }}>
                <VStack align="center" spacing="sm">
                    <AlertTriangle size={40} color={colors.destructive} />
                    <Body align="center">
                        You are reporting <Body weight="bold">{targetUserName}</Body>. 
                        Our team will review this report within 24 hours.
                    </Body>
                </VStack>

                <VStack spacing="sm">
                    <Heading size="sm">Select a Reason</Heading>
                    {REPORT_REASONS.map((reason) => (
                        <TouchableOpacity 
                            key={reason} 
                            onPress={() => setSelectedReason(reason)}
                            activeOpacity={0.7}
                        >
                            <Card 
                                variant={selectedReason === reason ? "elevated" : "outlined"}
                                padding="sm"
                                style={selectedReason === reason ? { borderColor: colors.primary, borderWidth: 1 } : {}}
                            >
                                <Body weight={selectedReason === reason ? "semibold" : "normal"}>{reason}</Body>
                            </Card>
                        </TouchableOpacity>
                    ))}
                </VStack>

                <HStack spacing="md">
                    <Button variant="outline" onPress={onClose} style={{ flex: 1 }}>Cancel</Button>
                    <Button 
                        variant="destructive" 
                        onPress={handleReport} 
                        disabled={!selectedReason}
                        loading={loading}
                        style={{ flex: 1 }}
                    >
                        Submit Report
                    </Button>
                </HStack>
            </VStack>
        </Modal>
    );
}

import { TouchableOpacity } from "react-native";
