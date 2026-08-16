# harness-background

DeepSeek Harness（Web GUI）的会话背景插件：选择一张**本地图片**或**网络图片**，显示在会话界面上，可调节**透明度**，并按**宽度/高度自适应**（填充裁剪或完整显示）。

- 图片和设置保存在**浏览器 localStorage**（`harness-background.v1`），刷新页面、重启 Harness 后依然生效。
- 本地图片会自动压缩（长边 ≤ 1920px）后保存，避免存储空间占用过大。
- 渲染层使用框架自带的 `shell.overlay` 座位（点击穿透），不会挡住任何交互。

## 为什么不用 Harness 的 settings 系统？

Harness 的 api-proxy（`dsh-host-apiproxy`）只把**硬编码白名单**（`WEB_SETTINGS_NAMESPACES`：agent-loop、shell、locale、permission、ui-conversation、ui-theme、web-search-deepseek 等）内的设置命名空间暴露给浏览器端。第三方插件即使宿主机侧注册成功，RPC 也会以 `settings-not-exposed` 拒绝读写（这是核心包的刻意设计："a future registration does not become remotely readable or writable by default"）。给核心包打补丁会在每次 Harness 更新后丢失，所以本插件改用 localStorage——完全自足、零宿主依赖、即时同步写入。

## 效果

| 设置项 | 说明 |
| --- | --- |
| 图片来源 | 本机文件（自动压缩）或 http(s) URL |
| 透明度 | 0%–100% 滑块，实时生效 |
| 适配方式 | 填充（整图拉伸填满背景、不裁剪，宽高比不同时会变形）/ 完整显示（整图按比例可见） |
| 缩放 | 25%–400% 按比例整体缩放，不会变形（以对齐点为锚；两种模式均可双向缩放） |
| 对齐 | 3×3 对齐面板：居中 / 靠左 / 靠右 / 靠上 / 靠下 / 四角 |

背景图片会叠加在整个会话窗口之上（含侧边栏），通过透明度调节让界面保持可读；默认透明度 35%。

## 安装

### 一键安装（推荐）

在仓库根目录运行：

```powershell
.\install.ps1
```

脚本会：
1. 把 `harness-background` 包复制到 `$DSH_HOME/profiles/node_modules/`（默认 `C:\Users\<你>\.dsh\profiles\node_modules`）；
2. 在 `$DSH_HOME/profiles/web/cordis.patch.yml` 中追加加载条目（幂等，重复运行安全）。

然后**重启 Harness**（停止 `dsh web` 再重新启动），刷新页面后生效。

> 说明：新增插件需要宿主机重启才会进入 cordis 加载器和浏览器启动清单（`window.__DSH_BOOT__`），仅刷新页面不够。插件代码本身的更新（如本仓库内的 `lib/client.js` 改动）只需重新运行 `install.ps1` 并刷新页面。

### 手动安装

```powershell
# 1. 复制包
Copy-Item .\harness-background "$env:USERPROFILE\.dsh\profiles\node_modules\harness-background" -Recurse

# 2. 在 profiles\web\cordis.patch.yml 末尾追加（若文件是 `[]` 则整体替换为下面内容）
- insert:
    - id: harness-background
      name: 'harness-background'
```

### 用 pnpm 安装（标准方式，需要 PATH 中有 pnpm）

```powershell
dsh plugin --profile web add "file:$PWD\harness-background"   # 或 link:
```

## 使用

1. 打开设置（左下角齿轮）→ **会话背景**；
2. “本地图片”选择文件，或“网络图片”粘贴 URL 后点“应用”；
3. 拖动“透明度”滑块，选择“填充 / 完整显示”；
4. 拖动“缩放”滑块按比例放大/缩小，用“对齐”面板选择居中或贴边/贴角；
5. “移除背景”清除图片，“恢复默认”重置透明度、适配方式、缩放与对齐。
## 卸载

```powershell
.\uninstall.ps1
```

或手动：删除 `profiles\node_modules\harness-background`，并从 `profiles\web\cordis.patch.yml` 移除对应条目，然后重启 Harness。

## 结构

```
harness-background/
  package.json       # dsh.client 声明（browser roster 入口；无 inject 依赖，仅 react）
  lib/index.js       # 宿主机半部：空 apply（见上方"为什么不用 settings"）
  lib/client.js      # 浏览器半部：shell.overlay 背景层 + settings.section 设置页 + localStorage 存储
```

`lib/client.js` 是手写的、符合 Harness 客户端模块格式（`window.__ModuleLoader__.load`）的单一文件，除 `react`（由 shell 提供）外不依赖其他运行时模块，**无需构建步骤**。若以后要改为 TypeScript + tsdown 构建，参考 `@deepseek-ai/dsh-client-ui-*` 包的 `bundle` 脚本。

## 存储字段（localStorage `harness-background.v1`）

| 字段 | 类型 | 默认 | 说明 |
| --- | --- | --- | --- |
| `image` | string | 无 | 背景图片：http(s) URL 或 data URL；缺省 = 无背景 |
| `opacity` | number (0–1) | `0.35` | 透明度 |
| `fit` | `stretch` \| `contain` | `stretch` | 适配方式：stretch = 整图拉伸填满（旧版 `cover` 值自动迁移为 `stretch`）；contain = 整图按比例完整显示 |
| `scale` | number (0.25–4) | `1` | 按比例缩放（100% = 原始适配尺寸） |
| `align` | 9 个位置之一 | `center` | 对齐：center/left/right/top/bottom/topleft/topright/bottomleft/bottomright |

## 测试

```powershell
node smoke-test.mjs    # 模块格式 / apply 接线 / 词典一致性
node render-test.mjs   # 真实 React 渲染 + localStorage 持久化/恢复
```
