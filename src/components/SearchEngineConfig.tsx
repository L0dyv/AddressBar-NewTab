import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, X, Bot, GripVertical, RotateCcw } from "lucide-react";
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
import { defaultSearchEngines, mergeBuiltinEngines } from "@/lib/defaultSearchEngines";

interface SearchEngine {
  id: string;
  name: string;
  url: string;
  isDefault?: boolean;
  isAI?: boolean;
  enabled?: boolean;
}

interface SearchEngineConfigProps {
  engines: SearchEngine[];
  onEnginesChange: (engines: SearchEngine[]) => void;
}

interface SortableEngineItemProps {
  engine: SearchEngine;
  onSetDefault: (id: string) => void;
  onRemove: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

function SortableEngineItem({ engine, onSetDefault, onRemove, onToggleEnabled }: SortableEngineItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: engine.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 判断是否为当前默认搜索引擎
  const isCurrentDefault = engine.isDefault;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-4 p-3 border rounded-lg bg-white dark:bg-gray-800 ${isDragging ? 'shadow-lg z-50 cursor-grabbing' : ''}`}
    >
      <div
        {...attributes}
        {...listeners}
        className={`drag-handle text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 touch-none ${isDragging ? 'drag-handle-active' : ''}`}
      >
        <GripVertical className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{engine.name}</span>
          {engine.isAI && (
            <span className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-xs font-medium">
              <Bot className="h-3 w-3" />
              AI
            </span>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {engine.isAI ? "AI助手搜索" : engine.url}
        </div>
      </div>
      <div className="flex gap-2">
        {engine.isDefault ? (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            默认
          </span>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSetDefault(engine.id)}
          >
            设为默认
          </Button>
        )}
        {engine.id !== 'kagi-assistant' && !engine.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(engine.id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <input
        type="checkbox"
        className="w-5 h-5"
        checked={engine.enabled !== false}
        onChange={e => onToggleEnabled(engine.id, e.target.checked)}
        disabled={isCurrentDefault}
        title={isCurrentDefault ? "默认搜索引擎不能取消勾选" : ""}
      />
    </div>
  );
}

const SearchEngineConfig = ({ engines, onEnginesChange }: SearchEngineConfigProps) => {
  const [newEngine, setNewEngine] = useState({ name: "", url: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 使用扩展的内置引擎列表（包含更多选项）
  const EXTRA_BUILTIN_ENGINES: SearchEngine[] = [
    { id: 'kagi', name: 'Kagi', url: 'https://kagi.com/search?q=' },
    { id: 'yahoo', name: 'Yahoo', url: 'https://search.yahoo.com/search?p=' },
    { id: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=' },
    { id: 'yandex', name: 'Yandex', url: 'https://yandex.com/search/?text=' },
    { id: 'startpage', name: 'StartPage', url: 'https://www.startpage.com/do/search?q=' },
    { id: 'ecosia', name: 'Ecosia', url: 'https://www.ecosia.org/search?q=' },
  ];

  const addEngine = () => {
    if (newEngine.name && newEngine.url) {
      const id = newEngine.name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
      onEnginesChange([...engines, { ...newEngine, id }]);
      setNewEngine({ name: "", url: "" });
    }
  };

  const removeEngine = (id: string) => {
    // 防止删除Kagi Assistant
    if (id === 'kagi-assistant') {
      return;
    }

    // 防止删除默认搜索引擎
    const targetEngine = engines.find(e => e.id === id);
    if (targetEngine?.isDefault) {
      return;
    }

    // 记录内置引擎的删除
    const isBuiltin = defaultSearchEngines.some(e => e.id === id);
    if (isBuiltin) {
      const del = JSON.parse(localStorage.getItem("deletedBuiltinIds") ?? "[]");
      if (!del.includes(id)) {
        del.push(id);
        localStorage.setItem("deletedBuiltinIds", JSON.stringify(del));
      }
    }

    onEnginesChange(engines.filter(engine => engine.id !== id));
  };

  const setDefault = (id: string) => {
    onEnginesChange(
      engines.map(engine => ({
        ...engine,
        isDefault: engine.id === id,
        enabled: engine.id === id ? true : engine.enabled,
      }))
    );
  };

  const resetToDefault = () => {
    localStorage.removeItem('deletedBuiltinIds'); // 清除删除记录
    onEnginesChange([...defaultSearchEngines]);
    localStorage.removeItem('currentSearchEngine');
  };

  const toggleEnabled = (id: string, enabled: boolean) => {
    // 默认搜索引擎不允许取消勾选
    const targetEngine = engines.find(e => e.id === id);
    if (targetEngine?.isDefault && !enabled) {
      return; // 不允许取消默认搜索引擎
    }

    onEnginesChange(engines.map(engine =>
      engine.id === id ? { ...engine, enabled } : engine
    ));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = engines.findIndex(engine => engine.id === active.id);
      const newIndex = engines.findIndex(engine => engine.id === over?.id);

      onEnginesChange(arrayMove(engines, oldIndex, newIndex));
    }
  };

  return (
    <Card className="border-0 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>搜索引擎配置</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            className="flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            重置为默认
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 现有搜索引擎列表 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={engines.map(e => e.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {engines.map((engine) => (
                <SortableEngineItem
                  key={engine.id}
                  engine={engine}
                  onSetDefault={setDefault}
                  onRemove={removeEngine}
                  onToggleEnabled={toggleEnabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {/* 添加新搜索引擎 */}
        <div className="border-t pt-6">
          <h3 className="font-medium mb-4">添加新搜索引擎</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={newEngine.name}
                onChange={(e) => setNewEngine({ ...newEngine, name: e.target.value })}
                placeholder="搜索引擎名称"
              />
            </div>
            <div>
              <Label htmlFor="url">搜索URL</Label>
              <Input
                id="url"
                value={newEngine.url}
                onChange={(e) => setNewEngine({ ...newEngine, url: e.target.value })}
                placeholder="https://example.com/search?q="
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addEngine} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                添加
              </Button>
            </div>
          </div>
        </div>

        {/* Kagi Assistant 说明 */}
        <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                关于 Kagi Assistant
              </h4>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Kagi Assistant 是集成的AI助手，支持多种模型（GPT-4o、Claude等）。使用前请确保已登录 Kagi 账户并有可用的配额。拖拽左侧图标可调整搜索引擎顺序。
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SearchEngineConfig;
