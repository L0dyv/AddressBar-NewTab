import { useMemo, useState } from "react";

interface QuickLinkIconProps {
    name: string;
    url: string;
    icon?: string;
    size?: number;
    className?: string;
}

const QuickLinkIcon = ({ name, url, icon, size = 32, className = "" }: QuickLinkIconProps) => {
    const [loadFailed, setLoadFailed] = useState(false);

    const hostname = useMemo(() => {
        try {
            return new URL(url).hostname;
        } catch {
            return url;
        }
    }, [url]);

    const label = useMemo(() => {
        const source = (name || hostname || "?").trim();
        return source ? source.charAt(0).toUpperCase() : "?";
    }, [name, hostname]);

    if (icon) {
        return (
            <div
                className={className}
                style={{ width: size, height: size, fontSize: size * 0.75, lineHeight: 1 }}
            >
                {icon}
            </div>
        );
    }

    return (
        <div
            className={`relative flex items-center justify-center rounded-md ${className}`}
            style={{ width: size, height: size }}
        >
            {!loadFailed && (
                <img
                    src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`}
                    alt={name}
                    className="w-full h-full object-contain"
                    onError={() => setLoadFailed(true)}
                />
            )}
            {loadFailed && (
                <div
                    className="w-full h-full rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-200 font-semibold flex items-center justify-center"
                    style={{ fontSize: size * 0.5 }}
                >
                    {label}
                </div>
            )}
        </div>
    );
};

export default QuickLinkIcon;
