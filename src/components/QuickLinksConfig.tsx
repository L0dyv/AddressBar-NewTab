import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, GripVertical, Loader2, Pencil, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
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

// 规范化URL：自动添加https://前缀（如果需要）
const normalizeUrl = (url: string): string => {
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return trimmedUrl;

  // 如果已经有协议前缀（http://, https://, file://, etc.），直接返回
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmedUrl)) {
    return trimmedUrl;
  }

  // 检查是否看起来像一个域名（包含.且不含空格）
  if (trimmedUrl.includes('.') && !trimmedUrl.includes(' ')) {
    return `https://${trimmedUrl}`;
  }

  // 其他情况原样返回
  return trimmedUrl;
};

const QuickLinksConfig = ({ links, onLinksChange }: QuickLinksConfigProps) => {
  const [newLink, setNewLink] = useState({ name: "", url: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState({ name: "", url: "" });
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [skipDeleteConfirm, setSkipDeleteConfirm] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 通过 background.js 获取网页标题
  const fetchPageTitle = async (url: string): Promise<string> => {
    console.log('[QuickLinks] 开始获取标题:', url);
    console.log('[QuickLinks] chrome 对象:', typeof chrome);
    console.log('[QuickLinks] chrome.runtime:', typeof chrome !== 'undefined' ? chrome.runtime : 'undefined');

    return new Promise((resolve) => {
      // 检查是否在扩展环境中
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        console.log('[QuickLinks] 发送消息到 background...');
        chrome.runtime.sendMessage<{ success: boolean; title?: string }>(
          { type: 'FETCH_PAGE_TITLE', url },
          (response) => {
            console.log('[QuickLinks] 收到响应:', response);
            if (response?.success && response.title) {
              resolve(response.title);
            } else {
              // 失败时使用域名
              try {
                const urlObj = new URL(url);
                resolve(urlObj.hostname.replace('www.', ''));
              } catch {
                resolve(url);
              }
            }
          }
        );
      } else {
        console.log('[QuickLinks] 不在扩展环境中，使用域名');
        // 非扩展环境，使用域名
        try {
          const urlObj = new URL(url);
          resolve(urlObj.hostname.replace('www.', ''));
        } catch {
          resolve(url);
        }
      }
    });
  };

  useEffect(() => {
    try {
      const saved = localStorage.getItem('skipConfirmDeleteQuickLinks');
      setSkipDeleteConfirm(saved === 'true');
    } catch {
      setSkipDeleteConfirm(false);
    }
  }, []);

  const updateSkipConfirm = (next: boolean) => {
    setSkipDeleteConfirm(next);
    try {
      localStorage.setItem('skipConfirmDeleteQuickLinks', String(next));
    } catch {
      /* ignore */
    }
  };

  const addLink = async () => {
    if (newLink.url) {
      setIsLoading(true);
      try {
        const normalizedUrl = normalizeUrl(newLink.url);

        // 如果没有填写名称，自动获取
        let linkName = newLink.name.trim();
        if (!linkName) {
          linkName = await fetchPageTitle(normalizedUrl);
        }

        const id = linkName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
        onLinksChange([...links, { name: linkName, url: normalizedUrl, id, enabled: true }]);
        setNewLink({ name: "", url: "" });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const removeLink = (id: string) => {
    const filteredLinks = links.filter(link => link.id !== id);
    onLinksChange(filteredLinks);
  };

  const startEditing = (link: QuickLink) => {
    setEditingId(link.id);
    setEditingLink({ name: link.name, url: link.url });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingLink({ name: "", url: "" });
  };

  const saveEditing = async () => {
    if (editingId && editingLink.url) {
      setIsEditLoading(true);
      try {
        const normalizedUrl = normalizeUrl(editingLink.url);

        // 如果没有填写名称，自动获取
        let linkName = editingLink.name.trim();
        if (!linkName) {
          linkName = await fetchPageTitle(normalizedUrl);
        }

        const updatedLinks = links.map(link =>
          link.id === editingId
            ? { ...link, name: linkName, url: normalizedUrl }
            : link
        );
        onLinksChange(updatedLinks);
        setEditingId(null);
        setEditingLink({ name: "", url: "" });
      } finally {
        setIsEditLoading(false);
      }
    }
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
    const isEditing = editingId === link.id;

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      toggleEnabled(link.id, e.target.checked);
    };

    const handleRemoveClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (skipDeleteConfirm) {
        removeLink(link.id);
      } else {
        setConfirmDeleteId(link.id);
      }
    };

    const handleEditClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      startEditing(link);
    };

    if (isEditing) {
      return (
        <div ref={setNodeRef} style={style}
          className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              value={editingLink.name}
              onChange={(e) => setEditingLink({ ...editingLink, name: e.target.value })}
              placeholder="留空将自动获取"
              disabled={isEditLoading}
              autoFocus
            />
            <Input
              value={editingLink.url}
              onChange={(e) => setEditingLink({ ...editingLink, url: e.target.value })}
              placeholder="https://example.com"
              disabled={isEditLoading}
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={saveEditing}
            disabled={!editingLink.url || isEditLoading}
            className="text-green-600 hover:text-green-800"
          >
            {isEditLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={cancelEditing}
            className="text-gray-600 hover:text-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

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
          <div className="font-medium">{link.name}</div>
          <div className="text-sm text-gray-500">{link.url}</div>
        </div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="linkName">名称(可选)</Label>
              <Input
                id="linkName"
                value={newLink.name}
                onChange={(e) => setNewLink({ ...newLink, name: e.target.value })}
                placeholder="留空将自动获取"
              />
            </div>
            <div>
              <Label htmlFor="linkUrl">网址</Label>
              <Input
                id="linkUrl"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                placeholder="https://example.com"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addLink();
                  }
                }}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addLink} className="w-full" disabled={isLoading || !newLink.url}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "获取中..." : "添加"}
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

      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除这个快速链接？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后无法恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-2">
            <Checkbox
              id="skipConfirmLinks"
              checked={skipDeleteConfirm}
              onCheckedChange={(val) => updateSkipConfirm(Boolean(val))}
            />
            <Label htmlFor="skipConfirmLinks" className="text-sm">下次不再提示</Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmDeleteId(null)}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDeleteId) {
                  removeLink(confirmDeleteId);
                }
                setConfirmDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default QuickLinksConfig;
