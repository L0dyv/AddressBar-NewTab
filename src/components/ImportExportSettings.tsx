import { useRef, useState } from 'react';
import { Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    downloadSettings,
    importSettingsFromFile,
    resetAllSettings,
    getAllSettings,
} from '@/lib/settingsManager';

interface ImportExportSettingsProps {
    onSettingsChanged?: () => void;
}

export default function ImportExportSettings({ onSettingsChanged }: ImportExportSettingsProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showImportConfirm, setShowImportConfirm] = useState(false);
    const [pendingFile, setPendingFile] = useState<File | null>(null);

    // 清除消息
    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    // 导出设置
    const handleExport = () => {
        clearMessages();
        try {
            downloadSettings();
            setSuccess('设置已导出');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : '导出失败');
        }
    };

    // 触发文件选择
    const handleImportClick = () => {
        clearMessages();
        fileInputRef.current?.click();
    };

    // 处理文件选择
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setPendingFile(file);
            setShowImportConfirm(true);
        }
        // 重置 input 以便可以选择同一个文件
        event.target.value = '';
    };

    // 确认导入
    const confirmImport = async () => {
        if (!pendingFile) return;

        setImporting(true);
        setShowImportConfirm(false);

        try {
            await importSettingsFromFile(pendingFile);
            setSuccess('设置已导入');
            onSettingsChanged?.();
        } catch (err) {
            console.error('Import settings failed', err);
            setError(err instanceof Error ? err.message : '导入失败');
        } finally {
            setImporting(false);
            setPendingFile(null);
        }
    };

    // 取消导入
    const cancelImport = () => {
        setShowImportConfirm(false);
        setPendingFile(null);
    };

    // 重置设置
    const handleReset = () => {
        clearMessages();
        setShowResetConfirm(true);
    };

    // 确认重置
    const confirmReset = () => {
        setShowResetConfirm(false);
        try {
            resetAllSettings();
            setSuccess('设置已重置，页面将自动刷新...');
            onSettingsChanged?.();
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            setError(err instanceof Error ? err.message : '重置失败');
        }
    };

    // 获取当前设置摘要
    const settings = getAllSettings();
    const summary = {
        searchEngines: settings.searchEngines.length,
        quickLinks: settings.quickLinks.length,
        theme: settings.theme === 'system' ? '跟随系统' : settings.theme === 'dark' ? '深色' : '浅色',
    };

    return (
        <div className="space-y-6">
            {/* 隐藏的文件输入 */}
            <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
            />

            {/* 当前设置摘要 */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">当前设置概览</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <span className="text-muted-foreground">搜索引擎</span>
                        <p className="font-medium text-foreground">{summary.searchEngines} 个</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">快速链接</span>
                        <p className="font-medium text-foreground">{summary.quickLinks} 个</p>
                    </div>
                    <div>
                        <span className="text-muted-foreground">主题</span>
                        <p className="font-medium text-foreground">{summary.theme}</p>
                    </div>
                </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex flex-col sm:flex-row gap-3">
                <Button
                    onClick={handleExport}
                    variant="outline"
                    className="flex-1 gap-2"
                >
                    <Download className="h-4 w-4" />
                    导出设置
                </Button>

                <Button
                    onClick={handleImportClick}
                    variant="outline"
                    className="flex-1 gap-2"
                    disabled={importing}
                >
                    <Upload className="h-4 w-4" />
                    {importing ? '导入中...' : '导入设置'}
                </Button>

                <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                    <RotateCcw className="h-4 w-4" />
                    重置设置
                </Button>
            </div>

            {/* 提示信息 */}
            <div className="text-xs text-muted-foreground space-y-1">
                <p>• 导出的配置文件包含所有搜索引擎、快速链接和主题设置</p>
                <p>• 导入设置会覆盖当前所有配置</p>
                <p>• 重置会将所有设置恢复为默认值</p>
            </div>

            {/* 成功/错误消息 */}
            {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
                    {success}
                </div>
            )}

            {/* 导入确认对话框 */}
            <AlertDialog open={showImportConfirm} onOpenChange={setShowImportConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认导入设置？</AlertDialogTitle>
                        <AlertDialogDescription>
                            导入设置将会覆盖当前所有配置，包括搜索引擎、快速链接和主题设置。此操作无法撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={cancelImport}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmImport}>确认导入</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 重置确认对话框 */}
            <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认重置所有设置？</AlertDialogTitle>
                        <AlertDialogDescription>
                            这将删除所有自定义配置，恢复为默认设置。此操作无法撤销，建议先导出当前配置作为备份。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>取消</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmReset}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            确认重置
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
