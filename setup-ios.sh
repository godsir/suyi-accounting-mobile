#!/bin/bash

# iOS 项目配置脚本
# 用于快速配置iOS打包所需的基本设置

echo "🍎 iOS项目配置脚本"
echo "===================="

# 检查是否在mobile-app目录中
if [ ! -f "capacitor.config.ts" ]; then
    echo "❌ 请在mobile-app目录中运行此脚本"
    exit 1
fi

echo "📦 安装依赖..."
npm install

echo "🔧 构建Web应用..."
npm run build

echo "📱 同步iOS项目..."
npx cap sync ios

if command -v pod &> /dev/null; then
    echo "🔗 安装iOS依赖..."
    cd ios/App && pod install && cd ../..
else
    echo "⚠️  CocoaPods未安装，请在macOS上运行以下命令："
    echo "   gem install cocoapods"
    echo "   cd ios/App && pod install"
fi

# 检查Bundle ID配置
echo "🔍 检查Bundle ID配置..."
BUNDLE_ID=$(grep -o 'appId: [^,]*' capacitor.config.ts | cut -d"'" -f2)
echo "   当前Bundle ID: $BUNDLE_ID"

# 检查应用名称
APP_NAME=$(grep -o "appName: '[^']*'" capacitor.config.ts | cut -d"'" -f2)
echo "   应用名称: $APP_NAME"

# 检查版本号
VERSION=$(node -p "require('./package.json').version")
echo "   版本号: $VERSION"

echo ""
echo "✅ 基本配置完成！"
echo ""
echo "📋 下一步操作："
echo "1. 确保有Apple Developer账户"
echo "2. 在App Store Connect中创建应用"
echo "3. 配置GitHub Secrets（详见docs/iOS-BUILD-GUIDE.md）"
echo "4. 运行GitHub Actions进行自动打包"
echo ""
echo "🚀 快速测试构建："
echo "   前往GitHub仓库 → Actions → 'iOS Build Test' → Run workflow"