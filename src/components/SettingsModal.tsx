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
    React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
    <DialogPortal>
        <DialogOverlay />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
                "max-h-[90vh] overflow-y-auto sm:max-w-2xl",
                className
            )}
            {...props}
        >
            {children}
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
            <CustomDialogContent>
                <DialogHeader
                    className="sticky top-0 z-10 flex items-center justify-between bg-white/95 backdrop-blur dark:bg-gray-900/95 px-6 py-4 -mx-6 -mt-6 mb-4 border-b"
                >
                    <DialogTitle className="text-lg font-semibold">
                        {title}
                    </DialogTitle>
                    <button
                        onClick={handleClose}
                        className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
                    >
                        <X className="h-4 w-4" />
                        <span className="sr-only">关闭</span>
                    </button>
                </DialogHeader>
                <div className="px-6">{children}</div>
            </CustomDialogContent>
        </Dialog>
    );
} 