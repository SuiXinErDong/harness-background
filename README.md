# harness-background

DeepSeek Harness（Web GUI）的会话背景插件：选择一张**本地图片**或**网络图片**，显示在会话界面上，可调节**透明度**、**按比例缩放**、**对齐方式**（居中/贴边/贴角），以及**适配方式**（填充 / 完整显示）。

![install](https://img.shields.io/badge/install-3%20steps-brightgreen) ![build](https://img.shields.io/badge/build-none-blue) ![license](https://img.shields.io/badge/license-MIT-green)

## 功能

| 设置项 | 说明 |
| --- | --- |
| 图片来源 | 本机文件（自动压缩）或 http(s) URL |
| 透明度 | 0%–100% 滑块，实时生效 |
| 适配方式 | 填充（整图拉伸填满背景、不裁剪，宽高比不同时会变形）/ 完整显示（整图按比例可见） |
| 缩放 | 25%–400% 按比例整体缩放，不会变形（以对齐点为锚；两种模式均可双向缩放） |
| 对齐 | 3×3 对齐面板：居中 / 靠左 / 靠右 / 靠上 / 靠下 / 四角 |

- 图片和设置保存在**浏览器 localStorage**（`harness-background.v1`），刷新页面、重启 Harness 后依然生效。
- 本地图片会自动压缩（长边 ≤ 1920px）后保存，避免存储空间占用过大。
- 渲染层使用框架自带的 `shell.overlay` 座位（点击穿透），不会挡住任何交互。

## 即装即用（三步）

1. **下载**：Clone 本仓库，或下载 Releases 里的 zip 并解压；
2. **安装**：在仓库根目录运行

   ```powershell
   powershell -ExecutionPolicy Bypass -File .\install.ps1
   ```

   > 脚本会把插件复制到 `$DSH_HOME/profiles/node_modules/harness-background`（默认 `C:\Users\<你>\.dsh\...`），并在 `profiles\web\cordis.patch.yml` 追加加载条目（幂等，可重复运行）。
3. **重启 Harness**（停止 `dsh web` 再重新启动），刷新页面 → 设置（左下角齿轮）→ **会话背景**。

> 说明：新增插件需要宿主机重启才会进入 cordis 加载器和浏览器启动清单（`window.__DSH_BOOT__`），仅刷新页面不够。

## 使用

1. 设置 → **会话背景**；
2. “本地图片”选择文件，或“网络图片”粘贴 URL 后点“应用”；
3. 拖动“透明度”滑块，选择“填充 / 完整显示”；
4. 拖动“缩放”滑块按比例放大/缩小，用“对齐”面板选择居中或贴边/贴角；
5. “移除背景”清除图片，“恢复默认”重置全部选项。

## 卸载

```powershell
powershell -ExecutionPolicy Bypass -File .\uninstall.ps1
```

然后重启 Harness。

## 权限与安全 FAQ

**插件需要什么权限？** 不需要任何特殊权限：

- 纯浏览器端 UI 插件：只注册两个界面槽位（背景层 + 设置页），没有宿主 API 调用，没有浏览器之外的文件访问，不收集任何数据；
- 设置保存在浏览器 localStorage，仅本浏览器可见；
- 本地图片只在你自己的浏览器里读取，**不会上传**；
- 网络图片：粘贴 URL 后由你的浏览器直接加载显示，**该图片服务器会看到你的一次普通图片请求**（与在浏览器打开该 URL 无异）；不想要这种暴露就用本地图片。

**安装脚本的权限提示？** `install.ps1` 需要写入你自己的 `$DSH_HOME` 配置目录（正常安装行为）。下载的 `.ps1` 可能触发 Windows SmartScreen / PowerShell 执行策略提示——你可以先打开脚本审查内容，或用 `-ExecutionPolicy Bypass` 运行。

**为什么不用 Harness 的 settings 系统？** Harness 的 api-proxy 只把硬编码白名单（`WEB_SETTINGS_NAMESPACES`）内的命名空间暴露给浏览器端，第三方插件即使宿主机注册成功，RPC 也会以 `settings-not-exposed` 拒绝读写。所以本插件改用 localStorage——完全自足、零宿主依赖。

**可以审计吗？** 可以。插件**没有构建步骤**，仓库里的 `harness-background/lib/client.js` 就是浏览器实际运行的源码（单文件、约 700 行、零外部依赖，仅使用框架提供的 `react`）。

## 兼容性

- DeepSeek Harness Web UI（`dsh web`），基于框架标准插件机制（`dsh.client` 声明 + `shell.overlay` / `settings.section` 槽位）；
- 不依赖任何内部 API，Harness 更新一般不影响（若槽位契约有变，仓库会跟进）。

## 项目结构

```
harness-background/
  package.json       # dsh.client 声明（browser roster 入口；无 inject 依赖，仅 react）
  lib/index.js       # 宿主机半部：空 apply（纯客户端插件）
  lib/client.js      # 浏览器半部：背景层 + 设置页 + localStorage 存储（即源码，无构建）
install.ps1          # 一键安装（复制到 profile + 追加加载条目）
uninstall.ps1        # 卸载
smoke-test.mjs       # 模块格式 / apply 接线 / 词典一致性测试
render-test.mjs      # 真实 React 渲染 + localStorage 持久化/恢复测试
```

## 开发与测试

```powershell
node smoke-test.mjs    # 模块格式 / apply 接线 / 词典一致性
node render-test.mjs   # 真实 React 渲染 + localStorage 持久化/恢复
```

## License

MIT
