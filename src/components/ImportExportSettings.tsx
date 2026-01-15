import { useRef, useState, useEffect } from 'react';
import { Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { getWebDAVConfig, setWebDAVConfig, testWebDAVConnection, uploadBackupToWebDAV, restoreFromWebDAV } from '@/lib/webdav';

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
    const [webdavUrl, setWebdavUrl] = useState('');
    const [webdavUsername, setWebdavUsername] = useState('');
    const [webdavPassword, setWebdavPassword] = useState('');
    const [testingWebdav, setTestingWebdav] = useState(false);
    const [syncingWebdav, setSyncingWebdav] = useState(false);
    const [showInsecureConfirm, setShowInsecureConfirm] = useState(false);
    const [pendingAction, setPendingAction] = useState<"test" | "upload" | "restore" | null>(null);


    const clearMessages = () => {
        setError(null);
        setSuccess(null);
    };

    useEffect(() => {
        const load = async () => {
            try {
                const cfg = await getWebDAVConfig();
                setWebdavUrl(cfg.url || '');
                setWebdavUsername(cfg.username || '');
                setWebdavPassword(cfg.password || '');
            } catch { void 0; }
        };
        load();
    }, []);

    const protocolIsHttps = () => {
        try { return new URL(webdavUrl).protocol === 'https:'; } catch { return false; }
    };

    const performTest = async (allowInsecure: boolean) => {
        clearMessages();
        setTestingWebdav(true);
        try {
            const res = await testWebDAVConnection({ url: webdavUrl, username: webdavUsername, password: webdavPassword }, { allowInsecure });
            if (res.ok) {
                setSuccess('连接正常');
            } else {
                setError(res.message || `连接失败（${res.status}）`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '连接失败');
        } finally {
            setTestingWebdav(false);
        }
    };

    const performUpload = async (allowInsecure: boolean) => {
        clearMessages();
        setSyncingWebdav(true);
        try {
            await uploadBackupToWebDAV({ url: webdavUrl, username: webdavUsername, password: webdavPassword }, undefined, { allowInsecure });
            setSuccess('备份已上传到云端');
        } catch (err) {
            setError(err instanceof Error ? err.message : '上传失败');
        } finally {
            setSyncingWebdav(false);
        }
    };

    const performRestore = async (allowInsecure: boolean) => {
        clearMessages();
        setSyncingWebdav(true);
        try {
            await restoreFromWebDAV({ url: webdavUrl, username: webdavUsername, password: webdavPassword }, { allowInsecure });
            setSuccess('设置已从云端恢复');
            onSettingsChanged?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : '恢复失败');
        } finally {
            setSyncingWebdav(false);
        }
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

            {/* 搜索行为设置 */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <h3 className="text-sm font-medium text-foreground mb-3">搜索行为</h3>
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-foreground">在新标签页打开搜索结果</p>
                        <p className="text-xs text-muted-foreground">启用后，搜索结果将在新标签页打开而非当前页面</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={settings.openSearchInNewTab ?? false}
                            onChange={(e) => {
                                const checked = e.target.checked;
                                localStorage.setItem('openSearchInNewTab', String(checked));
                                try {
                                    window.dispatchEvent(new CustomEvent('settings:updated'));
                                } catch { void 0; }
                                onSettingsChanged?.();
                            }}
                            className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-stone-300 dark:peer-focus:ring-stone-600 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-stone-600 dark:peer-checked:bg-stone-400"></div>
                    </label>
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

            {/* 云备份（WebDAV） */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-4">
                <h3 className="text-sm font-medium text-foreground">云备份（WebDAV）</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                        <Label htmlFor="webdav-url">目标文件 URL</Label>
                        <Input
                            id="webdav-url"
                            placeholder="例如：https://example.com/dav/QuickTab/backup.json"
                            value={webdavUrl}
                            onChange={(e) => setWebdavUrl(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="webdav-username">用户名</Label>
                        <Input
                            id="webdav-username"
                            value={webdavUsername}
                            onChange={(e) => setWebdavUsername(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label htmlFor="webdav-password">密码</Label>
                        <Input
                            id="webdav-password"
                            type="password"
                            value={webdavPassword}
                            onChange={(e) => setWebdavPassword(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={async () => {
                            clearMessages();
                            try {
                                await setWebDAVConfig({ url: webdavUrl, username: webdavUsername, password: webdavPassword });
                                setSuccess('WebDAV 配置已保存');
                                setTimeout(() => setSuccess(null), 3000);
                            } catch (err) {
                                setError(err instanceof Error ? err.message : '保存失败');
                            }
                        }}
                    >
                        保存配置
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={testingWebdav}
                        onClick={async () => {
                            if (protocolIsHttps()) {
                                await performTest(false);
                            } else {
                                setPendingAction('test');
                                setShowInsecureConfirm(true);
                            }
                        }}
                    >
                        {testingWebdav ? '测试中...' : '测试连接'}
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={syncingWebdav}
                        onClick={async () => {
                            if (protocolIsHttps()) {
                                await performUpload(false);
                            } else {
                                setPendingAction('upload');
                                setShowInsecureConfirm(true);
                            }
                        }}
                    >
                        {syncingWebdav ? '上传中...' : '备份到云端'}
                    </Button>
                    <Button
                        variant="outline"
                        className="flex-1"
                        disabled={syncingWebdav}
                        onClick={async () => {
                            if (protocolIsHttps()) {
                                await performRestore(false);
                            } else {
                                setPendingAction('restore');
                                setShowInsecureConfirm(true);
                            }
                        }}
                    >
                        {syncingWebdav ? '恢复中...' : '从云端恢复'}
                    </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                    <p>• 请填写完整的文件 URL，PUT 将直接写入该文件</p>
                    <p>• 也可填写基础 URL，系统将自动创建 QuickTabNavigator/backup.json</p>
                    <p>• 密码仅保存于浏览器同步存储，不写入本地缓存</p>
                    <p>• 建议使用 HTTPS 与应用专用密码</p>
                </div>
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

            <AlertDialog open={showInsecureConfirm} onOpenChange={setShowInsecureConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>使用非 HTTPS 连接，存在高风险</AlertDialogTitle>
                        <AlertDialogDescription>
                            凭据与数据可能在网络中被窃听或篡改。确定要继续吗？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => { setShowInsecureConfirm(false); setPendingAction(null); }}>取消</AlertDialogCancel>
                        <AlertDialogAction onClick={async () => {
                            setShowInsecureConfirm(false)
                            const action = pendingAction
                            setPendingAction(null)
                            if (action === 'test') await performTest(true)
                            else if (action === 'upload') await performUpload(true)
                            else if (action === 'restore') await performRestore(true)
                        }}>继续</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 版本号 */}
            <div className="text-center text-xs text-muted-foreground pt-2">
                v{__APP_VERSION__}
            </div>
        </div>
    );
}
