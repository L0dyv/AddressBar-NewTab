import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, GripVertical, Loader2, Pencil, Check, X } from "lucide-react";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { t } from "@/lib/i18n";

interface QuickLink {
    id: string;
    name: string;
    url: string;
    icon?: string;
    enabled?: boolean;
}

interface DraggableRowProps {
    link: QuickLink;
    isEditing: boolean;
    editingLink: { name: string; url: string };
    isEditLoading: boolean;
    skipDeleteConfirm: boolean;
    onEditingLinkChange: (value: { name: string; url: string }) => void;
    onStartEditing: (link: QuickLink) => void;
    onSaveEditing: () => void;
    onCancelEditing: () => void;
    onRemoveLink: (id: string) => void;
    onToggleEnabled: (id: string, enabled: boolean) => void;
    onConfirmDelete: (id: string) => void;
}

const DraggableRow = ({
    link,
    isEditing,
    editingLink,
    isEditLoading,
    skipDeleteConfirm,
    onEditingLinkChange,
    onStartEditing,
    onSaveEditing,
    onCancelEditing,
    onRemoveLink,
    onToggleEnabled,
    onConfirmDelete,
}: DraggableRowProps) => {
    const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: link.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        onToggleEnabled(link.id, e.target.checked);
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (skipDeleteConfirm) {
            onRemoveLink(link.id);
        } else {
            onConfirmDelete(link.id);
        }
    };

    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        onStartEditing(link);
    };

    if (isEditing) {
        // 编辑模式下不应用拖拽属性，避免干扰中文输入法
        return (
            <div ref={setNodeRef} style={style}
                className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                        value={editingLink.name}
                        onChange={(e) => onEditingLinkChange({ ...editingLink, name: e.target.value })}
                        placeholder={t('quickLinks.namePlaceholder')}
                        disabled={isEditLoading}
                        autoFocus
                    />
                    <Input
                        value={editingLink.url}
                        onChange={(e) => onEditingLinkChange({ ...editingLink, url: e.target.value })}
                        placeholder={t('quickLinks.urlPlaceholder')}
                        disabled={isEditLoading}
                    />
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onSaveEditing}
                    disabled={!editingLink.url || isEditLoading}
                    className="text-green-600 hover:text-green-800"
                >
                    {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancelEditing}
                    className="text-gray-600 hover:text-gray-800"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div ref={setNodeRef} style={style}
            className="flex items-center gap-4 p-3 border rounded-lg overflow-hidden">
            <div {...attributes} {...listeners} className="drag-handle text-gray-400 flex-shrink-0">
                <GripVertical />
            </div>
            <input type="checkbox" className="w-5 h-5 flex-shrink-0"
                checked={link.enabled === true}
                onChange={handleCheckboxChange} />
            <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{link.name}</div>
                <div className="text-sm text-gray-500 truncate">{link.url}</div>
            </div>
            <div className="flex-shrink-0 flex gap-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditClick}
                    className="text-blue-600 hover:text-blue-800"
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveClick}
                    className="text-red-600 hover:text-red-800"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
};

export default DraggableRow;
export type { QuickLink, DraggableRowProps };
