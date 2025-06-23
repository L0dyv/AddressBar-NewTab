import { ReactNode, useEffect } from "react";
import * as React from "react";
import {
    Dialog,
    DialogHeader,
    DialogTitle,
    DialogPortal,
    DialogOverlay,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsModalProps {
    title: string;
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: ReactNode;
    dirty?: boolean;
}

// 自定义 DialogContent，不包含默认的关闭按钮
const CustomDialogContent = React.forwardRef<
    React.ElementRef<typeof DialogPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2",
                "border bg-background shadow-lg sm:rounded-lg",
                "max-h-[90vh]",
                "overflow-visible",
                className
            )}
            {...props}
        >
            {/* 关闭按钮作为模态框的子元素，绝对定位到右上角外侧 */}
            <button
                onClick={onClose}
                type="button"
                className="absolute -top-4 -right-4 z-[100] rounded-full bg-background text-foreground p-2.5 shadow-xl border border-border hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-colors"
                aria-label="关闭"
            >
                <X className="h-5 w-5" />
            </button>
            <div className="max-h-[90vh] overflow-y-auto rounded-lg">
                {children}
            </div>
        </DialogPrimitive.Content>
    </DialogPortal>
));
CustomDialogContent.displayName = "CustomDialogContent";

export default function SettingsModal({
    title,
    open,
    onOpenChange,
    children,
    dirty = false,
}: SettingsModalProps) {
    // 关闭时拦截：有脏数据就二次确认
    const handleClose = () => {
        if (!dirty || window.confirm("仍有未保存修改，确定关闭？")) {
            onOpenChange(false);
        }
    };

    // 监听 ESC
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") handleClose();
        };
        if (open) window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <CustomDialogContent onClose={handleClose}>
                <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur px-6 py-4 mb-4 border-b">
                    <DialogTitle className="text-lg font-semibold">
                        {title}
                    </DialogTitle>
                </DialogHeader>
                <div className="px-6 pb-6">{children}</div>
            </CustomDialogContent>
        </Dialog>
    );
} 