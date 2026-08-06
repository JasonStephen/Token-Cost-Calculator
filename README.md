# Token Cost Calc

Token Cost Calc 是一个基于 Python + PyWebView 的本地桌面工具，用于估算和比较不同 AI 模型的 Token 成本。

## 功能

- 结构反推：根据输入、输出和缓存 Token 估算占比。
- 横向对比：比较多个模型的价格和预计开支。
- Token 转价格：根据 Token 用量计算成本。
- 价格转 Token：根据预算反推可使用的 Token 数量。
- 模型管理：同步模型、启用模型、添加自定义模型和设置自定义价格。
- 支持 USD / CNY、简体中文 / 繁体中文 / English，以及系统主题、浅色主题和深色主题。

## 运行

环境要求：Windows、Python 3 和可用的 `python` 命令。

```powershell
python -m pip install -r requirements.txt
.\start.bat
```

也可以直接运行：

```powershell
python app.py
```

`start.bat` 会检查依赖，并使用 `pythonw.exe` 启动桌面应用。需要调试时，可手动运行 `python app.py --devtools`。

## 模型价格

首次启动时，应用会尝试从 LiteLLM 的原始 JSON 获取模型价格；网络不可用时使用本地缓存和内置的 GPT-5.6 Sol、GPT-5.6 Terra、GPT-5.6 Luna 价格。

同步模型默认处于禁用状态，需要在“设置 > 模型管理”中手动启用。联网同步的模型不能删除，只有自定义添加的模型可以删除。价格单位为 USD / 1M Token。

## 数据与隐私

应用状态和价格缓存保存在本地，不会主动上传用户输入的模型、价格或计算数据。模型价格来源：

- [LiteLLM model prices](https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json)
- [Lobe Icons](https://github.com/lobehub/lobe-icons)

项目内使用的图标已保存到本地，第三方资源仍遵循其原始许可证和署名要求。

## 许可证

本项目代码采用 [Apache License 2.0](LICENSE) 发布。

第三方数据、图标和其他资源不由本项目重新授权，请以各自仓库中的许可证和说明为准。

## 作者

- [GitHub](https://github.com/JasonStephen)
- [Bilibili](https://space.bilibili.com/39750208)
- [YouTube](https://www.youtube.com/@stephenjason280)
