import { getStoredValue, setStoredValue } from './storage'
import { exportSettingsToJson, importSettingsFromJson } from './settingsManager'

export type WebDAVConfig = {
    url: string
    username: string
    password: string
}

const DEFAULT_WEBDAV_CONFIG: WebDAVConfig = {
    url: '',
    username: '',
    password: '',
}

const CONFIG_KEY = 'webdavConfig'
const PASSWORD_KEY = 'webdavPassword'

type ChromeStorageSync = {
    get: (keys: string | string[]) => Promise<Record<string, unknown>>
    set: (items: Record<string, unknown>) => Promise<void>
}

const getChromeSync = (): ChromeStorageSync | undefined => {
    try {
        const sync = (typeof chrome !== 'undefined'
            ? (chrome as unknown as { storage?: { sync?: ChromeStorageSync } })?.storage?.sync
            : undefined)
        return sync
    } catch {
        return undefined
    }
}

const toBase64 = (str: string) => {
    try {
        return btoa(unescape(encodeURIComponent(str)))
    } catch {
        return btoa(str)
    }
}

const authHeader = (cfg: WebDAVConfig) =>
    cfg.username || cfg.password
        ? `Basic ${toBase64(`${cfg.username}:${cfg.password}`)}`
        : undefined

export async function getWebDAVConfig(): Promise<WebDAVConfig> {
    const meta = await getStoredValue<WebDAVConfig>(CONFIG_KEY, DEFAULT_WEBDAV_CONFIG)
    let pwd = ''
    const sync = getChromeSync()
    if (sync) {
        try {
            const r = await sync.get(PASSWORD_KEY)
            if (r && Object.prototype.hasOwnProperty.call(r, PASSWORD_KEY)) {
                pwd = (r[PASSWORD_KEY] as string) ?? ''
            }
        } catch { pwd = '' }
    }
    return { url: meta.url ?? '', username: meta.username ?? '', password: pwd }
}

export async function setWebDAVConfig(cfg: WebDAVConfig): Promise<void> {
    await setStoredValue(CONFIG_KEY, { url: cfg.url ?? '', username: cfg.username ?? '', password: '' })
    const sync = getChromeSync()
    if (!sync) return
    try {
        await sync.set({ [PASSWORD_KEY]: cfg.password ?? '' })
    } catch { /* noop */ }
}

const isHttps = (url: string) => {
    try {
        return new URL(url).protocol === 'https:'
    } catch {
        return false
    }
}

const hex = (buf: ArrayBuffer | Uint8Array) => {
    const b = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
    let s = ''
    for (let i = 0; i < b.length; i++) s += ('0' + b[i].toString(16)).slice(-2)
    return s
}

const md5 = async (str: string) => {
    const data = new TextEncoder().encode(str)
    const digest = await crypto.subtle.digest('MD5', data)
    return hex(digest)
}

const parseDigest = (header: string) => {
    const m = header.replace(/^\s*Digest\s+/i, '')
    const parts: Record<string, string> = {}
    m.split(/,\s*/).forEach(kv => {
        const idx = kv.indexOf('=')
        if (idx > 0) {
            const k = kv.slice(0, idx).trim()
            let v = kv.slice(idx + 1).trim()
            if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
            parts[k] = v
        }
    })
    return parts
}

const buildDigestAuth = async (method: string, url: string, username: string, password: string, challenge: Record<string, string>) => {
    const u = new URL(url)
    const uri = u.pathname + (u.search || '')
    const realm = challenge.realm || ''
    const nonce = challenge.nonce || ''
    const qop = (challenge.qop || '').split(',')[0]?.trim() || 'auth'
    const opaque = challenge.opaque
    const algorithm = (challenge.algorithm || 'MD5').toUpperCase()
    const cnonce = hex(crypto.getRandomValues(new Uint8Array(16)))
    const nc = '00000001'
    const ha1 = await md5(`${username}:${realm}:${password}`)
    const ha2 = await md5(`${method}:${uri}`)
    const response = await md5(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
    let auth = `Digest username="${username}", realm="${realm}", nonce="${nonce}", uri="${uri}", response="${response}", qop=${qop}, nc=${nc}, cnonce="${cnonce}"`
    if (opaque) auth += `, opaque="${opaque}"`
    if (algorithm) auth += `, algorithm=${algorithm}`
    return auth
}

const requestWithAuth = async (method: string, url: string, baseHeaders: Record<string, string>, body: BodyInit | null, cfg: WebDAVConfig) => {
    const h1: Record<string, string> = { ...baseHeaders }
    const basic = authHeader(cfg)
    if (basic) h1['Authorization'] = basic
    let resp = await fetch(url, { method, headers: h1, body })
    if (resp.status === 401) {
        const wa = resp.headers.get('www-authenticate') || ''
        if (/Digest/i.test(wa)) {
            const chal = parseDigest(wa)
            const digest = await buildDigestAuth(method, url, cfg.username, cfg.password, chal)
            const h2: Record<string, string> = { ...baseHeaders, Authorization: digest }
            resp = await fetch(url, { method, headers: h2, body })
        }
    }
    return resp
}

const ensureSlash = (url: string) => {
    try {
        const u = new URL(url)
        if (!u.pathname.endsWith('/')) {
            u.pathname = u.pathname + '/'
        }
        return u.toString()
    } catch {
        return url.endsWith('/') ? url : url + '/'
    }
}

const DEFAULT_DIR = 'QuickTabNavigator'
const ts = () => {
    const d = new Date()
    const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
    const YYYY = d.getFullYear()
    const MM = pad(d.getMonth() + 1)
    const DD = pad(d.getDate())
    const hh = pad(d.getHours())
    const mm = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${YYYY}${MM}${DD}${hh}${mm}${ss}`
}
const timestampFile = () => `backup_${ts()}.json`

const buildDirUrl = (baseUrl: string) => {
    const base = ensureSlash(baseUrl)
    return base + DEFAULT_DIR + '/'
}

const isDirectory = (url: string) => {
    try { return new URL(url).pathname.endsWith('/') } catch { return url.endsWith('/') }
}

const ensureAppDir = async (baseUrl: string, cfg: WebDAVConfig) => {
    const dirUrl = buildDirUrl(baseUrl)
    const r = await requestWithAuth('PROPFIND', dirUrl, { Depth: '0' }, null, cfg)
    if (r.ok || (r.status >= 200 && r.status < 400)) return dirUrl
    const mk = await requestWithAuth('MKCOL', dirUrl, {}, null, cfg)
    return dirUrl
}

export async function testWebDAVConnection(cfg: WebDAVConfig, options?: { allowInsecure?: boolean }): Promise<{ ok: boolean; status: number; message?: string }> {
    if (!cfg.url) return { ok: false, status: 0, message: '未配置 URL' }
    if (!isHttps(cfg.url) && !options?.allowInsecure) {
        return { ok: false, status: 0, message: '使用非 HTTPS 连接，需确认后继续' }
    }

    const headers: Record<string, string> = {}
    const auth = authHeader(cfg)
    if (auth) headers['Authorization'] = auth

    try {
        if (isDirectory(cfg.url)) {
            const dirUrl = await ensureAppDir(cfg.url, cfg)
            const r0 = await requestWithAuth('PROPFIND', dirUrl, { Depth: '0' }, null, cfg)
            if (r0.ok || (r0.status >= 200 && r0.status < 400)) {
                return { ok: true, status: r0.status }
            }
        }
        const r1 = await requestWithAuth('HEAD', cfg.url, headers, null, cfg)
        if (r1.ok || (r1.status >= 200 && r1.status < 400)) {
            return { ok: true, status: r1.status }
        }

        const r2 = await requestWithAuth('OPTIONS', cfg.url, headers, null, cfg)
        if (r2.ok || (r2.status >= 200 && r2.status < 400)) {
            return { ok: true, status: r2.status }
        }

        const r3 = await requestWithAuth('PROPFIND', cfg.url, { ...headers, Depth: '0' }, null, cfg)
        if (r3.ok || (r3.status >= 200 && r3.status < 400)) {
            return { ok: true, status: r3.status }
        }

        return { ok: false, status: r3.status, message: `连接失败 (${r3.status})` }
    } catch (e) {
        return { ok: false, status: 0, message: e instanceof Error ? e.message : '网络错误' }
    }
}

export async function uploadBackupToWebDAV(cfg: WebDAVConfig, json?: string, options?: { allowInsecure?: boolean }): Promise<void> {
    const url = cfg.url
    if (!url) throw new Error('未配置 WebDAV 目标 URL')
    if (!isHttps(url) && !options?.allowInsecure) {
        throw new Error('使用非 HTTPS 连接，需确认后继续')
    }

    const body = json ?? exportSettingsToJson()

    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    let target = url
    if (isDirectory(url)) {
        const dir = await ensureAppDir(url, cfg)
        target = dir + timestampFile()
    }
    const resp = await requestWithAuth('PUT', target, headers, body, cfg)
    if (!resp.ok) {
        throw new Error(`上传失败：HTTP ${resp.status}`)
    }
}

export async function downloadBackupFromWebDAV(cfg: WebDAVConfig, options?: { allowInsecure?: boolean }): Promise<string> {
    const url = cfg.url
    if (!url) throw new Error('未配置 WebDAV 目标 URL')
    if (!isHttps(url) && !options?.allowInsecure) {
        throw new Error('使用非 HTTPS 连接，需确认后继续')
    }

    const headers: Record<string, string> = {}
    let target = url
    if (isDirectory(url)) {
        const dir = await ensureAppDir(url, cfg)
        const latest = await pickLatestBackupFile(dir, cfg)
        if (!latest) throw new Error('未找到备份文件')
        target = latest
    }
    const resp = await requestWithAuth('GET', target, headers, null, cfg)
    if (!resp.ok) {
        throw new Error(`下载失败：HTTP ${resp.status}`)
    }

    const text = await resp.text()
    return text
}

const pickLatestBackupFile = async (dirUrl: string, cfg: WebDAVConfig): Promise<string | null> => {
    const resp = await requestWithAuth('PROPFIND', dirUrl, { Depth: '1' }, null, cfg)
    if (!resp.ok) return null
    const xml = await resp.text()
    try {
        const doc = new DOMParser().parseFromString(xml, 'application/xml')
        const all = Array.from(doc.getElementsByTagName('*'))
        const responses = all.filter(el => el.localName === 'response')
        const files: { href: string; name: string }[] = []
        for (const r of responses) {
            const hrefEl = Array.from(r.getElementsByTagName('*')).find(el => el.localName === 'href') as Element | undefined
            if (!hrefEl || !hrefEl.textContent) continue
            const href = hrefEl.textContent
            let name = ''
            try { name = new URL(href, dirUrl).pathname.split('/').filter(Boolean).pop() || '' } catch { name = href.split('/').filter(Boolean).pop() || '' }
            if (/^backup_\d{14}\.json$/.test(name)) {
                const full = (() => { try { return new URL(href, dirUrl).toString() } catch { return dirUrl + name } })()
                files.push({ href: full, name })
            }
        }
        if (files.length === 0) return null
        files.sort((a, b) => (a.name > b.name ? -1 : a.name < b.name ? 1 : 0))
        return files[0].href
    } catch {
        return null
    }
}

export async function restoreFromWebDAV(cfg: WebDAVConfig, options?: { allowInsecure?: boolean }): Promise<void> {
    const json = await downloadBackupFromWebDAV(cfg, options)
    await importSettingsFromJson(json)
}
