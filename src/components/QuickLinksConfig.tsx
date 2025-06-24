import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, X, GripVertical, RotateCcw } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuickLink {
  id: string;
  name: string;
  url: string;
  icon?: string;
  enabled?: boolean;
}

interface QuickLinksConfigProps {
  links: QuickLink[];
  onLinksChange: (links: QuickLink[]) => void;
}

const QuickLinksConfig = ({ links, onLinksChange }: QuickLinksConfigProps) => {
  const [newLink, setNewLink] = useState({ name: "", url: "", icon: "" });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addLink = () => {
    if (newLink.name && newLink.url) {
      const id = newLink.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      onLinksChange([...links, { ...newLink, id, enabled: true }]);
      setNewLink({ name: "", url: "", icon: "" });
    }
  };

  const removeLink = (id: string) => {
    const filteredLinks = links.filter(link => link.id !== id);
    onLinksChange(filteredLinks);
  };

  const resetToDefault = () => {
    onLinksChange([]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = links.findIndex(link => link.id === active.id);
      const newIndex = links.findIndex(link => link.id === over?.id);

      onLinksChange(arrayMove(links, oldIndex, newIndex));
    }
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    const updatedLinks = links.map(link =>
      link.id === id ? { ...link, enabled } : link
    );
    onLinksChange(updatedLinks);
  };

  const DraggableRow = ({ link }: { link: QuickLink }) => {
    const { setNodeRef, attributes, listeners, transform, transition } = useSortable({ id: link.id });
    const style = { transform: CSS.Transform.toString(transform), transition };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      toggleEnabled(link.id, e.target.checked);
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      removeLink(link.id);
    };

    return (
      <div ref={setNodeRef} style={style}
        className="flex items-center gap-4 p-3 border rounded-lg">
        <div {...attributes} {...listeners} className="drag-handle text-gray-400">
          <GripVertical />
        </div>
        <input type="checkbox" className="w-5 h-5"
          checked={link.enabled === true}
          onChange={handleCheckboxChange} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {link.icon && <span className="text-lg">{link.icon}</span>}
            <div className="font-medium">{link.name}</div>
          </div>
          <div className="text-sm text-gray-500">{link.url}</div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemoveClick}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <CardTitle>快速链接配置</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 现有快速链接列表 */}
        {links.length > 0 && (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={links.map(l => l.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-3">
                {links.map((link) => (
                  <DraggableRow
                    key={link.id}
                    link={link}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* 添加新快速链接 */}
        <div className={links.length > 0 ? "border-t pt-6" : ""}>
          <h3 className="font-medium mb-4">添加新快速链接</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="linkName">名称</Label>
              <Input
                id="linkName"
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                placeholder="链接名称"
              />
            </div>
            <div>
              <Label htmlFor="linkUrl">网址</Label>
              <Input
                id="linkUrl"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label htmlFor="linkIcon">图标 (可选)</Label>
              <Input
                id="linkIcon"
                value={newLink.icon}
                onChange={(e) => setNewLink({ ...newLink, icon: e.target.value })}
                placeholder="😀"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addLink} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                添加
              </Button>
            </div>
          </div>
          {links.length > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              💡 提示：拖拽左侧图标可调整快速链接顺序
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickLinksConfig;
