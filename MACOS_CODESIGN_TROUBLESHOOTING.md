# macOS 代码签名错误排查指南

## 错误信息
```
security: SecKeychainItemImport: One or more parameters passed to a function were not valid.
failed to bundle project failed codesign application: failed to run command security import: failed to import keychain certificate
```

## 根本原因分析

此错误发生在 Tauri/macOS 应用构建过程中，当 GitHub Actions 尝试导入代码签名证书到钥匙链时失败。

### 可能的原因

1. **证书密码为空或包含特殊字符**
   - `APPLE_CODESIGN_CERT_PASSWORD` 没有正确设置
   - 密码包含需要转义的特殊字符

2. **P12 证书格式问题**
   - Base64 编码的证书损坏
   - 证书不是有效的 PKCS#12 格式
   - 证书已过期

3. **钥匙链初始化失败**
   - 临时钥匙链创建失败
   - 钥匙链权限不足

4. **Tauri 工作流配置问题**
   - 使用了过时的 Tauri Action 版本

## 解决方案

### 步骤 1：验证 GitHub Secrets

确保以下 secrets 正确设置（在 GitHub Settings → Secrets and variables → Actions）：

- `APPLE_CODESIGN_CERT_P12_BASE64` - Base64 编码的 P12 证书
- `APPLE_CODESIGN_CERT_PASSWORD` - 证书密码
- `APPLE_SIGNING_IDENTITY` - 签名身份（例如：`Apple Development: your@email.com (TEAM_ID)`）

**检查清单：**
```bash
# 本地验证证书（如有访问权限）
# 1. 检查证书有效性
security find-certificate -c "Apple Development" -p | openssl x509 -text -noout | grep -A 2 "Validity"

# 2. 检查 P12 文件有效性
openssl pkcs12 -in certificate.p12 -password pass:YOUR_PASSWORD -info -noout
```

### 步骤 2：改进的工作流配置

已在 `.github/workflows/release-macos-aarch64.yml` 中添加了以下改进：

1. **显式证书导入步骤** - 在 Tauri Action 之前预先导入证书
2. **错误处理** - 验证证书解码成功
3. **钥匙链管理** - 明确创建、配置和设置默认钥匙链
4. **权限设置** - 为代码签名工具授予钥匙链访问权限

### 步骤 3：重新生成证书（如需要）

如果证书已过期或损坏，需要重新生成：

```bash
# 1. 在 macOS 本地使用 Keychain Access 或 Xcode
#    - 登录 Apple Developer Account
#    - 创建新的 Development Certificate
#    - 下载 P12 格式

# 2. 编码为 Base64
base64 -i certificate.p12 -o certificate.p12.base64

# 3. 在 GitHub Secrets 中更新：
#    APPLE_CODESIGN_CERT_P12_BASE64 = 文件内容
#    APPLE_CODESIGN_CERT_PASSWORD = 证书密码
```

### 步骤 4：调试技巧

如果问题仍然存在，可以在工作流中添加调试步骤：

```yaml
- name: Debug certificate (for troubleshooting)
  if: matrix.os_type == 'macos'
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CODESIGN_CERT_P12_BASE64 }}
  run: |
    set -euo pipefail
    
    # 检查证书是否能正确解码
    CERT_PATH="$(mktemp).p12"
    echo "$APPLE_CERTIFICATE" | base64 --decode > "$CERT_PATH"
    
    # 验证文件类型
    file "$CERT_PATH"
    
    # 检查文件大小（有效的 P12 通常 > 1KB）
    ls -lh "$CERT_PATH"
    
    # 尝试读取证书信息（需要密码）
    openssl pkcs12 -in "$CERT_PATH" -password pass:$APPLE_CODESIGN_CERT_PASSWORD -info -noout || true
    
    rm -f "$CERT_PATH"
```

### 步骤 5：使用 macOS 14+ 特定的 Runner

工作流已配置为使用 `macos-14`，这是推荐的：

- ✅ 使用 `macos-14` （Sonoma）
- ⚠️ 避免使用 `macos-latest` （可能不稳定）
- ❌ 不要使用 `macos-13` 或更早版本

## 常见问题

### Q: 如何知道证书是否正确？
A: 在本地 macOS 机器上验证：
```bash
openssl pkcs12 -in your-cert.p12 -password pass:YOUR_PASSWORD -info -noout
```
输出应该显示证书链和密钥信息。

### Q: 密码包含特殊字符怎么办？
A: 在 GitHub Secrets 中直接设置密码字符串（不需要转义），工作流会正确处理。

### Q: 如何重试失败的构建？
A: 使用 GitHub CLI：
```bash
gh workflow run "Release App" --repo different-ai/openwork -f tag=v0.11.7
```

### Q: 为什么只有 macOS 构建失败？
A: 这是 macOS 特有的代码签名要求。其他平台有不同的签名机制。

## 相关资源

- [Tauri macOS 签名文档](https://tauri.app/v1/guides/distribution/sign-macos)
- [Apple 证书管理](https://developer.apple.com/support/certificates/)
- [macOS 钥匙链命令参考](https://support.apple.com/guide/keychain-access/change-keychain-settings-kyca1146/mac)

## 后续步骤

1. 确认所有 GitHub Secrets 都已正确设置
2. 在 main 分支推送一个新的 v* 标签来触发构建
3. 监控 GitHub Actions 日志以查看证书导入步骤是否成功
4. 如果仍有问题，启用调试步骤并检查输出

