# 主页维护

## 内容与结构

- `_pages/about.md`：个人介绍、教育、获奖信息及各区块的排列。
- `_data/publications.yml`：论文标题、作者、期刊、链接和奖项。作者可用 Markdown 加粗；没有公开链接时省略 `url`。默认按标准化后的完整标题匹配引用记录（忽略大小写、空格和标点）；同名多条记录不自动猜测，需要指定 ID。可选 `scholar_id` 是 Google Scholar 的完整 `author_pub_id`，例如 `个人ID:论文ID`。
- `_data/news.yml`：按展示顺序排列。`label` 是日期或公告标题，`text` 支持 Markdown，`featured` 控制红色强调。新论文尚未提供接收月份，所以新 News 只标记 2026。
- `_data/navigation.yml`、`_data/social.yml`：导航和个人链接。
- `_includes/`：可复用的页面区块。
- `_sass/_homepage.scss`：主页样式；`assets/js/site.js`：News 滚动与引用数据加载，无 jQuery 依赖。

## Google Scholar

2026-11-24 的公开 API 检查：远端只有 `main` 分支，没有 `google-scholar-stats`；Actions 列表只返回 Pages 工作流。不能从这些信息确认历史失败日志或私有设置，但可以确认引用数据尚未发布。旧前端还会访问不存在的 `total_cit` 元素并报错。

1. `_config.yml` 中 `scholar.id` 已设置为 `w0mmwl4AAAAJ`。它是公开 ID，无需 Secret。已有 `GOOGLE_SCHOLAR_ID` Secret 时优先使用 Secret；如果其中值错误，应更新或删除。
2. 推送代码后进入仓库 **Actions → Get Citation Data → Run workflow**。如果仓库提示 fork 工作流未启用，先启用 Actions。
3. 工作流显式请求 `contents: write`，并只在抓取成功后提交数据到 `google-scholar-stats`，不强制推送。
4. 如果抓取步骤报错，检查个人页面是否公开，以及 Google Scholar 是否封锁 GitHub runner 请求。`scholarly` 是非官方抓取库，不能保证持续可用。失败不会发布零计数或覆盖上次成功结果。
5. 如果发布步骤报 403，检查仓库/组织 Actions 权限和数据分支规则。
6. 如果日后定时任务停止，检查 GitHub 是否因长期没有仓库活动而停用 schedule。

页面优先请求 GitHub Raw，失败时尝试 jsDelivr；可在 `_config.yml` 切换优先顺序。数据仍不可用时保留 Scholar 链接并显示不可用提示，不显示虚假计数。成功时显示抓取日期。每次推送到 `main` 都会触发抓取（数据分支更新不会递归触发）。每日 UTC 08:17（北京时间 16:17）更新，也可手动运行。

本地抓取：

```sh
python3 -m venv /tmp/homepage-scholar
/tmp/homepage-scholar/bin/pip install -r google_scholar_crawler/requirements.txt
OUTPUT_DIR=/tmp/homepage-scholar-results /tmp/homepage-scholar/bin/python google_scholar_crawler/main.py
```

## 左侧累计访客地图

组件使用 ClustrMaps 记录访客 IP 的近似地理分布，不在页面公开 IP。GitHub Pages 是静态托管，累计访客需要第三方服务存储。

1. 在 https://clustrmaps.com/ 注册本站 `https://tianyuan2001.github.io`。
2. 选择平面地图 widget，复制 `map_v2.js?d=...` 中的 `d` 值（不是完整 HTML）。
3. 填入 `_config.yml` 的 `visitor_map.clustrmaps_id`。

未配置时不加载服务，也不展示空白/虚假的访客地图。配置后地图放在左侧个人资料下方，移动端随个人资料进入正常文档流。服务被网络或广告拦截器屏蔽时可能不可见。记录从启用时开始，不能恢复历史访客。访问地图服务会将访问者 IP 等请求信息交给该服务。

本次网络检查未能连接 ClustrMaps，尚未获得站点 ID，因此当前地图未启用。

## 本地预览与验证

```sh
bundle install
bundle exec jekyll build
sh run_server.sh
node tests/site.test.js
python3 -m unittest discover -s tests -p 'test_*.py'
```

Python 测试需要安装爬虫 requirements 中的 PyYAML。News 默认自动滚动；悬停、键盘聚焦或隐藏页面时暂停；触摸/滚轮/键盘操作后保持手动模式，可通过按钮恢复。系统开启减少动态效果时默认暂停。打印时显示完整 News。

旧的 jQuery、插件合集、未使用的折叠脚本和全局 MathJax 加载已移除；当前主页没有依赖这些功能的内容。保留原主题 SCSS，避免为精简而改变基础布局。若未来添加公式或视频灯箱，可按需要单独引入。

## 本次验证记录（2026-11-24）

- 使用临时目录中的锁定版本 Ruby 库，实际执行 Jekyll 3.9.0 构建成功；没有修改系统 Ruby。
- 生成 HTML 包含 27 篇论文、14 条 News，25 篇原有论文均保留，导航锚点有效。
- 另以 `/preview` 子路径和测试 widget ID 构建，验证资源路径与地图条件渲染；测试 ID 未写入实际站点配置。
- Node 回归检查通过：引用数据回退、零计数、非法数据、缺失论文、服务不可用；News 自动滚动、悬停暂停、手动暂停、恢复、后台暂停及减少动态效果。
- Python 3 项测试通过，包括在临时 Git 仓库中执行真实工作流发布脚本，验证首次创建分支和后续更新保留历史。
- `git diff --check` 通过。
- 未推送或部署，未验证线上 Scholar 抓取成功；访客地图缺少真实 widget ID。

总引用数融入 `_pages/about.md` 的个人介绍文字，每篇论文标题后都有 `Citations`。未成功抓取或无法唯一匹配时显示“—”，而不是 0。新论文未进入 Scholar 或标题不同，可在取得数据后填写 `scholar_id`。

### 补充验证

- 浏览器检查了 1440×1000 桌面和 390×844 手机视口，均无页面横向溢出；手机导航菜单自身可横向滚动。
- 修复了固定顶部导航遮住锚点标题的问题，并确认手机端 Publications 标题在导航下方可见。
- 浏览器确认 27 个逐篇引用位置及侧栏顶部总引用数均已生成，News 暂停后滚动位置保持不变。
- 标题大小写/标点标准化、显式 Scholar ID、同名多记录拒绝猜测及缺失记录回归检查通过。
- 当前引用数据显示“—”；没有将测试计数写入实际网站。

### 直接在 Markdown 中放置引用数

支持 AcadHomepage 原版写法，可在 `_pages/about.md` 任意论文条目后插入：

```html
<span class="show_paper_citations" data="YOUR_SCHOLAR_ID:PAPER_ID"></span>
```

`data` 填写 Scholar 论文详情 URL 中 `citation_for_view=` 后的完整值，不能使用他人的示例 ID。数据文件中的论文可填写 `scholar_id`，模板会生成相同的 class/data 标记；没有 ID 时才尝试唯一标题匹配。也兼容已有的 `data-scholar-paper` 写法。

总引用数支持 `id="total_cit"`，默认通过 `scholar-stats.html` 在介绍文字后输出。逐篇引用加载不依赖总引用组件，删除总引用句子也不会让逐篇引用失效。

## Selected / Full Publications

Publications 默认显示 Selected Publications，Full Publications 展示全部论文。两个列表由同一个 `_includes/publication-list.html` 模板和 `_data/publications.yml` 数据生成，引用数会同时更新两处。

为精选论文添加正整数 `selected_order`，数字决定 Selected 中的顺序；移除该字段即可取消精选，不影响 Full 中的位置。当前顺序为 TPAMI、LanEvil、Human-aligned PR、MIR、LatentGuard（IJCAI Workshop）和 MetAdv（MM Demo）。

支持鼠标点击、左右方向键及 Home/End 切换。JavaScript 不可用时显示完整列表；打印时也显示完整列表，避免重复打印精选论文。

已验证 Jekyll 构建、6 篇精选的内容与顺序、27 篇完整列表、桌面/手机切换、键盘焦点与手机无横向溢出。

## 抓取启动错误：bibtexparser.bibdatabase

2026-11-24 的运行日志显示 `ModuleNotFoundError: No module named 'bibtexparser.bibdatabase'`，发生在 `from scholarly import scholarly`，尚未请求 Scholar，也没有进入发布步骤。`scholarly==1.7.11` 的包元数据未限制 `bibtexparser` 版本，而代码使用 1.x 的 `BibDatabase` API。

已固定 `bibtexparser==1.4.3`，新增 `Verify crawler dependencies` 步骤（`pip check`、真实导入、初始化），并升级 checkout/setup-python 至 Node 24 版本。官方 1.4.3 源包 SHA-256 核验、缺失接口导入、BibTeX 解析、本地 Python 测试及工作流 YAML 检查通过。本机 pip 受 TLS 连接问题影响，完整依赖环境的初始化检查需由 Actions 执行。

推送修复后，从最新 main 启动新的 Run workflow。对旧失败记录执行 Re-run 会继续使用旧提交。数据分支由首次成功抓取自动创建，无需手动新建。

旧排队任务的取消失败只有通用页面提示，尚未获得更详细的 GitHub 错误原因；它与此次可确定的 Python 导入失败应分别处理。
