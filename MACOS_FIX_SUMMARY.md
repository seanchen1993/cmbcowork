# macOS 构建错误快速修复指南

## 问题
```
security: SecKeychainItemImport: One or more parameters passed to a function were not valid.
failed to bundle project failed codesign application: failed to run command security import: failed to import keychain certificate
```

## 原因
GitHub Actions macOS 构建中，代码签名证书导入到钥匙链失败。

## 已完成的修复

### ✅ 工作流改进
已在 `.github/workflows/release-macos-aarch64.yml` 中添加了：

1. **显式证书导入步骤** - 在 Tauri 构建前预先导入证书
2. **改进的钥匙链管理** - 创建专用的 `build.keychain-db` 
3. **错误检查** - 验证证书解码和文件有效性
4. **权限配置** - 为代码签名工具授予钥匙链访问权限

### 📄 文档
- `MACOS_CODESIGN_TROUBLESHOOTING.md` - 详细故障排除指南
- `MACOS_BUILD_CHECKLIST.md` - 构建验证检查清单

## 需要验证的项目

### GitHub Secrets（必需）
在仓库设置中检查这些 secrets 是否存在且有效：

| Secret 名称 | 说明 | 格式 |
|----------|------|------|
| `APPLE_CODESIGN_CERT_P12_BASE64` | 签名证书 | Base64 编码的 P12 |
| `APPLE_CODESIGN_CERT_PASSWORD` | 证书密码 | 文本 |
| `APPLE_SIGNING_IDENTITY` | 签名身份 | 例：`Apple Development: user@email.com (TEAM_ID)` |

### GitHub Secrets（可选，用于公证）
- `APPLE_NOTARY_API_KEY_P8_BASE64` - Base64 编码的 AuthKey_*.p8
- `APPLE_NOTARY_API_KEY_ID` - 公证 API 密钥 ID
- `APPLE_NOTARY_API_ISSUER_ID` - 公证 API 颁发者 ID

## 本地测试证书

```bash
# 验证 P12 证书有效性
openssl pkcs12 -in certificate.p12 -password pass:PASSWORD -info -noout
```

## 触发新构建

### 推送标签（推荐）
```bash
git tag v0.11.8
git push origin v0.11.8
```

### 或使用 GitHub CLI
```bash
gh workflow run "Release App" \
  --repo different-ai/openwork \
  -f tag=v0.11.8
```

## 监控进度

```bash
# 查看工作流运行
gh run list --repo different-ai/openwork --workflow "Release App" -L 5

# 查看详细日志
gh run view <run-id> --log --repo different-ai/openwork
```

## 预期结果

构建日志中应该看到这些成功的步骤：
1. ✅ `Import code signing certificate (macOS)` 
2. ✅ `Build + upload (notarized)` 或 `Build + upload`
3. ✅ DMG 和 APP 包上传到 Release

## 常见问题排查

| 问题 | 原因 | 解决方案 |
|------|------|--------|
| `SecKeychainItemImport: One or more parameters...` | 证书密码错误 | 检查 `APPLE_CODESIGN_CERT_PASSWORD` |
| `Failed to decode certificate` | Base64 编码损坏 | 重新编码证书并更新 secret |
| `Keychain import failed` | 证书格式不对 | 确保使用有效的 P12 文件 |
| 只有 macOS 失败 | 正常 | macOS 有特殊的代码签名要求 |

## 相关文件

- 工作流文件：`.github/workflows/release-macos-aarch64.yml`
- 完整指南：`MACOS_CODESIGN_TROUBLESHOOTING.md`
- 检查清单：`MACOS_BUILD_CHECKLIST.md`

---

**最后更新：** 2026-02-04  
**状态：** 修复已实现，等待验证
