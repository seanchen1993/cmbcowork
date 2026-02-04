# macOS 构建修复检查清单

## 对工作流的改进

### ✅ 已完成的修改

1. **新增显式证书导入步骤**
   - 添加了 `Import code signing certificate (macOS)` 步骤（第 347-393 行）
   - 添加了 `Import code signing certificate (macOS non-notarized)` 步骤（第 429-465 行）
   - 在 Tauri Action 运行之前进行证书导入，确保钥匙链正确配置

2. **改进的钥匙链管理**
   - 明确创建新的钥匙链（`build.keychain-db`）
   - 设置钥匙链超时时间为 3600 秒
   - 解锁钥匙链以准备导入
   - 设置为默认钥匙链

3. **错误检查和验证**
   - 验证证书是否成功解码为有效的二进制文件
   - 添加了 `-A` 标志（允许使用）和正确的 `-f pkcs12` 格式
   - 为代码签名工具明确授予钥匙链访问权限

4. **创建故障排除指南**
   - 详细的 `MACOS_CODESIGN_TROUBLESHOOTING.md` 文档
   - 包含常见问题、解决方案和调试技巧

---

## 需要验证的项目（GitHub Settings）

### GitHub Secrets 检查清单

在 GitHub 仓库设置中验证以下 secrets 存在且有效：

- [ ] `APPLE_CODESIGN_CERT_P12_BASE64`
  - 应该是 Base64 编码的 P12 证书
  - 大小通常 > 1KB
  - 来源：Apple Developer Account

- [ ] `APPLE_CODESIGN_CERT_PASSWORD`
  - 创建 P12 时设置的密码
  - 不应该为空
  - 确保没有意外的空格或特殊字符

- [ ] `APPLE_SIGNING_IDENTITY`
  - 格式示例：`Apple Development: your@email.com (TEAM_ID)`
  - 或 `Apple Distribution: Company Name (TEAM_ID)`
  - 必须与证书匹配

- [ ] `TAURI_SIGNING_PRIVATE_KEY`
  - 用于应用更新签名

- [ ] `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
  - 对应的私钥密码

### 可选的 Secrets（notarization）

- [ ] `APPLE_NOTARY_API_KEY_P8_BASE64`
  - 用于 Apple 公证
  - Base64 编码的 AuthKey_*.p8 文件

- [ ] `APPLE_NOTARY_API_KEY_ID`
  - 公证 API 密钥 ID

- [ ] `APPLE_NOTARY_API_ISSUER_ID`
  - 公证 API 颁发者 ID

---

## 本地验证步骤

### 1. 验证 P12 证书有效性

```bash
# 检查 P12 文件是否有效（需要在 macOS 上）
openssl pkcs12 -in your-certificate.p12 -password pass:YOUR_PASSWORD -info -noout

# 输出应包含：
# - Certificate data 部分
# - 一个 RSA 私钥
# - 证书链信息
```

### 2. 在 Keychain 中导入测试

```bash
# 创建临时钥匙链
security create-keychain -p temppass /tmp/test.keychain-db
security unlock-keychain -p temppass /tmp/test.keychain-db

# 导入证书
security import your-certificate.p12 \
  -P YOUR_PASSWORD \
  -A \
  -t cert \
  -f pkcs12 \
  -k /tmp/test.keychain-db

# 查看导入的证书
security find-certificate -k /tmp/test.keychain-db

# 清理
security delete-keychain /tmp/test.keychain-db
```

### 3. 检查 App ID 和 Provisioning Profile

```bash
# 列出可用的开发证书
security find-certificate -c "Apple Development" -a -p

# 应该看到匹配的证书
```

---

## 触发构建

### 方式 1：推送 Git 标签（推荐）

```bash
# 1. 确保 main 分支已推送
git push origin main

# 2. 创建新版本标签
git tag v0.11.8
git push origin v0.11.8

# 这将自动触发 Release App 工作流
```

### 方式 2：使用 GitHub CLI（Workflow Dispatch）

```bash
# 手动触发工作流
gh workflow run "Release App" \
  --repo different-ai/openwork \
  -f tag=v0.11.8 \
  -f notarize=true
```

---

## 监控构建

### 查看工作流运行

```bash
# 列出最近的运行
gh run list --repo different-ai/openwork --workflow "Release App" --limit 10

# 查看特定运行的详细日志
gh run view <run-id> --log --repo different-ai/openwork
```

### 关键日志检查点

构建日志中应该看到这些成功的步骤：

1. ✅ `Import code signing certificate (macOS)` - 证书导入成功
2. ✅ `Build + upload (notarized)` 或 `Build + upload` - Tauri 构建成功
3. ✅ 上传 DMG 和 APP 包到 Release

---

## 预期的工作流行为

### 对于 Notarized 构建（macOS）

```
1. Set release metadata
2. Enable git long paths (Windows)
3. Checkout
4. Setup Node
5. Setup pnpm
6. Setup Bun
7. Install dependencies
8. (Skip for macOS)
9. Setup Rust
10. Download OpenCode sidecar
11. Write notary API key
12. Import code signing certificate (macOS)    ← 新步骤
13. Build + upload (notarized)                  ← 使用已配置的钥匙链
```

### 对于非 Notarized 构建

```
...（步骤 1-10 相同）
11. Import code signing certificate (macOS non-notarized)  ← 新步骤
12. Build + upload                                         ← 使用已配置的钥匙链
```

---

## 故障排除

### 如果 macOS 构建仍然失败

1. 检查日志中 `Import code signing certificate` 步骤的输出
2. 查看详细的 Tauri 构建输出（有 `-vvv` 标志）
3. 运行本地验证步骤确认证书有效
4. 检查 GitHub Secrets 是否正确设置

### 如果出现 "Invalid parameters"

这通常表示：
- 证书 Base64 编码损坏
- P12 密码不正确
- P12 文件格式不对

### 如果出现 "Keychain import failed"

这通常表示：
- 钥匙链权限问题
- 证书格式不兼容
- 密码包含特殊字符未正确处理

---

## 测试完成后

构建成功后，验证：

```bash
# 获取发布信息
gh release view v0.11.8 --repo different-ai/openwork

# 下载 DMG 并验证签名
spctl -a -vv openwork-desktop-macos-aarch64.dmg

# 应该显示 "valid on disk"
```

---

## 参考资源

- [Tauri 官方构建指南](https://tauri.app/v1/guides/distribution/sign-macos)
- [Apple 开发者证书管理](https://developer.apple.com/support/certificates/)
- [GitHub Actions macOS Runner](https://github.com/actions/runner-images/blob/main/images/macos/macos-14-Readme.md)

