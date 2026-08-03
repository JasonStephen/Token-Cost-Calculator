# Token Cost Calc

本地桌面 Token 成本计算器，使用 Python + PyWebView。

## 启动

```powershell
python -m pip install -r requirements.txt
python app.py
```

数量输入默认使用 M Token（1 M = 100 万 Token）；模型单价以美元 / 每百万 Token 输入。缓存命中、缓外输入和输出的单价都可单独设置，且会保存在窗口的本地存储中。


## GPT-5.6 预设价目

按 OpenAI Standard / Short context 官方价格（美元 / 1M Token）：

| 模型 | 输入 | 缓存命中 | 输出 |
| --- | ---: | ---: | ---: |
| GPT-5.6 Sol | $5.00 | $0.50 | $30.00 |
| GPT-5.6 Luna | $0.20 | $0.02 | $1.20 |
| GPT-5.6 Terra | $2.00 | $0.20 | $12.00 |

来源：<https://developers.openai.com/api/docs/pricing>
