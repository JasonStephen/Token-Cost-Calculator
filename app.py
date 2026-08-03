"""TokenCostCalc - a local desktop token-cost calculator."""

from __future__ import annotations

import json
from pathlib import Path

import webview


HTML = r'''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Token Cost Calc</title>
  <style>
    :root {
      --ink: #111111;
      --paper: #faf9f5;
      --white: #ffffff;
      --muted: #6e6a63;
      --line: #171717;
      --soft-line: #cfcac0;
      --yellow: #ffe54d;
      --blue: #a8e9ff;
      --pink: #ffb6cc;
      --green: #c5ee82;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-width: 320px;
      color: var(--ink);
      background-color: var(--paper);
      background-image: radial-gradient(#dedbd4 0.65px, transparent 0.65px);
      background-size: 7px 7px;
      font-family: "Comic Sans MS", "KaiTi", "STKaiti", cursive;
    }
    button, input, select { font: inherit; color: inherit; }
    button { cursor: pointer; }
    .app { max-width: 1440px; margin: 0 auto; padding: 30px 34px 42px; }
    .masthead { display:flex; align-items:flex-start; justify-content:space-between; gap:24px; margin-bottom: 30px; }
    .title-wrap { position:relative; }
    h1 { margin:0; font-family: inherit; font-size: 38px; line-height:1; letter-spacing: 0; transform: rotate(-1deg); }
    .subtitle { margin: 9px 0 0; color:var(--muted); font-size:14px; }
    .scribble { position:absolute; width:112px; height:16px; bottom:-14px; left:2px; border-top:3px solid var(--ink); border-radius:50%; transform:rotate(-2deg); }
    .scribble::after { content:""; position:absolute; width:96px; height:12px; top:1px; left:10px; border-top:2px solid var(--ink); border-radius:50%; transform:rotate(4deg); }
    .top-actions { display:flex; align-items:center; gap:10px; }
    .currency-control { display:flex; align-items:center; gap:8px; font-weight:700; font-size:13px; }
    select, input { border:2px solid var(--line); background:var(--white); border-radius:3px; outline:none; }
    select:focus, input:focus { box-shadow: 3px 3px 0 var(--yellow); }
    select { padding:7px 28px 7px 9px; }
    .icon-btn, .add-btn, .text-btn { border:2px solid var(--line); background:var(--white); box-shadow: 3px 3px 0 var(--ink); border-radius:3px; font-weight:800; }
    .icon-btn { width:37px; height:35px; font-size:20px; line-height:1; }
    .add-btn { padding:8px 14px; }
    .text-btn { padding:7px 10px; font-size:13px; }
    button:active { transform:translate(2px,2px); box-shadow:1px 1px 0 var(--ink); }
    .section { margin-top:25px; }
    .section-heading { display:flex; align-items:center; justify-content:space-between; margin:0 0 10px; }
    .section-heading h2 { margin:0; font-size:16px; line-height:1; }
    .section-heading h2 span { display:inline-block; margin-left:7px; font-size:11px; font-weight:500; color:var(--muted); }
    .panel { border: 2px solid var(--line); background:rgba(255,255,255,.88); box-shadow: 5px 5px 0 var(--ink); }
    .method-grid { display:grid; grid-template-columns: 1.04fr 1.5fr; gap:16px; }
    .method-card { padding:18px; }
    .method-card h3 { margin:0 0 15px; font-size:16px; }
    .fields { display:grid; grid-template-columns: repeat(3, 1fr); gap:10px; }
    .field { min-width:0; }
    label { display:block; margin-bottom:5px; font-size:12px; font-weight:800; }
    .unit-input { display:flex; align-items:center; }
    .unit-input input { width:100%; min-width:0; padding:9px 8px; font-weight:700; }
    .unit-input span { margin-left:-44px; width:39px; color:var(--muted); font-size:11px; pointer-events:none; }
    .result-strip { display:grid; grid-template-columns: 1fr 1fr; gap:11px; margin-top:17px; }
    .metric { position:relative; min-height:76px; padding:12px; border:2px dashed var(--line); background:var(--yellow); transform:rotate(-.5deg); }
    .metric:nth-child(2) { background:var(--blue); transform:rotate(.5deg); }
    .metric .label { color:#343434; font-size:11px; font-weight:800; }
    .metric strong { display:block; margin-top:6px; font-family: inherit; font-size:21px; }
    .formula { margin-top:12px; color:var(--muted); font-size:11px; line-height:1.5; }
    .settings { display:flex; gap:12px; align-items:flex-end; padding:13px 16px; }
    .settings .field { width:130px; }
    .settings .field:first-child { width:230px; }
    .settings input { width:100%; padding:8px; font-weight:700; }
    .price-note { font-size:11px; line-height:1.5; color:var(--muted); padding-bottom:4px; max-width:500px; }
    .comparison-scroll { overflow-x:auto; padding:2px 0 10px; scrollbar-width:thin; scrollbar-color:var(--ink) var(--paper); }
    .comparison-scroll::-webkit-scrollbar { height:11px; width:0; }
    .comparison-scroll::-webkit-scrollbar-track { border:2px solid var(--line); background:var(--white); }
    .comparison-scroll::-webkit-scrollbar-thumb { border:2px solid var(--white); background:var(--ink); }
    .comparison-scroll::-webkit-scrollbar-button { display:none; width:0; height:0; }
    .comparison { min-width:0; width:max-content; display:grid; grid-template-columns:165px repeat(var(--cols), 178px); border-top:2px solid var(--line); border-left:2px solid var(--line); }
    .cell { min-height:47px; padding:9px 10px; border-right:2px solid var(--line); border-bottom:2px solid var(--line); background:rgba(255,255,255,.85); display:flex; align-items:center; }
    .label-cell { background:#ededeb; font-weight:800; font-size:12px; }
    .model-head { min-height:70px; align-items:flex-start; justify-content:space-between; gap:7px; background:var(--yellow); }
    .model-head:nth-child(3n+1) { background:var(--blue); }
    .model-head:nth-child(3n+2) { background:var(--pink); }
    .model-name { width:100%; padding:7px; background:transparent; border:0; border-bottom:2px solid var(--ink); border-radius:0; font-size:15px; font-weight:900; }
    .model-name:focus { box-shadow:none; background:var(--white); }
    .close { flex: 0 0 auto; border:0; padding:0; background:transparent; font-size:20px; line-height:1; }
    .price-input { width:100%; padding:6px; font-family:inherit; font-size:13px; font-weight:700; }
    .money { width:100%; font-family:inherit; font-size:13px; font-weight:900; }
    .money.big { font-size:16px; }
    .hint { margin:5px 0 0; font-size:11px; color:var(--muted); }
    .scenario { margin-top:21px; }
    .section-actions { display:flex; align-items:center; gap:10px; }
    .model-filter { position:relative; display:inline-block; }
    .model-picker { position:relative; }
    .model-picker summary { display:flex; align-items:center; gap:8px; min-height:34px; padding:6px 9px; border:2px solid var(--line); background:var(--white); box-shadow:3px 3px 0 var(--ink); cursor:pointer; list-style:none; font-size:12px; font-weight:800; }
    .model-picker summary::-webkit-details-marker { display:none; }
    .model-picker summary::after { content:'▾'; font-size:14px; }
    .model-picker[open] summary::after { content:'▴'; }
    .model-picker-count { color:var(--muted); font-weight:700; }
    .model-options { position:absolute; z-index:5; top:calc(100% + 6px); left:0; min-width:245px; padding:9px 11px; border:2px solid var(--line); background:var(--white); box-shadow:4px 4px 0 var(--ink); }
    .model-options .check-label { margin:7px 0; }
    .check-label { display:flex; align-items:center; gap:5px; white-space:nowrap; }
    .check-label input { width:15px; height:15px; accent-color:var(--yellow); }
    .scenario-config { display:grid; grid-template-columns:repeat(4, minmax(145px, 1fr)); gap:11px; padding:14px 16px; margin-bottom:15px; }
    .scenario-setting { min-width:0; }
    .scenario-setting-title { display:flex; justify-content:space-between; align-items:center; gap:6px; margin-bottom:5px; font-size:12px; font-weight:800; }
    .scenario-setting-title .check-label { font-size:10px; font-weight:700; color:var(--muted); }
    .scenario-setting input[type="number"] { width:100%; padding:9px; font-weight:800; }
    .per-row-note { margin:10px 0 0; color:var(--muted); font-size:11px; }
    .scenario-panel { padding:0; overflow:hidden; }
    .scenario-scroll { overflow-x:auto; }
    .scenario-table { min-width:760px; display:grid; grid-template-columns:72px; border-top:2px solid var(--line); border-left:2px solid var(--line); }
    .scenario-cell { min-height:78px; padding:10px; border-right:2px solid var(--line); border-bottom:2px solid var(--line); background:var(--white); }
    .scenario-head { min-height:43px; display:flex; align-items:center; background:#ededeb; font-size:12px; font-weight:900; }
    .scenario-head.model { background:var(--blue); }
    .scenario-cell label { margin-bottom:6px; }
    .scenario-input { width:100%; padding:8px; font-weight:800; }
    .scenario-name { width:calc(100% - 26px); padding:8px; font-weight:900; }
    .scenario-number { display:flex; align-items:flex-start; justify-content:center; gap:7px; font-size:17px; font-weight:900; }
    .scenario-remove { border:0; background:transparent; font-size:20px; line-height:1; }
    .scenario-result { background:#effaff; }
    .scenario-result strong { display:block; font-size:12px; }
    .scenario-result span { display:block; margin-top:7px; font-size:17px; font-weight:900; }
    .scenario-result em { display:block; margin-top:6px; color:#3d3d3d; font-size:11px; font-style:normal; }    .legend { margin-top:19px; padding:11px 14px; border-left:4px solid var(--ink); background:rgba(255,255,255,.63); color:var(--muted); font-size:11px; line-height:1.65; }
    .foot { margin:25px 0 0; color:var(--muted); font-size:11px; text-align:right; }
    .confirm-dialog { width:min(390px, calc(100vw - 32px)); padding:0; border:2px solid var(--line); background:var(--white); box-shadow:6px 6px 0 var(--ink); }
    .confirm-dialog::backdrop { background:rgba(17,17,17,.36); }
    .confirm-dialog form { padding:20px; }
    .confirm-dialog h3 { margin:0 0 10px; font-size:18px; }
    .confirm-dialog p { margin:0; color:var(--muted); font-size:13px; line-height:1.55; }
    .confirm-dialog-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:19px; }
    .danger-btn { border:2px solid var(--line); background:var(--pink); box-shadow:3px 3px 0 var(--ink); border-radius:3px; padding:7px 10px; font-weight:800; }
    @media (max-width: 1060px) { .app{padding:22px} .method-grid{grid-template-columns:1fr} .scenario-config{grid-template-columns:repeat(2, minmax(160px, 1fr))} }
    .collapsible-section.collapsed > :not(.section-heading) { display:none; }
    .section-toggle { width:31px; height:31px; font-size:16px; }
    .fields.two { grid-template-columns:repeat(2, 1fr); }
    .comparison-settings { display:flex; gap:12px; align-items:flex-end; padding:13px 16px; margin-bottom:15px; }
    .comparison-settings .field { width:170px; }
    .comparison-settings input { width:100%; padding:8px; font-weight:700; }    @keyframes section-enter {
      from { opacity:0; transform:translateY(8px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes panel-enter {
      from { opacity:0; transform:translateY(5px); }
      to { opacity:1; transform:translateY(0); }
    }
    @media (prefers-reduced-motion: no-preference) {
      .collapsible-section { animation:section-enter .36s ease both; }
      .panel, .comparison-scroll { animation:panel-enter .28s ease both; }
      .section-toggle, .model-picker summary, .scenario-result { transition:transform .18s ease, box-shadow .18s ease, background-color .18s ease; }
      .collapsible-section.collapsed .section-toggle { transform:rotate(180deg); }
      .scenario-result:hover { transform:translateY(-2px); box-shadow:0 3px 0 rgba(17,17,17,.18); }
      .model-picker summary:hover { transform:translateY(-1px); }
    }
    @media (max-width: 740px) {
      body { min-width:0; }
      .app { padding:20px 16px 30px; }
      .masthead { flex-direction:column; gap:18px; margin-bottom:24px; }
      .top-actions { width:100%; justify-content:space-between; }
      .section-heading { align-items:flex-start; flex-direction:column; gap:10px; }
      .section-heading h2 { line-height:1.35; }
      .section-heading h2 span { display:block; margin:5px 0 0; }
      .section-actions { width:100%; flex-wrap:wrap; justify-content:flex-start; }
      .comparison-settings { display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); padding:12px; }
      .comparison-settings .field { width:auto; }
      .method-card { padding:15px; }
      .panel { box-shadow:4px 4px 0 var(--ink); }
      .comparison { min-width:max-content; }
      .scenario-table { min-width:640px; }
      .model-options { left:auto; right:0; min-width:220px; }
    }
    @media (max-width: 440px) {
      .app { padding:16px 12px 26px; }
      h1 { font-size:30px; }
      .subtitle { font-size:13px; }
      .top-actions { align-items:flex-start; flex-direction:column; }
      .result-strip, .fields, .fields.two, .scenario-config, .comparison-settings { grid-template-columns:1fr; }
      .scenario-config { padding:12px; }
      .metric { min-height:68px; }
      .section-actions { gap:8px; }
      .add-btn { padding:8px 10px; }
      .comparison { min-width:max-content; }
      .scenario-table { min-width:590px; }
    }
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { animation-duration:.01ms !important; animation-iteration-count:1 !important; scroll-behavior:auto !important; transition-duration:.01ms !important; }
    }    .method-card .fields:not(.two) > .field { display:grid; grid-template-rows:36px minmax(0, 1fr); align-items:end; }
    .method-card .fields:not(.two) > .field > label { min-height:36px; margin-bottom:0; display:flex; align-items:flex-start; }
    .structure-unit { display:flex; align-items:center; gap:7px; font-size:12px; font-weight:800; white-space:nowrap; }
    .structure-unit select { min-width:68px; padding:6px 25px 6px 8px; }
    @media (max-width: 440px) {
      .method-card .fields:not(.two) > .field { grid-template-rows:auto; }
      .method-card .fields:not(.two) > .field > label { min-height:0; }
      .structure-unit { width:100%; justify-content:space-between; }
    }  </style>
</head>
<body>
  <main class="app">
    <header class="masthead">
      <div class="title-wrap"><h1>Token Cost Calc</h1><p class="subtitle">把 Token 账算得明明白白。</p><i class="scribble"></i></div>
      <div class="top-actions">
        <label class="currency-control">显示币种 <select id="currency"><option value="USD">USD $</option><option value="CNY">CNY &yen;</option></select></label>
        <button class="icon-btn" id="reset" title="重置为默认值">↺</button>
      </div>
    </header>

    <section class="section collapsible-section">
      <div class="section-heading"><h2>① 结构反推 <span>先填你已有的三项 Token</span></h2><div class="section-actions"><label class="structure-unit">Token 单位<select id="structureUnit"><option value="K">K</option><option value="M">M</option><option value="B">B</option></select></label><button class="icon-btn section-toggle" data-toggle title="折叠此板块" aria-expanded="true">⌃</button></div></div>
      <div class="method-grid">
        <article class="panel method-card">
          <h3>已知 Token 分布</h3>
          <div class="fields">
            <div class="field"><label id="cacheLabel" for="cache">缓存命中（M Token）</label><div class="unit-input"><input id="cache" type="number" min="0" step="0.1"><span id="cacheUnit">M</span></div></div>
            <div class="field"><label id="inputLabel" for="input">输入（缓外，M Token）</label><div class="unit-input"><input id="input" type="number" min="0" step="0.1"><span id="inputUnit">M</span></div></div>
            <div class="field"><label id="outputLabel" for="output">输出（M Token）</label><div class="unit-input"><input id="output" type="number" min="0" step="0.1"><span id="outputUnit">M</span></div></div>
          </div>
          <div class="result-strip">
            <div class="metric"><div class="label">输入 : 输出（含缓存）</div><strong id="ratioOut">--</strong></div>
            <div class="metric"><div class="label">缓存命中率</div><strong id="hitOut">--</strong></div>
          </div>
          <p class="formula">输入 = 缓存命中 + 缓外输入；命中率 = 缓存命中 / 输入。</p>
        </article>
        <article class="panel method-card">
          <h3>已知使用特征</h3>
          <div class="fields two">
            <div class="field"><label for="knownRatio">输入 : 输出</label><div class="unit-input"><input id="knownRatio" type="number" min="0" step="0.1"><span>: 1</span></div></div>
            <div class="field"><label for="knownHit">缓存命中率</label><div class="unit-input"><input id="knownHit" type="number" min="0" max="100" step="0.1"><span>%</span></div></div>
          </div>
          <div class="result-strip">
            <div class="metric"><div class="label">输入占全部 Token</div><strong id="inputShare">--</strong></div>
            <div class="metric"><div class="label">输出占全部 Token</div><strong id="outputShare">--</strong></div>
          </div>
          <p class="formula">第②至④可分别设置输入输出比与缓存命中率；此处用于查看已有使用特征。</p>
        </article>
      </div>
    </section>


    <section class="section collapsible-section">
      <div class="section-heading"><h2>② 横向对比 <span>每个模型可独立设置单价、倍率和美元兑人民币汇率</span></h2><div class="section-actions"><label class="structure-unit">Token 单位<select id="comparisonUnit"><option value="K">K</option><option value="M">M</option><option value="B">B</option></select></label><div class="model-filter" id="comparisonModelFilter"></div><button class="add-btn" id="addModel">＋ 添加模型</button><button class="icon-btn section-toggle" data-toggle title="折叠此板块" aria-expanded="true">⌃</button></div></div>
      <div class="panel scenario-config" id="comparisonConfig"></div>
      <div class="comparison-scroll"><div class="comparison" id="comparison"></div></div>
      <p class="hint">勾选共享后，该字段将应用到所有模型；取消勾选后可为每个模型单独设置。实际费用已乘开支倍率，并同时显示美元与人民币。</p>
    </section>

    <section class="section scenario collapsible-section">
      <div class="section-heading"><h2>③ Token 转价格 <span>按总 Token 估算不同模型的实际开支</span></h2><div class="section-actions"><label class="structure-unit">Token 单位<select id="tokenUnit"><option value="K">K</option><option value="M">M</option><option value="B">B</option></select></label><div class="model-filter" id="tokenModelFilter"></div><button class="add-btn" id="addTokenRow">＋ 添加条目</button><button class="icon-btn section-toggle" data-toggle title="折叠此板块" aria-expanded="true">⌃</button></div></div>
      <div class="panel scenario-config" id="tokenConfig"></div>
      <div class="panel scenario-panel"><div class="scenario-scroll"><div class="scenario-table" id="tokenRows"></div></div></div>
      <p class="hint">勾选共享后，该字段将应用到所有条目；取消勾选后可为每一条单独设置。</p>
    </section>

    <section class="section scenario collapsible-section">
      <div class="section-heading"><h2>④ 价格转 Token <span>按预算估算可使用的总 Token</span></h2><div class="section-actions"><label class="structure-unit">Token 单位<select id="budgetUnit"><option value="K">K</option><option value="M">M</option><option value="B">B</option></select></label><div class="model-filter" id="budgetModelFilter"></div><button class="add-btn" id="addBudgetRow">＋ 添加条目</button><button class="icon-btn section-toggle" data-toggle title="折叠此板块" aria-expanded="true">⌃</button></div></div>
      <div class="panel scenario-config" id="budgetConfig"></div>
      <div class="panel scenario-panel"><div class="scenario-scroll"><div class="scenario-table" id="budgetRows"></div></div></div>
      <p class="hint">勾选共享后，该字段将应用到所有条目；取消勾选后可为每一条单独设置。</p>
    </section>    <p class="legend">注：缓存命中视为输入的一部分。模型价格、汇率和开支倍率均由你控制；计算结果仅包含模型 Token 费用，不含工具调用、税费及其他服务费用。</p>
    <p class="foot">local calculator / saved in token-cost-calc.json</p>
  </main>
  <dialog class="confirm-dialog" id="modelDeleteDialog" aria-labelledby="modelDeleteTitle">
    <form method="dialog">
      <h3 id="modelDeleteTitle">删除模型？</h3>
      <p>将删除 <strong id="modelDeleteName"></strong> 及其在各板块中的模型选择。</p>
      <div class="confirm-dialog-actions"><button class="text-btn" value="cancel">取消</button><button class="danger-btn" id="confirmModelDelete" type="button">删除模型</button></div>
    </form>
  </dialog>
  <script>
    const DEFAULT = {
      stateVersion: 9, currency: 'CNY', structureUnit:'M', comparisonUnit:'M', tokenUnit:'M', budgetUnit:'M', comparisonSelectedModelIds:['sol', 'terra', 'luna'], comparisonMultiplier:.04, comparisonFxRate:7.2,
      cache: 6, input: 14, output: 5,
      knownRatio: 4, knownHit: 30, multiplier: .04,
      comparisonConfig: {ratio:4, hit:30, total:100, shared:{ratio:true, hit:true, total:true}},
      tokenConfig: {ratio:300, hit:90, total:100, multiplier:.04, fxRate:7.2, shared:{ratio:true, hit:true, total:true, multiplier:true, fxRate:true}},
      budgetConfig: {ratio:300, hit:90, budget:100, multiplier:.04, fxRate:7.2, shared:{ratio:true, hit:true, budget:true, multiplier:true, fxRate:true}},
      tokenRows: [{ratio:300, hit:90, total:100, multiplier:.04, fxRate:7.2}],
      budgetRows: [{ratio:300, hit:90, budget:100, multiplier:.04, fxRate:7.2}],
      tokenSelectedModelIds: ['sol', 'terra', 'luna'],
      budgetSelectedModelIds: ['sol', 'terra', 'luna'],
      models: [
        {id:'sol', name:'GPT-5.6 Sol', cache:0.5, input:5, output:30, multiplier:.04, fxRate:7.2, comparisonRatio:4, comparisonHit:30, comparisonTotal:100},
        {id:'terra', name:'GPT-5.6 Terra', cache:0.2, input:2, output:12, multiplier:.04, fxRate:7.2, comparisonRatio:4, comparisonHit:30, comparisonTotal:100},
        {id:'luna', name:'GPT-5.6 Luna', cache:0.02, input:0.2, output:1.2, multiplier:.04, fxRate:7.2, comparisonRatio:4, comparisonHit:30, comparisonTotal:100}
      ]
    };
    const PRESET_ORDER = ['GPT-5.6 Sol', 'GPT-5.6 Terra', 'GPT-5.6 Luna'];
    const $ = id => document.getElementById(id);
    const num = value => Math.max(0, Number(value) || 0);
    const valueOr = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : fallback;
    const percent = value => Math.min(100, Math.max(0, num(value)));
    const clone = value => JSON.parse(JSON.stringify(value));
    const STRUCTURE_UNIT_TO_M = {K:.001, M:1, B:1000};
    function tokenUnitFactor(unit) { return STRUCTURE_UNIT_TO_M[unit] || 1; }
    function tokenDisplayValue(valueM, unit) { return Number((num(valueM) / tokenUnitFactor(unit)).toFixed(6)).toString(); }
    function tokenStoredValue(value, unit) { return num(value) * tokenUnitFactor(unit); }
    function structureUnitFactor() { return tokenUnitFactor(state.structureUnit); }
    function structureDisplayValue(valueM) { return tokenDisplayValue(valueM, state.structureUnit); }
    function renderStructureUnit() {
      const unit = state.structureUnit || 'M';
      $('structureUnit').value = unit;
      $('cache').value = structureDisplayValue(state.cache);
      $('input').value = structureDisplayValue(state.input);
      $('output').value = structureDisplayValue(state.output);
      $('cacheLabel').textContent = '缓存命中（' + unit + ' Token）';
      $('inputLabel').textContent = '输入（缓外，' + unit + ' Token）';
      $('outputLabel').textContent = '输出（' + unit + ' Token）';
      $('cacheUnit').textContent = unit;
      $('inputUnit').textContent = unit;
      $('outputUnit').textContent = unit;
    }
    function bindStructureInput(id, key) { $(id).addEventListener('input', event => { state[key] = num(event.target.value) * structureUnitFactor(); update(); }); }
    const SCENARIO_FIELDS = {
      comparison: [
        {key:'ratio', label:'输入 : 输出', unit:': 1', step:'0.1'},
        {key:'hit', label:'缓存命中率', unit:'%', step:'0.1', converter:percent},
        {key:'total', label:'总 Token', unit:'M', step:'0.1'}
      ],
      tokenRows: [
        {key:'ratio', label:'输入 : 输出', unit:': 1', step:'0.1'},
        {key:'hit', label:'缓存命中率', unit:'%', step:'0.1', converter:percent},
        {key:'total', label:'总 Token', unit:'M', step:'0.1'},
        {key:'multiplier', label:'开支倍率', unit:'x', step:'0.001'},
        {key:'fxRate', label:'美元兑人民币', unit:'', step:'0.01'}
      ],
      budgetRows: [
        {key:'ratio', label:'输入 : 输出', unit:': 1', step:'0.1'},
        {key:'hit', label:'缓存命中率', unit:'%', step:'0.1', converter:percent},
        {key:'budget', label:'预算（当前币种）', unit:'', step:'1'},
        {key:'multiplier', label:'开支倍率', unit:'x', step:'0.001'},
        {key:'fxRate', label:'美元兑人民币', unit:'', step:'0.01'}
      ]
    };

    function modelId(model, index, used) {
      const base = String(model.id || model.name || 'model-' + (index + 1)).toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'model-' + (index + 1);
      let id = base, suffix = 2;
      while (used.has(id)) id = base + '-' + suffix++;
      used.add(id);
      return id;
    }
    function orderModels(models) {
      return [...models].sort((a, b) => {
        const ai = PRESET_ORDER.indexOf(a.name), bi = PRESET_ORDER.indexOf(b.name);
        return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
      });
    }
    function configFor(type) { return type === 'comparison' ? state.comparisonConfig : (type === 'tokenRows' ? state.tokenConfig : state.budgetConfig); }
    function fieldsFor(type) { return SCENARIO_FIELDS[type]; }
    function scenarioTokenUnit(type) { return type === 'comparison' ? state.comparisonUnit : (type === 'tokenRows' ? state.tokenUnit : state.budgetUnit); }
    function scenarioFieldLabel(type, field) {
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? '总 Token (' + scenarioTokenUnit(type) + ')' : field.label;
    }
    function scenarioFieldDisplayValue(type, field, value) {
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? tokenDisplayValue(value, scenarioTokenUnit(type)) : value;
    }
    function scenarioFieldStoredValue(type, field, value) {
      const converted = (field.converter || num)(value);
      return (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? tokenStoredValue(converted, scenarioTokenUnit(type)) : converted;
    }
    function newRow(type, config) {
      const row = {};
      fieldsFor(type).forEach(field => { row[field.key] = config[field.key]; });
      return row;
    }
    function normalizeConfig(source, fallback, type) {
      const normalized = {shared:{}};
      fieldsFor(type).forEach(field => {
        const convert = field.converter || num;
        normalized[field.key] = convert(valueOr(source && source[field.key], fallback[field.key]));
        normalized.shared[field.key] = source && source.shared && typeof source.shared[field.key] === 'boolean' ? source.shared[field.key] : fallback.shared[field.key];
      });
      return normalized;
    }
    function normalizeRows(rows, type, config) {
      const source = Array.isArray(rows) && rows.length ? rows : [newRow(type, config)];
      return source.map(row => {
        const normalized = {};
        fieldsFor(type).forEach(field => {
          const convert = field.converter || num;
          normalized[field.key] = convert(valueOr(row && row[field.key], config[field.key]));
        });
        return normalized;
      });
    }
    function migrate(raw) {
      const saved = raw && typeof raw === 'object' ? raw : {};
      const oldRatio = valueOr(saved.estimateRatio, DEFAULT.tokenConfig.ratio);
      const oldHit = percent(valueOr(saved.estimateHit, DEFAULT.tokenConfig.hit));
      const oldTokenRows = Array.isArray(saved.tokenRows) ? saved.tokenRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      const oldBudgetRows = Array.isArray(saved.budgetRows) ? saved.budgetRows : (Array.isArray(saved.scenarios) ? saved.scenarios : []);
      if (![3, 4, 5, 6, 7, 8, 9].includes(saved.stateVersion)) {
        const firstToken = oldTokenRows[0] || {};
        const firstBudget = oldBudgetRows[0] || {};
        saved.tokenConfig = {ratio:oldRatio, hit:oldHit, total:valueOr(firstToken.total, 100), multiplier:valueOr(firstToken.multiplier, .04), shared:{ratio:true, hit:true, total:true, multiplier:true}};
        saved.budgetConfig = {ratio:oldRatio, hit:oldHit, budget:valueOr(firstBudget.budget, 100), multiplier:valueOr(firstBudget.multiplier, .04), shared:{ratio:true, hit:true, budget:true, multiplier:true}};
        saved.tokenRows = oldTokenRows.map(row => ({ratio:oldRatio, hit:oldHit, total:valueOr(row.total, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.budgetRows = oldBudgetRows.map(row => ({ratio:oldRatio, hit:oldHit, budget:valueOr(row.budget, 100), multiplier:valueOr(row.multiplier, .04)}));
        saved.stateVersion = 9;
      }
      saved.comparisonMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, DEFAULT.comparisonMultiplier));
      saved.comparisonFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, DEFAULT.comparisonFxRate));
      const comparisonFallback = {
        ratio:valueOr(saved.knownRatio, DEFAULT.comparisonConfig.ratio),
        hit:percent(valueOr(saved.knownHit, DEFAULT.comparisonConfig.hit)),
        total:DEFAULT.comparisonConfig.total,
        shared:DEFAULT.comparisonConfig.shared
      };
      const comparisonConfig = normalizeConfig(saved.comparisonConfig, comparisonFallback, 'comparison');
      saved.stateVersion = 9;
      const usedIds = new Set();
      const rawModels = Array.isArray(saved.models) && saved.models.length ? saved.models : clone(DEFAULT.models);
      const legacyModelMultiplier = valueOr(saved.comparisonMultiplier, valueOr(saved.multiplier, .04));
      const legacyModelFxRate = valueOr(saved.comparisonFxRate, valueOr(saved.fxRate, 7.2));
      const models = orderModels(rawModels.map((model, index) => ({
        id:modelId(model, index, usedIds), name:String(model.name || '新模型'),
        cache:num(model.cache), input:num(model.input), output:num(model.output),
        multiplier:valueOr(model.multiplier, legacyModelMultiplier), fxRate:valueOr(model.fxRate, legacyModelFxRate),
        comparisonRatio:valueOr(model.comparisonRatio, comparisonConfig.ratio),
        comparisonHit:percent(valueOr(model.comparisonHit, comparisonConfig.hit)),
        comparisonTotal:valueOr(model.comparisonTotal, comparisonConfig.total)
      })));
      const tokenConfig = normalizeConfig(saved.tokenConfig, DEFAULT.tokenConfig, 'tokenRows');
      const budgetConfig = normalizeConfig(saved.budgetConfig, DEFAULT.budgetConfig, 'budgetRows');
      const legacySelected = Array.isArray(saved.selectedModelIds) ? saved.selectedModelIds : [];
      const selectionFor = key => {
        const source = Array.isArray(saved[key]) ? saved[key] : legacySelected;
        const selected = source.filter(id => models.some(model => model.id === id)).slice(0, 3);
        return selected.length ? selected : [models[0].id];
      };
      const comparisonSelectedModelIds = Array.isArray(saved.comparisonSelectedModelIds)
        ? [...new Set(saved.comparisonSelectedModelIds.filter(id => models.some(model => model.id === id)))]
        : models.map(model => model.id);
      return {
        ...DEFAULT, ...saved, models, comparisonConfig, tokenConfig, budgetConfig,
        tokenRows:normalizeRows(saved.tokenRows, 'tokenRows', tokenConfig),
        budgetRows:normalizeRows(saved.budgetRows, 'budgetRows', budgetConfig),
        comparisonSelectedModelIds:comparisonSelectedModelIds.length ? comparisonSelectedModelIds : [models[0].id],
        tokenSelectedModelIds:selectionFor('tokenSelectedModelIds'),
        budgetSelectedModelIds:selectionFor('budgetSelectedModelIds')
      };
    }
    function loadLegacyState() {
      try { return JSON.parse(localStorage.getItem('token-cost-calc')); }
      catch { return null; }
    }
    let state = clone(DEFAULT);
    let saveTimer;
    let pendingModelId = null;
    function save() {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        if (window.pywebview && window.pywebview.api) window.pywebview.api.save_state(state).catch(() => {});
      }, 180);
    }
    const money = (usd, fxRate) => {
      const amount = state.currency === 'CNY' ? usd * num(fxRate) : usd;
      const symbol = state.currency === 'CNY' ? '\u00a5' : '$';
      return symbol + amount.toLocaleString('zh-CN', {maximumFractionDigits:2});
    };
    const dualMoney = (usd, fxRate) => '$' + usd.toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' / ¥' + (usd * num(fxRate)).toLocaleString('zh-CN', {maximumFractionDigits:2});
    const tokens = (amountM, unit='M') => (num(amountM) / tokenUnitFactor(unit)).toLocaleString('zh-CN', {maximumFractionDigits:2}) + ' ' + unit + ' Token';
    function bind(id, key, converter=num) { $(id).value = state[key]; $(id).addEventListener('input', e => { state[key] = converter(e.target.value); update(); }); }
    function priceRow(label, key) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><input class="price-input" data-model-key="${key}" data-model-id="${m.id}" type="number" min="0" step="0.001" value="${m[key]}"></div>`).join('')}`; }
    function modelSettingRow(label, key, step) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><input class="price-input" data-model-key="${key}" data-model-id="${m.id}" type="number" min="0" step="${step}" value="${m[key]}"></div>`).join('')}`; }
    function multipliedPriceRow(label, key) { return `<div class="cell label-cell">${label}</div>${comparisonModels().map(m => `<div class="cell"><div class="money">${dualMoney(num(m[key]) * num(m.multiplier), m.fxRate)}</div></div>`).join('')}`; }    function standardCost(model, totalM, usage) {
      const ratio = num(usage.ratio);
      const hit = percent(usage.hit) / 100;
      const total = totalM * 1000000;
      const inputTotal = total * ratio / (ratio + 1);
      const cache = inputTotal * hit, input = inputTotal - cache, output = total - inputTotal;
      return (cache * num(model.cache) + input * num(model.input) + output * num(model.output)) / 1000000;
    }
    function cost(model, totalM, usage, multiplier) { return standardCost(model, totalM, usage) * num(multiplier); }
    function escapeHtml(text) { const node=document.createElement('span'); node.textContent=text; return node.innerHTML; }
    function selectedKey(type) { return type === 'tokenRows' ? 'tokenSelectedModelIds' : 'budgetSelectedModelIds'; }
    function selectedModels(type) { return state.models.filter(model => state[selectedKey(type)].includes(model.id)); }
    function ensureComparisonSelection() {
      const key = 'comparisonSelectedModelIds';
      state[key] = [...new Set((state[key] || []).filter(id => state.models.some(model => model.id === id)))];
      if (!state[key].length && state.models.length) state[key] = [state.models[0].id];
    }
    function comparisonModels() {
      ensureComparisonSelection();
      return state.models.filter(model => state.comparisonSelectedModelIds.includes(model.id));
    }
    function renderComparisonFilter(keepOpen=false) {
      const root = $('comparisonModelFilter');
      ensureComparisonSelection();
      const selected = state.comparisonSelectedModelIds;
      const count = selected.length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>显示模型 <span class="model-picker-count">已选 ' + count + ' 个</span></summary><div class="model-options">' + state.models.map(model => {
        const checked = selected.includes(model.id);
        return '<label class="check-label"><input type="checkbox" data-comparison-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (checked && count === 1 ? ' disabled' : '') + '>' + escapeHtml(model.name) + '</label>';
      }).join('') + '</div></details>';
      root.querySelectorAll('[data-comparison-model-filter]').forEach(input => input.addEventListener('change', event => {
        const id = event.target.dataset.comparisonModelFilter;
        if (event.target.checked) state.comparisonSelectedModelIds.push(id);
        else state.comparisonSelectedModelIds = state.comparisonSelectedModelIds.filter(selectedId => selectedId !== id);
        ensureComparisonSelection();
        renderComparison();
        renderComparisonFilter(true);
        save();
      }));
    }
    function ensureSelection(type) {
      const key = selectedKey(type);
      state[key] = [...new Set(state[key].filter(id => state.models.some(model => model.id === id)))].slice(0, 3);
      if (!state[key].length && state.models.length) state[key] = [state.models[0].id];
    }
    function renderModelFilter(type, keepOpen=false) {
      ensureSelection(type);
      const key = selectedKey(type);
      const root = $(type === 'tokenRows' ? 'tokenModelFilter' : 'budgetModelFilter');
      const count = state[key].length;
      root.innerHTML = '<details class="model-picker"' + (keepOpen ? ' open' : '') + '><summary>模型列 <span class="model-picker-count">已选 ' + count + ' 个</span></summary><div class="model-options">' + state.models.map(model => {
        const checked = state[key].includes(model.id);
        const disabled = checked && count === 1;
        return '<label class="check-label"><input type="checkbox" data-model-filter="' + model.id + '"' + (checked ? ' checked' : '') + (disabled ? ' disabled' : '') + '>' + escapeHtml(model.name) + '</label>';
      }).join('') + '</div></details>';
      root.querySelectorAll('[data-model-filter]').forEach(input => input.addEventListener('change', event => {
        const id = event.target.dataset.modelFilter;
        if (event.target.checked) {
          if (state[key].length >= 3) state[key].shift();
          state[key].push(id);
        } else state[key] = state[key].filter(selectedId => selectedId !== id);
        ensureSelection(type);
        if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        save(); renderModelFilter(type, true);
      }));
    }
    function comparisonValue(model, key) {
      const config = state.comparisonConfig;
      return config.shared[key] ? config[key] : model['comparison' + key[0].toUpperCase() + key.slice(1)];
    }
    function openModelDeleteDialog(id) {
      const model = state.models.find(item => item.id === id);
      if (!model || state.models.length <= 1) return;
      pendingModelId = id;
      $('modelDeleteName').textContent = model.name || '该模型';
      $('modelDeleteDialog').showModal();
    }
    function renderComparisonConfig() {
      const root = $('comparisonConfig');
      const config = state.comparisonConfig;
      root.innerHTML = fieldsFor('comparison').map(field => settingInput('comparison', field, config)).join('');
      root.querySelectorAll('[data-shared-key]').forEach(input => input.addEventListener('change', event => {
        const key = event.target.dataset.sharedKey;
        const shared = event.target.checked;
        if (!shared) state.models.forEach(model => { model['comparison' + key[0].toUpperCase() + key.slice(1)] = config[key]; });
        config.shared[key] = shared;
        renderComparisonConfig();
        renderComparison();
        save();
      }));
      root.querySelectorAll('[data-config-key]').forEach(input => {
        const apply = event => {
          const field = fieldsFor('comparison').find(item => item.key === event.target.dataset.configKey);
          config[field.key] = scenarioFieldStoredValue('comparison', field, event.target.value);
        };
        input.addEventListener('input', event => { apply(event); renderComparison(); save(); });
        input.addEventListener('change', event => { apply(event); renderComparison(); save(); });
      });
    }
    function comparisonSettingRow(field) {
      const property = 'comparison' + field.key[0].toUpperCase() + field.key.slice(1);
      const unit = field.key === 'total' ? scenarioTokenUnit('comparison') : field.unit;
      return `<div class="cell label-cell">${scenarioFieldLabel('comparison', field)}</div>${comparisonModels().map(model => `<div class="cell"><div class="unit-input"><input class="price-input" data-comparison-key="${field.key}" data-model-id="${model.id}" type="number" min="0" step="${field.step}" value="${scenarioFieldDisplayValue('comparison', field, model[property])}"><span>${unit}</span></div></div>`).join('')}`;
    }
    function renderComparison() {
      const root = $('comparison'); const models = comparisonModels(); root.style.setProperty('--cols', models.length); renderComparisonFilter();
      const config = state.comparisonConfig;
      root.innerHTML = `
        <div class="cell label-cell">模型 / 项目</div>${models.map(m=>`<div class="cell model-head"><input class="model-name" data-name="${m.id}" value="${escapeHtml(m.name)}"><button class="close" data-remove="${m.id}" title="删除该模型">×</button></div>`).join('')}
        ${priceRow('缓存命中 $ / 1M', 'cache')}
        ${multipliedPriceRow('缓存命中（倍率后，$ / ¥ / 1M）', 'cache')}
        ${priceRow('缓外输入 $ / 1M', 'input')}
        ${multipliedPriceRow('缓外输入（倍率后，$ / ¥ / 1M）', 'input')}
        ${priceRow('输出 $ / 1M', 'output')}
        ${multipliedPriceRow('输出（倍率后，$ / ¥ / 1M）', 'output')}
        ${modelSettingRow('开支倍率（x）', 'multiplier', '0.001')}
        ${modelSettingRow('美元兑人民币汇率', 'fxRate', '0.01')}
        ${fieldsFor('comparison').filter(field => !config.shared[field.key]).map(comparisonSettingRow).join('')}
        <div class="cell label-cell">总 Token 实际开支（倍率后）</div>${models.map(m=>`<div class="cell"><div class="money big">${dualMoney(cost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')},m.multiplier), m.fxRate)}</div></div>`).join('')}
        <div class="cell label-cell">标准 API 费用（未乘倍率）</div>${models.map(m=>`<div class="cell"><div class="money">${dualMoney(standardCost(m,comparisonValue(m,'total'),{ratio:comparisonValue(m,'ratio'), hit:comparisonValue(m,'hit')}), m.fxRate)}</div></div>`).join('')}`;
      root.querySelectorAll('[data-model-key]').forEach(el => { const apply = e => { const model = state.models.find(item => item.id === e.target.dataset.modelId); if (model) model[e.target.dataset.modelKey] = num(e.target.value); }; el.addEventListener('input', e => { apply(e); save(); }); el.addEventListener('change', e => { apply(e); renderComparison(); save(); }); });
      root.querySelectorAll('[data-comparison-key]').forEach(el => {
        const apply = event => {
          const model = state.models.find(item => item.id === event.target.dataset.modelId);
          const field = fieldsFor('comparison').find(item => item.key === event.target.dataset.comparisonKey);
          if (model) model['comparison' + field.key[0].toUpperCase() + field.key.slice(1)] = scenarioFieldStoredValue('comparison', field, event.target.value);
        };
        el.addEventListener('input', event => { apply(event); save(); });
        el.addEventListener('change', event => { apply(event); renderComparison(); save(); });
      });
      root.querySelectorAll('[data-name]').forEach(el => el.addEventListener('input', e => { const model = state.models.find(item => item.id === e.target.dataset.name); if (model) model.name = e.target.value; update(false); }));
      root.querySelectorAll('[data-remove]').forEach(el => el.addEventListener('click', e => {
        openModelDeleteDialog(e.target.dataset.remove);
      }));
    }
    function settingInput(type, field, config) {
      const label = scenarioFieldLabel(type, field);
      const value = scenarioFieldDisplayValue(type, field, config[field.key]);
      const unit = (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? scenarioTokenUnit(type) : field.unit;
      return '<div class="scenario-setting"><div class="scenario-setting-title"><span>' + label + '</span><label class="check-label"><input type="checkbox" data-shared-type="' + type + '" data-shared-key="' + field.key + '"' + (config.shared[field.key] ? ' checked' : '') + '>共享</label></div>' +
        (config.shared[field.key] ? '<div class="unit-input"><input data-config-type="' + type + '" data-config-key="' + field.key + '" type="number" min="0" step="' + field.step + '" value="' + value + '"><span>' + unit + '</span></div>' : '<p class="per-row-note">逐条设置</p>') + '</div>';
    }    function renderScenarioConfig(type) {
      const root = $(type === 'tokenRows' ? 'tokenConfig' : 'budgetConfig');
      const config = configFor(type);
      root.innerHTML = fieldsFor(type).map(field => settingInput(type, field, config)).join('');
      root.querySelectorAll('[data-shared-key]').forEach(input => input.addEventListener('change', event => {
        const key = event.target.dataset.sharedKey;
        const shared = event.target.checked;
        if (!shared) state[type].forEach(row => { row[key] = config[key]; });
        config.shared[key] = shared;
        renderScenarioConfig(type);
        if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
        save();
      }));
      root.querySelectorAll('[data-config-key]').forEach(input => {
        const apply = event => {
          const field = fieldsFor(type).find(item => item.key === event.target.dataset.configKey);
          config[field.key] = scenarioFieldStoredValue(type, field, event.target.value);
        };
        input.addEventListener('input', event => { apply(event); save(); });
        input.addEventListener('change', event => {
          apply(event);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        });
      });
    }
    function scenarioValue(type, row, key) {
      const config = configFor(type);
      return config.shared[key] ? config[key] : row[key];
    }
    function scenarioHeader(type, fields, models) {
      return '<div class="scenario-cell scenario-head">#</div>' + fields.map(field => '<div class="scenario-cell scenario-head">' + scenarioFieldLabel(type, field) + '</div>').join('') + models.map(model => '<div class="scenario-cell scenario-head model">' + escapeHtml(model.name) + '</div>').join('');
    }
    function scenarioNumberInput(type, index, field, value) {
      const label = scenarioFieldLabel(type, field);
      const displayValue = scenarioFieldDisplayValue(type, field, value);
      const unit = (type === 'comparison' || type === 'tokenRows') && field.key === 'total' ? scenarioTokenUnit(type) : field.unit;
      return '<div class="scenario-cell"><label>' + label + '</label><div class="unit-input"><input class="scenario-input" data-row-type="' + type + '" data-row-index="' + index + '" data-row-key="' + field.key + '" type="number" min="0" step="' + field.step + '" value="' + displayValue + '"><span>' + unit + '</span></div></div>';
    }    function bindScenarioRows(root) {
      root.querySelectorAll('[data-row-key]').forEach(el => {
        const apply = event => {
          const type = event.target.dataset.rowType;
          const index = Number(event.target.dataset.rowIndex);
          const field = fieldsFor(type).find(item => item.key === event.target.dataset.rowKey);
          state[type][index][field.key] = scenarioFieldStoredValue(type, field, event.target.value);
          return type;
        };
        el.addEventListener('input', event => { apply(event); save(); });
        el.addEventListener('change', event => {
          const type = apply(event);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        });
      });
      root.querySelectorAll('[data-remove-row]').forEach(el => el.addEventListener('click', event => {
        const type = event.target.dataset.removeType;
        if (state[type].length > 1) {
          state[type].splice(Number(event.target.dataset.removeRow), 1);
          if (type === 'tokenRows') renderTokenRows(); else renderBudgetRows();
          save();
        }
      }));
    }
    function prepareTable(root, fields, models) {
      root.style.gridTemplateColumns = ['72px', ...fields.map(() => 'minmax(132px, 1fr)'), ...models.map(() => 'minmax(190px, 1fr)')].join(' ');
    }
    function renderTokenRows() {
      const root = $('tokenRows'), config = state.tokenConfig;
      const fields = fieldsFor('tokenRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('tokenRows'); prepareTable(root, fields, models);
      root.innerHTML = scenarioHeader('tokenRows', fields, models) + state.tokenRows.map((row, index) => {
        const usage = {ratio:scenarioValue('tokenRows', row, 'ratio'), hit:scenarioValue('tokenRows', row, 'hit')};
        const total = scenarioValue('tokenRows', row, 'total');
        const multiplier = scenarioValue('tokenRows', row, 'multiplier');
        const fxRate = scenarioValue('tokenRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="tokenRows" data-remove-row="' + index + '" title="删除条目">×</button></div>' + fields.map(field => scenarioNumberInput('tokenRows', index, field, row[field.key])).join('');
        const results = models.map(model => '<div class="scenario-cell scenario-result"><strong>' + escapeHtml(model.name) + '</strong><span>' + money(cost(model, total, usage, multiplier), fxRate) + '</span><em>每 1 亿 Token ' + money(cost(model, 100, usage, multiplier), fxRate) + '</em></div>').join('');
        return controls + results;
      }).join('');
      bindScenarioRows(root);
    }
    function renderBudgetRows() {
      const root = $('budgetRows'), config = state.budgetConfig;
      const fields = fieldsFor('budgetRows').filter(field => !config.shared[field.key]);
      const models = selectedModels('budgetRows'); prepareTable(root, fields, models);
      root.innerHTML = scenarioHeader('budgetRows', fields, models) + state.budgetRows.map((row, index) => {
        const usage = {ratio:scenarioValue('budgetRows', row, 'ratio'), hit:scenarioValue('budgetRows', row, 'hit')};
        const budget = scenarioValue('budgetRows', row, 'budget');
        const multiplier = scenarioValue('budgetRows', row, 'multiplier');
        const fxRate = scenarioValue('budgetRows', row, 'fxRate');
        const controls = '<div class="scenario-cell scenario-number">' + (index + 1) + '<button class="scenario-remove" data-remove-type="budgetRows" data-remove-row="' + index + '" title="删除条目">×</button></div>' + fields.map(field => scenarioNumberInput('budgetRows', index, field, row[field.key])).join('');
        const budgetUsd = budget / (state.currency === 'CNY' ? num(fxRate) : 1);
        const results = models.map(model => {
          const perM = cost(model, 1, usage, multiplier);
          return '<div class="scenario-cell scenario-result"><strong>' + escapeHtml(model.name) + '</strong><span>' + (perM ? tokens(budgetUsd / perM, state.budgetUnit) : '--') + '</span><em>按预算可使用总 Token</em></div>';
        }).join('');
        return controls + results;
      }).join('');
      bindScenarioRows(root);
    }
    function renderScenario() { renderModelFilter('tokenRows'); renderModelFilter('budgetRows'); renderScenarioConfig('tokenRows'); renderScenarioConfig('budgetRows'); renderTokenRows(); renderBudgetRows(); }
    function update(renderModelComparison=true) {
      const inputTotal = num(state.cache) + num(state.input);
      $('ratioOut').textContent = num(state.output) ? (inputTotal / num(state.output)).toFixed(2) + ' : 1' : '--';
      $('hitOut').textContent = inputTotal ? (num(state.cache) / inputTotal * 100).toFixed(1) + '%' : '--';
      const ratio = num(state.knownRatio);
      $('inputShare').textContent = (ratio / (ratio + 1) * 100).toFixed(1) + '%';
      $('outputShare').textContent = (1 / (ratio + 1) * 100).toFixed(1) + '%';
      if (renderModelComparison) { renderComparisonConfig(); renderComparison(); }
      renderScenario(); save();
    }
    bindStructureInput('cache','cache'); bindStructureInput('input','input'); bindStructureInput('output','output'); bind('knownRatio','knownRatio'); bind('knownHit','knownHit',percent);
    $('confirmModelDelete').onclick = () => {
      const id = pendingModelId;
      $('modelDeleteDialog').close();
      pendingModelId = null;
      if (id && state.models.length > 1) {
        state.models = state.models.filter(model => model.id !== id);
        ensureComparisonSelection(); ensureSelection('tokenRows'); ensureSelection('budgetRows'); update();
      }
    };
    $('modelDeleteDialog').addEventListener('close', () => { pendingModelId = null; });
    $('structureUnit').onchange=e=>{state.structureUnit=e.target.value; renderStructureUnit(); update();};
    renderStructureUnit();
    $('comparisonUnit').value = state.comparisonUnit;
    $('comparisonUnit').onchange = event => {
      state.comparisonUnit = event.target.value;
      renderComparisonConfig();
      renderComparison();
      save();
    };
    $('tokenUnit').value = state.tokenUnit;
    $('tokenUnit').onchange = event => {
      state.tokenUnit = event.target.value;
      renderScenarioConfig('tokenRows');
      renderTokenRows();
      save();
    };
    $('budgetUnit').value = state.budgetUnit;
    $('budgetUnit').onchange = event => {
      state.budgetUnit = event.target.value;
      renderBudgetRows();
      save();
    };
    $('currency').value=state.currency; $('currency').onchange=e=>{state.currency=e.target.value; update();};
    $('addModel').onclick=()=>{const config=state.comparisonConfig, id='custom-' + Date.now(); state.models.push({id, name:'新模型',cache:0,input:0,output:0,multiplier:.04,fxRate:7.2,comparisonRatio:config.ratio,comparisonHit:config.hit,comparisonTotal:config.total}); state.comparisonSelectedModelIds.push(id); update();};
    $('addTokenRow').onclick=()=>{state.tokenRows.push(newRow('tokenRows', state.tokenConfig)); renderTokenRows(); save();};
    $('addBudgetRow').onclick=()=>{state.budgetRows.push(newRow('budgetRows', state.budgetConfig)); renderBudgetRows(); save();};
    $('reset').onclick=()=>{if(confirm('重置所有输入、模型和价格？')) { localStorage.removeItem('token-cost-calc'); location.reload(); }};
    document.querySelectorAll('[data-toggle]').forEach(button => button.addEventListener('click', () => {
      const section = button.closest('.collapsible-section');
      const collapsed = section.classList.toggle('collapsed');
      button.textContent = collapsed ? '⌄' : '⌃';
      button.setAttribute('aria-expanded', String(!collapsed));
      button.title = collapsed ? '展开此板块' : '折叠此板块';
    }));
    window.addEventListener('pywebviewready', async () => {
      try {
        const saved = await window.pywebview.api.load_state();
        state = migrate(saved || loadLegacyState());
        renderStructureUnit();
        $('knownRatio').value = state.knownRatio;
        $('knownHit').value = state.knownHit;
        $('comparisonUnit').value = state.comparisonUnit;
        $('tokenUnit').value = state.tokenUnit;
        $('budgetUnit').value = state.budgetUnit;
        $('currency').value = state.currency;
        update();
      } catch {
        state = migrate(loadLegacyState());
        update();
      }
    });    update();
  </script>
</body>
</html>'''

STATE_PATH = Path(__file__).with_name("token-cost-calc.json")


class StateApi:
    def load_state(self) -> dict | None:
        try:
            data = json.loads(STATE_PATH.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return None
        return data if isinstance(data, dict) else None

    def save_state(self, state: dict) -> bool:
        if not isinstance(state, dict):
            return False
        try:
            temporary_path = STATE_PATH.with_suffix(".tmp")
            temporary_path.write_text(
                json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            temporary_path.replace(STATE_PATH)
            return True
        except OSError:
            return False

    def reset_state(self) -> bool:
        try:
            STATE_PATH.unlink(missing_ok=True)
            return True
        except OSError:
            return False

def main() -> None:
    window = webview.create_window(
        "Token Cost Calc",
        html=HTML,
        width=1320,
        height=900,
        min_size=(360, 640),
        background_color="#faf9f5",
        js_api=StateApi(),
    )
    webview.start(debug=False)


if __name__ == "__main__":
    main()
